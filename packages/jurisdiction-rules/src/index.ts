import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  CANDIDATE_EVIDENCE_SCHEMA_VERSION,
  ENGINE_CONTRACT_VERSION,
  type CandidateEvidenceV1,
  type EngineFindingSeverity,
  type EngineFindingV1,
  type EngineResultV1,
  type EvidenceFieldV1,
  validateCandidateEvidenceV1,
  validateEngineResultV1,
} from "@tax-lien/engine-contract";

export const RULE_PACK_INTERFACE_VERSION = "1.0.0" as const;
export const RULE_ENGINE_VERSION = "jurisdiction-rules-1.1.0" as const;

export type RuleSourceClass = "official_statute" | "official_county" | "internal_policy";
export type RuleCategory = "statutory_context" | "county_operation" | "underwriting_policy";
export type RuleEvaluation =
  | "always_disclose"
  | "value_coverage_below_one"
  | "road_access_false";

export interface RuleCitationV1 {
  citationId: string;
  sourceClass: RuleSourceClass;
  authority: string;
  title: string;
  section: string;
  uri: string;
  verifiedAt: string;
}

export interface JurisdictionRuleV1 {
  ruleId: string;
  category: RuleCategory;
  evaluation: RuleEvaluation;
  severity: EngineFindingSeverity;
  message: string;
  citationIds: readonly string[];
}

export interface JurisdictionRulePackV1 {
  interfaceVersion: typeof RULE_PACK_INTERFACE_VERSION;
  packId: string;
  version: string;
  verifiedAt: string;
  jurisdiction: {
    country: string;
    state: string;
    county: string;
  };
  supportedEvidenceSchemaVersion: typeof CANDIDATE_EVIDENCE_SCHEMA_VERSION;
  legalReviewStatus: "primary_sources_verified_not_legal_advice";
  operationalAuctionRulesStatus: "not_verified" | "verified";
  citations: readonly RuleCitationV1[];
  rules: readonly JurisdictionRuleV1[];
  limitations: readonly string[];
}

export interface RuleEvaluationOptions {
  generatedAt?: string;
}

export type RuleEvaluationOutcome =
  | {
      ok: true;
      result: EngineResultV1;
      rulePack?: JurisdictionRulePackV1;
    }
  | {
      ok: false;
      kind: "invalid_evidence" | "invalid_options" | "contract_violation";
      errors: string[];
    };

const verifiedAt = "2026-08-29T09:15:00.000Z";

