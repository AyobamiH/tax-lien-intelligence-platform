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

const [configSource, workerSource, policySource, dockerfile, preflight, secretSync, workflow] = await Promise.all([
  readFile(configPath, "utf8"),
  readFile(workerPath, "utf8"),
  readFile(policyPath, "utf8"),
  readFile(dockerfilePath, "utf8"),
  readFile(preflightPath, "utf8"),
  readFile(secretSyncPath, "utf8"),
  readFile(workflowPath, "utf8"),
]);

const config = JSON.parse(configSource);
const errors = [];

if (config.name !== "tax-lien-chatgpt-staging") errors.push("Worker name must remain staging-only.");
if (config.workers_dev !== true) errors.push("The bounded workers.dev HTTPS origin must remain enabled.");
if (config.routes !== undefined) errors.push("Custom/public routes require a separately reviewed domain decision.");
if (config.observability?.enabled !== true) errors.push("Workers observability must remain enabled.");
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
