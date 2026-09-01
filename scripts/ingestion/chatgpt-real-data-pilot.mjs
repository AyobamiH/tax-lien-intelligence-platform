import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import {
  connectMongo,
  DatasetModel,
  disconnectMongo,
  InternalJobModel,
  ScoredRecordModel,
  UserModel,
  WorkspaceMembershipModel,
  WorkspaceModel,
} from "@tax-lien/db";

export const PILOT_MAX_RAW_BYTES = 32 * 1024;
export const PILOT_MAX_ROWS = 250;
export const PILOT_RETENTION_DAYS = 30;
export const PILOT_JURISDICTION = Object.freeze({ country: "US", state: "AZ", county: "Maricopa" });
export const PILOT_REUSE_SCOPE = "private_staging_evaluation";
export const PILOT_RIGHTS_BASES = Object.freeze(["owner_attestation", "written_authorization"]);

const canonicalColumns = [
  { key: "parcel_id", output: "APN", aliases: ["apn", "parcel number", "parcel no", "assessor parcel number", "parcel id", "parcel_id", "folio key", "foliokey"] },
  { key: "lien_amount", output: "Total Due", aliases: ["total due", "tax due", "amount due", "delinquent tax", "delinquent amount", "minimum bid", "lien amount", "lien_amount"] },
  { key: "estimated_value", output: "Full Cash Value", aliases: ["full cash value", "fcv", "market value", "limited property value", "lpv", "assessed value", "valuation", "estimated value", "estimated_value"] },
  { key: "property_type", output: "Property Use", aliases: ["property use", "property use description", "use code", "legal class", "property class", "property type", "property_type"] },
  { key: "address", output: "Situs Address", aliases: ["situs address", "site address", "property address", "situs street", "situs full address", "address"] },
];

const directIdentifierPatterns = [
  /(^|\b)owner(\b|$)/iu,
  /(^|\b)mailing(\b|$)/iu,
  /(^|\b)e[-_ ]?mail(\b|$)/iu,
  /(^|\b)phone(\b|$)/iu,
  /(^|\b)telephone(\b|$)/iu,
  /(^|\b)taxpayer[ _-]?name(\b|$)/iu,
  /(^|\b)contact[ _-]?name(\b|$)/iu,
  /(^|\b)ssn(\b|$)/iu,
  /social[ _-]?security/iu,
];

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function normalizeExpectedSha256(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/^sha256:/u, "");
  if (!/^[0-9a-f]{64}$/u.test(normalized)) {
    throw new Error("Pilot dataset SHA-256 must be exactly 64 hexadecimal characters.");
  }
  return normalized;
}

export function validatePilotManifest(input, now = new Date()) {
  const sourceInventoryId = requiredText(input.sourceInventoryId, "source inventory id", 120);
  const logicalDatasetId = requiredLogicalId(input.logicalDatasetId);
  const sourceAuthority = requiredText(input.sourceAuthority, "source authority", 240);
  const rightsReference = requiredText(input.rightsReference, "rights reference", 240);
  const rightsBasis = requiredText(input.rightsBasis, "rights basis", 40);
  if (!PILOT_RIGHTS_BASES.includes(rightsBasis)) throw new Error("Pilot rights basis is not supported.");
  const sourceAsOf = requiredIsoDate(input.sourceAsOf, "source as-of");
  const expectedSha256 = normalizeExpectedSha256(input.expectedSha256);
  const trainingPermitted = input.trainingPermitted === true || String(input.trainingPermitted).toLowerCase() === "true";

  if (trainingPermitted) throw new Error("Private-pilot data must not be permitted for model training.");
  if (input.ownerIdentityConfirmed !== true) throw new Error("Owner identity confirmation is required.");
  if (input.rightsConfirmed !== true) throw new Error("Reuse-rights confirmation is required.");
  if (input.piiMinimizationConfirmed !== true) throw new Error("PII minimization confirmation is required.");
  if (input.noTrainingConfirmed !== true) throw new Error("No-training confirmation is required.");

  const asOfTime = sourceAsOf.getTime();
  const nowTime = now.getTime();
  if (asOfTime > nowTime + 5 * 60_000) throw new Error("Source as-of cannot be in the future.");
  if (nowTime - asOfTime > 180 * 24 * 60 * 60_000) {
    throw new Error("Source as-of is too stale for this private-pilot evaluation lane.");
  }

  return {
    schemaVersion: "1.0.0",
    sourceInventoryId,
    logicalDatasetId,
    sourceAuthority,
    rightsReference,
    rightsBasis,
    sourceAsOf: sourceAsOf.toISOString(),
    expectedSha256,
    jurisdiction: PILOT_JURISDICTION,
    reuseScope: PILOT_REUSE_SCOPE,
    retentionDays: PILOT_RETENTION_DAYS,
    trainingPermitted: false,
  };
}

