export const ENGINE_CONTRACT_VERSION = "1.0.0" as const;
export const CANDIDATE_EVIDENCE_SCHEMA_VERSION = "1.0.0" as const;
export const CANDIDATE_EVIDENCE_SCHEMA_ID =
  "https://taxlien.local/schemas/candidate-evidence-v1.schema.json" as const;
export const ENGINE_RESULT_SCHEMA_ID =
  "https://taxlien.local/schemas/engine-result-v1.schema.json" as const;

export type EvidenceState = "observed" | "derived" | "unknown" | "not_applicable";

export type EvidenceSourceType =
  | "county_record"
  | "assessor_record"
  | "auction_record"
  | "market_sale"
  | "geospatial"
  | "manual_verification";

export interface EvidenceSourceV1 {
  sourceId: string;
  sourceType: EvidenceSourceType;
  authority: string;
  uri: string;
  retrievedAt: string;
  effectiveAt?: string;
  adapterVersion?: string;
  license?: string;
}

export interface EvidenceFieldV1<T> {
  state: EvidenceState;
  value?: T;
  sourceRefs: string[];
  observedAt?: string;
  derivation?: string;
}

export interface MoneyV1 {
  amount: number;
  currency: string;
}

export interface CandidateEvidenceFieldsV1 {
  parcelId: EvidenceFieldV1<string>;
  lienAmount: EvidenceFieldV1<MoneyV1>;
  estimatedValue: EvidenceFieldV1<MoneyV1>;
  propertyType: EvidenceFieldV1<string>;
  roadAccess: EvidenceFieldV1<boolean>;
  buildable: EvidenceFieldV1<boolean>;
  utilitiesAvailable: EvidenceFieldV1<boolean>;
  locationQuality: EvidenceFieldV1<number>;
}

export interface CandidateEvidenceV1 {
  schemaVersion: typeof CANDIDATE_EVIDENCE_SCHEMA_VERSION;
  evidenceVersion: string;
  requestId: string;
  candidateId: string;
  asOf: string;
  jurisdiction: {
    country: string;
    state: string;
    county: string;
  };
  provenance: EvidenceSourceV1[];
  fields: CandidateEvidenceFieldsV1;
  limitations: string[];
}

export type EngineResultStatus = "assessed" | "insufficient_evidence" | "out_of_scope";
export type ApplicabilityStatus = "applicable" | "unknown" | "out_of_scope";
export type EngineSignalStatus = "available" | "unknown" | "unavailable" | "not_applicable";
export type EngineSignalMethod = "deterministic" | "heuristic" | "model" | "not_computed";
export type EngineSignalUnit = "ratio" | "score" | "probability";
export type EngineSignalKey =
  | "value_coverage_ratio"
  | "redemption_heuristic_signal"
  | "redemption_probability"
  | "liquidity_score"
  | "risk_score"
  | "investment_score";

export interface ModelArtifactRefV1 {
  modelId: string;
  version: string;
  sha256: string;
  trainingDatasetVersion: string;
  evaluationReportUri: string;
}

export interface EngineSignalV1 {
  key: EngineSignalKey;
  status: EngineSignalStatus;
  method: EngineSignalMethod;
  unit: EngineSignalUnit;
  value?: number;
  evidenceRefs: string[];
  explanation: string;
  missingEvidence: string[];
  modelArtifact?: ModelArtifactRefV1;
}

export type EngineFindingSeverity = "info" | "warning" | "exclusion";

export interface EngineFindingV1 {
  code: string;
  severity: EngineFindingSeverity;
  message: string;
  evidenceRefs: string[];
  ruleId?: string;
}

export interface EngineResultV1 {
  contractVersion: typeof ENGINE_CONTRACT_VERSION;
  evidenceSchemaVersion: typeof CANDIDATE_EVIDENCE_SCHEMA_VERSION;
  requestId: string;
  candidateId: string;
  generatedAt: string;
  status: EngineResultStatus;
  versions: {
    engineVersion: string;
    rulePackVersion: string;
    evidenceVersion: string;
  };
  applicability: {
    status: ApplicabilityStatus;
    jurisdiction: string;
    reason: string;
    sourceRefs: string[];
    rulePackId?: string;
  };
  evidenceDigest: string;
  signals: EngineSignalV1[];
  findings: EngineFindingV1[];
  missingEvidence: string[];
  limitations: string[];
}

export interface ContractValidationResult {
  valid: boolean;
  errors: string[];
}

