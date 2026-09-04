import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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

class ControlledRecoveryError extends Error {
  constructor(code) {
    super(code);
    this.name = "ControlledRecoveryError";
    this.code = code;
  }
}

const receiptPath = resolve(
  process.env.PILOT_CREDENTIAL_RECOVERY_RECEIPT_PATH ??
    "artifacts/chatgpt-staging-pilot-credential-recovery-receipt.json",
);

try {
  const mongoUri = requireTrimmedSecret("MONGODB_URI");
  const requestedEmail = requirePilotEmail("CHATGPT_PILOT_EMAIL");
  const requestedPasswordHash = requirePilotPasswordHash("CHATGPT_PILOT_PASSWORD_HASH");
  await connectMongo({
    uri: mongoUri,
    dbName: "tax_lien_chatgpt_staging",
    serverSelectionTimeoutMs: 15_000,
  });

  const [users, workspaces, memberships] = await Promise.all([
    UserModel.find({}).exec(),
    WorkspaceModel.find({}).exec(),
    WorkspaceMembershipModel.find({}).exec(),
  ]);
  assertControlled(users.length === 1, "pilot_recovery_user_boundary_mismatch");
  assertControlled(workspaces.length === 1, "pilot_recovery_workspace_boundary_mismatch");
  assertControlled(memberships.length === 1, "pilot_recovery_membership_boundary_mismatch");

  const user = users[0];
  const workspace = workspaces[0];
  const membership = memberships[0];
  assertControlled(user && workspace && membership, "pilot_recovery_boundary_incomplete");
  assertControlled(
    workspace.name === "Maricopa Pilot Workspace",
    "pilot_recovery_workspace_name_mismatch",
  );
  assertControlled(
    workspace.ownerUserId === user.id,
    "pilot_recovery_workspace_owner_mismatch",
  );
  assertControlled(
    membership.workspaceId === workspace.id &&
      membership.userId === user.id &&
      membership.role === "owner" &&
      membership.status === "active" &&
      membership.isDefault === true &&
      membership.addedByUserId === user.id,
    "pilot_recovery_membership_role_mismatch",
  );

  const identityAction = user.email === requestedEmail ? "verified_existing" : "changed";
  const credentialAction =
    user.passwordHash === requestedPasswordHash ? "verified_existing" : "rotated";
  const revokedAt = new Date();
  const [authorizationCodes, grants, refreshTokens] = await Promise.all([
    OAuthAuthorizationCodeModel.deleteMany({ userId: user.id }).exec(),
    OAuthGrantModel.updateMany(
      { userId: user.id, revokedAt: { $exists: false } },
      { $set: { revokedAt } },
    ).exec(),
    OAuthRefreshTokenModel.updateMany(
      { userId: user.id, revokedAt: { $exists: false } },
      { $set: { revokedAt } },
    ).exec(),
  ]);
  if (identityAction === "changed" || credentialAction === "rotated") {
    const update = await UserModel.updateOne(
      { _id: user._id, email: user.email, passwordHash: user.passwordHash },
      { $set: { email: requestedEmail, passwordHash: requestedPasswordHash } },
    ).exec();
    assertControlled(
      update.matchedCount === 1 && update.modifiedCount === 1,
      "pilot_recovery_concurrent_change",
    );
  }

  const [recoveredUsers, recoveredWorkspaces, recoveredMemberships] = await Promise.all([
    UserModel.find({}).exec(),
    WorkspaceModel.find({}).exec(),
    WorkspaceMembershipModel.find({}).exec(),
  ]);
  const recoveredUser = recoveredUsers[0];
  assertControlled(
    recoveredUsers.length === 1 &&
      recoveredUser?.id === user.id &&
      recoveredUser.email === requestedEmail &&
      recoveredUser.passwordHash === requestedPasswordHash,
    "pilot_recovery_verification_failed",
  );
  assertControlled(
    recoveredWorkspaces.length === 1 && recoveredWorkspaces[0]?.ownerUserId === user.id,
    "pilot_recovery_workspace_changed",
  );
  assertControlled(
    recoveredMemberships.length === 1 &&
      recoveredMemberships[0]?.workspaceId === workspace.id &&
      recoveredMemberships[0]?.userId === user.id &&
      recoveredMemberships[0]?.role === "owner" &&
      recoveredMemberships[0]?.status === "active" &&
      recoveredMemberships[0]?.isDefault === true,
    "pilot_recovery_membership_changed",
  );

  const receipt = {
    schemaVersion: "1.0.0",
    receiptKind: "chatgpt_private_staging_pilot_credential_recovery",
    status: "passed",
    observedAt: new Date().toISOString(),
    source: {
      repository: process.env.GITHUB_REPOSITORY
        ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
        : "https://github.com/AyobamiH/tax-lien-intelligence-platform",
      revision: process.env.LIVE_SOURCE_REVISION ?? null,
      workflowRun: process.env.LIVE_WORKFLOW_RUN_URL ?? null,
    },
    principal: {
      classification: "dedicated_private_pilot_owner",
      identityAction,
      credentialAction,
      userIdentifierPreserved: true,
      workspaceIdentifierPreserved: true,
      membershipIdentifierPreserved: true,
      role: "owner",
    },
    controls: {
      publicRegistrationOpened: false,
      plaintextCredentialProcessed: false,
      exactPersistentUserCount: recoveredUsers.length,
      exactWorkspaceCount: recoveredWorkspaces.length,
      exactWorkspaceMembershipCount: recoveredMemberships.length,
      ownerWorkspacePreserved: true,
      ownerMembershipPreserved: true,
      pendingAuthorizationCodesInvalidated: authorizationCodes.deletedCount,
      activeOAuthGrantsRevoked: grants.modifiedCount,
      activeRefreshTokensRevoked: refreshTokens.modifiedCount,
    },
    authoritativeIdentityStorage: {
      normalizedEmailStored: true,
      bcryptPasswordHashStored: true,
      plaintextPasswordStored: false,
    },
    evidencePolicy: {
      emailStoredInReceipt: false,
      passwordStoredInReceipt: false,
      passwordHashStoredInReceipt: false,
      databaseIdentifierStored: false,
      workspaceIdentifierStored: false,
      credentialStoredInReceipt: false,
    },
  };

  await mkdir(dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  console.log("Private staging pilot owner credentials recovered; sanitized receipt written.");
} catch (error) {
  const code =
    error instanceof ControlledRecoveryError
      ? error.code
      : "pilot_credential_recovery_unexpected_failure";
  console.error(JSON.stringify({ status: "failed", code }));
  process.exitCode = 1;
} finally {
  await disconnectMongo();
}

function requireTrimmedSecret(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new ControlledRecoveryError("pilot_recovery_required_secret_missing");
  return value;
}

function requireExactSecret(name) {
  const value = process.env[name];
  if (!value) throw new ControlledRecoveryError("pilot_recovery_required_secret_missing");
  return value;
}

function requirePilotEmail(name) {
  const value = requireTrimmedSecret(name).toLowerCase();
  if (value.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) {
    throw new ControlledRecoveryError("pilot_recovery_email_invalid");
  }
  return value;
}

function requirePilotPasswordHash(name) {
  const value = requireExactSecret(name);
  const match = /^\$2[ab]\$(\d{2})\$[./A-Za-z0-9]{53}$/u.exec(value);
  const cost = match ? Number(match[1]) : Number.NaN;
  if (!match || cost < 12 || cost > 14) {
    throw new ControlledRecoveryError("pilot_recovery_password_hash_invalid");
  }
  return value;
}

function assertControlled(condition, code) {
  if (!condition) throw new ControlledRecoveryError(code);
}
