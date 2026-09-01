import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  UserModel,
  WorkspaceMembershipModel,
  WorkspaceModel,
  connectMongo,
  disconnectMongo,
} from "../packages/db/dist/index.js";

class ControlledProvisioningError extends Error {
  constructor(code) {
    super(code);
    this.name = "ControlledProvisioningError";
    this.code = code;
  }
}

const receiptPath = resolve(
  process.env.PILOT_PROVISION_RECEIPT_PATH ?? "artifacts/chatgpt-staging-pilot-provision-receipt.json",
);

let userAction = "verified_existing";
let workspaceAction = "verified_existing";
let membershipAction = "verified_existing";

try {
  const mongoUri = requireTrimmedSecret("MONGODB_URI");
  const email = requirePilotEmail("CHATGPT_PILOT_EMAIL");
  const passwordHash = requirePilotPasswordHash("CHATGPT_PILOT_PASSWORD_HASH");
  await connectMongo({
    uri: mongoUri,
    dbName: "tax_lien_chatgpt_staging",
    serverSelectionTimeoutMs: 15_000,
  });

  const [initialUserCount, initialWorkspaceCount, initialMembershipCount] = await Promise.all([
    UserModel.countDocuments({}),
    WorkspaceModel.countDocuments({}),
    WorkspaceMembershipModel.countDocuments({}),
  ]);

  assertControlled(initialUserCount <= 1, "pilot_user_boundary_mismatch");
  assertControlled(initialWorkspaceCount <= 1, "pilot_workspace_boundary_mismatch");
  assertControlled(initialMembershipCount <= 1, "pilot_membership_boundary_mismatch");
  if (initialUserCount === 0) {
    assertControlled(initialWorkspaceCount === 0, "pilot_workspace_without_user");
    assertControlled(initialMembershipCount === 0, "pilot_membership_without_user");
  }

  let user = await UserModel.findOne({ email }).exec();
  if (!user) {
    assertControlled(initialUserCount === 0, "pilot_owner_identity_mismatch");
    user = await UserModel.create({ email, passwordHash });
    userAction = "created";
  } else {
    assertControlled(user.passwordHash === passwordHash, "pilot_credential_mismatch");
  }

  let workspace = await WorkspaceModel.findOne({ ownerUserId: user.id }).exec();
  if (!workspace) {
    assertControlled(initialWorkspaceCount === 0, "pilot_workspace_owner_mismatch");
    workspace = await WorkspaceModel.create({
      name: "Maricopa Pilot Workspace",
      ownerUserId: user.id,
    });
    workspaceAction = "created";
  }
  assertControlled(workspace.name === "Maricopa Pilot Workspace", "pilot_workspace_name_mismatch");

  let membership = await WorkspaceMembershipModel.findOne({
    workspaceId: workspace.id,
    userId: user.id,
  }).exec();
  if (!membership) {
    assertControlled(initialMembershipCount === 0, "pilot_membership_identity_mismatch");
    membership = await WorkspaceMembershipModel.create({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
      status: "active",
      isDefault: true,
      addedByUserId: user.id,
      joinedAt: user.createdAt,
    });
    membershipAction = "created";
  }

  assertControlled(
    membership.role === "owner" &&
      membership.status === "active" &&
      membership.isDefault === true &&
      membership.addedByUserId === user.id,
    "pilot_membership_role_mismatch",
  );

  const [finalUserCount, finalWorkspaceCount, finalMembershipCount] = await Promise.all([
    UserModel.countDocuments({}),
    WorkspaceModel.countDocuments({}),
    WorkspaceMembershipModel.countDocuments({}),
  ]);
  assertControlled(finalUserCount === 1, "pilot_user_boundary_mismatch");
  assertControlled(finalWorkspaceCount === 1, "pilot_workspace_boundary_mismatch");
  assertControlled(finalMembershipCount === 1, "pilot_membership_boundary_mismatch");

  const receipt = {
    schemaVersion: "1.0.0",
    receiptKind: "chatgpt_private_staging_pilot_provision",
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
      userAction,
      workspaceAction,
      membershipAction,
      role: "owner",
      workspacePurpose: "Maricopa evidence-backed shortlist evaluation",
    },
    controls: {
      publicRegistrationOpened: false,
      plaintextCredentialProcessed: false,
      existingCredentialRotated: false,
      exactPersistentUserCount: finalUserCount,
      exactWorkspaceCount: finalWorkspaceCount,
      exactWorkspaceMembershipCount: finalMembershipCount,
      sharedModelTrainingDefault: false,
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
  console.log("Private staging pilot owner provisioned; sanitized receipt written.");
} catch (error) {
  const code = error instanceof ControlledProvisioningError
    ? error.code
    : "pilot_provision_unexpected_failure";
  console.error(JSON.stringify({ status: "failed", code }));
  process.exitCode = 1;
} finally {
  await disconnectMongo();
}

function requireTrimmedSecret(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new ControlledProvisioningError("pilot_required_secret_missing");
  return value;
}

function requireExactSecret(name) {
  const value = process.env[name];
  if (!value) throw new ControlledProvisioningError("pilot_required_secret_missing");
  return value;
}

function requirePilotEmail(name) {
  const value = requireTrimmedSecret(name).toLowerCase();
  if (value.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) {
    throw new ControlledProvisioningError("pilot_email_invalid");
  }
  return value;
}

function requirePilotPasswordHash(name) {
  const value = requireExactSecret(name);
  const match = /^\$2[ab]\$(\d{2})\$[./A-Za-z0-9]{53}$/u.exec(value);
  const cost = match ? Number(match[1]) : Number.NaN;
  if (!match || cost < 12 || cost > 14) {
    throw new ControlledProvisioningError("pilot_password_hash_invalid");
  }
  return value;
}

function assertControlled(condition, code) {
  if (!condition) throw new ControlledProvisioningError(code);
}
