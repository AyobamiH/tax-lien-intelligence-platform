import type { NormalizedScoredRecordFields, ScoredRecordResponse, WatchlistItemResponse } from "@tax-lien/types";

export type ScoreFilter = "all" | "flagged" | "strong" | "weak";

export interface ScoreStats {
  count: number;
  averageInvestmentScore: number;
  averageRiskScore: number;
  flaggedCount: number;
}

export interface ScoreBand {
  label: "Strong" | "Review" | "Weak";
  className: string;
}

export interface ReviewRecordLike {
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  investmentScore: number;
  riskScore: number;
  confidenceScore: number;
  flags: string[];
  reasoning: string[];
}

export function sortScoresForReview(scores: ScoredRecordResponse[]): ScoredRecordResponse[] {
  return [...scores].sort((left, right) => {
    if (right.investmentScore !== left.investmentScore) {
      return right.investmentScore - left.investmentScore;
    }

    if (left.riskScore !== right.riskScore) {
      return left.riskScore - right.riskScore;
    }

    return left.sourceRowNumber - right.sourceRowNumber;
  });
}

export function sortWatchlistItemsForReview(items: WatchlistItemResponse[]): WatchlistItemResponse[] {
  return [...items].sort((left, right) => {
    if (right.investmentScore !== left.investmentScore) {
      return right.investmentScore - left.investmentScore;
    }

    if (left.riskScore !== right.riskScore) {
      return left.riskScore - right.riskScore;
    }

    return new Date(right.addedAt).getTime() - new Date(left.addedAt).getTime();
  });
}

export function buildWatchlistByScoreId(items: WatchlistItemResponse[]): Map<string, WatchlistItemResponse> {
  return new Map(items.map((item) => [item.scoredRecordId, item]));
}

export function filterScoresForReview(
  scores: ScoredRecordResponse[],
  filter: ScoreFilter,
  query: string,
): ScoredRecordResponse[] {
  const normalizedQuery = query.trim().toLowerCase();

  return sortScoresForReview(scores).filter((score) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "flagged" && score.flags.length > 0) ||
      (filter === "strong" && score.investmentScore >= 70 && score.confidenceScore >= 60) ||
      (filter === "weak" && (score.investmentScore < 40 || score.confidenceScore < 50));

    if (!matchesFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return searchableScoreText(score).includes(normalizedQuery);
  });
}

export function summarizeScores(scores: ScoredRecordResponse[]): ScoreStats {
  if (scores.length === 0) {
    return {
      count: 0,
      averageInvestmentScore: 0,
      averageRiskScore: 0,
      flaggedCount: 0,
    };
  }

  const totals = scores.reduce(
    (summary, score) => ({
      investment: summary.investment + score.investmentScore,
      risk: summary.risk + score.riskScore,
      flagged: summary.flagged + (score.flags.length > 0 ? 1 : 0),
    }),
    { investment: 0, risk: 0, flagged: 0 },
  );

  return {
    count: scores.length,
    averageInvestmentScore: Math.round(totals.investment / scores.length),
    averageRiskScore: Math.round(totals.risk / scores.length),
    flaggedCount: totals.flagged,
  };
}

export function scoreBand(score: number): ScoreBand {
  if (score >= 70) {
    return {
      label: "Strong",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (score >= 40) {
    return {
      label: "Review",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  return {
    label: "Weak",
    className: "border-red-200 bg-red-50 text-red-800",
  };
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatMoney(value: number | undefined): string {
  if (value === undefined) {
    return "Missing";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRatio(value: number | undefined): string {
  if (value === undefined) {
    return "Missing";
  }

  return `${Number(value.toFixed(2))}x`;
}

export function primaryRecordLabel(record: ReviewRecordLike): string {
  return record.normalizedFields.parcelId ?? `Row ${record.sourceRowNumber}`;
}

export function reasoningPreview(record: ReviewRecordLike): string {
  return record.reasoning[0] ?? "No reasoning returned.";
}

export function flagPreview(record: ReviewRecordLike, limit = 2): string {
  if (record.flags.length === 0) {
    return "No flags";
  }

  const visibleFlags = record.flags.slice(0, limit).join(", ");
  const remainingCount = record.flags.length - limit;

  return remainingCount > 0 ? `${visibleFlags} +${remainingCount}` : visibleFlags;
}

function searchableScoreText(score: ScoredRecordResponse): string {
  const fields = score.normalizedFields;

  return [
    fields.parcelId,
    fields.address,
    fields.propertyType,
    fields.propertyTypeCategory,
    ...score.flags,
    ...score.reasoning,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();
}
