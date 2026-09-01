import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const configPath = resolve(root, "infra/cloudflare/wrangler.jsonc");
const workerPath = resolve(root, "infra/cloudflare/src/index.ts");
const policyPath = resolve(root, "infra/cloudflare/src/gateway-policy.ts");
const dockerfilePath = resolve(root, "Dockerfile.staging");
const preflightPath = resolve(root, "infra/cloudflare/scripts/preflight.mjs");
const secretSyncPath = resolve(root, "infra/cloudflare/scripts/sync-secrets.mjs");
const workflowPath = resolve(root, ".github/workflows/chatgpt-staging.yml");
const packagePath = resolve(root, "package.json");
const apiEnvPath = resolve(root, "apps/api/src/config/env.ts");
const apiAppPath = resolve(root, "apps/api/src/app.ts");
const liveVerifierPath = resolve(root, "scripts/verify-chatgpt-staging-live.mjs");
const revisionWaitPath = resolve(root, "scripts/wait-chatgpt-staging-revision.mjs");
const authenticatedLiveVerifierPath = resolve(root, "scripts/verify-chatgpt-staging-authenticated-live.mjs");
const logRedactionLiveVerifierPath = resolve(root, "scripts/verify-chatgpt-staging-log-redaction-live.mjs");
const rollbackLiveVerifierPath = resolve(root, "scripts/verify-chatgpt-staging-rollback-live.mjs");

const [
  configSource,
  workerSource,
  policySource,
  dockerfile,
  preflight,
  secretSync,
  workflow,
  packageSource,
  apiEnvSource,
  apiAppSource,
  liveVerifier,
  revisionWait,
  authenticatedLiveVerifier,
  logRedactionLiveVerifier,
  rollbackLiveVerifier,
] = await Promise.all([
  readFile(configPath, "utf8"),
  readFile(workerPath, "utf8"),
  readFile(policyPath, "utf8"),
  readFile(dockerfilePath, "utf8"),
  readFile(preflightPath, "utf8"),
  readFile(secretSyncPath, "utf8"),
  readFile(workflowPath, "utf8"),
  readFile(packagePath, "utf8"),
  readFile(apiEnvPath, "utf8"),
  readFile(apiAppPath, "utf8"),
  readFile(liveVerifierPath, "utf8"),
  readFile(revisionWaitPath, "utf8"),
  readFile(authenticatedLiveVerifierPath, "utf8"),
  readFile(logRedactionLiveVerifierPath, "utf8"),
  readFile(rollbackLiveVerifierPath, "utf8"),
]);

const config = JSON.parse(configSource);
const packageJson = JSON.parse(packageSource);
const errors = [];

if (config.name !== "tax-lien-chatgpt-staging") errors.push("Worker name must remain staging-only.");
if (config.workers_dev !== true) errors.push("The bounded workers.dev HTTPS origin must remain enabled.");
if (config.preview_urls !== false) errors.push("Unstable Worker preview URLs must remain disabled.");
if (config.routes !== undefined) errors.push("Custom/public routes require a separately reviewed domain decision.");
if (config.observability?.enabled !== true) errors.push("Workers observability must remain enabled.");
if (config.observability?.head_sampling_rate !== 1) errors.push("Private-staging operational logs must remain unsampled.");
if (config.observability?.logs?.invocation_logs !== false) {
  errors.push("Default provider invocation logs must remain disabled; use only the payload-free custom events.");
}
if (config.containers?.length !== 1) errors.push("Private staging must use exactly one container definition.");
if (config.containers?.[0]?.max_instances !== 1) {
  errors.push("Private staging must remain single-instance until shared application limits are adopted.");
}

const requiredSecrets = [
  "STAGING_ORIGIN",
  "MONGODB_URI",
  "JWT_SECRET",
  "INTELLIGENCE_SERVICE_TOKEN",
  "MCP_OAUTH_SIGNING_SECRET",
];
for (const name of requiredSecrets) {
  if (
    !workerSource.includes(`env.${name}`) ||
    !preflight.includes(`\"${name}\"`) ||
    !config.secrets?.required?.includes(name) ||
    !secretSync.includes(name)
  ) {
    errors.push(`${name} must be injected by secret reference and checked before deployment.`);
  }
}

