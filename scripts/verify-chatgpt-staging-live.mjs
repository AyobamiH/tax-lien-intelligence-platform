import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const origin = requireCanonicalOrigin(process.env.STAGING_ORIGIN);
const receiptPath = resolve(process.env.LIVE_RECEIPT_PATH ?? "artifacts/chatgpt-staging-live-receipt.json");
const observedAt = new Date().toISOString();
const checks = [];

await checkJson("health", "/healthz", 200, (payload, response) => {
  assert(payload?.service === "tax-lien-api" && payload?.status === "ok", "health payload drifted");
  assert(response.headers.get("cache-control") === "no-store", "health cache control drifted");
  assert(response.headers.get("x-content-type-options") === "nosniff", "health content hardening drifted");
  assert(response.headers.has("strict-transport-security"), "HTTPS HSTS header is missing");
});

await checkJson("readiness", "/readyz", 200, (payload) => {
  assert(payload?.status === "ready", "runtime is not ready");
  assert(payload?.dependencies?.mongodb === "connected", "MongoDB is not connected");
  assert(payload?.dependencies?.intelligence === "ready", "intelligence service is not ready");
});

await checkJson("protected_resource_discovery", "/.well-known/oauth-protected-resource", 200, (payload) => {
  assert(payload?.resource === `${origin}/mcp`, "protected resource URL drifted");
  assert(JSON.stringify(payload?.authorization_servers) === JSON.stringify([origin]), "authorization server drifted");
  assert(JSON.stringify(payload?.scopes_supported) === JSON.stringify(["tax_lien:read"]), "OAuth scope drifted");
});

await checkJson("authorization_server_discovery", "/.well-known/oauth-authorization-server", 200, (payload) => {
  assert(payload?.issuer === origin, "OAuth issuer drifted");
  assert(payload?.authorization_endpoint === `${origin}/oauth/authorize`, "authorization endpoint drifted");
  assert(payload?.token_endpoint === `${origin}/oauth/token`, "token endpoint drifted");
  assert(payload?.revocation_endpoint === `${origin}/oauth/revoke`, "revocation endpoint drifted");
  assert(JSON.stringify(payload?.code_challenge_methods_supported) === JSON.stringify(["S256"]), "PKCE policy drifted");
});

await checkJson(
  "mcp_oauth_challenge",
  "/mcp",
  401,
  (payload, response) => {
    assert(payload?.error?.code === "oauth_missing_token", "MCP did not fail closed");
    const challenge = response.headers.get("www-authenticate") ?? "";
    assert(challenge.includes(`${origin}/.well-known/oauth-protected-resource`), "MCP challenge metadata drifted");
    assert(challenge.includes('scope="tax_lien:read"'), "MCP challenge scope drifted");
  },
  {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "p47-live-verifier", version: "1.0" },
      },
    }),
  },
);

await checkJson(
  "ingress_body_bound",
  "/mcp",
  413,
  (payload) => assert(payload?.error?.code === "request_too_large", "ingress body bound drifted"),
  {
    method: "POST",
    headers: { "content-type": "application/octet-stream" },
    body: new Uint8Array(1_048_577),
  },
);

for (const path of ["/auth/register", "/datasets", "/scores", "/bid", "/purchase", "/graphql"]) {
  await checkJson(`closed_route:${path}`, path, 404, (payload) => {
    assert(payload?.error?.code === "route_not_found", `gateway admitted forbidden route ${path}`);
  });
}

const receipt = {
  schemaVersion: "1.0.0",
  receiptKind: "chatgpt_private_staging_public_boundary",
  status: "passed",
  observedAt,
  origin,
  source: {
    repository: process.env.GITHUB_REPOSITORY
      ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
      : "https://github.com/AyobamiH/tax-lien-intelligence-platform",
    revision: process.env.LIVE_SOURCE_REVISION ?? null,
    workflowRun: process.env.LIVE_WORKFLOW_RUN_URL ?? null,
  },
  checks,
  evidencePolicy: {
    responseBodiesStored: false,
    credentialsStored: false,
    tokensStored: false,
    payloadsStored: false,
  },
  remainingGates: [
    "authenticated OAuth lifecycle and role/tenant isolation",
    "exact six-tool authenticated inventory",
    "private ChatGPT connection",
    "live log-redaction inspection",
    "rollback and recovery",
  ],
};

await mkdir(dirname(receiptPath), { recursive: true });
await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(`Live staging verification passed: ${checks.length} checks; sanitized receipt written.`);

async function checkJson(name, path, expectedStatus, verify, init = {}) {
  const startedAt = Date.now();
  const response = await fetch(`${origin}${path}`, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(45_000),
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`${name} returned a non-JSON response`);
  }
  assert(response.status === expectedStatus, `${name} returned ${response.status}, expected ${expectedStatus}`);
  assertSafeResponse(text, name);
  verify(payload, response);
  checks.push({
    name,
    status: "passed",
    httpStatus: response.status,
    durationMs: Math.max(0, Date.now() - startedAt),
    responseSha256: createHash("sha256").update(text).digest("hex"),
  });
}

function assertSafeResponse(text, name) {
  for (const forbidden of ["mongodb://", "mongodb+srv://", "authorization: bearer", "mcp_oauth_signing_secret", "jwt_secret", "intelligence_service_token"]) {
    assert(!text.toLowerCase().includes(forbidden), `${name} response exposed a forbidden secret marker`);
  }
}

function requireCanonicalOrigin(value) {
  assert(typeof value === "string" && value.length > 0, "STAGING_ORIGIN is required");
  const url = new URL(value);
  assert(url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash, "STAGING_ORIGIN must be an HTTPS origin");
  assert(
    /^tax-lien-chatgpt-staging\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.workers\.dev$/i.test(url.hostname),
    "STAGING_ORIGIN must be the stable named workers.dev deployment",
  );
  return url.origin;
}

function assert(condition, message) {
  if (!condition) throw new Error(`Live staging verification failed: ${message}`);
}