export function validateInventorySource(inventory, manifest) {
  if (
    inventory?.jurisdiction?.country !== PILOT_JURISDICTION.country ||
    inventory?.jurisdiction?.state !== PILOT_JURISDICTION.state ||
    inventory?.jurisdiction?.county !== PILOT_JURISDICTION.county
  ) {
    throw new Error("Pilot source inventory is not the governed Maricopa inventory.");
  }
  if (inventory?.policies?.userUploadsMayEstablishOfficialAuthority !== false) {
    throw new Error("Pilot source inventory must preserve the no-authority-from-upload policy.");
  }
  const source = inventory?.sources?.find((candidate) => candidate.id === manifest.sourceInventoryId);
  if (!source) throw new Error("Pilot source inventory id is not registered.");
  if (source.sourceClass === "legal_reference") throw new Error("A legal-reference source cannot be ingested as a parcel pilot dataset.");
  const decision = source.productionDecision?.status;
  if (!new Set(["evidence_only", "blocked"]).has(decision)) {
    throw new Error("Pilot source is not eligible for the protected evidence lane.");
  }
  if (decision === "blocked" && manifest.rightsBasis !== "written_authorization") {
    throw new Error("Blocked inventory sources require a written_authorization rights basis.");
  }
  if (manifest.sourceInventoryId === "platform-user-upload" && !PILOT_RIGHTS_BASES.includes(manifest.rightsBasis)) {
    throw new Error("Tenant uploads require an explicit supported rights basis.");
  }
  return {
    sourceClass: source.sourceClass,
    productionDecisionStatus: decision,
    termsStatus: source.terms?.status ?? "unknown",
  };
}

export function decodeAndVerifyPilotData(base64Value, expectedSha256) {
  const encoded = String(base64Value ?? "").replaceAll(/\s+/gu, "");
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/u.test(encoded)) throw new Error("Pilot dataset secret is not valid base64.");
  const buffer = Buffer.from(encoded, "base64");
  if (buffer.length === 0) throw new Error("Pilot dataset is empty.");
  if (buffer.length > PILOT_MAX_RAW_BYTES) {
    throw new Error(`Pilot dataset exceeds the ${PILOT_MAX_RAW_BYTES}-byte protected-lane limit.`);
  }
  const digest = sha256(buffer);
  if (digest !== normalizeExpectedSha256(expectedSha256)) {
    throw new Error("Pilot dataset SHA-256 does not match the operator-supplied digest.");
  }
  return buffer;
}

export function minimizePilotCsv(buffer) {
  const text = buffer.toString("utf8");
  let matrix;
  try {
    matrix = parse(text, {
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: false,
      max_record_size: 64 * 1024,
    });
  } catch {
    throw new Error("Pilot dataset CSV could not be parsed safely.");
  }

  if (!Array.isArray(matrix) || matrix.length < 2) throw new Error("Pilot dataset must include headers and at least one row.");
  const headers = matrix[0].map((value) => String(value).trim());
  if (headers.length === 0 || headers.some((header) => !header)) throw new Error("Pilot dataset contains a blank header.");
  if (new Set(headers.map(normalizeHeader)).size !== headers.length) throw new Error("Pilot dataset contains duplicate headers.");

  const selected = canonicalColumns.map((column) => ({ ...column, index: findHeaderIndex(headers, column.aliases) }));
  const parcel = selected.find((column) => column.key === "parcel_id");
  if (!parcel || parcel.index < 0) throw new Error("Pilot dataset must contain a recognized parcel identifier column.");
  if (!selected.some((column) => column.key !== "parcel_id" && column.index >= 0)) {
    throw new Error("Pilot dataset needs at least one decision field in addition to the parcel identifier.");
  }

  const rows = matrix.slice(1).filter((row) => row.some((value) => String(value).trim().length > 0));
  if (rows.length === 0) throw new Error("Pilot dataset contains no usable rows.");
  if (rows.length > PILOT_MAX_ROWS) throw new Error(`Pilot dataset exceeds the ${PILOT_MAX_ROWS}-row evaluation limit.`);

  const outputHeaders = canonicalColumns.map((column) => column.output);
  const outputRows = rows.map((row, rowIndex) => {
    const values = selected.map((column) => column.index >= 0 ? sanitizeCell(row[column.index] ?? "") : "");
    if (!values[0]) throw new Error(`Pilot dataset row ${rowIndex + 2} is missing a parcel identifier.`);
    return values;
  });

  const recognizedIndexes = new Set(selected.filter((column) => column.index >= 0).map((column) => column.index));
  const droppedHeaders = headers.filter((_header, index) => !recognizedIndexes.has(index));
  const directIdentifierHeadersDropped = droppedHeaders.filter((header) => directIdentifierPatterns.some((pattern) => pattern.test(header)));
  const minimized = [outputHeaders, ...outputRows].map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";

  return {
    buffer: Buffer.from(minimized, "utf8"),
    rowCount: outputRows.length,
    columnCount: outputHeaders.length,
    originalColumnCount: headers.length,
    droppedColumnCount: droppedHeaders.length,
    directIdentifierColumnCountDropped: directIdentifierHeadersDropped.length,
    outputHeaders,
  };
}