const evidenceStates = new Set<EvidenceState>([
  "observed",
  "derived",
  "unknown",
  "not_applicable",
]);
const evidenceSourceTypes = new Set<EvidenceSourceType>([
  "county_record",
  "assessor_record",
  "auction_record",
  "market_sale",
  "geospatial",
  "manual_verification",
]);
const resultStatuses = new Set<EngineResultStatus>([
  "assessed",
  "insufficient_evidence",
  "out_of_scope",
]);
const applicabilityStatuses = new Set<ApplicabilityStatus>([
  "applicable",
  "unknown",
  "out_of_scope",
]);
const signalStatuses = new Set<EngineSignalStatus>([
  "available",
  "unknown",
  "unavailable",
  "not_applicable",
]);
const signalMethods = new Set<EngineSignalMethod>([
  "deterministic",
  "heuristic",
  "model",
  "not_computed",
]);
const signalUnits = new Set<EngineSignalUnit>([
  "ratio",
  "score",
  "probability",
]);
const signalKeys = new Set<EngineSignalKey>([
  "value_coverage_ratio",
  "redemption_heuristic_signal",
  "redemption_probability",
  "liquidity_score",
  "risk_score",
  "investment_score",
]);
const signalUnitByKey: Record<EngineSignalKey, EngineSignalUnit> = {
  value_coverage_ratio: "ratio",
  redemption_heuristic_signal: "score",
  redemption_probability: "probability",
  liquidity_score: "score",
  risk_score: "score",
  investment_score: "score",
};
const findingSeverities = new Set<EngineFindingSeverity>(["info", "warning", "exclusion"]);
const fieldNames = [
  "parcelId",
  "lienAmount",
  "estimatedValue",
  "propertyType",
  "roadAccess",
  "buildable",
  "utilitiesAvailable",
  "locationQuality",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isIsoDate(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function validateAllowedKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
  errors: string[],
): void {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      errors.push(`${path}${path.length > 0 ? "." : ""}${key} is not allowed.`);
    }
  }
}

function validateString(
  value: unknown,
  path: string,
  errors: string[],
): value is string {
  if (!isNonEmptyString(value)) {
    errors.push(`${path} must be a non-empty string.`);
    return false;
  }

  return true;
}

function validateIsoDate(value: unknown, path: string, errors: string[]): value is string {
  if (!isIsoDate(value)) {
    errors.push(`${path} must be an ISO-8601 UTC timestamp.`);
    return false;
  }

  return true;
}

function validateStringArray(value: unknown, path: string, errors: string[]): value is string[] {
  if (!isStringArray(value)) {
    errors.push(`${path} must be an array of non-empty strings.`);
    return false;
  }

  return true;
}

