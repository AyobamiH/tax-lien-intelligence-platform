import { describe, expect, it } from "vitest";
import type { PortfolioItemResponse, ScoredRecordResponse, WatchlistItemResponse } from "@tax-lien/types";
import {
  buildPortfolioByScoreId,
  buildPortfolioByWatchlistId,
  buildWatchlistByScoreId,
  filterScoresForReview,
  flagPreview,
  formatMoney,
  formatPercent,
  formatRatio,
  primaryRecordLabel,
  portfolioStatusClassName,
  portfolioStatusLabel,
  portfolioStatusOptions,
  reasoningPreview,
  scoreBand,
  sortPortfolioItemsForReview,
  sortScoresForReview,
  sortWatchlistItemsForReview,
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

function watchlistItem(overrides: Partial<WatchlistItemResponse>): WatchlistItemResponse {
  return {
    id: "watch-1",
    datasetId: "dataset-1",
    scoredRecordId: "score-1",
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
    addedAt: "2026-05-25T00:00:00.000Z",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
    ...overrides,
  };
}

function portfolioItem(overrides: Partial<PortfolioItemResponse>): PortfolioItemResponse {
  return {
    id: "portfolio-1",
    datasetId: "dataset-1",
    scoredRecordId: "score-1",
    status: "tracked",
    statusUpdatedAt: "2026-05-25T00:00:00.000Z",
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
    trackedAt: "2026-05-25T00:00:00.000Z",
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

  it("builds watchlist state and sorts kept records for comparison", () => {
    const newerTie = watchlistItem({
      id: "newer-tie",
      scoredRecordId: "score-newer",
      investmentScore: 82,
      riskScore: 20,
      addedAt: "2026-05-25T03:00:00.000Z",
    });
    const olderTie = watchlistItem({
      id: "older-tie",
      scoredRecordId: "score-older",
      investmentScore: 82,
      riskScore: 20,
      addedAt: "2026-05-25T01:00:00.000Z",
    });
    const lowerRisk = watchlistItem({
      id: "lower-risk",
      scoredRecordId: "score-lower-risk",
      investmentScore: 82,
      riskScore: 10,
    });

    const sorted = sortWatchlistItemsForReview([olderTie, newerTie, lowerRisk]);
    const byScoreId = buildWatchlistByScoreId(sorted);

    expect(sorted.map((item) => item.id)).toEqual(["lower-risk", "newer-tie", "older-tie"]);
    expect(byScoreId.get("score-newer")?.id).toBe("newer-tie");
  });

  it("builds portfolio state, labels statuses, and sorts tracked records for operations", () => {
    const tracked = portfolioItem({
      id: "tracked",
      scoredRecordId: "score-tracked",
      sourceWatchlistItemId: "watch-tracked",
      status: "tracked",
      investmentScore: 92,
      riskScore: 5,
    });
    const ready = portfolioItem({
      id: "ready",
      scoredRecordId: "score-ready",
      sourceWatchlistItemId: "watch-ready",
      status: "ready",
      investmentScore: 70,
      riskScore: 20,
    });
    const reviewing = portfolioItem({
      id: "reviewing",
      scoredRecordId: "score-reviewing",
      status: "reviewing",
      investmentScore: 85,
      riskScore: 12,
      trackedAt: "2026-05-25T02:00:00.000Z",
    });

    const sorted = sortPortfolioItemsForReview([ready, reviewing, tracked]);
    const byScoreId = buildPortfolioByScoreId(sorted);
    const byWatchlistId = buildPortfolioByWatchlistId(sorted);

    expect(portfolioStatusOptions).toEqual(["tracked", "reviewing", "ready", "acquired", "closed", "discarded"]);
    expect(sorted.map((item) => item.id)).toEqual(["tracked", "reviewing", "ready"]);
    expect(byScoreId.get("score-ready")?.id).toBe("ready");
    expect(byWatchlistId.get("watch-tracked")?.id).toBe("tracked");
    expect(byWatchlistId.has("watch-reviewing")).toBe(false);
    expect(portfolioStatusLabel("ready")).toBe("Ready");
    expect(portfolioStatusClassName("discarded")).toContain("red");
  });
});
