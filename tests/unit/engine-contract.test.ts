import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CANDIDATE_EVIDENCE_SCHEMA_ID,
  CANDIDATE_EVIDENCE_SCHEMA_VERSION,
  ENGINE_CONTRACT_VERSION,
  ENGINE_RESULT_SCHEMA_ID,
  type CandidateEvidenceV1,
  type EngineResultV1,
  validateCandidateEvidenceV1,
  validateEngineResultV1,
} from "../../packages/engine-contract/src/index.js";

const observedAt = "2026-08-29T05:00:00.000Z";
const sourceId = "county-source:parcel-001";

function unknownField() {
  return {
    state: "unknown" as const,
    sourceRefs: [],
  };
}

function candidateEvidence(): CandidateEvidenceV1 {
  return {
    schemaVersion: CANDIDATE_EVIDENCE_SCHEMA_VERSION,
    evidenceVersion: "evidence-test-vector-v1",
    requestId: "request-contract-001",
    candidateId: "candidate-contract-001",
    asOf: observedAt,
    jurisdiction: {
      country: "US",
      state: "AZ",
      county: "Maricopa",
    },
    provenance: [
      {
        sourceId,
        sourceType: "county_record",
        authority: "Contract test authority",
        uri: "urn:tax-lien:contract-test:county-record",
        retrievedAt: observedAt,
        effectiveAt: observedAt,
        adapterVersion: "contract-test-adapter-v1",
      },
    ],
    fields: {
      parcelId: {
        state: "observed",
        value: "TEST-PARCEL-001",
        sourceRefs: [sourceId],
        observedAt,
      },
      lienAmount: {
        state: "observed",
        value: { amount: 1_000, currency: "USD" },
        sourceRefs: [sourceId],
        observedAt,
      },
      estimatedValue: unknownField(),
      propertyType: unknownField(),
      roadAccess: unknownField(),
      buildable: unknownField(),
      utilitiesAvailable: unknownField(),
      locationQuality: unknownField(),
    },
    limitations: ["This deterministic vector validates shape only and is not production intelligence."],
  };
}

function insufficientEvidenceResult(): EngineResultV1 {
  return {
    contractVersion: ENGINE_CONTRACT_VERSION,
    evidenceSchemaVersion: CANDIDATE_EVIDENCE_SCHEMA_VERSION,
    requestId: "request-contract-001",
    candidateId: "candidate-contract-001",
    generatedAt: observedAt,
    status: "insufficient_evidence",
    versions: {
      engineVersion: "contract-test-engine-v1",
      rulePackVersion: "unavailable",
      evidenceVersion: "evidence-test-vector-v1",
    },
    applicability: {
      status: "unknown",
      jurisdiction: "US/AZ/Maricopa",
      reason: "No verified rule pack was evaluated by this contract test vector.",
      sourceRefs: [],
    },
    evidenceDigest: "a".repeat(64),
    signals: [
      {
        key: "redemption_probability",
        status: "unavailable",
        method: "not_computed",
        unit: "probability",
        evidenceRefs: [],
        explanation: "No trained and evaluated model artifact is available.",
        missingEvidence: ["verified historical redemption outcomes"],
      },
    ],
    findings: [],
    missingEvidence: ["verified historical redemption outcomes"],
    limitations: ["No probability was computed."],
  };
}

