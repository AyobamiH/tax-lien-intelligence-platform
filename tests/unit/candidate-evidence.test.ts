import { describe, expect, it } from "vitest";
import { validateCandidateEvidenceV1 } from "../../packages/engine-contract/src/index.js";
import { evaluateJurisdictionRules } from "../../packages/jurisdiction-rules/src/index.js";
import { buildCandidateEvidence } from "../../apps/api/src/intelligence/candidate-evidence.js";
import type { EnrichmentResult } from "../../packages/types/src/index.js";

const observedAt = new Date("2026-08-29T12:00:00.000Z");

function enrichment(): EnrichmentResult {
  return {
    adapters: ["source_field_inference"],
    orchestrationVersion: "enrichment-orchestration-v1",
    enrichedAt: observedAt.toISOString(),
    adapterOutcomes: [
      {
        adapterId: "source_field_inference",
        stage: "internal",
        status: "success",
        message: "Adapter completed successfully.",
        startedAt: observedAt.toISOString(),
        completedAt: observedAt.toISOString(),
      },
    ],
    freshness: {
      status: "fresh",
      enrichedAt: observedAt.toISOString(),
      staleAt: "2026-09-28T12:00:00.000Z",
      reprocessAfter: "2026-09-28T12:00:00.000Z",
      reprocessEligible: false,
      sourceVersion: "source_field_inference@1",
    },
    dataQualityScore: 80,
    inferredFields: {
      propertyType: "Vacant land",
      propertyTypeCategory: "land",
    },
    signals: [],
    flags: [],
    reasoning: [],
  };
}

function build(jurisdiction: { country: string; state: string; county: string }) {
  return buildCandidateEvidence({
    datasetId: "dataset-001",
    sourceRowNumber: 7,
    sourceAuthority: "Uploaded Maricopa tax lien export",
    jurisdiction,
    sourceObservedAt: observedAt,
    evaluationRequestedAt: new Date("2026-08-29T12:05:00.000Z"),
    scoreableRecord: {
      parcelId: "123-45-678",
      lienAmount: 1_000,
      estimatedValue: 12_000,
      propertyType: "Vacant land",
    },
    enrichment: enrichment(),
  });
}

describe("candidate evidence builder", () => {
  it("creates contract-valid, provenance-linked evidence from a real uploaded row", () => {
    const evidence = build({ country: "US", state: "AZ", county: "Maricopa" });

    expect(validateCandidateEvidenceV1(evidence)).toEqual({ valid: true, errors: [] });
    expect(evidence.provenance).toEqual([
      expect.objectContaining({
        sourceType: "user_upload",
        authority: "Uploaded Maricopa tax lien export",
      }),
    ]);
    expect(evidence.fields.lienAmount).toMatchObject({
      state: "derived",
      value: { amount: 1_000, currency: "USD" },
    });
    expect(evidence.limitations.join(" ")).toContain("not been independently verified");
  });

  it("keeps generic uploads outside the verified jurisdiction scope", () => {
    const evidence = build({ country: "unknown", state: "unknown", county: "unknown" });
    const outcome = evaluateJurisdictionRules(evidence, {
      generatedAt: "2026-08-29T12:05:00.000Z",
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.status).toBe("out_of_scope");
    expect(outcome.result.signals.every((signal) => signal.value === undefined)).toBe(true);
    expect(evidence.limitations.join(" ")).toContain("Jurisdiction remains unknown");
  });
});
