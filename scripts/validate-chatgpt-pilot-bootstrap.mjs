import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const workflow = await readFile(
  resolve(root, ".github/workflows/chatgpt-pilot-provision.yml"),
  "utf8",
);
const provisioner = await readFile(
  resolve(root, "scripts/provision-chatgpt-staging-pilot.mjs"),
  "utf8",
);
const integrationTest = await readFile(
  resolve(root, "scripts/test-chatgpt-pilot-bootstrap.mjs"),
  "utf8",
);
const ciWorkflow = await readFile(resolve(root, ".github/workflows/ci.yml"), "utf8");
const packageManifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const errors = [];

const triggerBlock = workflow.slice(workflow.indexOf("on:"), workflow.indexOf("permissions:"));
const provisionStepStart = workflow.indexOf("- name: Provision or verify exact first owner");
const provisionStepEnd = workflow.indexOf("- name: Archive sanitized provisioning receipt");
const provisionStep = workflow.slice(provisionStepStart, provisionStepEnd);

if (!triggerBlock.includes("workflow_dispatch:")) {
  errors.push("Pilot provisioning must require an explicit manual dispatch.");
}
for (const forbiddenTrigger of ["push:", "pull_request:", "schedule:", "workflow_call:"]) {
  if (triggerBlock.includes(forbiddenTrigger)) {
    errors.push(`Pilot provisioning must not use the ${forbiddenTrigger} trigger.`);
  }
}
if (!workflow.includes("permissions:\n  contents: read")) {
  errors.push("Pilot provisioning permissions must remain read-only.");
}
if (!workflow.includes("environment: chatgpt-pilot-bootstrap")) {
  errors.push("Pilot provisioning must remain isolated in its dedicated protected environment.");
}
if (!workflow.includes("group: chatgpt-private-staging")) {
  errors.push("Pilot provisioning must serialize with private-staging deployment and verification.");
}
if (
  !workflow.includes("github.ref == format('refs/heads/{0}', github.event.repository.default_branch)") ||
  !workflow.includes("ref: ${{ github.event.repository.default_branch }}")
) {
  errors.push("Pilot provisioning must execute trusted default-branch source only.");
}
if (!workflow.includes("persist-credentials: false")) {
  errors.push("Pilot provisioning checkout credentials must not persist.");
}
if (!workflow.includes("npm ci --ignore-scripts")) {
  errors.push("Pilot provisioning must install locked dependencies without lifecycle scripts.");
}
for (const requiredCeremonyControl of [
  "owner_identity_confirmed:",
  "password_ceremony_confirmed:",
  "inputs.owner_identity_confirmed",
  "inputs.password_ceremony_confirmed",
]) {
  if (!workflow.includes(requiredCeremonyControl)) {
    errors.push(`Pilot workflow is missing operator ceremony control: ${requiredCeremonyControl}.`);
  }
}
if (/^    env:/mu.test(workflow)) {
  errors.push("Pilot secrets must never be scoped at the job level.");
}
for (const secret of ["MONGODB_URI", "CHATGPT_PILOT_EMAIL", "CHATGPT_PILOT_PASSWORD_HASH"]) {
  if (!provisionStep.includes(`${secret}: \${{ secrets.${secret} }}`)) {
    errors.push(`${secret} must be scoped only to the exact provisioning step.`);
  }
}
if (/CHATGPT_PILOT_PASSWORD(?!_HASH)/u.test(workflow + provisioner)) {
  errors.push("Plaintext pilot passwords must never enter source or CI.");
}
if (
  !workflow.includes("npm run validate:chatgpt-pilot-bootstrap") ||
  !workflow.includes("npm run provision:chatgpt-staging:pilot") ||
  !workflow.includes("chatgpt-staging-pilot-provision-receipt.json")
) {
  errors.push("The protected workflow must validate, provision, and archive a sanitized receipt.");
}
if (
  packageManifest.scripts?.["validate:chatgpt-pilot-bootstrap"] !==
    "node scripts/validate-chatgpt-pilot-bootstrap.mjs" ||
  packageManifest.scripts?.["test:chatgpt-pilot-bootstrap"] !==
    "node scripts/test-chatgpt-pilot-bootstrap.mjs" ||
  packageManifest.scripts?.["provision:chatgpt-staging:pilot"] !==
    "node scripts/provision-chatgpt-staging-pilot.mjs"
) {
  errors.push("Pilot bootstrap validation, integration test, and provision scripts must remain pinned.");
}
for (const requiredCiCommand of [
  "npm run validate:chatgpt-pilot-bootstrap",
  "npm run test:chatgpt-pilot-bootstrap",
]) {
  if (!ciWorkflow.includes(requiredCiCommand)) {
    errors.push(`CI must enforce the pilot bootstrap command: ${requiredCiCommand}.`);
  }
}

for (const requiredProvisionerControl of [
  'requirePilotPasswordHash("CHATGPT_PILOT_PASSWORD_HASH")',
  "user.passwordHash === passwordHash",
  'finalUserCount === 1',
  'finalWorkspaceCount === 1',
  'finalMembershipCount === 1',
  'publicRegistrationOpened: false',
  'plaintextCredentialProcessed: false',
  'existingCredentialRotated: false',
  'workspace.name === "Maricopa Pilot Workspace"',
  'membership.addedByUserId === user.id',
  'plaintextPasswordStored: false',
  'emailStoredInReceipt: false',
  'passwordStoredInReceipt: false',
  'passwordHashStoredInReceipt: false',
  'credentialStoredInReceipt: false',
]) {
  if (!provisioner.includes(requiredProvisionerControl)) {
    errors.push(`Pilot provisioner is missing required control: ${requiredProvisionerControl}.`);
  }
}
for (const forbiddenProvisionerBehavior of [
  "bcrypt.hash",
  "bcrypt.compare",
  "error.message",
  "console.log(email",
  "console.error(email",
]) {
  if (provisioner.includes(forbiddenProvisionerBehavior)) {
    errors.push(`Pilot provisioner contains forbidden credential behavior: ${forbiddenProvisionerBehavior}.`);
  }
}
for (const requiredIntegrationCase of [
  "empty bootstrap must create the owner",
  "rerun must be idempotent",
  "partial recovery must create workspace",
  "pilot_owner_identity_mismatch",
  "pilot_credential_mismatch",
  "pilot_workspace_name_mismatch",
  "pilot_workspace_boundary_mismatch",
  "pilot_membership_boundary_mismatch",
  "pilot_membership_role_mismatch",
  "pilot_password_hash_invalid",
  "receipt must not store pilot email",
  "receipt must not store pilot password hash",
  "workspace name must match pilot purpose",
  "owner must be the membership adder",
]) {
  if (!integrationTest.includes(requiredIntegrationCase)) {
    errors.push(`Pilot integration coverage is missing: ${requiredIntegrationCase}.`);
  }
}

if (errors.length > 0) {
  console.error("ChatGPT private-pilot bootstrap validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "ChatGPT private-pilot bootstrap validation passed for manual default-branch execution, step-scoped hash input, and an exact one-owner boundary.",
);
