import { describe, expect, it } from "vitest";
import {
  CANDIDATE_EVIDENCE_SCHEMA_VERSION,
  type CandidateEvidenceV1,
} from "../../packages/engine-contract/src/index.js";
import {
  ARIZONA_MARICOPA_RULE_PACK_V1,
  digestCandidateEvidence,
  evaluateJurisdictionRules,
  findJurisdictionRulePack,
  getRuleCitations,
} from "../../packages/jurisdiction-rules/src/index.js";

const timestamp = "2026-08-29T10:00:00.000Z";
const countySourceId = "contract-vector:county-record";
const assessorSourceId = "contract-vector:assessor-record";

function unknownField() {
  return {
    state: "unknown" as const,
    sourceRefs: [],
  };
}

function evidenceVector(): CandidateEvidenceV1 {
  return {
    schemaVersion: CANDIDATE_EVIDENCE_SCHEMA_VERSION,
    evidenceVersion: "jurisdiction-rule-vector-v1",
    requestId: "request-rule-001",
    candidateId: "candidate-rule-001",
    asOf: timestamp,
    jurisdiction: {
      country: "US",
      state: "AZ",
      county: "Maricopa",
    },
    provenance: [
      {
        sourceId: countySourceId,
        sourceType: "county_record",
        authority: "Deterministic contract vector",
        uri: "urn:tax-lien:rule-test:county-record",
        retrievedAt: timestamp,
      },
      {
        sourceId: assessorSourceId,
        sourceType: "assessor_record",
        authority: "Deterministic contract vector",
        uri: "urn:tax-lien:rule-test:assessor-record",
        retrievedAt: timestamp,
      },
    ],
    fields: {
      parcelId: {
        state: "observed",
        value: "TEST-PARCEL-001",
        sourceRefs: [countySourceId],
        observedAt: timestamp,
      },
      lienAmount: {
        state: "observed",
        value: { amount: 1_000, currency: "USD" },
        sourceRefs: [countySourceId],
        observedAt: timestamp,
      },
      estimatedValue: {
        state: "observed",
        value: { amount: 12_000, currency: "USD" },
        sourceRefs: [assessorSourceId],
        observedAt: timestamp,
      },
      propertyType: unknownField(),
      roadAccess: unknownField(),
      buildable: unknownField(),
      utilitiesAvailable: unknownField(),
      locationQuality: unknownField(),
    },
    limitations: ["Deterministic contract vector only; not production intelligence."],
  };
}

describe("jurisdiction rule registry", () => {
  it("matches only the verified Maricopa jurisdiction while accepting canonical aliases", () => {
    expect(
      findJurisdictionRulePack({
        country: "United States",
        state: "Arizona",
        county: "Maricopa County",
      })?.packId,
    ).toBe(ARIZONA_MARICOPA_RULE_PACK_V1.packId);
    expect(
      findJurisdictionRulePack({ country: "US", state: "AZ", county: "Pima" }),
    ).toBeUndefined();
  });

  it("resolves every rule to versioned citations of the declared source class", () => {
    for (const rule of ARIZONA_MARICOPA_RULE_PACK_V1.rules) {
      const citations = getRuleCitations(ARIZONA_MARICOPA_RULE_PACK_V1, rule.ruleId);
      expect(citations.length).toBeGreaterThan(0);
      expect(citations.map((citation) => citation.citationId)).toEqual(rule.citationIds);
      if (rule.category === "statutory_context") {
        expect(citations.every((citation) => citation.sourceClass === "official_statute")).toBe(
          true,
        );
        expect(citations.every((citation) => citation.uri.startsWith("https://www.azleg.gov/"))).toBe(
          true,
        );
      }
    }
    expect(ARIZONA_MARICOPA_RULE_PACK_V1.operationalAuctionRulesStatus).toBe("not_verified");
  });
});

