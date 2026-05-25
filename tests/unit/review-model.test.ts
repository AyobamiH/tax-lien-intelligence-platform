import { describe, expect, it } from "vitest";
import type { ScoredRecordResponse } from "@tax-lien/types";
import {
  filterScoresForReview,
  flagPreview,
  formatMoney,
  formatPercent,
  formatRatio,
  primaryRecordLabel,
  reasoningPreview,
  scoreBand,
  sortScoresForReview,
  summarizeScores,
} from "../../apps/web/src/review-model.js";

function scoredRecord(overrides: Partial<ScoredRecordResponse>): ScoredRecordResponse {
  return {
    id: "score-1",
    datasetId: "dataset-1",
    sourceRowNumber: 2,
    normalizedFields: {
      parcelId: "A-100",
      lienAmount: 1000,
      estimatedValue: 12000,
      propertyType: "Single-family residential",
      propertyTypeCategory: "residential",
    },
    investmentScore: 80,
    riskScore: 20,
    liquidityScore: 75,
    redemptionProbability: 0.82,
    confidenceScore: 90,
    valueCoverageRatio: 12,
    flags: [],
    reasoning: ["Strong value coverage."],
    scoredAt: "2026-05-25T00:00:00.000Z",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("review model helpers", () => {
  it("sorts scored records by strongest investment score, then lower risk", () => {
    const weak = scoredRecord({ id: "weak", investmentScore: 25, riskScore: 80, sourceRowNumber: 3 });
    const strongerHigherRisk = scoredRecord({ id: "strong-riskier", investmentScore: 75, riskScore: 40 });
    const strongerLowerRisk = scoredRecord({ id: "strong-safer", investmentScore: 75, riskScore: 15 });

    expect(sortScoresForReview([weak, strongerHigherRisk, strongerLowerRisk]).map((score) => score.id)).toEqual([
      "strong-safer",
      "strong-riskier",
      "weak",
    ]);
  });

  it("filters by risk flags, weak-data records, strong records, and searchable fields", () => {
    const land = scoredRecord({
      id: "land",
      normalizedFields: {
        propertyType: "Vacant land",
        propertyTypeCategory: "land",
      },
      investmentScore: 18,
      confidenceScore: 44,
      flags: ["Vacant land is high risk"],
      reasoning: ["Vacant land often has weak liquidity."],
    });
    const residential = scoredRecord({
      id: "residential",
      normalizedFields: {
        parcelId: "R-42",
        propertyType: "Residential",
        propertyTypeCategory: "residential",
      },
      investmentScore: 82,
      confidenceScore: 88,
      flags: [],
    });

    expect(filterScoresForReview([land, residential], "flagged", "").map((score) => score.id)).toEqual(["land"]);
    expect(filterScoresForReview([land, residential], "weak", "").map((score) => score.id)).toEqual(["land"]);
    expect(filterScoresForReview([land, residential], "strong", "").map((score) => score.id)).toEqual(["residential"]);
    expect(filterScoresForReview([land, residential], "all", "vacant").map((score) => score.id)).toEqual(["land"]);
  });

  it("summarizes scores without hiding flagged records", () => {
    const scores = [
      scoredRecord({ investmentScore: 80, riskScore: 20, flags: [] }),
      scoredRecord({ investmentScore: 40, riskScore: 60, flags: ["Missing property value"] }),
    ];

    expect(summarizeScores(scores)).toEqual({
      count: 2,
      averageInvestmentScore: 60,
      averageRiskScore: 40,
      flaggedCount: 1,
    });
  });

  it("formats review values for missing and present score context", () => {
    expect(formatMoney(undefined)).toBe("Missing");
    expect(formatRatio(undefined)).toBe("Missing");
    expect(formatMoney(12000)).toBe("$12,000");
    expect(formatRatio(8.236)).toBe("8.24x");
    expect(formatPercent(0.82)).toBe("82%");
  });

  it("builds compact labels, previews, and score bands", () => {
    const flagged = scoredRecord({
      normalizedFields: { propertyTypeCategory: "unknown" },
      flags: ["Missing parcel identifier", "Missing property value", "Unknown property type"],
      reasoning: [],
      investmentScore: 35,
    });

    expect(primaryRecordLabel(flagged)).toBe("Row 2");
    expect(reasoningPreview(flagged)).toBe("No reasoning returned.");
    expect(flagPreview(flagged)).toBe("Missing parcel identifier, Missing property value +1");
    expect(scoreBand(75).label).toBe("Strong");
    expect(scoreBand(50).label).toBe("Review");
    expect(scoreBand(20).label).toBe("Weak");
  });
});