export function sourceLabelForPilot(manifest, digest) {
  const logical = manifest.logicalDatasetId.slice(0, 16);
  const inventory = manifest.sourceInventoryId.slice(0, 20);
  const label = `pilot-evidence-only|id=${logical}|inv=${inventory}|asof=${manifest.sourceAsOf.slice(0, 10)}|sha=${digest.slice(0, 12)}|not-county-authority`;
  if (label.length > 120) throw new Error("Generated pilot source label exceeds the dataset contract.");
  return label;
}

export function buildSanitizedReceipt(input) {
  return {
    schemaVersion: "1.0.0",
    receiptKind: "chatgpt_private_staging_real_data_pilot",
    status: "passed",
    observedAt: input.observedAt,
    source: { repository: input.repository, revision: input.revision, workflowRun: input.workflowRun },
    manifest: {
      logicalDatasetId: input.manifest.logicalDatasetId,
      sourceInventoryId: input.manifest.sourceInventoryId,
      sourceAuthority: input.manifest.sourceAuthority,
      rightsReference: input.manifest.rightsReference,
      rightsBasis: input.manifest.rightsBasis,
      inventorySourceClass: input.inventorySource.sourceClass,
      inventoryDecisionAtRun: input.inventorySource.productionDecisionStatus,
      inventoryTermsStatusAtRun: input.inventorySource.termsStatus,
      sourceAsOf: input.manifest.sourceAsOf,
      jurisdiction: input.manifest.jurisdiction,
      reuseScope: input.manifest.reuseScope,
      retentionDays: input.manifest.retentionDays,
      retentionUntil: input.retentionUntil,
      trainingPermitted: false,
      datasetSha256: `sha256:${input.datasetSha256}`,
    },
    minimization: {
      rawBytes: input.rawBytes,
      originalColumnCount: input.minimized.originalColumnCount,
      persistedColumnCount: input.minimized.columnCount,
      droppedColumnCount: input.minimized.droppedColumnCount,
      directIdentifierColumnCountDropped: input.minimized.directIdentifierColumnCountDropped,
      persistedFields: ["parcel_id", "lien_amount", "estimated_value", "property_type", "address"],
      rawRowsStoredInReceipt: false,
      parcelValuesStoredInReceipt: false,
    },
    tenantBoundary: {
      intendedOwnerCount: 1,
      observedOwnerCount: 1,
      intendedWorkspaceCount: 1,
      observedWorkspaceCount: 1,
      role: "owner",
      emailStoredInReceipt: false,
      workspaceIdentifierStoredInReceipt: false,
      databaseIdentifierStoredInReceipt: false,
    },
    ingestion: {
      idempotentReuse: input.idempotentReuse,
      datasetPersisted: true,
      rowCount: input.minimized.rowCount,
      scoringJobCompleted: true,
      scoredRecordCount: input.scoredRecordCount,
      versionedIntelligenceRequired: false,
      heuristicOutputsMustRemainLabelled: true,
      publicGatewayMutationAdded: false,
      mcpMutationAdded: false,
    },
    checks: input.checks.map((name) => ({ name, status: "passed" })),
    evidencePolicy: {
      credentialsStored: false,
      tokensStored: false,
      emailsStored: false,
      workspaceIdentifiersStored: false,
      rawRowsStored: false,
      parcelValuesStored: false,
      sourceSecretStored: false,
      modelTrainingPermitted: false,
    },
  };
}

