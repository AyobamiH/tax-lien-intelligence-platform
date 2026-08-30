import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const origin = requireCanonicalOrigin(process.env.STAGING_ORIGIN);
const receiptPath = resolve(
  process.env.ROLLBACK_RECEIPT_PATH ??
    "artifacts/chatgpt-staging-rollback-recovery-receipt.json",
);
const wranglerPath = resolve(process.cwd(), "node_modules/.bin/wrangler");
const wranglerConfig = "infra/cloudflare/wrangler.jsonc";
const checks = [];
let recoveryVersionId = null;
let rollbackVersionId = null;
let rollbackStarted = false;
let rollbackRoutedAt = null;
let recoveredAt = null;
let primaryFailure = null;

try {
  const currentDeployment = await getDeploymentStatus();
  recoveryVersionId = requireSingleVersion(currentDeployment, "current_deployment");
  const deployments = await getDeployments();
  rollbackVersionId = selectPreviousVersion(deployments, recoveryVersionId);

  rollbackStarted = true;
  await runWrangler([
    "rollback",
    rollbackVersionId,
    "--message",
    "P47-093 governed rollback verification",
    "--config",
    wranglerConfig,
  ]);
  await waitForVersion(rollbackVersionId, "rollback_to_previous_version");
  rollbackRoutedAt = new Date().toISOString();
  await verifyBoundary("rollback");
} catch (error) {
  primaryFailure = normalizeError(error);
} finally {
  if (rollbackStarted && recoveryVersionId) {
    try {
      await runWrangler([
        "rollback",
        recoveryVersionId,
        "--message",
        "P47-093 governed recovery",
        "--config",
        wranglerConfig,
      ]);
      await waitForVersion(recoveryVersionId, "recover_current_version");
      recoveredAt = new Date().toISOString();
      await verifyBoundary("recovery");
    } catch (error) {
      const recoveryFailure = normalizeError(error);
      primaryFailure = primaryFailure
        ? new Error(primaryFailure.message + "; recovery_failed")
        : recoveryFailure;
    }
  }
}

if (primaryFailure) throw primaryFailure;
assert(rollbackVersionId && recoveryVersionId, "version_selection_incomplete");
assert(rollbackVersionId !== recoveryVersionId, "rollback_target_matches_recovery_version");
assert(rollbackRoutedAt && recoveredAt, "rollback_or_recovery_route_unverified");

const receipt = {
  schemaVersion: "1.0.0",
  receiptKind: "chatgpt_private_staging_rollback_recovery",
  status: "passed",
  observedAt: new Date().toISOString(),
  origin,
  source: {
    repository: process.env.GITHUB_REPOSITORY
      ? "https://github.com/" + process.env.GITHUB_REPOSITORY
      : "https://github.com/AyobamiH/tax-lien-intelligence-platform",
    revision: process.env.LIVE_SOURCE_REVISION ?? null,
    workflowRun: process.env.LIVE_WORKFLOW_RUN_URL ?? null,
  },
  routing: {
    rollbackVersionId,
    recoveryVersionId,
    rollbackRoutedAt,
    recoveredAt,
    finalVersionId: recoveryVersionId,
    trafficPercentage: 100,
  },
  checks,
  boundResources: {
    rolledBack: false,
    readinessVerifiedAfterRollback: ["mongodb", "intelligence"],
    readinessVerifiedAfterRecovery: ["mongodb", "intelligence"],
  },
  evidencePolicy: {
    deterministicProbeOnly: true,
    representedAsUserCountyOrModelEvidence: false,
    responseBodiesStored: false,
    commandOutputStored: false,
    credentialsStored: false,
    tokensStored: false,
    emailsStored: false,
    payloadsStored: false,
  },
};

await mkdir(dirname(receiptPath), { recursive: true });
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", {
  encoding: "utf8",
  mode: 0o600,
});
console.log(
  "Governed staging rollback and recovery passed: previous version verified and current version restored; sanitized receipt written.",
);

async function getDeployments() {
  const result = await runWrangler([
    "deployments",
    "list",
    "--json",
    "--config",
    wranglerConfig,
  ]);
  const payload = parseJsonDocument(
    result.stdout + "\n" + result.stderr,
    "deployments_list_invalid",
  );
  assert(Array.isArray(payload), "deployments_list_not_array");
  return payload;
}

async function getDeploymentStatus() {
  const result = await runWrangler([
    "deployments",
    "status",
    "--json",
    "--config",
    wranglerConfig,
  ]);
  return parseJsonDocument(
    result.stdout + "\n" + result.stderr,
    "deployment_status_invalid",
  );
}

function selectPreviousVersion(deployments, currentVersionId) {
  const candidates = deployments
    .map((deployment) => ({
      createdAt: Date.parse(deployment?.created_on ?? deployment?.createdAt ?? ""),
      versionId: readSingleVersion(deployment),
    }))
    .filter(
      (candidate) =>
        Number.isFinite(candidate.createdAt) &&
        candidate.versionId &&
        candidate.versionId !== currentVersionId,
    )
    .sort((left, right) => right.createdAt - left.createdAt);
  assert(candidates.length > 0, "previous_single_version_deployment_missing");
  return candidates[0].versionId;
}

function requireSingleVersion(deployment, label) {
  const versionId = readSingleVersion(deployment);
  assert(versionId, label + "_must_route_one_version_at_100_percent");
  return versionId;
}

function readSingleVersion(deployment) {
  const versions = Array.isArray(deployment?.versions) ? deployment.versions : [];
  if (versions.length !== 1 || Number(versions[0]?.percentage) !== 100) return null;
  const versionId = versions[0]?.version_id ?? versions[0]?.versionId;
  return isIdentifier(versionId) ? versionId : null;
}