function validateMoney(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be a money object.`);
    return;
  }

  validateAllowedKeys(value, ["amount", "currency"], path, errors);

  if (typeof value.amount !== "number" || !Number.isFinite(value.amount) || value.amount < 0) {
    errors.push(`${path}.amount must be a finite non-negative number.`);
  }
  if (typeof value.currency !== "string" || !/^[A-Z]{3}$/.test(value.currency)) {
    errors.push(`${path}.currency must be a three-letter uppercase currency code.`);
  }
}

function validateEvidenceValue(fieldName: (typeof fieldNames)[number], value: unknown, path: string, errors: string[]): void {
  switch (fieldName) {
    case "parcelId":
    case "propertyType":
      validateString(value, `${path}.value`, errors);
      return;
    case "lienAmount":
    case "estimatedValue":
      validateMoney(value, `${path}.value`, errors);
      return;
    case "roadAccess":
    case "buildable":
    case "utilitiesAvailable":
      if (typeof value !== "boolean") {
        errors.push(`${path}.value must be a boolean.`);
      }
      return;
    case "locationQuality":
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
        errors.push(`${path}.value must be a finite number from 0 to 100.`);
      }
  }
}

function validateEvidenceField(
  value: unknown,
  fieldName: (typeof fieldNames)[number],
  knownSourceIds: Set<string>,
  errors: string[],
): void {
  const path = `fields.${fieldName}`;
  if (!isRecord(value)) {
    errors.push(`${path} must be an evidence field object.`);
    return;
  }

  validateAllowedKeys(
    value,
    ["state", "value", "sourceRefs", "observedAt", "derivation"],
    path,
    errors,
  );

  const stateValid = evidenceStates.has(value.state as EvidenceState);
  if (!stateValid) {
    errors.push(`${path}.state is unsupported.`);
  }

  const sourceRefs = value.sourceRefs;
  const refsValid = validateStringArray(sourceRefs, `${path}.sourceRefs`, errors);
  if (refsValid) {
    for (const sourceRef of sourceRefs) {
      if (!knownSourceIds.has(sourceRef)) {
        errors.push(`${path}.sourceRefs contains unknown source ${sourceRef}.`);
      }
    }
  }

  if (value.observedAt !== undefined) {
    validateIsoDate(value.observedAt, `${path}.observedAt`, errors);
  }
  if (value.derivation !== undefined) {
    validateString(value.derivation, `${path}.derivation`, errors);
  }

  if (!stateValid) {
    return;
  }

  if (value.state === "observed" || value.state === "derived") {
    if (!("value" in value)) {
      errors.push(`${path}.value is required when state is ${value.state}.`);
    } else {
      validateEvidenceValue(fieldName, value.value, path, errors);
    }
    if (!Array.isArray(value.sourceRefs) || value.sourceRefs.length === 0) {
      errors.push(`${path}.sourceRefs must identify provenance when state is ${value.state}.`);
    }
    if (value.state === "derived" && !isNonEmptyString(value.derivation)) {
      errors.push(`${path}.derivation is required when state is derived.`);
    }
  } else if ("value" in value) {
    errors.push(`${path}.value must be omitted when state is ${value.state}.`);
  }
}

export function validateCandidateEvidenceV1(value: unknown): ContractValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { valid: false, errors: ["Candidate evidence must be an object."] };
  }

  validateAllowedKeys(
    value,
    [
      "schemaVersion",
      "evidenceVersion",
      "requestId",
      "candidateId",
      "asOf",
      "jurisdiction",
      "provenance",
      "fields",
      "limitations",
    ],
    "",
    errors,
  );

  if (value.schemaVersion !== CANDIDATE_EVIDENCE_SCHEMA_VERSION) {
    errors.push(`schemaVersion must equal ${CANDIDATE_EVIDENCE_SCHEMA_VERSION}.`);
  }
  validateString(value.evidenceVersion, "evidenceVersion", errors);
  validateString(value.requestId, "requestId", errors);
  validateString(value.candidateId, "candidateId", errors);
  validateIsoDate(value.asOf, "asOf", errors);
  validateStringArray(value.limitations, "limitations", errors);

  if (!isRecord(value.jurisdiction)) {
    errors.push("jurisdiction must be an object.");
  } else {
    validateAllowedKeys(value.jurisdiction, ["country", "state", "county"], "jurisdiction", errors);
    validateString(value.jurisdiction.country, "jurisdiction.country", errors);
    validateString(value.jurisdiction.state, "jurisdiction.state", errors);
    validateString(value.jurisdiction.county, "jurisdiction.county", errors);
  }

  const sourceIds = new Set<string>();
  if (!Array.isArray(value.provenance)) {
    errors.push("provenance must be an array.");
  } else {
    value.provenance.forEach((source, index) => {
      const path = `provenance[${index}]`;
      if (!isRecord(source)) {
        errors.push(`${path} must be an evidence source object.`);
        return;
      }

      validateAllowedKeys(
        source,
        [
          "sourceId",
          "sourceType",
          "authority",
          "uri",
          "retrievedAt",
          "effectiveAt",
          "adapterVersion",
          "license",
        ],
        path,
        errors,
      );

      if (validateString(source.sourceId, `${path}.sourceId`, errors)) {
        if (sourceIds.has(source.sourceId)) {
          errors.push(`${path}.sourceId must be unique.`);
        }
        sourceIds.add(source.sourceId);
      }
      if (!evidenceSourceTypes.has(source.sourceType as EvidenceSourceType)) {
        errors.push(`${path}.sourceType is unsupported.`);
      }
      validateString(source.authority, `${path}.authority`, errors);
      validateString(source.uri, `${path}.uri`, errors);
      validateIsoDate(source.retrievedAt, `${path}.retrievedAt`, errors);
      if (source.effectiveAt !== undefined) {
        validateIsoDate(source.effectiveAt, `${path}.effectiveAt`, errors);
      }
      if (source.adapterVersion !== undefined) {
        validateString(source.adapterVersion, `${path}.adapterVersion`, errors);
      }
      if (source.license !== undefined) {
        validateString(source.license, `${path}.license`, errors);
      }
    });
  }

  if (!isRecord(value.fields)) {
    errors.push("fields must be an object.");
  } else {
    validateAllowedKeys(value.fields, fieldNames, "fields", errors);
    for (const fieldName of fieldNames) {
      validateEvidenceField(value.fields[fieldName], fieldName, sourceIds, errors);
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateModelArtifact(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be a model artifact reference.`);
    return;
  }

  validateAllowedKeys(
    value,
    ["modelId", "version", "sha256", "trainingDatasetVersion", "evaluationReportUri"],
    path,
    errors,
  );

  validateString(value.modelId, `${path}.modelId`, errors);
  validateString(value.version, `${path}.version`, errors);
  if (!isSha256(value.sha256)) {
    errors.push(`${path}.sha256 must be a 64-character hexadecimal digest.`);
  }
  validateString(value.trainingDatasetVersion, `${path}.trainingDatasetVersion`, errors);
  validateString(value.evaluationReportUri, `${path}.evaluationReportUri`, errors);
}

