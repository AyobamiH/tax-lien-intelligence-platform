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
assert(!("mcpServers" in manifest), "source-only package must not publish an unverified MCP endpoint");
assert(provenance.releaseStatus === "source_only", "unverified package must remain source_only");
assert(/^[a-f0-9]{40}$/.test(provenance.systemOfRecord.engineRevision), "engine revision must be a full commit");
assert(provenance.systemOfRecord.mcpContractVersion === "1.0.0", "MCP contract version drifted");
assert(JSON.stringify(provenance.approvedTools) === JSON.stringify(expectedTools), "approved tool inventory drifted");
assert(provenance.permissions.readOnly === true, "ChatGPT package must remain read-only");
assert(provenance.permissions.writes === false, "write permission is prohibited");
assert(provenance.connection.mcpUrl === null, "source-only package cannot claim a deployment URL");
assert(provenance.connection.oauthIssuer === null, "source-only package cannot claim an OAuth issuer");
for (const receipt of Object.values(provenance.liveEvidence)) {
  assert(receipt === null, "source-only package cannot claim live evidence");
}
await access(path.join(product, "README.md"));
console.log(`Validated ChatGPT source package: ${expectedTools.length} read-only tools, no unverified endpoint.`);

function assert(condition, message) {
  if (!condition) throw new Error(`ChatGPT release validation failed: ${message}`);
}
