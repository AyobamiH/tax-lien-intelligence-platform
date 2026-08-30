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

const focus = graph.executionFocus;
if (focus?.priority !== "chatgpt-product") {
  errors.push("executionFocus.priority must be chatgpt-product");
}
if (focus?.wipLimit !== 1) {
  errors.push("executionFocus.wipLimit must be 1");
}
if (focus?.parallelProductTracksAllowed !== false) {
  errors.push("executionFocus.parallelProductTracksAllowed must be false");
}
for (const field of ["activeSequence", "deferredNodes"]) {
  if (!Array.isArray(focus?.[field]) || focus[field].length === 0) {
    errors.push(`executionFocus.${field} must be a non-empty array`);
  }
}
if (typeof focus?.nextNode !== "string" || focus.nextNode.length === 0) {
  errors.push("executionFocus.nextNode must be a non-empty string");
}
if (typeof focus?.resumeCondition !== "string" || focus.resumeCondition.length === 0) {
  errors.push("executionFocus.resumeCondition must be a non-empty string");
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

const focusedIds = new Set(focus?.activeSequence ?? []);
const deferredIds = new Set(focus?.deferredNodes ?? []);
for (const [field, ids] of [
  ["activeSequence", focus?.activeSequence ?? []],
  ["deferredNodes", focus?.deferredNodes ?? []],
]) {
  if (new Set(ids).size !== ids.length) {
    errors.push(`executionFocus.${field} must not contain duplicate node ids`);
  }
  for (const id of ids) {
    if (!nodes.has(id)) {
      errors.push(`executionFocus.${field} references unknown node ${id}`);
    }
  }
}
for (const id of focusedIds) {
  if (deferredIds.has(id)) {
    errors.push(`${id} cannot be both active and deferred`);
  }
}
if (!focusedIds.has(focus?.nextNode)) {
  errors.push("executionFocus.nextNode must appear in activeSequence");
}
const nextNode = nodes.get(focus?.nextNode);
if (nextNode && !["ready", "in_progress", "blocked"].includes(nextNode.status)) {
  errors.push(`executionFocus.nextNode ${nextNode.id} must be ready, in_progress, or blocked`);
}
const runnable = [...nodes.values()].filter((node) => ["ready", "in_progress"].includes(node.status));
if (runnable.length > 1) {
  errors.push(`at most one node may be ready or in_progress during ChatGPT priority focus, found: ${runnable.map((node) => node.id).join(", ")}`);
}
if (nextNode && ["ready", "in_progress"].includes(nextNode.status) && runnable.length !== 1) {
  errors.push(`executionFocus.nextNode ${nextNode.id} is ${nextNode.status} but no single runnable node exists`);
}
if (nextNode?.status === "blocked" && runnable.length !== 0) {
  errors.push(`executionFocus.nextNode ${nextNode.id} is blocked but another node is runnable`);
}
for (const node of runnable) {
  if (!focusedIds.has(node.id)) {
    errors.push(`${node.id} is ${node.status} outside the active ChatGPT product sequence`);
  }
  if (node.id !== focus?.nextNode) {
    errors.push(`${node.id} is ${node.status} but executionFocus.nextNode is ${String(focus?.nextNode)}`);
  }
}
for (const id of deferredIds) {
  const node = nodes.get(id);
  if (node && ["ready", "in_progress", "verified"].includes(node.status)) {
    errors.push(`deferred node ${id} must not be ${node.status}`);
  }
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

console.log(`work graph valid: ${nodes.size} nodes, ${inProgress.length} in progress, focus ${focus.priority}, next ${focus.nextNode}`);
