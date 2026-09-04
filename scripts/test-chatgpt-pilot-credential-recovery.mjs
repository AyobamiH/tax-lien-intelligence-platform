import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import bcrypt from "bcryptjs";
import {
  OAuthAuthorizationCodeModel,
  OAuthGrantModel,
  OAuthRefreshTokenModel,
  UserModel,
  WorkspaceMembershipModel,
  WorkspaceModel,
  connectMongo,
  disconnectMongo,
} from "../packages/db/dist/index.js";

const execFileAsync = promisify(execFile);
const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const databaseName = "tax_lien_chatgpt_staging";
const oldEmail = "uncontrolled-pilot-owner@example.test";
const recoveredEmail = "controlled-pilot-owner@example.test";
const oldPasswordHash = await bcrypt.hash("UnretainedFixturePassword123", 12);
const recoveredPasswordHash = await bcrypt.hash("RetainedFixturePassword456", 12);
const recovererPath = resolve("scripts/recover-chatgpt-staging-pilot-credentials.mjs");
const temporaryDirectory = await mkdtemp(join(tmpdir(), "tax-lien-pilot-recovery-"));

try {
  await connectMongo({ uri: mongoUri, dbName: databaseName, serverSelectionTimeoutMs: 15_000 });

  await resetDatabase();
  const seeded = await seedExactOwnerBoundary();
  await seedOAuthArtifacts(seeded.userId);
  const recoveryReceiptPath = join(temporaryDirectory, "recovered.json");
  await runRecoverer({ receiptPath: recoveryReceiptPath });
  const recovered = await assertRecoveredOwnerBoundary(seeded);
  await assertOAuthArtifactsInvalidated(seeded.userId);
  const recoveryReceipt = JSON.parse(await readFile(recoveryReceiptPath, "utf8"));
  assert(recoveryReceipt.principal.identityAction === "changed", "recovery must record identity change");
  assert(recoveryReceipt.principal.credentialAction === "rotated", "recovery must record credential rotation");
  assert(recoveryReceipt.controls.pendingAuthorizationCodesInvalidated === 1, "recovery must invalidate pending codes");
  assert(recoveryReceipt.controls.activeOAuthGrantsRevoked === 1, "recovery must revoke active grants");
  assert(recoveryReceipt.controls.activeRefreshTokensRevoked === 1, "recovery must revoke refresh tokens");
  assertSanitizedReceipt(recoveryReceipt);

  const repeatedReceiptPath = join(temporaryDirectory, "repeated.json");
  await runRecoverer({ receiptPath: repeatedReceiptPath });
  await assertRecoveredOwnerBoundary({ ...seeded, userId: recovered.id });
  const repeatedReceipt = JSON.parse(await readFile(repeatedReceiptPath, "utf8"));
  assert(repeatedReceipt.principal.identityAction === "verified_existing", "recovery rerun must be idempotent");
  assert(repeatedReceipt.principal.credentialAction === "verified_existing", "credential rerun must be idempotent");

  await resetDatabase();
  await expectControlledFailure("pilot_recovery_user_boundary_mismatch");

  await resetDatabase();
  await seedExactOwnerBoundary();
  await UserModel.create({ email: "second-owner@example.test", passwordHash: oldPasswordHash });
  await expectControlledFailure("pilot_recovery_user_boundary_mismatch");
  assert(await UserModel.countDocuments({ email: recoveredEmail }) === 0, "multi-user failure must not mutate identity");

  await resetDatabase();
  const wrongWorkspace = await seedExactOwnerBoundary();
  await WorkspaceModel.updateOne(
    { _id: wrongWorkspace.workspaceId },
    { $set: { name: "Unexpected Workspace" } },
  ).exec();
  await expectControlledFailure("pilot_recovery_workspace_name_mismatch");

  await resetDatabase();
  const wrongMembership = await seedExactOwnerBoundary();
  await WorkspaceMembershipModel.updateOne(
    { _id: wrongMembership.membershipId },
    { $set: { role: "member", isDefault: false } },
  ).exec();
  await expectControlledFailure("pilot_recovery_membership_role_mismatch");

  await resetDatabase();
  await seedExactOwnerBoundary();
  await expectControlledFailure("pilot_recovery_email_invalid", {
    email: "not-an-email",
  });
  await expectControlledFailure("pilot_recovery_password_hash_invalid", {
    passwordHash: "not-a-bcrypt-hash",
  });

  console.log("ChatGPT private-pilot credential-recovery integration checks passed.");
} finally {
  await resetDatabase();
  await disconnectMongo();
  await rm(temporaryDirectory, { recursive: true, force: true });
}

async function seedExactOwnerBoundary() {
  const user = await UserModel.create({ email: oldEmail, passwordHash: oldPasswordHash });
  const workspace = await WorkspaceModel.create({
    name: "Maricopa Pilot Workspace",
    ownerUserId: user.id,
  });
  const membership = await WorkspaceMembershipModel.create({
    workspaceId: workspace.id,
    userId: user.id,
    role: "owner",
    status: "active",
    isDefault: true,
    addedByUserId: user.id,
    joinedAt: user.createdAt,
  });
  return { userId: user.id, workspaceId: workspace.id, membershipId: membership.id };
}

