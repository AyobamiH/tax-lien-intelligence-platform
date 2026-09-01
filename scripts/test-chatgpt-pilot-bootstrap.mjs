import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import bcrypt from "bcryptjs";
import {
  UserModel,
  WorkspaceMembershipModel,
  WorkspaceModel,
  connectMongo,
  disconnectMongo,
} from "../packages/db/dist/index.js";

const execFileAsync = promisify(execFile);
const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const databaseName = "tax_lien_chatgpt_staging";
const targetEmail = "private-pilot-owner@example.test";
const targetPasswordHash = await bcrypt.hash("PilotFixturePassword123", 12);
const alternatePasswordHash = await bcrypt.hash("PilotFixturePassword456", 12);
const provisionerPath = resolve("scripts/provision-chatgpt-staging-pilot.mjs");
const temporaryDirectory = await mkdtemp(join(tmpdir(), "tax-lien-pilot-bootstrap-"));

try {
  await connectMongo({ uri: mongoUri, dbName: databaseName, serverSelectionTimeoutMs: 15_000 });

  await resetDatabase();
  const createdReceiptPath = join(temporaryDirectory, "created.json");
  await runProvisioner({ receiptPath: createdReceiptPath });
  await assertExactOwnerBoundary(targetPasswordHash);
  const createdReceipt = JSON.parse(await readFile(createdReceiptPath, "utf8"));
  assert(createdReceipt.principal.userAction === "created", "empty bootstrap must create the owner");
  assert(createdReceipt.principal.workspaceAction === "created", "empty bootstrap must create the workspace");
  assert(createdReceipt.principal.membershipAction === "created", "empty bootstrap must create membership");
  assertSanitizedReceipt(createdReceipt);

  const repeatedReceiptPath = join(temporaryDirectory, "repeated.json");
  await runProvisioner({ receiptPath: repeatedReceiptPath });
  await assertExactOwnerBoundary(targetPasswordHash);
  const repeatedReceipt = JSON.parse(await readFile(repeatedReceiptPath, "utf8"));
  assert(repeatedReceipt.principal.userAction === "verified_existing", "rerun must be idempotent");
  assert(repeatedReceipt.principal.workspaceAction === "verified_existing", "workspace rerun must be idempotent");
  assert(repeatedReceipt.principal.membershipAction === "verified_existing", "membership rerun must be idempotent");

  await resetDatabase();
  await UserModel.create({ email: targetEmail, passwordHash: targetPasswordHash });
  const recoveredReceiptPath = join(temporaryDirectory, "recovered.json");
  await runProvisioner({ receiptPath: recoveredReceiptPath });
  await assertExactOwnerBoundary(targetPasswordHash);
  const recoveredReceipt = JSON.parse(await readFile(recoveredReceiptPath, "utf8"));
  assert(recoveredReceipt.principal.userAction === "verified_existing", "partial recovery must retain owner");
  assert(recoveredReceipt.principal.workspaceAction === "created", "partial recovery must create workspace");
  assert(recoveredReceipt.principal.membershipAction === "created", "partial recovery must create membership");

  await resetDatabase();
  await UserModel.create({ email: "foreign-owner@example.test", passwordHash: targetPasswordHash });
  await expectControlledFailure("pilot_owner_identity_mismatch");
  assert(await UserModel.countDocuments({}) === 1, "foreign identity failure must not mutate users");
  assert(await WorkspaceModel.countDocuments({}) === 0, "foreign identity failure must not create workspace");

  await resetDatabase();
  await UserModel.create({ email: targetEmail, passwordHash: alternatePasswordHash });
  await expectControlledFailure("pilot_credential_mismatch");
  assert(await WorkspaceModel.countDocuments({}) === 0, "credential drift failure must not create workspace");

  await resetDatabase();
  const wrongNameUser = await UserModel.create({ email: targetEmail, passwordHash: targetPasswordHash });
  await WorkspaceModel.create({ name: "Unexpected Workspace", ownerUserId: wrongNameUser.id });
  await expectControlledFailure("pilot_workspace_name_mismatch");
  assert(await WorkspaceMembershipModel.countDocuments({}) === 0, "workspace-name drift must not create membership");

  await resetDatabase();
  await seedExactOwnerBoundary();
  await WorkspaceModel.create({ name: "Unexpected Workspace", ownerUserId: "unexpected-owner-id" });
  await expectControlledFailure("pilot_workspace_boundary_mismatch");
  assert(await WorkspaceModel.countDocuments({}) === 2, "workspace drift failure must not mutate workspaces");

  await resetDatabase();
  const seeded = await seedExactOwnerBoundary();
  await WorkspaceMembershipModel.create({
    workspaceId: "unexpected-workspace-id",
    userId: seeded.user.id,
    role: "member",
    status: "active",
    isDefault: false,
    addedByUserId: seeded.user.id,
    joinedAt: seeded.user.createdAt,
  });
  await expectControlledFailure("pilot_membership_boundary_mismatch");
  assert(await WorkspaceMembershipModel.countDocuments({}) === 2, "membership drift failure must not mutate memberships");

  await resetDatabase();
  const membershipDrift = await seedExactOwnerBoundary();
  await WorkspaceMembershipModel.updateOne(
    { _id: membershipDrift.membership.id },
    { $set: { addedByUserId: "unexpected-adder-id" } },
  ).exec();
  await expectControlledFailure("pilot_membership_role_mismatch");

  await expectControlledFailure("pilot_password_hash_invalid", "not-a-bcrypt-hash");

  console.log("ChatGPT private-pilot bootstrap integration checks passed.");
} finally {
  await resetDatabase();
  await disconnectMongo();
  await rm(temporaryDirectory, { recursive: true, force: true });
}