export const ARIZONA_MARICOPA_RULE_PACK_V1 = {
  interfaceVersion: RULE_PACK_INTERFACE_VERSION,
  packId: "us-az-maricopa-statutory-baseline",
  version: "2026-08-29.1",
  verifiedAt,
  jurisdiction: {
    country: "US",
    state: "AZ",
    county: "Maricopa",
  },
  supportedEvidenceSchemaVersion: CANDIDATE_EVIDENCE_SCHEMA_VERSION,
  legalReviewStatus: "primary_sources_verified_not_legal_advice",
  operationalAuctionRulesStatus: "not_verified",
  citations: [
    {
      citationId: "ars-42-18101",
      sourceClass: "official_statute",
      authority: "Arizona State Legislature",
      title: "Sale and foreclosure of tax liens",
      section: "A.R.S. 42-18101",
      uri: "https://www.azleg.gov/ars/42/18101.htm",
      verifiedAt,
    },
    {
      citationId: "ars-42-18114",
      sourceClass: "official_statute",
      authority: "Arizona State Legislature",
      title: "Successful purchaser",
      section: "A.R.S. 42-18114",
      uri: "https://www.azleg.gov/ars/42/18114.htm",
      verifiedAt,
    },
    {
      citationId: "ars-42-18053",
      sourceClass: "official_statute",
      authority: "Arizona State Legislature",
      title: "Interest on delinquent taxes",
      section: "A.R.S. 42-18053",
      uri: "https://www.azleg.gov/ars/42/18053.htm",
      verifiedAt,
    },
    {
      citationId: "ars-42-18115",
      sourceClass: "official_statute",
      authority: "Arizona State Legislature",
      title: "Easements and liens not extinguished by sale",
      section: "A.R.S. 42-18115",
      uri: "https://www.azleg.gov/ars/42/18115.htm",
      verifiedAt,
    },
    {
      citationId: "ars-42-18118",
      sourceClass: "official_statute",
      authority: "Arizona State Legislature",
      title: "Certificate of purchase",
      section: "A.R.S. 42-18118",
      uri: "https://www.azleg.gov/ars/42/18118.htm",
      verifiedAt,
    },
    {
      citationId: "ars-42-18127",
      sourceClass: "official_statute",
      authority: "Arizona State Legislature",
      title: "Expiration of lien and certificate",
      section: "A.R.S. 42-18127",
      uri: "https://www.azleg.gov/ars/42/18127.htm",
      verifiedAt,
    },
    {
      citationId: "ars-42-18152",
      sourceClass: "official_statute",
      authority: "Arizona State Legislature",
      title: "When lien may be fully redeemed",
      section: "A.R.S. 42-18152",
      uri: "https://www.azleg.gov/ars/42/18152.htm",
      verifiedAt,
    },
    {
      citationId: "ars-42-18201",
      sourceClass: "official_statute",
      authority: "Arizona State Legislature",
      title: "Action to foreclose right to redeem",
      section: "A.R.S. 42-18201",
      uri: "https://www.azleg.gov/ars/42/18201.htm",
      verifiedAt,
    },
    {
      citationId: "ars-42-18202",
      sourceClass: "official_statute",
      authority: "Arizona State Legislature",
      title: "Notice of intent to foreclose",
      section: "A.R.S. 42-18202",
      uri: "https://www.azleg.gov/ars/42/18202.htm",
      verifiedAt,
    },
    {
      citationId: "tlip-value-coverage-policy-v1",
      sourceClass: "internal_policy",
      authority: "Tax Lien Intelligence Platform",
      title: "Value coverage review policy",
      section: "Minimum known value coverage",
      uri: "repo://docs/engine/rule-packs.md#internal-underwriting-policy",
      verifiedAt,
    },
    {
      citationId: "tlip-access-policy-v1",
      sourceClass: "internal_policy",
      authority: "Tax Lien Intelligence Platform",
      title: "Road access review policy",
      section: "Observed lack of road access",
      uri: "repo://docs/engine/rule-packs.md#internal-underwriting-policy",
      verifiedAt,
    },
  ],
  rules: [
    {
      ruleId: "az.instrument.tax-lien-certificate",
      category: "statutory_context",
      evaluation: "always_disclose",
      severity: "info",
      message:
        "The sale concerns a real-property tax lien evidenced by a certificate of purchase, not an immediate conveyance of the parcel.",
      citationIds: ["ars-42-18101", "ars-42-18118", "ars-42-18152", "ars-42-18201"],
    },
    {
      ruleId: "az.redemption.remains-open-until-deed",
      category: "statutory_context",
      evaluation: "always_disclose",
      severity: "warning",
      message:
        "Arizona law permits full redemption within three years after sale and after three years until delivery of a treasurer's deed.",
      citationIds: ["ars-42-18152"],
    },
    {
      ruleId: "az.foreclosure.window",
      category: "statutory_context",
      evaluation: "always_disclose",
      severity: "warning",
      message:
        "Subject to statutory exceptions, a purchaser may bring a redemption-foreclosure action beginning three years after sale and the certificate may expire if action is not commenced within the statutory ten-year period.",
      citationIds: ["ars-42-18201", "ars-42-18127"],
    },
    {
      ruleId: "az.foreclosure.notice",
      category: "statutory_context",
      evaluation: "always_disclose",
      severity: "warning",
      message:
        "A certificate holder must satisfy the statutory notice requirements before a court may enter a foreclosure judgment.",
      citationIds: ["ars-42-18202"],
    },
    {
      ruleId: "az.bid.rate-mechanics",
      category: "statutory_context",
      evaluation: "always_disclose",
      severity: "info",
      message:
        "The successful purchaser offers the lowest redemption interest rate, and that rate may not exceed the rate prescribed for delinquent taxes.",
      citationIds: ["ars-42-18114", "ars-42-18053"],
    },
    {
      ruleId: "az.encumbrances.survive-sale",
      category: "statutory_context",
      evaluation: "always_disclose",
      severity: "warning",
      message:
        "A tax-lien sale does not extinguish easements or the assessment liens identified by Arizona statute.",
      citationIds: ["ars-42-18115"],
    },
    {
      ruleId: "platform.value-coverage.below-one",
      category: "underwriting_policy",
      evaluation: "value_coverage_below_one",
      severity: "exclusion",
      message:
        "Internal review policy excludes a candidate when known value does not cover the lien amount.",
      citationIds: ["tlip-value-coverage-policy-v1"],
    },
    {
      ruleId: "platform.access.none-observed",
      category: "underwriting_policy",
      evaluation: "road_access_false",
      severity: "exclusion",
      message:
        "Internal review policy excludes a candidate when available evidence establishes no road access.",
      citationIds: ["tlip-access-policy-v1"],
    },
  ],
  limitations: [
    "This pack encodes an Arizona statutory baseline and internal review policy, not legal advice.",
    "Current Maricopa County auction registration, deposit, payment, schedule, and platform rules are not verified in this pack.",
    "The pack does not determine title condition, bankruptcy status, environmental condition, occupancy, or bid eligibility.",
  ],
} as const satisfies JurisdictionRulePackV1;