async function assertRecoveredOwnerBoundary(expected) {
  const [users, workspaces, memberships] = await Promise.all([
    UserModel.find({}).exec(),
    WorkspaceModel.find({}).exec(),
    WorkspaceMembershipModel.find({}).exec(),
  ]);
  const user = users[0];
  assert(users.length === 1 && user, "recovery must preserve exactly one user");
  assert(user.id === expected.userId, "recovery must preserve the user identifier");
  assert(user.email === recoveredEmail, "recovery must apply the controlled email");
  assert(user.passwordHash === recoveredPasswordHash, "recovery must apply the controlled hash");
  assert(workspaces.length === 1 && workspaces[0]?.id === expected.workspaceId, "workspace must be preserved");
  assert(workspaces[0]?.ownerUserId === user.id, "workspace owner must remain the pilot user");
  assert(memberships.length === 1 && memberships[0]?.id === expected.membershipId, "membership must be preserved");
  assert(memberships[0]?.workspaceId === expected.workspaceId, "membership workspace must be preserved");
  assert(memberships[0]?.userId === user.id, "membership user must be preserved");
  assert(memberships[0]?.role === "owner", "membership role must remain owner");
  assert(memberships[0]?.status === "active", "membership must remain active");
  assert(memberships[0]?.isDefault === true, "membership must remain default");
  return user;
}

async function seedOAuthArtifacts(userId) {
  const expiresAt = new Date(Date.now() + 60_000);
  await OAuthAuthorizationCodeModel.create({
    codeHash: "recovery-test-code-hash",
    userId,
    email: oldEmail,
    clientId: "https://chatgpt.com/oauth/client.json",
    redirectUri: "https://chatgpt.com/connector_platform_oauth_redirect",
    codeChallenge: "recovery-test-code-challenge",
    resource: "https://tax-lien-chatgpt-staging.example.test/mcp",
    scopes: ["tax_lien:read"],
    expiresAt,
  });
  await OAuthGrantModel.create({
    grantId: "recovery-test-grant",
    userId,
    email: oldEmail,
    clientId: "https://chatgpt.com/oauth/client.json",
    resource: "https://tax-lien-chatgpt-staging.example.test/mcp",
    scopes: ["tax_lien:read"],
    currentRefreshTokenHash: "recovery-test-refresh-hash",
    refreshExpiresAt: expiresAt,
    purgeAt: expiresAt,
  });
  await OAuthRefreshTokenModel.create({
    tokenHash: "recovery-test-refresh-hash",
    familyId: "recovery-test-grant",
    userId,
    email: oldEmail,
    clientId: "https://chatgpt.com/oauth/client.json",
    resource: "https://tax-lien-chatgpt-staging.example.test/mcp",
    scopes: ["tax_lien:read"],
    expiresAt,
  });
}

async function assertOAuthArtifactsInvalidated(userId) {
  const [codeCount, activeGrantCount, activeRefreshTokenCount] = await Promise.all([
    OAuthAuthorizationCodeModel.countDocuments({ userId }).exec(),
    OAuthGrantModel.countDocuments({ userId, revokedAt: { $exists: false } }).exec(),
    OAuthRefreshTokenModel.countDocuments({ userId, revokedAt: { $exists: false } }).exec(),
  ]);
  assert(codeCount === 0, "recovery must remove pending authorization codes");
  assert(activeGrantCount === 0, "recovery must revoke every active OAuth grant");
  assert(activeRefreshTokenCount === 0, "recovery must revoke every active refresh token");
}

async function runRecoverer({
  receiptPath,
  email = recoveredEmail,
  passwordHash = recoveredPasswordHash,
} = {}) {
  return execFileAsync(process.execPath, [recovererPath], {
    env: {
      ...process.env,
      MONGODB_URI: mongoUri,
      CHATGPT_PILOT_EMAIL: email,
      CHATGPT_PILOT_PASSWORD_HASH: passwordHash,
      PILOT_CREDENTIAL_RECOVERY_RECEIPT_PATH:
        receiptPath ?? join(temporaryDirectory, "unused.json"),
      LIVE_SOURCE_REVISION: "credential-recovery-integration-test",
    },
  });
}

async function expectControlledFailure(expectedCode, overrides = {}) {
  try {
    await runRecoverer(overrides);
    throw new Error(`expected controlled failure ${expectedCode}`);
  } catch (error) {
    const stdout = typeof error?.stdout === "string" ? error.stdout : "";
    const stderr = typeof error?.stderr === "string" ? error.stderr : "";
    const output = `${stdout}\n${stderr}`;
    assert(output.includes(`"code":"${expectedCode}"`), `expected controlled failure ${expectedCode}`);
    for (const forbidden of [oldEmail, recoveredEmail, oldPasswordHash, recoveredPasswordHash]) {
      assert(!output.includes(forbidden), "controlled failure must not expose identity material");
    }
  }
}

function assertSanitizedReceipt(receipt) {
  const serialized = JSON.stringify(receipt);
  for (const forbidden of [oldEmail, recoveredEmail, oldPasswordHash, recoveredPasswordHash]) {
    assert(!serialized.includes(forbidden), "receipt must not store identity material");
  }
  assert(receipt.controls.plaintextCredentialProcessed === false, "receipt must deny plaintext handling");
  assert(receipt.principal.userIdentifierPreserved === true, "receipt must prove stable user identity");
  assert(receipt.principal.workspaceIdentifierPreserved === true, "receipt must prove stable workspace identity");
  assert(receipt.principal.membershipIdentifierPreserved === true, "receipt must prove stable membership identity");
  assert(receipt.evidencePolicy.emailStoredInReceipt === false, "receipt must redact email");
  assert(receipt.evidencePolicy.passwordHashStoredInReceipt === false, "receipt must redact password hash");
}

async function resetDatabase() {
  if (UserModel.db.readyState === 1) await UserModel.db.dropDatabase();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
