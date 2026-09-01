import { readFile, access } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const product = path.join(root, "products/chatgpt/tax-lien-intelligence");
const manifest = JSON.parse(await readFile(path.join(product, ".codex-plugin/plugin.json"), "utf8"));
const provenance = JSON.parse(await readFile(path.join(product, "release-provenance.json"), "utf8"));
const expectedTools = [
  "list_workspaces",
  "list_datasets",
  "list_dataset_candidates",
  "get_candidate_evidence",
  "compare_candidates",
  "get_decision_brief",
];
const expectedConnectionChecks = [
  "real_chatgpt_oauth_connection",
  "real_chatgpt_mcp_connection",
  "revoked_access_token_rejected",
  "revoked_refresh_token_rejected",
];

assert(manifest.name === "tax-lien-intelligence", "plugin name changed");
assert(manifest.version === "0.1.0", "plugin version must be explicit");
assert(!("mcpServers" in manifest), "private package must not publish an MCP endpoint through the source manifest");
assert(
  ["source_only", "private_staging_deployed", "private_staging_connected"].includes(provenance.releaseStatus),
  "release status is not governed",
);
assert(/^[a-f0-9]{40}$/.test(provenance.systemOfRecord.engineRevision), "engine revision must be a full commit");
assert(provenance.systemOfRecord.mcpContractVersion === "1.0.0", "MCP contract version drifted");
assert(JSON.stringify(provenance.approvedTools) === JSON.stringify(expectedTools), "approved tool inventory drifted");
assert(provenance.permissions.readOnly === true, "ChatGPT package must remain read-only");
assert(provenance.permissions.writes === false, "write permission is prohibited");
if (provenance.releaseStatus === "source_only") {
  assert(provenance.connection.mcpUrl === null, "source-only package cannot claim a deployment URL");
  assert(provenance.connection.oauthIssuer === null, "source-only package cannot claim an OAuth issuer");
  for (const receipt of Object.values(provenance.liveEvidence)) {
    assert(receipt === null, "source-only package cannot claim live evidence");
  }
} else {
  const issuer = new URL(provenance.connection.oauthIssuer);
  assert(issuer.protocol === "https:" && issuer.pathname === "/", "staging issuer must be an HTTPS origin");
  assert(
    provenance.connection.mcpUrl === `${issuer.origin}/mcp`,
    "staging MCP URL must use the OAuth issuer origin",
  );
  assert(typeof provenance.liveEvidence.deploymentReceipt === "string", "deployed staging needs a receipt");
  const receiptPath = path.join(product, provenance.liveEvidence.deploymentReceipt);
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  assert(receipt.status === "passed", "deployment receipt did not pass");
  assert(receipt.origin === issuer.origin, "deployment receipt origin drifted");
  assert(receipt.source?.revision === provenance.systemOfRecord.engineRevision, "deployment revision drifted");
  assert(receipt.evidencePolicy?.credentialsStored === false, "deployment receipt must store no credentials");
  assert(receipt.evidencePolicy?.tokensStored === false, "deployment receipt must store no tokens");
  assert(
    typeof provenance.liveEvidence.authenticatedBoundaryReceipt === "string",
    "deployed staging needs an authenticated boundary receipt",
  );
  const authenticatedReceipt = JSON.parse(
    await readFile(path.join(product, provenance.liveEvidence.authenticatedBoundaryReceipt), "utf8"),
  );
  assert(authenticatedReceipt.status === "passed", "authenticated boundary receipt did not pass");
  assert(authenticatedReceipt.origin === issuer.origin, "authenticated boundary origin drifted");
  assert(
    authenticatedReceipt.source?.revision === provenance.systemOfRecord.engineRevision,
    "authenticated boundary revision drifted",
  );
  assert(
    JSON.stringify(authenticatedReceipt.toolInventory) === JSON.stringify(expectedTools),
    "authenticated deployed tool inventory drifted",
  );
  assert(authenticatedReceipt.fixturePolicy?.removedAfterVerification === true, "test fixture cleanup is unverified");
  assert(authenticatedReceipt.evidencePolicy?.credentialsStored === false, "authenticated receipt stored credentials");
  assert(authenticatedReceipt.evidencePolicy?.tokensStored === false, "authenticated receipt stored tokens");
  const atlasReceipt = JSON.parse(
    await readFile(path.join(product, provenance.liveEvidence.atlasLeastPrivilegeReceipt), "utf8"),
  );
  assert(atlasReceipt.status === "passed", "Atlas least-privilege receipt did not pass");
  assert(atlasReceipt.roles?.length === 1, "Atlas application user must have exactly one role");
  assert(atlasReceipt.roles[0]?.role === "readWrite", "Atlas application user role is not readWrite");
  assert(
    atlasReceipt.roles[0]?.database === "tax_lien_chatgpt_staging",
    "Atlas application user database scope drifted",
  );
  assert(
    JSON.stringify(atlasReceipt.resourceRestriction?.clusters) === JSON.stringify(["TaxLienStaging"]),
    "Atlas application user cluster scope drifted",
  );
  assert(atlasReceipt.evidencePolicy?.credentialStored === false, "Atlas receipt stored a credential");
  const governanceReceipt = JSON.parse(
    await readFile(path.join(product, provenance.liveEvidence.governanceReceipt), "utf8"),
  );
  assert(governanceReceipt.status === "approved", "private-pilot governance is not approved");
  for (const owner of [
    "privacySecurityApprover",
    "retentionDeletionOwner",
    "pilotConsentOwner",
    "supportOwner",
    "incidentOwner",
    "operationsOwner",
  ]) {
    assert(typeof governanceReceipt.assignments?.[owner] === "string", `${owner} is not assigned`);
  }
  assert(governanceReceipt.controls?.defaultTrainingConsent === false, "training consent must default to false");
  if (provenance.releaseStatus === "private_staging_deployed") {
    assert(provenance.liveEvidence.chatgptConnectionReceipt === null, "unconnected staging cannot claim ChatGPT evidence");
  } else {
    const connectionReceiptReference = provenance.liveEvidence.chatgptConnectionReceipt;
    assert(
      typeof connectionReceiptReference === "string" && connectionReceiptReference.trim().length > 0,
      "connected staging needs a ChatGPT connection receipt",
    );
    const connectionReceiptPath = path.resolve(product, connectionReceiptReference);
    assert(
      connectionReceiptPath.startsWith(`${path.resolve(product)}${path.sep}`),
      "ChatGPT connection receipt must stay inside the product package",
    );
    const connectionReceipt = JSON.parse(await readFile(connectionReceiptPath, "utf8"));
    assert(connectionReceipt.schemaVersion === "1.0.0", "ChatGPT connection receipt schema drifted");
    assert(
      connectionReceipt.receiptKind === "chatgpt_private_staging_connection",
      "ChatGPT connection receipt kind drifted",
    );
    assert(connectionReceipt.status === "passed", "ChatGPT connection receipt did not pass");
    assert(connectionReceipt.origin === issuer.origin, "ChatGPT connection issuer origin drifted");
    assert(
      connectionReceipt.source?.repository === provenance.systemOfRecord.repository,
      "ChatGPT connection repository drifted",
    );
    assert(
      connectionReceipt.source?.revision === provenance.systemOfRecord.engineRevision,
      "ChatGPT connection revision drifted",
    );
    const workflowRun = requiredHttpsUrl(
      connectionReceipt.source?.workflowRun,
      "ChatGPT connection receipt needs an HTTPS GitHub workflow run",
    );
    assert(workflowRun.hostname === "github.com", "ChatGPT connection workflow run must use GitHub");
    const workflowRunPrefix =
      `${new URL(provenance.systemOfRecord.repository).pathname.replace(/\/$/u, "")}/actions/runs/`;
    assert(
      workflowRun.pathname.startsWith(workflowRunPrefix) &&
        /^[1-9][0-9]*$/u.test(workflowRun.pathname.slice(workflowRunPrefix.length)) &&
        workflowRun.search === "" &&
        workflowRun.hash === "",
      "ChatGPT connection workflow run repository drifted",
    );
    assert(
      connectionReceipt.connection?.clientId === "https://chatgpt.com/oauth/client.json",
      "ChatGPT connection client id drifted",
    );
    assert(
      connectionReceipt.connection?.redirectUri === "https://chatgpt.com/connector_platform_oauth_redirect",
      "ChatGPT connection redirect URI drifted",
    );
    assert(connectionReceipt.connection?.scope === provenance.connection.scope, "ChatGPT connection scope drifted");
    assert(connectionReceipt.connection?.visibility === "private", "ChatGPT connection must remain private");
    assert(
      JSON.stringify(connectionReceipt.toolInventory) === JSON.stringify(expectedTools),
      "real ChatGPT tool inventory drifted",
    );
    assert(
      connectionReceipt.workspaceEvidence?.intendedWorkspaceCount === 1 &&
        connectionReceipt.workspaceEvidence?.observedWorkspaceCount === 1,
      "real ChatGPT connection must expose exactly one intended workspace",
    );
    assert(
      connectionReceipt.workspaceEvidence?.role === "owner",
      "real ChatGPT connection workspace must use the intended owner role",
    );
    assert(Array.isArray(connectionReceipt.checks), "ChatGPT connection checks are missing");
    const connectionCheckNames = connectionReceipt.checks.map((check) => check?.name);
    assert(
      new Set(connectionCheckNames).size === connectionCheckNames.length,
      "ChatGPT connection checks contain duplicate names",
    );
    assert(
      connectionReceipt.checks.every(
        (check) => typeof check?.name === "string" && check.name.length > 0 && check.status === "passed",
      ),
      "ChatGPT connection receipt contains an invalid or failed check",
    );
    for (const checkName of expectedConnectionChecks) {
      assert(connectionCheckNames.includes(checkName), `ChatGPT connection check ${checkName} is missing`);
    }
    assert(connectionReceipt.evidencePolicy?.credentialsStored === false, "ChatGPT connection receipt stored credentials");
    assert(connectionReceipt.evidencePolicy?.tokensStored === false, "ChatGPT connection receipt stored tokens");
    assert(connectionReceipt.evidencePolicy?.emailsStored === false, "ChatGPT connection receipt stored email identity");
  }
}
await access(path.join(product, "README.md"));
console.log(`Validated ChatGPT ${provenance.releaseStatus} package: ${expectedTools.length} read-only tools.`);

function assert(condition, message) {
  if (!condition) throw new Error(`ChatGPT release validation failed: ${message}`);
}

function requiredHttpsUrl(value, message) {
  assert(typeof value === "string" && value.length > 0, message);
  let url;
  try {
    url = new URL(value);
  } catch {
    assert(false, message);
  }
  assert(url.protocol === "https:", message);
  return url;
}
