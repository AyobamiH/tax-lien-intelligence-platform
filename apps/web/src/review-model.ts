import type {
  AlertResponse,
  AlertSeverity,
  AlertType,
  ComparisonDecision,
  DecisionHistoryEventResponse,
  DecisionHistoryEventType,
  ComparisonItemResponse,
  DatasetManualMappingEntry,
  DatasetManualMappingTarget,
  DatasetReadinessIssue,
  DatasetReadinessStatus,
  DatasetResponse,
  DatasetScoringStatus,
  NormalizedScoredRecordFields,
  PortfolioItemResponse,
  PortfolioStatus,
  ScoredRecordResponse,
  WatchlistItemResponse,
} from "@tax-lien/types";

export type ScoreFilter = "all" | "flagged" | "strong" | "weak";

export const portfolioStatusOptions: PortfolioStatus[] = [
  "tracked",
  "reviewing",
  "ready",
  "acquired",
  "closed",
  "discarded",
];

export const comparisonDecisionOptions: ComparisonDecision[] = [
  "undecided",
  "keep_reviewing",
  "move_forward",
  "rejected",
];

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

export interface DatasetImportPresentation {
  label: string;
  status: "County adapter matched" | "Generic CSV fallback";
  detail: string;
  warning?: string;
}

export interface DatasetReadinessPresentation {
  label: "Ready" | "Partial" | "Weak" | "Blocked";
  className: string;
  actionText: string;
}

export interface ImportProfileApplicationPresentation {
  label: string;
  detail: string;
  className: string;
  canApplySuggestedProfile: boolean;
}

export interface ManualMappingTargetPresentation {
  targetField: DatasetManualMappingTarget;
  label: string;
  description: string;
}

export const manualMappingTargetPresentations: ManualMappingTargetPresentation[] = [
  {
    targetField: "parcel_id",
    label: "Parcel ID",
    description: "Parcel, APN, account, or property identifier.",
  },
  {
    targetField: "lien_amount",
    label: "Lien amount",
    description: "Tax due, delinquent amount, minimum bid, or lien balance.",
  },
  {
    targetField: "estimated_value",
    label: "Estimated value",
    description: "Assessed, market, full cash, or property value.",
  },
  {
    targetField: "property_type",
    label: "Property type",
    description: "Use, class, land use, or property description.",
  },
  {
    targetField: "address",
    label: "Address",
    description: "Situs, site, or property address context.",
  },
];

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

export function sortPortfolioItemsForReview(items: PortfolioItemResponse[]): PortfolioItemResponse[] {
  return [...items].sort((left, right) => {
    const statusDelta = portfolioStatusOptions.indexOf(left.status) - portfolioStatusOptions.indexOf(right.status);
    if (statusDelta !== 0) {
      return statusDelta;
    }

    if (right.investmentScore !== left.investmentScore) {
      return right.investmentScore - left.investmentScore;
    }

    if (left.riskScore !== right.riskScore) {
      return left.riskScore - right.riskScore;
    }

    return new Date(right.trackedAt).getTime() - new Date(left.trackedAt).getTime();
  });
}

export function sortComparisonItemsForReview(items: ComparisonItemResponse[]): ComparisonItemResponse[] {
  return [...items].sort((left, right) => {
    const decisionDelta = comparisonDecisionOptions.indexOf(left.decision) - comparisonDecisionOptions.indexOf(right.decision);
    if (decisionDelta !== 0) {
      return decisionDelta;
    }

    if (right.investmentScore !== left.investmentScore) {
      return right.investmentScore - left.investmentScore;
    }

    if (left.riskScore !== right.riskScore) {
      return left.riskScore - right.riskScore;
    }

    return new Date(right.addedAt).getTime() - new Date(left.addedAt).getTime();
  });
}