async function waitForVersion(expectedVersionId, action) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const deployment = await getDeploymentStatus();
    if (readSingleVersion(deployment) === expectedVersionId) return;
    await delay(2_000);
  }
  throw new Error("Rollback verification failed: " + action + "_timed_out");
}

async function verifyBoundary(phase) {
  await checkJson(phase + ":health", "/healthz", 200, (payload, response) => {
    assert(payload?.service === "tax-lien-api" && payload?.status === "ok", phase + "_health_drifted");
    assert(response.headers.get("cache-control") === "no-store", phase + "_health_cache_drifted");
    assert(response.headers.has("strict-transport-security"), phase + "_hsts_missing");
  });
  await checkJson(phase + ":readiness", "/readyz", 200, (payload) => {
    assert(payload?.status === "ready", phase + "_runtime_not_ready");
    assert(payload?.dependencies?.mongodb === "connected", phase + "_mongodb_not_connected");
    assert(payload?.dependencies?.intelligence === "ready", phase + "_intelligence_not_ready");
  });
  await checkJson(
    phase + ":oauth_discovery",
    "/.well-known/oauth-authorization-server",
    200,
    (payload) => {
      assert(payload?.issuer === origin, phase + "_issuer_drifted");
      assert(payload?.token_endpoint === origin + "/oauth/token", phase + "_token_endpoint_drifted");
      assert(
        JSON.stringify(payload?.code_challenge_methods_supported) === JSON.stringify(["S256"]),
        phase + "_pkce_policy_drifted",
      );
    },
  );
  await checkJson(
    phase + ":mcp_fail_closed",
    "/mcp",
    401,
    (payload, response) => {
      assert(payload?.error?.code === "oauth_missing_token", phase + "_mcp_not_fail_closed");
      const challenge = response.headers.get("www-authenticate") ?? "";
      assert(challenge.includes('scope="tax_lien:read"'), phase + "_mcp_scope_drifted");
    },
    {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "p47-rollback-verifier", version: "1.0" },
        },
      }),
    },
  );
}

async function checkJson(name, path, expectedStatus, verify, init = {}) {
  const startedAt = Date.now();
  const response = await fetch(origin + path, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(45_000),
  });
  const bytes = await response.arrayBuffer();
  assert(bytes.byteLength <= 1_048_576, name + "_response_bound_exceeded");
  const body = Buffer.from(bytes).toString("utf8");
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error("Rollback verification failed: " + name + "_non_json_response");
  }
  assert(response.status === expectedStatus, name + "_status_" + response.status);
  assertSafeResponse(body, name);
  verify(payload, response);
  checks.push({
    name,
    status: "passed",
    httpStatus: response.status,
    durationMs: Math.max(0, Date.now() - startedAt),
    responseSha256: createHash("sha256").update(body).digest("hex"),
  });
}

function assertSafeResponse(body, name) {
  const normalized = body.toLowerCase();
  for (const forbidden of [
    "mongodb://",
    "mongodb+srv://",
    "authorization: bearer",
    "jwt_secret",
    "mcp_oauth_signing_secret",
    "intelligence_service_token",
  ]) {
    assert(!normalized.includes(forbidden), name + "_exposed_forbidden_marker");
  }
}

function runWrangler(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(wranglerPath, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        WRANGLER_LOG_SANITIZE: "true",
        WRANGLER_SEND_ERROR_REPORTS: "false",
        WRANGLER_SEND_METRICS: "false",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(new Error("Rollback verification failed: wrangler_timeout"));
    }, 180_000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      if (Buffer.byteLength(stdout) > 1_048_576) {
        child.kill("SIGTERM");
        finish(new Error("Rollback verification failed: wrangler_stdout_bound_exceeded"));
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      if (Buffer.byteLength(stderr) > 262_144) {
        child.kill("SIGTERM");
        finish(new Error("Rollback verification failed: wrangler_stderr_bound_exceeded"));
      }
    });
    child.once("error", () => finish(new Error("Rollback verification failed: wrangler_start_failed")));
    child.once("exit", (code) => {
      if (code !== 0) {
        finish(new Error("Rollback verification failed: wrangler_exit_" + String(code)));
        return;
      }
      finish(null, { stdout, stderr });
    });

    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) rejectRun(error);
      else resolveRun(result);
    }
  });
}

function parseJsonDocument(value, errorCode) {
  const trimmed = value.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    for (let start = 0; start < trimmed.length; start += 1) {
      const opening = trimmed[start];
      if (opening !== "{" && opening !== "[") continue;
      const closing = opening === "{" ? "}" : "]";
      for (let end = trimmed.lastIndexOf(closing); end > start; end = trimmed.lastIndexOf(closing, end - 1)) {
        try {
          return JSON.parse(trimmed.slice(start, end + 1));
        } catch {
          // Continue scanning bounded Wrangler output without exposing it.
        }
      }
    }
  }
  throw new Error("Rollback verification failed: " + errorCode);
}

function requireCanonicalOrigin(value) {
  assert(typeof value === "string" && value.length > 0, "staging_origin_missing");
  const url = new URL(value);
  assert(url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash, "staging_origin_invalid");
  assert(
    /^tax-lien-chatgpt-staging\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.workers\.dev$/i.test(url.hostname),
    "staging_origin_not_stable_workers_dev",
  );
  return url.origin;
}

function isIdentifier(value) {
  return typeof value === "string" && /^[a-zA-Z0-9-]{8,128}$/u.test(value);
}

function normalizeError(error) {
  return error instanceof Error ? error : new Error("Rollback verification failed");
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error("Rollback verification failed: " + message);
}
