import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const workflow = await readFile(
  resolve(root, ".github/workflows/chatgpt-pilot-credential-recovery.yml"),
  "utf8",
);
const recoverer = await readFile(
  resolve(root, "scripts/recover-chatgpt-staging-pilot-credentials.mjs"),
  "utf8",
);
const integrationTest = await readFile(
  resolve(root, "scripts/test-chatgpt-pilot-credential-recovery.mjs"),
  "utf8",
);
const ciWorkflow = await readFile(resolve(root, ".github/workflows/ci.yml"), "utf8");
const packageManifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const errors = [];

const triggerBlock = workflow.slice(workflow.indexOf("on:"), workflow.indexOf("permissions:"));
const recoveryStepStart = workflow.indexOf("- name: Recover exact pilot owner credentials");
const recoveryStepEnd = workflow.indexOf("- name: Archive sanitized credential-recovery receipt");
const recoveryStep = workflow.slice(recoveryStepStart, recoveryStepEnd);

if (!triggerBlock.includes("workflow_dispatch:")) {
  errors.push("Pilot credential recovery must require explicit manual dispatch.");
}
for (const forbiddenTrigger of ["push:", "pull_request:", "schedule:", "workflow_call:"]) {
  if (triggerBlock.includes(forbiddenTrigger)) {
    errors.push(`Pilot credential recovery must not use the ${forbiddenTrigger} trigger.`);
  }
}
if (!workflow.includes("permissions:\n  contents: read")) {
  errors.push("Pilot credential-recovery permissions must remain read-only.");
}
if (!workflow.includes("environment: chatgpt-pilot-bootstrap")) {
  errors.push("Pilot credential recovery must reuse the protected bootstrap environment.");
}
if (!workflow.includes("group: chatgpt-private-staging")) {
  errors.push("Pilot credential recovery must serialize with private-staging operations.");
}
if (
  !workflow.includes("github.ref == format('refs/heads/{0}', github.event.repository.default_branch)") ||
  !workflow.includes("ref: ${{ github.event.repository.default_branch }}")
) {
  errors.push("Pilot credential recovery must execute trusted default-branch source only.");
}
for (const confirmation of [
  "credential_loss_confirmed:",
  "owner_identity_recovery_confirmed:",
  "password_ceremony_confirmed:",
  "inputs.credential_loss_confirmed",
  "inputs.owner_identity_recovery_confirmed",
  "inputs.password_ceremony_confirmed",
]) {
  if (!workflow.includes(confirmation)) {
    errors.push(`Pilot credential recovery is missing confirmation control: ${confirmation}.`);
  }
}
if (!workflow.includes("persist-credentials: false") || !workflow.includes("npm ci --ignore-scripts")) {
  errors.push("Pilot credential recovery must use a non-persistent, lifecycle-free checkout.");
}
if (/^    env:/mu.test(workflow)) {
  errors.push("Pilot credential-recovery secrets must never be job-scoped.");
}
for (const secret of ["MONGODB_URI", "CHATGPT_PILOT_EMAIL", "CHATGPT_PILOT_PASSWORD_HASH"]) {
  if (!recoveryStep.includes(`${secret}: \${{ secrets.${secret} }}`)) {
    errors.push(`${secret} must be scoped only to the exact recovery step.`);
  }
}
if (/CHATGPT_PILOT_PASSWORD(?!_HASH)/u.test(workflow + recoverer)) {
  errors.push("Plaintext pilot passwords must never enter credential-recovery source or CI.");
}
for (const requiredControl of [
  'requirePilotPasswordHash("CHATGPT_PILOT_PASSWORD_HASH")',
  'users.length === 1',
  'workspaces.length === 1',
  'memberships.length === 1',
  'workspace.name === "Maricopa Pilot Workspace"',
  'membership.role === "owner"',
  'membership.status === "active"',
  'membership.isDefault === true',
  'OAuthAuthorizationCodeModel.deleteMany({ userId: user.id })',
  'OAuthGrantModel.updateMany(',
  'OAuthRefreshTokenModel.updateMany(',
  'revokedAt: { $exists: false }',
  'update.matchedCount === 1 && update.modifiedCount === 1',
  'publicRegistrationOpened: false',
  'plaintextCredentialProcessed: false',
  'userIdentifierPreserved: true',
  'workspaceIdentifierPreserved: true',
  'membershipIdentifierPreserved: true',
  'emailStoredInReceipt: false',
  'passwordHashStoredInReceipt: false',
]) {
  if (!recoverer.includes(requiredControl)) {
    errors.push(`Pilot credential recoverer is missing required control: ${requiredControl}.`);
  }
}
for (const forbiddenBehavior of [
  "bcrypt.hash",
  "bcrypt.compare",
  "error.message",
  "console.log(requestedEmail",
  "console.error(requestedEmail",
]) {
  if (recoverer.includes(forbiddenBehavior)) {
    errors.push(`Pilot credential recoverer contains forbidden behavior: ${forbiddenBehavior}.`);
  }
}
for (const requiredCase of [
  "recovery must record identity change",
  "recovery must record credential rotation",
  "recovery must invalidate pending codes",
  "recovery must revoke active grants",
  "recovery must revoke refresh tokens",
  "recovery rerun must be idempotent",
  "pilot_recovery_user_boundary_mismatch",
  "pilot_recovery_workspace_name_mismatch",
  "pilot_recovery_membership_role_mismatch",
  "pilot_recovery_email_invalid",
  "pilot_recovery_password_hash_invalid",
  "recovery must preserve the user identifier",
  "recovery must remove pending authorization codes",
  "recovery must revoke every active OAuth grant",
  "receipt must not store identity material",
]) {
  if (!integrationTest.includes(requiredCase)) {
    errors.push(`Pilot credential-recovery integration coverage is missing: ${requiredCase}.`);
  }
}
if (
  packageManifest.scripts?.["validate:chatgpt-pilot-credential-recovery"] !==
    "node scripts/validate-chatgpt-pilot-credential-recovery.mjs" ||
  packageManifest.scripts?.["test:chatgpt-pilot-credential-recovery"] !==
    "node scripts/test-chatgpt-pilot-credential-recovery.mjs" ||
  packageManifest.scripts?.["recover:chatgpt-staging:pilot-credentials"] !==
    "node scripts/recover-chatgpt-staging-pilot-credentials.mjs"
) {
  errors.push("Pilot credential-recovery scripts must remain pinned in package.json.");
}
for (const command of [
  "npm run validate:chatgpt-pilot-credential-recovery",
  "npm run test:chatgpt-pilot-credential-recovery",
]) {
  if (!ciWorkflow.includes(command)) {
    errors.push(`CI must enforce the credential-recovery command: ${command}.`);
  }
}

if (errors.length > 0) {
  console.error("ChatGPT private-pilot credential-recovery validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "ChatGPT private-pilot credential-recovery validation passed for a manual, default-branch-only, exact-owner rotation.",
);