describe("jurisdiction rule evaluation", () => {
  it("returns out_of_scope without calculated intelligence for an unsupported county", () => {
    const evidence = evidenceVector();
    evidence.jurisdiction.county = "Pima";

    const outcome = evaluateJurisdictionRules(evidence, { generatedAt: timestamp });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.rulePack).toBeUndefined();
    expect(outcome.result.status).toBe("out_of_scope");
    expect(outcome.result.signals).toEqual([
      expect.objectContaining({
        key: "redemption_probability",
        status: "not_applicable",
        method: "not_computed",
      }),
    ]);
    expect(outcome.result.signals[0]).not.toHaveProperty("value");
  });

  it("returns insufficient_evidence when supported property value is unknown", () => {
    const evidence = evidenceVector();
    evidence.fields.estimatedValue = unknownField();

    const outcome = evaluateJurisdictionRules(evidence, { generatedAt: timestamp });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.status).toBe("insufficient_evidence");
    expect(outcome.result.missingEvidence).toContain("supported property value");
    expect(outcome.result.signals).toContainEqual(
      expect.objectContaining({
        key: "value_coverage_ratio",
        status: "unknown",
        method: "not_computed",
      }),
    );
  });

  it("produces only deterministic coverage and source-cited rule findings", () => {
    const outcome = evaluateJurisdictionRules(evidenceVector(), { generatedAt: timestamp });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok || outcome.rulePack === undefined) return;
    expect(outcome.result.status).toBe("assessed");
    expect(outcome.result.applicability.rulePackId).toBe(outcome.rulePack.packId);
    expect(outcome.result.signals).toContainEqual(
      expect.objectContaining({
        key: "value_coverage_ratio",
        status: "available",
        method: "deterministic",
        unit: "ratio",
        value: 12,
        evidenceRefs: [countySourceId, assessorSourceId],
      }),
    );
    expect(outcome.result.signals).toContainEqual(
      expect.objectContaining({
        key: "redemption_probability",
        status: "unavailable",
        method: "not_computed",
      }),
    );
    expect(
      outcome.result.findings.every(
        (finding) =>
          finding.ruleId !== undefined &&
          getRuleCitations(outcome.rulePack!, finding.ruleId).length > 0,
      ),
    ).toBe(true);
  });

  it("applies the internal exclusion when known value coverage is below one", () => {
    const evidence = evidenceVector();
    evidence.fields.estimatedValue.value = { amount: 800, currency: "USD" };

    const outcome = evaluateJurisdictionRules(evidence, { generatedAt: timestamp });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.findings).toContainEqual(
      expect.objectContaining({
        code: "platform.value-coverage.below-one",
        severity: "exclusion",
      }),
    );
  });

  it("applies the internal exclusion only when lack of road access is established", () => {
    const evidence = evidenceVector();
    evidence.fields.roadAccess = {
      state: "observed",
      value: false,
      sourceRefs: [assessorSourceId],
      observedAt: timestamp,
    };

    const outcome = evaluateJurisdictionRules(evidence, { generatedAt: timestamp });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.findings).toContainEqual(
      expect.objectContaining({
        code: "platform.access.none-observed",
        severity: "exclusion",
        evidenceRefs: [assessorSourceId],
      }),
    );
  });

  it("rejects evidence that violates the engine contract before evaluating rules", () => {
    const evidence = evidenceVector() as unknown as Record<string, unknown>;
    const fields = evidence.fields as Record<string, unknown>;
    fields.parcelId = { state: "observed", value: "TEST-PARCEL-001", sourceRefs: [] };

    const outcome = evaluateJurisdictionRules(evidence, { generatedAt: timestamp });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.kind).toBe("invalid_evidence");
    expect(outcome.errors).toContain(
      "fields.parcelId.sourceRefs must identify provenance when state is observed.",
    );
  });

  it("creates a stable SHA-256 digest independent of object property insertion order", () => {
    const evidence = evidenceVector();
    const reordered: CandidateEvidenceV1 = {
      limitations: evidence.limitations,
      fields: {
        locationQuality: evidence.fields.locationQuality,
        utilitiesAvailable: evidence.fields.utilitiesAvailable,
        buildable: evidence.fields.buildable,
        roadAccess: evidence.fields.roadAccess,
        propertyType: evidence.fields.propertyType,
        estimatedValue: evidence.fields.estimatedValue,
        lienAmount: evidence.fields.lienAmount,
        parcelId: evidence.fields.parcelId,
      },
      provenance: evidence.provenance,
      jurisdiction: evidence.jurisdiction,
      asOf: evidence.asOf,
      candidateId: evidence.candidateId,
      requestId: evidence.requestId,
      evidenceVersion: evidence.evidenceVersion,
      schemaVersion: evidence.schemaVersion,
    };

    expect(digestCandidateEvidence(reordered)).toBe(digestCandidateEvidence(evidence));
    expect(digestCandidateEvidence(evidence)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects non-canonical evaluation timestamps instead of producing invalid output", () => {
    const outcome = evaluateJurisdictionRules(evidenceVector(), {
      generatedAt: "2026-08-29T10:00:00Z",
    });

    expect(outcome).toEqual({
      ok: false,
      kind: "invalid_options",
      errors: ["generatedAt must be a canonical ISO-8601 UTC timestamp."],
    });
  });
});