export const JURISDICTION_RULE_PACKS: readonly JurisdictionRulePackV1[] = [
  ARIZONA_MARICOPA_RULE_PACK_V1,
];

function normalizedToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizedCountry(value: string): string {
  const token = normalizedToken(value);
  return token === "us" || token === "usa" || token === "united states" ? "US" : value.trim();
}

function normalizedState(value: string): string {
  const token = normalizedToken(value);
  return token === "az" || token === "arizona" ? "AZ" : value.trim();
}

function normalizedCounty(value: string): string {
  return normalizedToken(value).replace(/ county$/, "");
}

export function findJurisdictionRulePack(
  jurisdiction: CandidateEvidenceV1["jurisdiction"],
): JurisdictionRulePackV1 | undefined {
  const country = normalizedCountry(jurisdiction.country);
  const state = normalizedState(jurisdiction.state);
  const county = normalizedCounty(jurisdiction.county);

  return JURISDICTION_RULE_PACKS.find(
    (pack) =>
      pack.jurisdiction.country === country &&
      pack.jurisdiction.state === state &&
      normalizedCounty(pack.jurisdiction.county) === county,
  );
}

export function getRuleCitations(
  pack: JurisdictionRulePackV1,
  ruleId: string,
): readonly RuleCitationV1[] {
  const rule = pack.rules.find((candidate) => candidate.ruleId === ruleId);
  if (!rule) {
    return [];
  }

  return rule.citationIds
    .map((citationId) => pack.citations.find((citation) => citation.citationId === citationId))
    .filter((citation): citation is RuleCitationV1 => citation !== undefined);
}

