import type {
  DatasetImportSummary,
  DatasetReadinessFieldCoverage,
  DatasetReadinessFieldName,
  DatasetReadinessIssue,
  DatasetReadinessSummary,
  DatasetValidationSummary,
} from "@tax-lien/types";
import { normalizeDatasetRow } from "../scoring/normalization.js";
import type { StoredDatasetSourceRow } from "./dataset-store.js";

interface ReadinessFieldDefinition {
  field: DatasetReadinessFieldName;
  label: string;
  importance: DatasetReadinessFieldCoverage["importance"];
  weight: number;
}

const readinessFields: ReadinessFieldDefinition[] = [
  { field: "parcel_id", label: "Parcel identifier", importance: "important", weight: 20 },
  { field: "lien_amount", label: "Lien amount", importance: "required", weight: 25 },
  { field: "estimated_value", label: "Estimated value", importance: "required", weight: 25 },
  { field: "property_type", label: "Property type", importance: "important", weight: 20 },
  { field: "address", label: "Address context", importance: "helpful", weight: 10 },
];

export function calculateDatasetReadiness(input: {
  sourceRows: StoredDatasetSourceRow[];
  importSummary: DatasetImportSummary;
  validationSummary: DatasetValidationSummary;
}): DatasetReadinessSummary {
  const fieldCoverage = calculateFieldCoverage(input.sourceRows);
  const coverageByField = new Map(fieldCoverage.map((coverage) => [coverage.field, coverage]));
  const weightedScore = fieldCoverage.reduce(
    (total, coverage) =>
      total + (coverage.coveragePercent / 100) * (readinessFields.find((field) => field.field === coverage.field)?.weight ?? 0),
    0,
  );
  const importAdjustment = importConfidenceAdjustment(input.importSummary);
  const validationAdjustment = input.validationSummary.invalidRows > 0 ? -5 : 0;
  const score = clampScore(Math.round(weightedScore + importAdjustment + validationAdjustment));
  const issues = buildIssues({
    fieldCoverage,
    importSummary: input.importSummary,
    validationSummary: input.validationSummary,
  });
  const status = readinessStatus(score, issues, coverageByField);

  return {
    status,
    score,
    scoringRecommended: status === "ready" || status === "partial",
    fieldCoverage,
    issues,
    guidance: readinessGuidance(status),
  };
}

function calculateFieldCoverage(sourceRows: StoredDatasetSourceRow[]): DatasetReadinessFieldCoverage[] {
  const totalRows = sourceRows.length;
  const counters: Record<DatasetReadinessFieldName, number> = {
    parcel_id: 0,
    lien_amount: 0,
    estimated_value: 0,
    property_type: 0,
    address: 0,
  };

  for (const sourceRow of sourceRows) {
    const normalized = normalizeDatasetRow(sourceRow).normalizedFields;
    if (normalized.parcelId) counters.parcel_id += 1;
    if (normalized.lienAmount !== undefined) counters.lien_amount += 1;
    if (normalized.estimatedValue !== undefined) counters.estimated_value += 1;
    if (normalized.propertyType) counters.property_type += 1;
    if (normalized.address) counters.address += 1;
  }

  return readinessFields.map((field) => ({
    field: field.field,
    label: field.label,
    presentRows: counters[field.field],
    totalRows,
    coveragePercent: percentage(counters[field.field], totalRows),
    importance: field.importance,
  }));
}