export function sortAlertsForReview(alerts: AlertResponse[]): AlertResponse[] {
  return [...alerts].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "unread" ? -1 : 1;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function sortDecisionHistoryForReview(events: DecisionHistoryEventResponse[]): DecisionHistoryEventResponse[] {
  return [...events].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function buildPortfolioByScoreId(items: PortfolioItemResponse[]): Map<string, PortfolioItemResponse> {
  return new Map(items.map((item) => [item.scoredRecordId, item]));
}

export function buildPortfolioByWatchlistId(items: PortfolioItemResponse[]): Map<string, PortfolioItemResponse> {
  return new Map(
    items
      .filter((item): item is PortfolioItemResponse & { sourceWatchlistItemId: string } => Boolean(item.sourceWatchlistItemId))
      .map((item) => [item.sourceWatchlistItemId, item]),
  );
}

export function buildComparisonByScoreId(items: ComparisonItemResponse[]): Map<string, ComparisonItemResponse> {
  return new Map(items.map((item) => [item.scoredRecordId, item]));
}

export function buildComparisonByWatchlistId(items: ComparisonItemResponse[]): Map<string, ComparisonItemResponse> {
  return new Map(
    items
      .filter((item): item is ComparisonItemResponse & { sourceWatchlistItemId: string } => Boolean(item.sourceWatchlistItemId))
      .map((item) => [item.sourceWatchlistItemId, item]),
  );
}

export function buildComparisonByPortfolioId(items: ComparisonItemResponse[]): Map<string, ComparisonItemResponse> {
  return new Map(
    items
      .filter((item): item is ComparisonItemResponse & { sourcePortfolioItemId: string } => Boolean(item.sourcePortfolioItemId))
      .map((item) => [item.sourcePortfolioItemId, item]),
  );
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

export function portfolioStatusLabel(status: PortfolioStatus): string {
  switch (status) {
    case "tracked":
      return "Tracked";
    case "reviewing":
      return "Reviewing";
    case "ready":
      return "Ready";
    case "acquired":
      return "Acquired";
    case "closed":
      return "Closed";
    case "discarded":
      return "Discarded";
  }
}

export function portfolioStatusClassName(status: PortfolioStatus): string {
  switch (status) {
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "acquired":
      return "border-pine bg-pine text-white";
    case "closed":
      return "border-slate-300 bg-slate-100 text-slate-700";
    case "discarded":
      return "border-red-200 bg-red-50 text-red-800";
    case "reviewing":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "tracked":
      return "border-line bg-field text-ink";
  }
}

export function comparisonDecisionLabel(decision: ComparisonDecision): string {
  switch (decision) {
    case "undecided":
      return "Undecided";
    case "keep_reviewing":
      return "Keep reviewing";
    case "move_forward":
      return "Move forward";
    case "rejected":
      return "Rejected";
  }
}

export function decisionHistoryEventLabel(eventType: DecisionHistoryEventType): string {
  switch (eventType) {
    case "comparison_decision_changed":
      return "Decision changed";
    case "comparison_note_changed":
      return "Note changed";
    case "comparison_handoff_to_watchlist":
      return "Sent to watchlist";
    case "comparison_handoff_to_portfolio":
      return "Tracked in portfolio";
  }
}

export function comparisonDecisionClassName(decision: ComparisonDecision): string {
  switch (decision) {
    case "move_forward":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-800";
    case "keep_reviewing":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "undecided":
      return "border-line bg-field text-ink";
  }
}

export function alertTypeLabel(type: AlertType): string {
  switch (type) {
    case "scoring_job_completed":
      return "Scoring completed";
    case "scoring_job_failed":
      return "Scoring failed";
  }
}

export function alertSeverityClassName(severity: AlertSeverity): string {
  switch (severity) {
    case "info":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "error":
      return "border-red-200 bg-red-50 text-red-800";
  }
}

export function datasetScoringStatusLabel(status: DatasetScoringStatus): string {
  switch (status) {
    case "not_scored":
      return "Not scored";
    case "fresh":
      return "Fresh";
    case "stale":
      return "Stale";
    case "refresh_requested":
      return "Refresh queued";
    case "refresh_in_progress":
      return "Refresh running";
    case "refresh_failed":
      return "Refresh failed";
    case "refresh_completed":
      return "Refresh completed";
  }
}

export function datasetScoringStatusClassName(status: DatasetScoringStatus): string {
  switch (status) {
    case "fresh":
    case "refresh_completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "stale":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "refresh_requested":
    case "refresh_in_progress":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "refresh_failed":
      return "border-red-200 bg-red-50 text-red-800";
    case "not_scored":
      return "border-line bg-field text-ink";
  }
}

export function datasetImportPresentation(dataset: Pick<DatasetResponse, "importSummary">): DatasetImportPresentation {
  const mappedFieldCount = dataset.importSummary.mappedFields.length;
  const mappedFieldText = `${mappedFieldCount} mapped field${mappedFieldCount === 1 ? "" : "s"}`;
  const confidenceText = `${dataset.importSummary.confidence} confidence`;

  return {
    label: dataset.importSummary.adapterMatched ? dataset.importSummary.adapterName : "Generic CSV handling",
    status: dataset.importSummary.adapterMatched ? "County adapter matched" : "Generic CSV fallback",
    detail: `${mappedFieldText} · ${confidenceText}`,
    ...(dataset.importSummary.warnings[0] ? { warning: dataset.importSummary.warnings[0] } : {}),
  };
}

export function datasetReadinessPresentation(
  dataset: Pick<DatasetResponse, "readinessSummary">,
): DatasetReadinessPresentation {
  return {
    label: datasetReadinessLabel(dataset.readinessSummary.status),
    className: datasetReadinessClassName(dataset.readinessSummary.status),
    actionText: dataset.readinessSummary.scoringRecommended
      ? "Scoring is available with the current import quality."
      : "Improve the import before relying on scoring.",
  };
}

export function importProfileApplicationPresentation(
  dataset: Pick<DatasetResponse, "importProfile">,
): ImportProfileApplicationPresentation {
  const importProfile = dataset.importProfile;

  switch (importProfile.status) {
    case "auto_applied":
      return {
        label: "Profile applied",
        detail: importProfile.message,
        className: "border-emerald-200 bg-emerald-50 text-emerald-900",
        canApplySuggestedProfile: false,
      };
    case "user_applied":
      return {
        label: "Profile confirmed",
        detail: importProfile.message,
        className: "border-emerald-200 bg-emerald-50 text-emerald-900",
        canApplySuggestedProfile: false,
      };
    case "suggested":
      return {
        label: "Profile suggested",
        detail: importProfile.message,
        className: "border-amber-200 bg-amber-50 text-amber-900",
        canApplySuggestedProfile: Boolean(importProfile.profileId),
      };
    case "none":
      return {
        label: "No profile used",
        detail: importProfile.message,
        className: "border-line bg-white text-ink/70",
        canApplySuggestedProfile: false,
      };
  }
}

export function importProfileMappingSourceLabel(source: DatasetManualMappingEntry["source"]): string {
  switch (source) {
    case "manual":
      return "Manual";
    case "import_profile":
      return "Profile";
  }
}

export function datasetReadinessLabel(status: DatasetReadinessStatus): DatasetReadinessPresentation["label"] {
  switch (status) {
    case "ready":
      return "Ready";
    case "partial":
      return "Partial";
    case "weak":
      return "Weak";
    case "blocked":
      return "Blocked";
  }
}

export function datasetReadinessClassName(status: DatasetReadinessStatus): string {
  switch (status) {
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "partial":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "weak":
      return "border-orange-200 bg-orange-50 text-orange-900";
    case "blocked":
      return "border-red-200 bg-red-50 text-red-800";
  }
}

export function topReadinessIssues(
  dataset: Pick<DatasetResponse, "readinessSummary">,
  limit = 3,
): DatasetReadinessIssue[] {
  return [...dataset.readinessSummary.issues]
    .sort((left, right) => readinessSeverityRank(right.severity) - readinessSeverityRank(left.severity))
    .slice(0, limit);
}

export function datasetNeedsImportRepair(dataset: Pick<DatasetResponse, "readinessSummary">): boolean {
  return dataset.readinessSummary.status !== "ready";
}

export function manualMappingByTarget(
  dataset: Pick<DatasetResponse, "manualMapping">,
): Map<DatasetManualMappingTarget, DatasetManualMappingEntry> {
  return new Map(dataset.manualMapping.mappings.map((mapping) => [mapping.targetField, mapping]));
}

function readinessSeverityRank(severity: DatasetReadinessIssue["severity"]): number {
  switch (severity) {
    case "error":
      return 3;
    case "warning":
      return 2;
    case "info":
      return 1;
  }
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