function canonicalEvidenceEncoding(value: unknown): string {
  if (value === null) {
    return "n";
  }
  if (typeof value === "boolean") {
    return value ? "b1" : "b0";
  }
  if (typeof value === "number") {
    const bytes = Buffer.allocUnsafe(8);
    bytes.writeDoubleBE(value);
    return `d${bytes.toString("hex")}`;
  }
  if (typeof value === "string") {
    return `s${Buffer.from(value, "utf8").toString("hex")}`;
  }
  if (Array.isArray(value)) {
    return `a[${value.map((item) => canonicalEvidenceEncoding(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const properties = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .map((key) => ({ key, encodedKey: Buffer.from(key, "utf8").toString("hex") }))
    .sort((left, right) => left.encodedKey.localeCompare(right.encodedKey))
    .map(({ key, encodedKey }) => `${encodedKey}:${canonicalEvidenceEncoding(record[key])}`);
  return `o{${properties.join(",")}}`;
}

export function digestCandidateEvidence(evidence: CandidateEvidenceV1): string {
  return createHash("sha256").update(canonicalEvidenceEncoding(evidence)).digest("hex");
}

function evidenceValue<T>(field: EvidenceFieldV1<T>): T | undefined {
  if (field.state !== "observed" && field.state !== "derived") {
    return undefined;
  }
  return field.value;
}

function evidenceRefs(...fields: Array<EvidenceFieldV1<unknown>>): string[] {
  return [...new Set(fields.flatMap((field) => field.sourceRefs))];
}

function jurisdictionLabel(evidence: CandidateEvidenceV1): string {
  return [
    evidence.jurisdiction.country.trim(),
    evidence.jurisdiction.state.trim(),
    evidence.jurisdiction.county.trim(),
  ].join("/");
}

function resolveGeneratedAt(options: RuleEvaluationOptions): string | undefined {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const timestamp = Date.parse(generatedAt);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== generatedAt) {
    return undefined;
  }
  return generatedAt;
}

function validateProducedResult(
  result: EngineResultV1,
  rulePack?: JurisdictionRulePackV1,
): RuleEvaluationOutcome {
  const validation = validateEngineResultV1(result);
  if (!validation.valid) {
    return {
      ok: false,
      kind: "contract_violation",
      errors: validation.errors,
    };
  }

  return rulePack === undefined ? { ok: true, result } : { ok: true, result, rulePack };
}

function outOfScopeResult(
  evidence: CandidateEvidenceV1,
  generatedAt: string,
): RuleEvaluationOutcome {
  const result: EngineResultV1 = {
    contractVersion: ENGINE_CONTRACT_VERSION,
    evidenceSchemaVersion: CANDIDATE_EVIDENCE_SCHEMA_VERSION,
    requestId: evidence.requestId,
    candidateId: evidence.candidateId,
    generatedAt,
    status: "out_of_scope",
    versions: {
      engineVersion: RULE_ENGINE_VERSION,
      rulePackVersion: "unavailable",
      evidenceVersion: evidence.evidenceVersion,
    },
    applicability: {
      status: "out_of_scope",
      jurisdiction: jurisdictionLabel(evidence),
      reason: "No verified jurisdiction rule pack matches this candidate.",
      sourceRefs: [],
    },
    evidenceDigest: digestCandidateEvidence(evidence),
    signals: [
      {
        key: "redemption_probability",
        status: "not_applicable",
        method: "not_computed",
        unit: "probability",
        evidenceRefs: [],
        explanation: "No model output is produced outside a verified jurisdiction rule pack.",
        missingEvidence: ["verified jurisdiction rule pack"],
      },
    ],
    findings: [],
    missingEvidence: ["verified jurisdiction rule pack"],
    limitations: ["The engine did not evaluate this candidate outside its verified jurisdiction scope."],
  };

  return validateProducedResult(result);
}

function disclosureFindings(pack: JurisdictionRulePackV1): EngineFindingV1[] {
  return pack.rules
    .filter((rule) => rule.evaluation === "always_disclose")
    .map((rule) => ({
      code: rule.ruleId,
      severity: rule.severity,
      message: rule.message,
      evidenceRefs: [],
      ruleId: rule.ruleId,
    }));
}

function unavailableRedemptionProbability() {
  return {
    key: "redemption_probability" as const,
    status: "unavailable" as const,
    method: "not_computed" as const,
    unit: "probability" as const,
    evidenceRefs: [],
    explanation:
      "No trained, evaluated, and versioned redemption model artifact is registered for this rule pack.",
    missingEvidence: ["verified historical redemption outcomes", "promoted redemption model artifact"],
  };
}

function evaluateApplicableCandidate(
  evidence: CandidateEvidenceV1,
  pack: JurisdictionRulePackV1,
  generatedAt: string,
): RuleEvaluationOutcome {
  const parcelId = evidenceValue(evidence.fields.parcelId);
  const lienAmount = evidenceValue(evidence.fields.lienAmount);
  const estimatedValue = evidenceValue(evidence.fields.estimatedValue);
  const roadAccess = evidenceValue(evidence.fields.roadAccess);
  const missingCoreEvidence: string[] = [];

  if (parcelId === undefined) {
    missingCoreEvidence.push("parcel identifier");
  }
  if (lienAmount === undefined || lienAmount.amount <= 0) {
    missingCoreEvidence.push("positive lien amount");
  }
  if (estimatedValue === undefined) {
    missingCoreEvidence.push("supported property value");
  }
  if (
    lienAmount !== undefined &&
    estimatedValue !== undefined &&
    lienAmount.currency !== estimatedValue.currency
  ) {
    missingCoreEvidence.push("lien and value amounts in a common currency");
  }

  const findings = disclosureFindings(pack);
  const signals: EngineResultV1["signals"] = [];
  let valueCoverage: number | undefined;

  if (
    lienAmount !== undefined &&
    lienAmount.amount > 0 &&
    estimatedValue !== undefined &&
    lienAmount.currency === estimatedValue.currency
  ) {
    valueCoverage = estimatedValue.amount / lienAmount.amount;
    signals.push({
      key: "value_coverage_ratio",
      status: "available",
      method: "deterministic",
      unit: "ratio",
      value: valueCoverage,
      evidenceRefs: evidenceRefs(evidence.fields.lienAmount, evidence.fields.estimatedValue),
      explanation: "Known property value divided by known lien amount.",
      missingEvidence: [],
    });
  } else {
    signals.push({
      key: "value_coverage_ratio",
      status: "unknown",
      method: "not_computed",
      unit: "ratio",
      evidenceRefs: evidenceRefs(evidence.fields.lienAmount, evidence.fields.estimatedValue),
      explanation: "Value coverage requires positive lien amount and comparable property value.",
      missingEvidence: missingCoreEvidence.filter((item) => item !== "parcel identifier"),
    });
  }

  signals.push(unavailableRedemptionProbability());

  if (valueCoverage !== undefined && valueCoverage < 1) {
    const rule = pack.rules.find((candidate) => candidate.evaluation === "value_coverage_below_one");
    if (rule) {
      findings.push({
        code: rule.ruleId,
        severity: rule.severity,
        message: rule.message,
        evidenceRefs: evidenceRefs(evidence.fields.lienAmount, evidence.fields.estimatedValue),
        ruleId: rule.ruleId,
      });
    }
  }

  if (roadAccess === false) {
    const rule = pack.rules.find((candidate) => candidate.evaluation === "road_access_false");
    if (rule) {
      findings.push({
        code: rule.ruleId,
        severity: rule.severity,
        message: rule.message,
        evidenceRefs: evidence.fields.roadAccess.sourceRefs,
        ruleId: rule.ruleId,
      });
    }
  }

  const additionalMissingEvidence = [
    ...(roadAccess === undefined ? ["road access"] : []),
    ...("unknown" === evidence.fields.buildable.state ? ["buildability"] : []),
    ...("unknown" === evidence.fields.utilitiesAvailable.state ? ["utility availability"] : []),
  ];
  const missingEvidence = [
    ...new Set([
      ...missingCoreEvidence,
      ...additionalMissingEvidence,
      "verified historical redemption outcomes",
      "promoted redemption model artifact",
    ]),
  ];
  const status = missingCoreEvidence.length === 0 ? "assessed" : "insufficient_evidence";

  const result: EngineResultV1 = {
    contractVersion: ENGINE_CONTRACT_VERSION,
    evidenceSchemaVersion: CANDIDATE_EVIDENCE_SCHEMA_VERSION,
    requestId: evidence.requestId,
    candidateId: evidence.candidateId,
    generatedAt,
    status,
    versions: {
      engineVersion: RULE_ENGINE_VERSION,
      rulePackVersion: pack.version,
      evidenceVersion: evidence.evidenceVersion,
    },
    applicability: {
      status: "applicable",
      jurisdiction: jurisdictionLabel(evidence),
      reason: "A primary-source-verified Arizona statutory baseline is registered for Maricopa County.",
      sourceRefs: [],
      rulePackId: pack.packId,
    },
    evidenceDigest: digestCandidateEvidence(evidence),
    signals,
    findings,
    missingEvidence,
    limitations: [...pack.limitations],
  };

  return validateProducedResult(result, pack);
}

export function evaluateJurisdictionRules(
  input: unknown,
  options: RuleEvaluationOptions = {},
): RuleEvaluationOutcome {
  const evidenceValidation = validateCandidateEvidenceV1(input);
  if (!evidenceValidation.valid) {
    return {
      ok: false,
      kind: "invalid_evidence",
      errors: evidenceValidation.errors,
    };
  }

  const generatedAt = resolveGeneratedAt(options);
  if (generatedAt === undefined) {
    return {
      ok: false,
      kind: "invalid_options",
      errors: ["generatedAt must be a canonical ISO-8601 UTC timestamp."],
    };
  }

  const evidence = input as CandidateEvidenceV1;
  const rulePack = findJurisdictionRulePack(evidence.jurisdiction);
  if (!rulePack) {
    return outOfScopeResult(evidence, generatedAt);
  }

  return evaluateApplicableCandidate(evidence, rulePack, generatedAt);
}
