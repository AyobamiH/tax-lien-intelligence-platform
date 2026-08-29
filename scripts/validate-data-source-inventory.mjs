import { readFile } from "node:fs/promises";

const inventoryUrl = new URL("../docs/engine/data-source-inventory.json", import.meta.url);
const inventory = JSON.parse(await readFile(inventoryUrl, "utf8"));
const errors = [];

const allowedReviewStates = new Set([
  "verified",
  "conditional",
  "unknown",
  "unavailable",
  "unverified",
  "restricted",
  "not_applicable"
]);
const allowedProductionStates = new Set(["approved", "reference_only", "evidence_only", "blocked"]);
const allowedCommercialUse = new Set([
  "allowed",
  "unknown",
  "not_applicable",
  "prohibited_without_written_authorization",
  "user_responsibility_not_attested"
]);
const requiredReviewSections = [
  "access",
  "schema",
  "cadence",
  "historicalCoverage",
  "observationTimestamp",
  "terms",
  "outcomeLabels"
];

function isCanonicalTimestamp(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

if (inventory.schemaVersion !== "1.0.0") {
  errors.push("schemaVersion must be 1.0.0");
}
if (!isCanonicalTimestamp(inventory.reviewedAt)) {
  errors.push("reviewedAt must be a canonical ISO timestamp");
}
if (inventory.policies?.noUnverifiedProductionData !== true) {
  errors.push("policies.noUnverifiedProductionData must be true");
}
if (inventory.policies?.datedOutcomeAndCensoringFieldsRequiredForTraining !== true) {
  errors.push("policies.datedOutcomeAndCensoringFieldsRequiredForTraining must be true");
}
if (!Array.isArray(inventory.sources) || inventory.sources.length === 0) {
  errors.push("sources must be a non-empty array");
}

const sourceIds = new Set();
for (const [index, source] of (inventory.sources ?? []).entries()) {
  const prefix = `sources[${index}]`;
  if (!isNonEmptyString(source.id)) {
    errors.push(`${prefix}.id must be a non-empty string`);
    continue;
  }
  if (sourceIds.has(source.id)) {
    errors.push(`duplicate source id: ${source.id}`);
  }
  sourceIds.add(source.id);

  if (!isNonEmptyString(source.title) || !isNonEmptyString(source.sourceClass)) {
    errors.push(`${source.id} must declare title and sourceClass`);
  }
  if (!isNonEmptyString(source.authority?.publisher) || !allowedReviewStates.has(source.authority?.status)) {
    errors.push(`${source.id}.authority must declare a publisher and valid status`);
  }
  if (!Array.isArray(source.authority?.urls)) {
    errors.push(`${source.id}.authority.urls must be an array`);
  }
  for (const url of source.authority?.urls ?? []) {
    if (!isNonEmptyString(url) || !url.startsWith("https://")) {
      errors.push(`${source.id} authority URL must use HTTPS: ${String(url)}`);
    }
  }

  for (const section of requiredReviewSections) {
    if (!source[section] || !allowedReviewStates.has(source[section].status)) {
      errors.push(`${source.id}.${section} must declare a valid review status`);
    }
    if (!isNonEmptyString(source[section]?.evidence) && !isNonEmptyString(source[section]?.notes)) {
      errors.push(`${source.id}.${section} must provide evidence or notes`);
    }
  }
  if (!Array.isArray(source.schema?.fields)) {
    errors.push(`${source.id}.schema.fields must be an array`);
  }
  if (!isNonEmptyString(source.cadence?.value)) {
    errors.push(`${source.id}.cadence.value must be a non-empty string`);
  }
  if (!isNonEmptyString(source.historicalCoverage?.value)) {
    errors.push(`${source.id}.historicalCoverage.value must be a non-empty string`);
  }
  if (!isNonEmptyString(source.observationTimestamp?.value)) {
    errors.push(`${source.id}.observationTimestamp.value must be a non-empty string`);
  }
  if (!allowedCommercialUse.has(source.terms?.commercialUse)) {
    errors.push(`${source.id}.terms.commercialUse is invalid`);
  }
  if (!Array.isArray(source.outcomeLabels?.eventFields) || !Array.isArray(source.outcomeLabels?.censoringFields)) {
    errors.push(`${source.id}.outcomeLabels must declare eventFields and censoringFields arrays`);
  }
  if (!source.pii || !Array.isArray(source.pii.fields) || !Array.isArray(source.pii.controlsRequired)) {
    errors.push(`${source.id}.pii must declare fields and controlsRequired arrays`);
  }

  const decision = source.productionDecision;
  if (!allowedProductionStates.has(decision?.status)) {
    errors.push(`${source.id}.productionDecision.status is invalid`);
  }
  for (const field of ["uses", "reasons", "unblockingConditions"]) {
    if (!Array.isArray(decision?.[field])) {
      errors.push(`${source.id}.productionDecision.${field} must be an array`);
    }
  }
  if (decision?.status === "blocked" && (decision.reasons?.length === 0 || decision.unblockingConditions?.length === 0)) {
    errors.push(`${source.id} is blocked without reasons and unblocking conditions`);
  }
  if (decision?.status === "approved") {
    if (source.authority.status !== "verified") {
      errors.push(`${source.id} is approved without verified authority`);
    }
    if (source.schema.status !== "verified" || source.cadence.status !== "verified") {
      errors.push(`${source.id} is approved without verified schema and cadence`);
    }
    if (source.observationTimestamp.status !== "verified") {
      errors.push(`${source.id} is approved without a verified observation timestamp`);
    }
    if (source.terms.status !== "verified" || source.terms.commercialUse !== "allowed") {
      errors.push(`${source.id} is approved without verified commercial-use permission`);
    }
  }
  if (decision?.uses?.includes("model_training")) {
    if (decision.status !== "approved") {
      errors.push(`${source.id} declares model_training without approved production status`);
    }
    if (source.outcomeLabels.status !== "verified") {
      errors.push(`${source.id} declares model_training without verified outcomes`);
    }
    if (source.outcomeLabels.eventFields.length === 0 || source.outcomeLabels.censoringFields.length === 0) {
      errors.push(`${source.id} declares model_training without event and censoring fields`);
    }
  }

  if (!isCanonicalTimestamp(source.provenance?.checkedAt)) {
    errors.push(`${source.id}.provenance.checkedAt must be a canonical ISO timestamp`);
  }
  if (!isNonEmptyString(source.provenance?.checkMethod)) {
    errors.push(`${source.id}.provenance.checkMethod must be a non-empty string`);
  }
  if (!Array.isArray(source.provenance?.evidenceUrls) || !Array.isArray(source.provenance?.artifactDigests)) {
    errors.push(`${source.id}.provenance must declare evidenceUrls and artifactDigests arrays`);
  }
  for (const url of source.provenance?.evidenceUrls ?? []) {
    if (!isNonEmptyString(url) || !url.startsWith("https://")) {
      errors.push(`${source.id} evidence URL must use HTTPS: ${String(url)}`);
    }
  }
}

const datasetCard = inventory.trainingDatasetCard;
if (!datasetCard || !["blocked", "ready", "approved"].includes(datasetCard.status)) {
  errors.push("trainingDatasetCard must declare blocked, ready, or approved status");
} else {
  for (const field of [
    "requiredIdentityFields",
    "requiredOutcomeFields",
    "prohibitedLeakage",
    "approvedSourceIds",
    "blockers",
    "unblockingConditions"
  ]) {
    if (!Array.isArray(datasetCard[field])) {
      errors.push(`trainingDatasetCard.${field} must be an array`);
    }
  }
  if (datasetCard.status === "blocked" && (datasetCard.blockers?.length === 0 || datasetCard.unblockingConditions?.length === 0)) {
    errors.push("blocked trainingDatasetCard must declare blockers and unblockingConditions");
  }
  for (const sourceId of datasetCard.approvedSourceIds ?? []) {
    const source = inventory.sources.find((candidate) => candidate.id === sourceId);
    if (!source) {
      errors.push(`trainingDatasetCard references unknown source ${sourceId}`);
    } else if (source.productionDecision.status !== "approved" || !source.productionDecision.uses.includes("model_training")) {
      errors.push(`trainingDatasetCard source ${sourceId} is not approved for model_training`);
    }
  }
  if (["ready", "approved"].includes(datasetCard.status) && datasetCard.approvedSourceIds?.length === 0) {
    errors.push(`${datasetCard.status} trainingDatasetCard must reference an approved training source`);
  }
}

if (errors.length > 0) {
  throw new Error(`Invalid intelligence-engine data source inventory:\n- ${errors.join("\n- ")}`);
}

const decisions = Object.fromEntries(
  [...allowedProductionStates].map((status) => [
    status,
    inventory.sources.filter((source) => source.productionDecision.status === status).length
  ])
);
console.log(
  `data source inventory valid: ${inventory.sources.length} sources, ${decisions.approved} approved, ${decisions.blocked} blocked, training ${datasetCard.status}`
);
