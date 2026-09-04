import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import {
  DatasetModel,
  InternalJobModel,
  ScoredRecordModel,
  UserModel,
  WorkspaceMembershipModel,
  WorkspaceModel,
  connectMongo,
  disconnectMongo,
} from "../packages/db/dist/index.js";
import { sha256 } from "./ingestion/chatgpt-real-data-pilot.mjs";

const execFileAsync = promisify(execFile);
const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const mongoUrl = new URL(mongoUri);
if (!new Set(["127.0.0.1", "localhost"]).has(mongoUrl.hostname)) {
  throw new Error("Protected real-data integration tests may only use a local disposable MongoDB.");
}

const databaseName = "tax_lien_chatgpt_staging";
const ownerEmail = "real-data-pilot-owner@example.test";
const logicalDatasetId = "maricopa-protected-lane-ci";
const sourceAsOf = new Date().toISOString();
const raw = Buffer.from([
  "APN,Total Due,Full Cash Value,Property Use,Situs Address,OwnerName,MailingAddress1",
  "101-01-001,1250,85000,Residential,123 Test Ave,Example Owner,PO Box 1",
  "101-01-002,2200,120000,Vacant Land,456 Test Rd,Second Owner,PO Box 2",
].join("\n"), "utf8");
const rawDigest = sha256(raw);
const runnerPath = resolve("scripts/ingestion/chatgpt-real-data-pilot.mjs");
const temporaryDirectory = await mkdtemp(join(tmpdir(), "tax-lien-real-data-pilot-"));
const receiptPath = join(temporaryDirectory, "receipt.json");
let databasePrepared = false;

try {
  await connectMongo({ uri: mongoUri, dbName: databaseName, serverSelectionTimeoutMs: 15_000 });
  await UserModel.db.dropDatabase();
  databasePrepared = true;
  const user = await UserModel.create({ email: ownerEmail, passwordHash: "synthetic-integration-hash" });
  const workspace = await WorkspaceModel.create({ name: "Maricopa Pilot Workspace", ownerUserId: user.id });
  await WorkspaceMembershipModel.create({
    workspaceId: workspace.id,
    userId: user.id,
    role: "owner",
    status: "active",
    isDefault: true,
    addedByUserId: user.id,
    joinedAt: user.createdAt,
  });
  await disconnectMongo();

  await runProtectedLane();
  const firstReceipt = JSON.parse(await readFile(receiptPath, "utf8"));
  assert(firstReceipt.ingestion.idempotentReuse === false, "first run must create the protected dataset");
  assertSanitizedReceipt(firstReceipt);

  await runProtectedLane();
  const repeatedReceipt = JSON.parse(await readFile(receiptPath, "utf8"));
  assert(repeatedReceipt.ingestion.idempotentReuse === true, "second run must reuse the exact protected dataset");
  assertSanitizedReceipt(repeatedReceipt);

  await connectMongo({ uri: mongoUri, dbName: databaseName, serverSelectionTimeoutMs: 15_000 });
  const datasets = await DatasetModel.find({ userId: user.id }).lean();
  assert(datasets.length === 1, "idempotent rerun must retain exactly one dataset");
  assert(datasets[0]?.rowCount === 2, "protected dataset must retain the minimized row count");
  assert(datasets[0]?.columnCount === 5, "protected dataset must retain only five allowlisted columns");
  assert(datasets[0]?.sourceLabel?.includes("not-county-authority"), "protected dataset must preserve its authority limitation");
  const storedDataset = JSON.stringify(datasets[0]);
  for (const forbidden of ["Example Owner", "Second Owner", "PO Box", "OwnerName", "MailingAddress1"]) {
    assert(!storedDataset.includes(forbidden), `protected dataset must discard ${forbidden}`);
  }
  const datasetId = String(datasets[0]?._id);
  assert(await ScoredRecordModel.countDocuments({ userId: user.id, datasetId }) === 2, "protected dataset must produce one scored record per row");
  assert(await InternalJobModel.countDocuments({ userId: user.id, targetEntityId: datasetId, type: "dataset_scoring" }) === 1, "idempotent rerun must not queue a duplicate scoring job");
  assert(await InternalJobModel.countDocuments({ userId: user.id, targetEntityId: datasetId, type: "dataset_scoring", status: "completed" }) === 1, "idempotent reuse must retain exact completed-job evidence");

  console.log("ChatGPT protected real-data pilot Mongo integration checks passed.");
} finally {
  if (databasePrepared) {
    if (UserModel.db.readyState !== 1) {
      await connectMongo({ uri: mongoUri, dbName: databaseName, serverSelectionTimeoutMs: 15_000 });
    }
    await UserModel.db.dropDatabase();
    await disconnectMongo();
  }
  await rm(temporaryDirectory, { recursive: true, force: true });
}

async function runProtectedLane() {
  await execFileAsync(process.execPath, [runnerPath], {
    timeout: 180_000,
    maxBuffer: 64 * 1024,
    env: {
      NODE_ENV: "test",
      MONGODB_URI: mongoUri,
      CHATGPT_PILOT_EMAIL: ownerEmail,
      CHATGPT_PILOT_DATA_B64: raw.toString("base64"),
      PILOT_SOURCE_INVENTORY_ID: "platform-user-upload",
      PILOT_LOGICAL_DATASET_ID: logicalDatasetId,
      PILOT_SOURCE_AUTHORITY: "Synthetic CI owner-supplied fixture",
      PILOT_RIGHTS_BASIS: "owner_attestation",
      PILOT_RIGHTS_REFERENCE: "synthetic-ci-only",
      PILOT_SOURCE_AS_OF: sourceAsOf,
      PILOT_DATASET_SHA256: rawDigest,
      PILOT_OWNER_IDENTITY_CONFIRMED: "true",
      PILOT_RIGHTS_CONFIRMED: "true",
      PILOT_PII_MINIMIZATION_CONFIRMED: "true",
      PILOT_NO_TRAINING_CONFIRMED: "true",
      PILOT_TRAINING_PERMITTED: "false",
      PILOT_RECEIPT_PATH: receiptPath,
      LIVE_REPOSITORY_URL: "https://github.com/AyobamiH/tax-lien-intelligence-platform",
      LIVE_SOURCE_REVISION: "f".repeat(40),
      LIVE_WORKFLOW_RUN_URL: "https://github.com/AyobamiH/tax-lien-intelligence-platform/actions/runs/1",
      INTELLIGENCE_SERVICE_ENABLED: "false",
      CENSUS_GEOCODER_ENABLED: "false",
      EMAIL_DELIVERY_ENABLED: "false",
      MAINTENANCE_AUTO_REFRESH_ENABLED: "false",
      OPERATIONAL_LOGGING_ENABLED: "false",
    },
  });
}

function assertSanitizedReceipt(receipt) {
  const serialized = JSON.stringify(receipt);
  for (const forbidden of [ownerEmail, "Example Owner", "Second Owner", "PO Box", "101-01-001", "123 Test Ave"]) {
    assert(!serialized.includes(forbidden), `receipt must not retain ${forbidden}`);
  }
  assert(receipt.status === "passed", "receipt must record a passed execution");
  assert(receipt.minimization.directIdentifierColumnCountDropped === 2, "receipt must count both discarded direct-identifier columns");
  assert(receipt.ingestion.scoredRecordCount === 2, "receipt must record aggregate score parity");
  assert(receipt.evidencePolicy.rawRowsStored === false, "receipt must deny raw-row retention");
  assert(receipt.evidencePolicy.modelTrainingPermitted === false, "receipt must deny model training");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