function validateSignal(value: unknown, index: number, errors: string[]): void {
  const path = `signals[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${path} must be an engine signal object.`);
    return;
  }

  validateAllowedKeys(
    value,
    [
      "key",
      "status",
      "method",
      "unit",
      "value",
      "evidenceRefs",
      "explanation",
      "missingEvidence",
      "modelArtifact",
    ],
    path,
    errors,
  );

  const key = value.key as EngineSignalKey;
  const status = value.status as EngineSignalStatus;
  const method = value.method as EngineSignalMethod;
  const unit = value.unit as EngineSignalUnit;
  if (!signalKeys.has(key)) {
    errors.push(`${path}.key is unsupported.`);
  }
  if (!signalStatuses.has(status)) {
    errors.push(`${path}.status is unsupported.`);
  }
  if (!signalMethods.has(method)) {
    errors.push(`${path}.method is unsupported.`);
  }
  if (!signalUnits.has(unit)) {
    errors.push(`${path}.unit is unsupported.`);
  }
  validateStringArray(value.evidenceRefs, `${path}.evidenceRefs`, errors);
  validateString(value.explanation, `${path}.explanation`, errors);
  validateStringArray(value.missingEvidence, `${path}.missingEvidence`, errors);

  if (status === "available") {
    if (method === "not_computed") {
      errors.push(`${path}.method cannot be not_computed when status is available.`);
    }
    if (typeof value.value !== "number" || !Number.isFinite(value.value)) {
      errors.push(`${path}.value must be a finite number when status is available.`);
    }
  } else {
    if ("value" in value) {
      errors.push(`${path}.value must be omitted when status is ${String(status)}.`);
    }
    if (method !== "not_computed") {
      errors.push(`${path}.method must be not_computed when status is ${String(status)}.`);
    }
  }

  if (signalKeys.has(key) && signalUnits.has(unit) && signalUnitByKey[key] !== unit) {
    errors.push(`${path}.unit must be ${signalUnitByKey[key]} for ${key}.`);
  }
  if (unit === "probability" && typeof value.value === "number" && (value.value < 0 || value.value > 1)) {
    errors.push(`${path}.value must be between 0 and 1 for a probability.`);
  }
  if (unit === "score" && typeof value.value === "number" && (value.value < 0 || value.value > 100)) {
    errors.push(`${path}.value must be between 0 and 100 for a score.`);
  }
  if (unit === "ratio" && typeof value.value === "number" && value.value < 0) {
    errors.push(`${path}.value must be non-negative for a ratio.`);
  }

  if (method === "model") {
    validateModelArtifact(value.modelArtifact, `${path}.modelArtifact`, errors);
  } else if (value.modelArtifact !== undefined) {
    errors.push(`${path}.modelArtifact is only allowed for model signals.`);
  }

  if (key === "redemption_probability" && status === "available") {
    if (method !== "model") {
      errors.push(`${path} redemption_probability must be produced by a versioned model artifact.`);
    }
    if (unit !== "probability") {
      errors.push(`${path} redemption_probability must use the probability unit.`);
    }
  }
  if (key === "redemption_heuristic_signal") {
    if (status === "available" && method !== "heuristic") {
      errors.push(`${path} redemption_heuristic_signal must use the heuristic method.`);
    }
    if (unit === "probability") {
      errors.push(`${path} redemption_heuristic_signal cannot use the probability unit.`);
    }
  }
}

