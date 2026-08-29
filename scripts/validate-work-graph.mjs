import { readFile } from "node:fs/promises";

const graphUrl = new URL("../docs/engine/work-graph.json", import.meta.url);
const allowedStates = new Set(["planned", "ready", "in_progress", "blocked", "verified", "completed"]);
const requiredNodeArrays = ["dependencies", "scope", "acceptance", "documentation", "verification", "evidence", "blockers"];

const graph = JSON.parse(await readFile(graphUrl, "utf8"));
const errors = [];

if (graph.schemaVersion !== "1.0.0") {
  errors.push("schemaVersion must be 1.0.0");
}
if (graph.policies?.noMockIntelligence !== true) {
  errors.push("policies.noMockIntelligence must be true");
}
if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
  errors.push("nodes must be a non-empty array");
}

const nodes = new Map();
for (const [index, node] of (graph.nodes ?? []).entries()) {
  const prefix = `nodes[${index}]`;
  if (typeof node.id !== "string" || node.id.length === 0) {
    errors.push(`${prefix}.id must be a non-empty string`);
    continue;
  }
  if (nodes.has(node.id)) {
    errors.push(`duplicate node id: ${node.id}`);
  }
  nodes.set(node.id, node);
  if (!allowedStates.has(node.status)) {
    errors.push(`${node.id} has unsupported status ${String(node.status)}`);
  }
  if (typeof node.ownerRole !== "string" || node.ownerRole.length === 0) {
    errors.push(`${node.id}.ownerRole must be a non-empty string`);
  }
  for (const field of requiredNodeArrays) {
    if (!Array.isArray(node[field])) {
      errors.push(`${node.id}.${field} must be an array`);
    }
  }
  if (node.status === "blocked" && node.blockers?.length === 0) {
    errors.push(`${node.id} is blocked but has no blockers`);
  }
  if ((node.status === "verified" || node.status === "completed") && node.evidence?.length === 0) {
    errors.push(`${node.id} is ${node.status} but has no evidence`);
  }
}

const inProgress = [...nodes.values()].filter((node) => node.status === "in_progress");
if (inProgress.length > 1) {
  errors.push(`only one node may be in_progress, found: ${inProgress.map((node) => node.id).join(", ")}`);
}

for (const node of nodes.values()) {
  for (const dependency of node.dependencies ?? []) {
    if (!nodes.has(dependency)) {
      errors.push(`${node.id} depends on unknown node ${dependency}`);
    }
  }
  if (["ready", "in_progress", "verified", "completed"].includes(node.status)) {
    for (const dependency of node.dependencies ?? []) {
      if (nodes.get(dependency)?.status !== "completed") {
        errors.push(`${node.id} is ${node.status} before dependency ${dependency} is completed`);
      }
    }
  }
}

const visiting = new Set();
const visited = new Set();
function visit(nodeId, path) {
  if (visiting.has(nodeId)) {
    errors.push(`dependency cycle detected: ${[...path, nodeId].join(" -> ")}`);
    return;
  }
  if (visited.has(nodeId) || !nodes.has(nodeId)) {
    return;
  }
  visiting.add(nodeId);
  for (const dependency of nodes.get(nodeId).dependencies ?? []) {
    visit(dependency, [...path, nodeId]);
  }
  visiting.delete(nodeId);
  visited.add(nodeId);
}
for (const nodeId of nodes.keys()) {
  visit(nodeId, []);
}

if (errors.length > 0) {
  throw new Error(`Invalid intelligence-engine work graph:\n- ${errors.join("\n- ")}`);
}

console.log(`work graph valid: ${nodes.size} nodes, ${inProgress.length} in progress`);