describe("engine contract", () => {
  it("accepts candidate evidence with field-level provenance and explicit unknowns", () => {
    expect(validateCandidateEvidenceV1(candidateEvidence())).toEqual({ valid: true, errors: [] });
  });

  it("rejects observed evidence without a value or provenance", () => {
    const candidate = candidateEvidence() as unknown as Record<string, unknown>;
    const fields = candidate.fields as Record<string, unknown>;
    fields.parcelId = { state: "observed", sourceRefs: [] };

    const validation = validateCandidateEvidenceV1(candidate);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("fields.parcelId.value is required when state is observed.");
    expect(validation.errors).toContain(
      "fields.parcelId.sourceRefs must identify provenance when state is observed.",
    );
  });

  it("rejects evidence references that are absent from provenance", () => {
    const candidate = candidateEvidence();
    candidate.fields.parcelId.sourceRefs = ["missing-source"];

    const validation = validateCandidateEvidenceV1(candidate);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      "fields.parcelId.sourceRefs contains unknown source missing-source.",
    );
  });

  it("accepts an explicit insufficient-evidence result without a fabricated value", () => {
    expect(validateEngineResultV1(insufficientEvidenceResult())).toEqual({ valid: true, errors: [] });
  });

  it("rejects unavailable signals that carry a value", () => {
    const result = insufficientEvidenceResult() as unknown as Record<string, unknown>;
    const signals = result.signals as Array<Record<string, unknown>>;
    signals[0]!.value = 0.6;

    const validation = validateEngineResultV1(result);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      "signals[0].value must be omitted when status is unavailable.",
    );
  });

  it("rejects a heuristic presented as redemption probability", () => {
    const result = insufficientEvidenceResult() as unknown as Record<string, unknown>;
    result.status = "assessed";
    result.applicability = {
      status: "applicable",
      jurisdiction: "US/AZ/Maricopa",
      reason: "Contract validation vector.",
      sourceRefs: [sourceId],
      rulePackId: "az-maricopa-test",
    };
    result.signals = [
      {
        key: "redemption_probability",
        status: "available",
        method: "heuristic",
        unit: "probability",
        value: 0.7,
        evidenceRefs: [sourceId],
        explanation: "A fixed heuristic must not be labelled a probability.",
        missingEvidence: [],
      },
    ];

    const validation = validateEngineResultV1(result);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      "signals[0] redemption_probability must be produced by a versioned model artifact.",
    );
  });

  it("accepts redemption probability only with a versioned model artifact", () => {
    const result = insufficientEvidenceResult();
    result.status = "assessed";
    result.applicability = {
      status: "applicable",
      jurisdiction: "US/AZ/Maricopa",
      reason: "A verified rule pack supports this jurisdiction.",
      sourceRefs: [sourceId],
      rulePackId: "az-maricopa-v1",
    };
    result.signals = [
      {
        key: "redemption_probability",
        status: "available",
        method: "model",
        unit: "probability",
        value: 0.64,
        evidenceRefs: [sourceId],
        explanation: "Output from the referenced evaluated artifact.",
        missingEvidence: [],
        modelArtifact: {
          modelId: "redemption-survival",
          version: "1.0.0",
          sha256: "b".repeat(64),
          trainingDatasetVersion: "verified-outcomes-v1",
          evaluationReportUri: "urn:tax-lien:evaluation:redemption-survival-v1",
        },
      },
    ];
    result.missingEvidence = [];
    result.limitations = ["Contract validation does not assert that this test artifact exists."],

    expect(validateEngineResultV1(result)).toEqual({ valid: true, errors: [] });
  });

  it("keeps heuristic redemption output distinct from probability", () => {
    const result = insufficientEvidenceResult();
    result.status = "assessed";
    result.applicability = {
      status: "applicable",
      jurisdiction: "US/AZ/Maricopa",
      reason: "A verified rule pack supports this jurisdiction.",
      sourceRefs: [sourceId],
      rulePackId: "az-maricopa-v1",
    };
    result.signals = [
      {
        key: "redemption_heuristic_signal",
        status: "available",
        method: "heuristic",
        unit: "score",
        value: 64,
        evidenceRefs: [sourceId],
        explanation: "A bounded rule signal, not a calibrated probability.",
        missingEvidence: ["verified historical redemption outcomes"],
      },
    ];

    expect(validateEngineResultV1(result)).toEqual({ valid: true, errors: [] });
  });

  it("publishes parseable schemas whose ids match the runtime contract", async () => {
    const schemaDirectory = fileURLToPath(
      new URL("../../packages/engine-contract/schemas/", import.meta.url),
    );
    const [candidateSchema, resultSchema, manifest] = await Promise.all(
      ["candidate-evidence-v1.schema.json", "engine-result-v1.schema.json", "manifest.json"].map(
        async (fileName) =>
          JSON.parse(await readFile(`${schemaDirectory}${fileName}`, "utf8")) as Record<
            string,
            unknown
          >,
      ),
    );

    expect(candidateSchema.$id).toBe(CANDIDATE_EVIDENCE_SCHEMA_ID);
    expect(resultSchema.$id).toBe(ENGINE_RESULT_SCHEMA_ID);
    expect(manifest.contractVersion).toBe(ENGINE_CONTRACT_VERSION);
  });
});