export function validateEngineResultV1(value: unknown): ContractValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { valid: false, errors: ["Engine result must be an object."] };
  }

  validateAllowedKeys(
    value,
    [
      "contractVersion",
      "evidenceSchemaVersion",
      "requestId",
      "candidateId",
      "generatedAt",
      "status",
      "versions",
      "applicability",
      "evidenceDigest",
      "signals",
      "findings",
      "missingEvidence",
      "limitations",
    ],
    "",
    errors,
  );

  if (value.contractVersion !== ENGINE_CONTRACT_VERSION) {
    errors.push(`contractVersion must equal ${ENGINE_CONTRACT_VERSION}.`);
  }
  if (value.evidenceSchemaVersion !== CANDIDATE_EVIDENCE_SCHEMA_VERSION) {
    errors.push(`evidenceSchemaVersion must equal ${CANDIDATE_EVIDENCE_SCHEMA_VERSION}.`);
  }
  validateString(value.requestId, "requestId", errors);
  validateString(value.candidateId, "candidateId", errors);
  validateIsoDate(value.generatedAt, "generatedAt", errors);
  validateStringArray(value.missingEvidence, "missingEvidence", errors);
  validateStringArray(value.limitations, "limitations", errors);
  if (!isSha256(value.evidenceDigest)) {
    errors.push("evidenceDigest must be a 64-character hexadecimal digest.");
  }

  const status = value.status as EngineResultStatus;
  if (!resultStatuses.has(status)) {
    errors.push("status is unsupported.");
  }

  if (!isRecord(value.versions)) {
    errors.push("versions must be an object.");
  } else {
    validateAllowedKeys(
      value.versions,
      ["engineVersion", "rulePackVersion", "evidenceVersion"],
      "versions",
      errors,
    );
    validateString(value.versions.engineVersion, "versions.engineVersion", errors);
    validateString(value.versions.rulePackVersion, "versions.rulePackVersion", errors);
    validateString(value.versions.evidenceVersion, "versions.evidenceVersion", errors);
  }

  let applicabilityStatus: ApplicabilityStatus | undefined;
  if (!isRecord(value.applicability)) {
    errors.push("applicability must be an object.");
  } else {
    validateAllowedKeys(
      value.applicability,
      ["status", "jurisdiction", "reason", "sourceRefs", "rulePackId"],
      "applicability",
      errors,
    );
    applicabilityStatus = value.applicability.status as ApplicabilityStatus;
    if (!applicabilityStatuses.has(applicabilityStatus)) {
      errors.push("applicability.status is unsupported.");
    }
    validateString(value.applicability.jurisdiction, "applicability.jurisdiction", errors);
    validateString(value.applicability.reason, "applicability.reason", errors);
    validateStringArray(value.applicability.sourceRefs, "applicability.sourceRefs", errors);
    if (value.applicability.rulePackId !== undefined) {
      validateString(value.applicability.rulePackId, "applicability.rulePackId", errors);
    }
  }

  const signalKeySet = new Set<string>();
  if (!Array.isArray(value.signals)) {
    errors.push("signals must be an array.");
  } else {
    value.signals.forEach((signal, index) => {
      validateSignal(signal, index, errors);
      if (isRecord(signal) && isNonEmptyString(signal.key)) {
        if (signalKeySet.has(signal.key)) {
          errors.push(`signals[${index}].key must be unique.`);
        }
        signalKeySet.add(signal.key);
      }
    });

    if (status === "assessed" && !value.signals.some((signal) => isRecord(signal) && signal.status === "available")) {
      errors.push("assessed results must contain at least one available signal.");
    }
  }

  if (!Array.isArray(value.findings)) {
    errors.push("findings must be an array.");
  } else {
    value.findings.forEach((finding, index) => {
      const path = `findings[${index}]`;
      if (!isRecord(finding)) {
        errors.push(`${path} must be an engine finding object.`);
        return;
      }
      validateAllowedKeys(
        finding,
        ["code", "severity", "message", "evidenceRefs", "ruleId"],
        path,
        errors,
      );
      validateString(finding.code, `${path}.code`, errors);
      if (!findingSeverities.has(finding.severity as EngineFindingSeverity)) {
        errors.push(`${path}.severity is unsupported.`);
      }
      validateString(finding.message, `${path}.message`, errors);
      validateStringArray(finding.evidenceRefs, `${path}.evidenceRefs`, errors);
      if (finding.ruleId !== undefined) {
        validateString(finding.ruleId, `${path}.ruleId`, errors);
      }
    });
  }

  if (status === "out_of_scope" && applicabilityStatus !== "out_of_scope") {
    errors.push("out_of_scope results require out_of_scope applicability.");
  }
  if (status === "assessed" && applicabilityStatus !== "applicable") {
    errors.push("assessed results require applicable applicability.");
  }

  return { valid: errors.length === 0, errors };
}