async function seedExactOwnerBoundary() {
  const user = await UserModel.create({ email: targetEmail, passwordHash: targetPasswordHash });
  const workspace = await WorkspaceModel.create({ name: "Maricopa Pilot Workspace", ownerUserId: user.id });
  const membership = await WorkspaceMembershipModel.create({
    workspaceId: workspace.id,
    userId: user.id,
    role: "owner",
    status: "active",
    isDefault: true,
    addedByUserId: user.id,
    joinedAt: user.createdAt,
  });
  return { user, workspace, membership };
}

async function assertExactOwnerBoundary(expectedHash) {
  const [users, workspaces, memberships] = await Promise.all([
    UserModel.find({}).lean().exec(),
    WorkspaceModel.find({}).lean().exec(),
    WorkspaceMembershipModel.find({}).lean().exec(),
  ]);
  assert(users.length === 1, "exactly one pilot user must exist");
  assert(workspaces.length === 1, "exactly one pilot workspace must exist");
  assert(memberships.length === 1, "exactly one pilot membership must exist");
  assert(users[0]?.email === targetEmail, "pilot email must match the requested owner");
  assert(users[0]?.passwordHash === expectedHash, "pilot password hash must not be rotated");
  assert(workspaces[0]?.ownerUserId === String(users[0]?._id), "workspace owner must match pilot user");
  assert(workspaces[0]?.name === "Maricopa Pilot Workspace", "workspace name must match pilot purpose");
  assert(memberships[0]?.role === "owner", "pilot membership must be owner");
  assert(memberships[0]?.status === "active", "pilot membership must be active");
  assert(memberships[0]?.isDefault === true, "pilot membership must be default");
  assert(memberships[0]?.addedByUserId === String(users[0]?._id), "owner must be the membership adder");
}

async function runProvisioner({ receiptPath, passwordHash = targetPasswordHash } = {}) {
  return execFileAsync(process.execPath, [provisionerPath], {
    env: {
      ...process.env,
      MONGODB_URI: mongoUri,
      CHATGPT_PILOT_EMAIL: targetEmail,
      CHATGPT_PILOT_PASSWORD_HASH: passwordHash,
      PILOT_PROVISION_RECEIPT_PATH: receiptPath ?? join(temporaryDirectory, "unused.json"),
      LIVE_SOURCE_REVISION: "bootstrap-integration-test",
    },
  });
}

async function expectControlledFailure(expectedCode, passwordHash = targetPasswordHash) {
  try {
    await runProvisioner({ passwordHash });
    throw new Error(`expected controlled failure ${expectedCode}`);
  } catch (error) {
    const stdout = typeof error?.stdout === "string" ? error.stdout : "";
    const stderr = typeof error?.stderr === "string" ? error.stderr : "";
    const output = `${stdout}\n${stderr}`;
    assert(output.includes(`\"code\":\"${expectedCode}\"`), `expected controlled failure ${expectedCode}`);
    assert(!output.includes(targetEmail), "controlled failure must not expose pilot email");
    assert(!output.includes(targetPasswordHash), "controlled failure must not expose pilot hash");
  }
}

function assertSanitizedReceipt(receipt) {
  const serialized = JSON.stringify(receipt);
  assert(!serialized.includes(targetEmail), "receipt must not store pilot email");
  assert(!serialized.includes(targetPasswordHash), "receipt must not store pilot password hash");
  assert(receipt.controls.plaintextCredentialProcessed === false, "receipt must deny plaintext handling");
  assert(receipt.authoritativeIdentityStorage.plaintextPasswordStored === false, "database must not store plaintext");
  assert(receipt.evidencePolicy.emailStoredInReceipt === false, "receipt policy must redact email");
  assert(receipt.evidencePolicy.passwordHashStoredInReceipt === false, "receipt policy must redact password hash");
  assert(receipt.controls.exactPersistentUserCount === 1, "receipt must prove one persistent user");
  assert(receipt.controls.exactWorkspaceCount === 1, "receipt must prove one workspace");
  assert(receipt.controls.exactWorkspaceMembershipCount === 1, "receipt must prove one membership");
}

async function resetDatabase() {
  if (UserModel.db.readyState === 1) await UserModel.db.dropDatabase();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