function buildIssues(input: {
  fieldCoverage: DatasetReadinessFieldCoverage[];
  importSummary: DatasetImportSummary;
  validationSummary: DatasetValidationSummary;
}): DatasetReadinessIssue[] {
  const coverageByField = new Map(input.fieldCoverage.map((coverage) => [coverage.field, coverage]));
  const issues: DatasetReadinessIssue[] = [];

  addCoverageIssue(issues, coverageByField.get("parcel_id"), "missing_parcel_identifier", "weak_parcel_identifier_mapping");
  addCoverageIssue(issues, coverageByField.get("lien_amount"), "missing_lien_amount", "weak_lien_amount_mapping");
  addCoverageIssue(issues, coverageByField.get("estimated_value"), "missing_estimated_value", "weak_estimated_value_mapping");
  addCoverageIssue(issues, coverageByField.get("property_type"), "missing_property_type", "weak_property_type_mapping");

  const addressCoverage = coverageByField.get("address");
  if (addressCoverage && addressCoverage.coveragePercent === 0) {
    issues.push({
      code: "weak_address_context",
      severity: "info",
      message: "No address context was recognized; location-sensitive review will be limited.",
      field: "address",
    });
  }

  if (input.importSummary.fallbackUsed) {
    issues.push({
      code: "generic_fallback_used",
      severity: "info",
      message: "No county-specific adapter matched; generic CSV mapping was used.",
    });
  }

  if (input.importSummary.adapterMatched && input.importSummary.confidence === "low") {
    issues.push({
      code: "low_confidence_adapter_match",
      severity: "warning",
      message: "The county adapter matched with low confidence; verify mapped fields before relying on scores.",
    });
  }

  for (const warning of input.importSummary.warnings) {
    issues.push({
      code: "import_warning",
      severity: "warning",
      message: warning,
    });
  }

  if (input.validationSummary.invalidRows > 0) {
    issues.push({
      code: "invalid_rows_ignored",
      severity: "warning",
      message: `${input.validationSummary.invalidRows} blank row(s) were ignored during validation.`,
    });
  }

  const sparseRowRatio = input.validationSummary.validRows > 0
    ? averagePresentCoreFields(input.fieldCoverage) / readinessFields.length
    : 0;
  if (sparseRowRatio < 0.45) {
    issues.push({
      code: "thin_rows",
      severity: "warning",
      message: "Rows have sparse usable field coverage; downstream scoring confidence will be limited.",
    });
  }

  return issues;
}

function addCoverageIssue(
  issues: DatasetReadinessIssue[],
  coverage: DatasetReadinessFieldCoverage | undefined,
  missingCode: string,
  weakCode: string,
): void {
  if (!coverage) {
    return;
  }

  if (coverage.coveragePercent === 0) {
    issues.push({
      code: missingCode,
      severity: coverage.importance === "required" ? "error" : "warning",
      message: `${coverage.label} was not recognized in any usable row.`,
      field: coverage.field,
    });
    return;
  }

  if (coverage.coveragePercent < 80) {
    issues.push({
      code: weakCode,
      severity: coverage.importance === "required" ? "warning" : "info",
      message: `${coverage.label} was recognized in ${coverage.coveragePercent}% of usable rows.`,
      field: coverage.field,
    });
  }
}

function readinessStatus(
  score: number,
  issues: DatasetReadinessIssue[],
  coverageByField: Map<DatasetReadinessFieldName, DatasetReadinessFieldCoverage>,
): DatasetReadinessSummary["status"] {
  const lienCoverage = coverageByField.get("lien_amount")?.coveragePercent ?? 0;
  const valueCoverage = coverageByField.get("estimated_value")?.coveragePercent ?? 0;
  const hasBlockingIssue = issues.some((issue) => issue.severity === "error");

  if (lienCoverage === 0 || valueCoverage === 0 || hasBlockingIssue) {
    return "blocked";
  }

  if (score >= 80) {
    return "ready";
  }

  if (score >= 55) {
    return "partial";
  }

  return "weak";
}

function readinessGuidance(status: DatasetReadinessSummary["status"]): string[] {
  switch (status) {
    case "ready":
      return ["Import quality is strong enough for scoring review.", "Still inspect flags and reasoning before acting."];
    case "partial":
      return ["Scoring is possible, but review warnings before trusting rankings.", "Consider re-uploading if key fields are missing."];
    case "weak":
      return ["Scoring would be low-confidence with this import.", "Improve source columns before relying on ranked results."];
    case "blocked":
      return ["Do not rely on scoring until required lien and value fields are recognized.", "Re-upload with clearer amount and value columns."];
  }
}

function importConfidenceAdjustment(importSummary: DatasetImportSummary): number {
  if (!importSummary.adapterMatched) {
    return -5;
  }

  switch (importSummary.confidence) {
    case "high":
      return 5;
    case "medium":
      return 0;
    case "low":
      return -10;
  }
}

function averagePresentCoreFields(fieldCoverage: DatasetReadinessFieldCoverage[]): number {
  if (fieldCoverage.length === 0) {
    return 0;
  }

  return fieldCoverage.reduce((total, coverage) => total + coverage.coveragePercent / 100, 0);
}

function percentage(value: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}