if (
  !preflight.includes('runWrangler(["secret", "list", "--format=json"])') ||
  preflight.includes('"--json"')
) {
  errors.push("Cloudflare preflight must use Wrangler's supported JSON format flag.");
}

if (
  !dockerfile.includes("RUN npm run build --workspaces --if-present") ||
  !dockerfile.includes("RUN python -m compileall -q") ||
  dockerfile.includes("RUN npm run build\n")
) {
  errors.push("The staging image must build Node workspaces and validate Python in its Python stage.");
}

for (const name of [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "MONGODB_URI",
  "JWT_SECRET",
  "INTELLIGENCE_SERVICE_TOKEN",
  "MCP_OAUTH_SIGNING_SECRET",
]) {
  if (!workflow.includes(`secrets.${name}`)) {
    errors.push(`The staging workflow must consume ${name} only as a GitHub environment secret reference.`);
  }
}
if (!workflow.includes("[deploy-private-staging]")) {
  errors.push("Feature-branch staging deployment must require the exact reviewed commit marker.");
}
const deployIndex = workflow.indexOf("Deploy private staging");
const convergenceIndex = workflow.indexOf("Wait for exact container source revision");
const publicVerificationIndex = workflow.indexOf("Verify deployed HTTPS boundary");
if (
  !workflow.includes('--var "SOURCE_REVISION:${{ github.sha }}"') ||
  !workflow.includes("--containers-rollout=immediate") ||
  !workflow.includes("npm run verify:chatgpt-staging:revision") ||
  deployIndex < 0 ||
  convergenceIndex <= deployIndex ||
  publicVerificationIndex <= convergenceIndex ||
  packageJson.scripts?.["verify:chatgpt-staging:revision"] !==
    "node scripts/wait-chatgpt-staging-revision.mjs"
) {
  errors.push("Deployment must prove exact container source convergence before live verification.");
}
if (
  !workerSource.includes("SOURCE_REVISION: env.SOURCE_REVISION") ||
  !apiEnvSource.includes("SOURCE_REVISION") ||
  !apiEnvSource.includes("/^[0-9a-f]{40}$/u") ||
  !apiAppSource.includes('setHeader("X-Tax-Lien-Source-Revision", sourceRevision)') ||
  !revisionWait.includes("/readyz") ||
  !revisionWait.includes('headers.get("x-tax-lien-source-revision")') ||
  !revisionWait.includes("requiredConsecutiveMatches = 3") ||
  !revisionWait.includes("180_000") ||
  revisionWait.includes("response.text()")
) {
  errors.push("Source revision provenance must be exact, bounded, and response-body-free.");
}
if (
  !liveVerifier.includes('headers.get("x-tax-lien-source-revision")') ||
  !authenticatedLiveVerifier.includes('headers.get("x-tax-lien-source-revision")') ||
  !logRedactionLiveVerifier.includes('headers.get("x-tax-lien-source-revision")') ||
  !rollbackLiveVerifier.includes('headers.get("x-tax-lien-source-revision")')
) {
  errors.push("Every live verification phase must reassert the exact container source revision.");
}
for (const forbiddenPilotCoupling of [
  "CHATGPT_PILOT_",
  "provision:chatgpt-staging:pilot",
  "chatgpt-staging-pilot-provision-receipt.json",
]) {
  if (workflow.includes(forbiddenPilotCoupling)) {
    errors.push(`Deployment must remain isolated from pilot identity provisioning: ${forbiddenPilotCoupling}.`);
  }
}
if (
  !workflow.includes("npm run verify:chatgpt-staging:live") ||
  !workflow.includes("npm run verify:chatgpt-staging:authenticated-live") ||
  !workflow.includes("npm run verify:chatgpt-staging:log-redaction-live") ||
  !workflow.includes("npm run verify:chatgpt-staging:rollback-live") ||
  !workflow.includes("chatgpt-staging-rollback-recovery-receipt.json") ||
  !workflow.includes("actions/upload-artifact@v4") ||
  !secretSync.includes("staging_origin=")
) {
  errors.push("A deployment must verify the derived HTTPS origin and archive a sanitized receipt.");
}

