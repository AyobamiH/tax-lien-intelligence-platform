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
  if (provenance.releaseStatus === "private_staging_deployed") {
    assert(provenance.liveEvidence.chatgptConnectionReceipt === null, "unconnected staging cannot claim ChatGPT evidence");
  }
}
await access(path.join(product, "README.md"));
console.log(`Validated ChatGPT ${provenance.releaseStatus} package: ${expectedTools.length} read-only tools.`);

function assert(condition, message) {
  if (!condition) throw new Error(`ChatGPT release validation failed: ${message}`);
}
