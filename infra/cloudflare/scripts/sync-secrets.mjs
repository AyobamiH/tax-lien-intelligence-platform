import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const workerName = "tax-lien-chatgpt-staging";
const requiredEnvironmentSecrets = [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "MONGODB_URI",
  "JWT_SECRET",
  "INTELLIGENCE_SERVICE_TOKEN",
  "MCP_OAUTH_SIGNING_SECRET",
];

const missing = requiredEnvironmentSecrets.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(
    `Cloudflare secret sync failed: missing environment secret references: ${missing.join(", ")}`,
  );
  process.exit(1);
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
let subdomain;

try {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/workers/subdomain`,
    { headers: { authorization: `Bearer ${apiToken}`, accept: "application/json" } },
  );
  const payload = await response.json();
  subdomain = payload?.success === true ? payload?.result?.subdomain : undefined;
} catch {
  subdomain = undefined;
}

if (
  typeof subdomain !== "string" ||
  !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain)
) {
  console.error(
    "Cloudflare secret sync failed: the authorized workers.dev subdomain could not be resolved.",
  );
  process.exit(1);
}

const secretPayload = {
  STAGING_ORIGIN: `https://${workerName}.${subdomain}.workers.dev`,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  INTELLIGENCE_SERVICE_TOKEN: process.env.INTELLIGENCE_SERVICE_TOKEN,
  MCP_OAUTH_SIGNING_SECRET: process.env.MCP_OAUTH_SIGNING_SECRET,
};

const result = spawnSync("wrangler", ["secret", "bulk", "--config", "wrangler.jsonc"], {
  cwd: new URL("..", import.meta.url),
  encoding: "utf8",
  env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  input: JSON.stringify(secretPayload),
  stdio: ["pipe", "pipe", "pipe"],
});

if (result.status !== 0) {
  console.error("Cloudflare secret sync failed: Wrangler could not install the required bindings.");
  process.exit(1);
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `staging_origin=${secretPayload.STAGING_ORIGIN}\n`, {
    encoding: "utf8",
  });
}

console.log(`Cloudflare secret sync passed for ${Object.keys(secretPayload).length} secret-name bindings.`);