async function main() {
  const manifest = validatePilotManifest({
    sourceInventoryId: process.env.PILOT_SOURCE_INVENTORY_ID,
    logicalDatasetId: process.env.PILOT_LOGICAL_DATASET_ID,
    sourceAuthority: process.env.PILOT_SOURCE_AUTHORITY,
    rightsReference: process.env.PILOT_RIGHTS_REFERENCE,
    rightsBasis: process.env.PILOT_RIGHTS_BASIS,
    sourceAsOf: process.env.PILOT_SOURCE_AS_OF,
    expectedSha256: process.env.PILOT_DATASET_SHA256,
    trainingPermitted: process.env.PILOT_TRAINING_PERMITTED,
    ownerIdentityConfirmed: process.env.PILOT_OWNER_IDENTITY_CONFIRMED === "true",
    rightsConfirmed: process.env.PILOT_RIGHTS_CONFIRMED === "true",
    piiMinimizationConfirmed: process.env.PILOT_PII_MINIMIZATION_CONFIRMED === "true",
    noTrainingConfirmed: process.env.PILOT_NO_TRAINING_CONFIRMED === "true",
  });
  const inventory = JSON.parse(await readFile("docs/engine/data-source-inventory.json", "utf8"));
  const inventorySource = validateInventorySource(inventory, manifest);
  const repository = requiredHttpsUrl(process.env.LIVE_REPOSITORY_URL, "repository URL");
  const revision = requiredRevision(process.env.LIVE_SOURCE_REVISION);
  const workflowRun = requiredHttpsUrl(process.env.LIVE_WORKFLOW_RUN_URL, "workflow run URL");
  if (!workflowRun.startsWith(`${repository}/actions/runs/`)) throw new Error("Workflow run URL must belong to the source repository.");
  const ownerEmail = requiredText(process.env.CHATGPT_PILOT_EMAIL, "pilot owner email", 320).toLowerCase();
  const mongoUri = requiredText(process.env.MONGODB_URI, "MongoDB URI", 4096);
  const receiptPath = requiredText(process.env.PILOT_RECEIPT_PATH, "pilot receipt path", 500);
  const raw = decodeAndVerifyPilotData(process.env.CHATGPT_PILOT_DATA_B64, manifest.expectedSha256);
  const minimized = minimizePilotCsv(raw);
  const datasetSha256 = sha256(raw);
  const sourceLabel = sourceLabelForPilot(manifest, datasetSha256);
  const retentionUntil = new Date(Date.now() + manifest.retentionDays * 24 * 60 * 60_000).toISOString();

  let idempotentReuse = false;
  let scoredRecordCount = 0;
  const checks = [
    "operator_attestations",
    "inventory_source_gate",
    "source_as_of_freshness",
    "dataset_hash_match",
    "bounded_csv_parse",
    "field_minimization",
    "no_training",
    "single_owner_workspace",
  ];

  try {
    await connectMongo({ uri: mongoUri, dbName: "tax_lien_chatgpt_staging", serverSelectionTimeoutMs: 10_000 });
    const owner = await UserModel.findOne({ email: ownerEmail }).lean();
    if (!owner) throw new Error("The provisioned pilot owner was not found.");
    const ownerUserId = String(owner._id);
    const memberships = await WorkspaceMembershipModel.find({ userId: ownerUserId, status: "active" }).lean();
    if (memberships.length !== 1 || memberships[0]?.role !== "owner") {
      throw new Error("Pilot owner must have exactly one active owner workspace.");
    }
    const workspace = await WorkspaceModel.findOne({ _id: memberships[0].workspaceId, ownerUserId }).lean();
    if (!workspace) throw new Error("Pilot workspace ownership could not be verified.");

    const otherActiveJobs = await InternalJobModel.countDocuments({ status: { $in: ["queued", "running"] } });
    if (otherActiveJobs !== 0) throw new Error("Protected pilot ingestion refuses to run while another internal job is active.");

    let dataset = await DatasetModel.findOne({ userId: ownerUserId, sourceLabel }).lean();
    if (!dataset) {
      const { createDatasetService } = await import("../../apps/api/dist/datasets/factory.js");
      const datasetService = createDatasetService();
      const created = await datasetService.createDataset({
        userId: ownerUserId,
        sourceLabel,
        file: {
          originalname: `${manifest.logicalDatasetId}.csv`,
          mimetype: "text/csv",
          size: minimized.buffer.length,
          buffer: minimized.buffer,
        },
      });
      dataset = await DatasetModel.findById(created.dataset.id).lean();
      if (!dataset) throw new Error("Pilot dataset persistence could not be verified.");
    } else {
      idempotentReuse = true;
    }

    const datasetId = String(dataset._id);
    scoredRecordCount = await ScoredRecordModel.countDocuments({ userId: ownerUserId, datasetId });
    if (scoredRecordCount === 0) {
      const { createInternalJobService } = await import("../../apps/api/dist/jobs/factory.js");
      const { createScoringService } = await import("../../apps/api/dist/scoring/factory.js");
      const internalJobService = createInternalJobService();
      const scoringService = createScoringService(internalJobService);
      await scoringService.scoreDataset(datasetId, ownerUserId);
      await disconnectMongo();

      const worker = spawnSync(process.execPath, ["apps/api/dist/worker.js", "--once"], {
        cwd: process.cwd(),
        stdio: "ignore",
        env: {
          ...process.env,
          NODE_ENV: "test",
          MONGODB_URI: mongoUri,
          MONGODB_DB_NAME: "tax_lien_chatgpt_staging",
          INTELLIGENCE_SERVICE_ENABLED: "false",
          CENSUS_GEOCODER_ENABLED: "false",
          EMAIL_DELIVERY_ENABLED: "false",
          MAINTENANCE_AUTO_REFRESH_ENABLED: "false",
          OPERATIONAL_LOGGING_ENABLED: "false",
        },
      });
      if (worker.status !== 0) throw new Error("Protected pilot scoring worker did not complete successfully.");

      await connectMongo({ uri: mongoUri, dbName: "tax_lien_chatgpt_staging", serverSelectionTimeoutMs: 10_000 });
      const latestJob = await InternalJobModel.findOne({ userId: ownerUserId, targetEntityId: datasetId, type: "dataset_scoring" })
        .sort({ createdAt: -1 })
        .lean();
      if (!latestJob || latestJob.status !== "completed") throw new Error("Pilot dataset scoring job did not reach completed state.");
      scoredRecordCount = await ScoredRecordModel.countDocuments({ userId: ownerUserId, datasetId });
    }

    if (scoredRecordCount !== minimized.rowCount) throw new Error("Scored record count does not match the minimized pilot row count.");
    checks.push("existing_dataset_service", "existing_scoring_service", "scoring_count_parity", "idempotent_dataset_key");
  } finally {
    await disconnectMongo();
  }

  const receipt = buildSanitizedReceipt({
    observedAt: new Date().toISOString(),
    repository,
    revision,
    workflowRun,
    manifest,
    inventorySource,
    retentionUntil,
    datasetSha256,
    rawBytes: raw.length,
    minimized,
    idempotentReuse,
    scoredRecordCount,
    checks,
  });
  await mkdir(path.dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  process.stdout.write(`Protected real-data pilot passed: ${minimized.rowCount} minimized rows, ${scoredRecordCount} scored records.\n`);
}

function normalizeHeader(value) {
  return String(value).trim().toLowerCase().replaceAll(/[_\s-]+/gu, " ");
}

function findHeaderIndex(headers, aliases) {
  const accepted = new Set(aliases.map(normalizeHeader));
  return headers.findIndex((header) => accepted.has(normalizeHeader(header)));
}

function sanitizeCell(value) {
  return String(value).replaceAll(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, "").trim().slice(0, 255);
}

function csvEscape(value) {
  const text = String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function requiredText(value, label, maxLength) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  if (text.length > maxLength) throw new Error(`${label} is too long.`);
  return text;
}

function requiredLogicalId(value) {
  const text = requiredText(value, "logical dataset id", 80);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/u.test(text)) {
    throw new Error("logical dataset id must use only letters, numbers, dot, underscore, or hyphen.");
  }
  return text;
}

function requiredIsoDate(value, label) {
  const text = requiredText(value, label, 80);
  const time = Date.parse(text);
  if (!Number.isFinite(time)) throw new Error(`${label} must be an ISO date or timestamp.`);
  return new Date(time);
}

function requiredRevision(value) {
  const revision = requiredText(value, "source revision", 40).toLowerCase();
  if (!/^[0-9a-f]{40}$/u.test(revision)) throw new Error("Source revision must be a full Git commit SHA.");
  return revision;
}

function requiredHttpsUrl(value, label) {
  const text = requiredText(value, label, 500);
  const url = new URL(text);
  if (url.protocol !== "https:") throw new Error(`${label} must use HTTPS.`);
  return url.toString().replace(/\/$/u, "");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "Protected real-data pilot failed.";
    console.error(message);
    process.exitCode = 1;
  });
}