for (const authenticatedRequirement of [
  "exact_source_revision",
  "explicit_consent_required",
  "authorization_code_replay",
  "refresh_rotation_and_replay",
  "refresh_replay_access_revocation",
  "grant_wide_revocation",
  "access_token_revocation",
  "expired_access_token",
  "owner_workspace_isolation",
  "admin_workspace_isolation",
  "member_workspace_isolation",
  "denied_workspace_isolation",
  "cross_workspace_denial",
  "exact_read_only_tool_inventory",
  "ephemeral_fixture_cleanup",
]) {
  if (!authenticatedLiveVerifier.includes(authenticatedRequirement)) {
    errors.push(`Authenticated live verifier is missing required assertion: ${authenticatedRequirement}.`);
  }
}
if (
  authenticatedLiveVerifier.includes("response.json()") ||
  !authenticatedLiveVerifier.includes("readJsonResponse") ||
  !authenticatedLiveVerifier.includes("response_body_not_json") ||
  !authenticatedLiveVerifier.includes("response_body_too_large")
) {
  errors.push("Authenticated live responses must be parsed through the bounded sanitized JSON reader.");
}
if (authenticatedLiveVerifier.includes("${tool.name}")) {
  errors.push("Authenticated live diagnostics must not interpolate remote tool names.");
}

for (const logRequirement of [
  "exact_source_revision",
  "cloudflare_workers_realtime_tail",
  "gateway_payload_free_shape",
  "application_payload_free_shape",
  "payload_marker_absent",
  "credential_marker_absent",
  "rawProviderEnvelopeStored: false",
  "consoleMessagesStored: false",
]) {
  if (!logRedactionLiveVerifier.includes(logRequirement)) {
    errors.push(`Live log-redaction verifier is missing required assertion: ${logRequirement}.`);
  }
}

for (const rollbackRequirement of [
  '"rollback"',
  "try {",
  "} finally {",
  "rollback_to_previous_version",
  "recover_current_version",
  "chatgpt_private_staging_rollback_recovery",
  "x-tax-lien-source-revision",
  "sourceRevisionVerifiedAfterRollback: true",
  "sourceRevisionVerifiedAfterRecovery: true",
  "responseBodiesStored: false",
  "commandOutputStored: false",
]) {
  if (!rollbackLiveVerifier.includes(rollbackRequirement)) {
    errors.push(`Rollback/recovery verifier is missing required assertion: ${rollbackRequirement}.`);
  }
}

for (const liveRequirement of [
  "/healthz",
  "/readyz",
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-authorization-server",
  "/mcp",
  "oauth_missing_token",
  "request_too_large",
  "route_not_found",
]) {
  if (!liveVerifier.includes(liveRequirement)) {
    errors.push(`Live staging verifier is missing required assertion: ${liveRequirement}.`);
  }
}

for (const forbidden of ["mongodb://localhost", "mongo:7", "mongo:8", "redemptionProbability"]) {
  if (dockerfile.includes(forbidden) || workerSource.includes(forbidden)) {
    errors.push(`Staging deployment source must not contain forbidden runtime shortcut: ${forbidden}.`);
  }
}

for (const requiredRoute of [
  "/healthz",
  "/readyz",
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-authorization-server",
  "/oauth/authorize",
  "/oauth/token",
  "/oauth/revoke",
  "/mcp",
]) {
  if (!policySource.includes(`\"${requiredRoute}\"`)) {
    errors.push(`Gateway policy is missing required route ${requiredRoute}.`);
  }
}

for (const forbiddenRoute of ["/datasets", "/auth/register", "/bid", "/purchase"]) {
  const routeDeclaration = `\"${forbiddenRoute}\", {`;
  if (policySource.includes(routeDeclaration)) {
    errors.push(`Gateway policy must not admit ${forbiddenRoute}.`);
  }
}

if (errors.length > 0) {
  console.error("ChatGPT private-staging validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `ChatGPT private-staging validation passed for ${requiredSecrets.length} secret references, one container instance, and the closed ingress route set.`,
);
