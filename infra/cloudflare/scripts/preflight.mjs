import { execFileSync } from "node:child_process";

const requiredSecrets = new Set([
  "STAGING_ORIGIN",
  "MONGODB_URI",
  "JWT_SECRET",
  "INTELLIGENCE_SERVICE_TOKEN",
  "MCP_OAUTH_SIGNING_SECRET",
]);

function runWrangler(args) {
  return execFileSync("wrangler", args, {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

try {
  runWrangler(["whoami"]);
} catch {
  console.error("Cloudflare preflight failed: Wrangler is not authenticated for an authorized account.");
  process.exit(1);
}

let listedSecrets;
try {
  listedSecrets = JSON.parse(runWrangler(["secret", "list", "--format=json"]));
} catch {
  console.error("Cloudflare preflight failed: secret names could not be listed.");
  process.exit(1);
}

const availableNames = new Set(
  Array.isArray(listedSecrets)
    ? listedSecrets.map((entry) => entry?.name).filter((name) => typeof name === "string")
    : [],
);
const missing = [...requiredSecrets].filter((name) => !availableNames.has(name)).sort();
if (missing.length > 0) {
  console.error(`Cloudflare preflight failed: missing secret bindings: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`Cloudflare preflight passed with ${requiredSecrets.size} required secret-name bindings.`);
