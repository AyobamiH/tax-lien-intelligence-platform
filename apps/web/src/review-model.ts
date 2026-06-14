import type {
  AlertResponse,
  ApprovalRequestedAction,
  ApprovalRequestStatus,
  AlertRelatedEntityType,
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
  NotificationCadence,
  NotificationDeliveryHistoryItem,
  NotificationDeliveryMode,
  NotificationDeliveryState,
  NotificationDeliveryStatus,
  NotificationDigestBatchResponse,
  NotificationDigestBatchStatus,
  PortfolioActivitySummary,
  PortfolioAttentionReason,
  PortfolioAttentionSummary,
  PortfolioItemResponse,
  PortfolioStatus,
  PortfolioStatusCount,
  PortfolioSummaryRecord,
  PortfolioSummaryResponse,
  SavedViewPortfolioFilters,
  SavedViewResponse,
  ScoredRecordResponse,
  WatchlistItemResponse,
  WorkspaceRole,
  WorkspaceActivityCategory,
  WorkspaceActivityResponse,
  DiscussionAttentionResponse,
  WorkspaceAssignmentEntityType,
  WorkspaceAssignmentResponse,
} from "@tax-lien/types";

export function workspaceRoleLabel(role: WorkspaceRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "member":
      return "Member";
  }
}

export function canChangeWorkspaceMemberRole(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
): boolean {
  return actorRole === "owner" && targetRole !== "owner";
}

export function canRemoveWorkspaceMember(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
): boolean {
  return (
    targetRole !== "owner" &&
    (actorRole === "owner" || (actorRole === "admin" && targetRole === "member"))
  );
}

export function approvalStatusLabel(status: ApprovalRequestStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
  }
}

export function approvalStatusClassName(status: ApprovalRequestStatus): string {
  switch (status) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-800";
    case "cancelled":
      return "border-line bg-field text-ink/65";
  }
}

export function approvalActionLabel(action: ApprovalRequestedAction): string {
  switch (action) {
    case "comparison_handoff_to_portfolio":
      return "Move comparison item to portfolio";
  }
}

export type WorkspaceActivityDestination =
  | { surface: "dataset"; datasetId: string }
  | { surface: "comparison" }
  | { surface: "watchlist" }
  | { surface: "portfolio" }
  | { surface: "workspace" }
  | { surface: "approvals" }
  | null;

export function workspaceActivityCategoryLabel(category: WorkspaceActivityCategory | "all"): string {
  switch (category) {
    case "all":
      return "All";
    case "data":
      return "Data";
    case "decisions":
      return "Decisions";
    case "portfolio":
      return "Portfolio";
    case "members":
      return "Members";
    case "responsibility":
      return "Responsibility";
    case "approvals":
      return "Approvals";
  }
}

export function workspaceActivityDestination(
  activity: WorkspaceActivityResponse,
): WorkspaceActivityDestination {
  const datasetId = activity.metadata?.datasetId;
  if (
    datasetId &&
    (activity.eventType === "dataset_uploaded" ||
      activity.eventType === "dataset_scoring_requested" ||
      activity.eventType === "dataset_refresh_requested")
  ) {
    return { surface: "dataset", datasetId };
  }

  switch (activity.eventType) {
    case "comparison_decision_changed":
      return { surface: "comparison" };
    case "comparison_handoff_to_watchlist":
      return { surface: "watchlist" };
    case "comparison_handoff_to_portfolio":
    case "portfolio_status_changed":
      return { surface: "portfolio" };
    case "workspace_member_added":
    case "workspace_member_role_changed":
    case "workspace_member_removed":
      return { surface: "workspace" };
    case "approval_requested":
    case "approval_approved":
    case "approval_rejected":
    case "approval_cancelled":
      return { surface: "approvals" };
    case "entity_assigned":
    case "entity_reassigned":
    case "entity_assignment_cleared":
      return activity.metadata?.targetEntityType
        ? assignmentSurfaceDestination(activity.metadata.targetEntityType, activity.relatedEntityId)
        : null;
    case "dataset_uploaded":
    case "dataset_scoring_requested":
    case "dataset_refresh_requested":
      return null;
  }
}

export function assignmentEntityLabel(entityType: WorkspaceAssignmentEntityType): string {
  switch (entityType) {
    case "dataset":
      return "Dataset";
    case "comparison_item":
      return "Comparison item";
    case "watchlist_item":
      return "Watchlist item";
    case "portfolio_item":
      return "Portfolio item";
  }
}

export function assignmentDestination(
  assignment: WorkspaceAssignmentResponse,
): WorkspaceActivityDestination {
  return assignmentSurfaceDestination(assignment.relatedEntityType, assignment.relatedEntityId);
}

export function discussionAttentionDestination(
  attention: DiscussionAttentionResponse,
): WorkspaceActivityDestination {
  return assignmentSurfaceDestination(attention.relatedEntityType, attention.relatedEntityId);
}

function assignmentSurfaceDestination(
  entityType: WorkspaceAssignmentEntityType,
  entityId: string,
): WorkspaceActivityDestination {
  switch (entityType) {
    case "dataset":
      return { surface: "dataset", datasetId: entityId };
    case "comparison_item":
      return { surface: "comparison" };
    case "watchlist_item":
      return { surface: "watchlist" };
    case "portfolio_item":
      return { surface: "portfolio" };
  }
}

export function workspaceActivityDestinationLabel(
  destination: Exclude<WorkspaceActivityDestination, null>,
): string {
  switch (destination.surface) {
    case "dataset":
      return "Open dataset";
    case "comparison":
      return "Open comparison";
    case "watchlist":
      return "Open watchlist";
    case "portfolio":
      return "Open portfolio";
    case "workspace":
      return "Open workspace";
    case "approvals":
      return "Open approvals";
  }
}

export type ScoreFilter = "all" | "flagged" | "strong" | "weak";
export type PortfolioReviewFilter = "all" | "active" | PortfolioStatus;

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

export function filterPortfolioItemsForReview(
  items: PortfolioItemResponse[],
  filter: PortfolioReviewFilter,
): PortfolioItemResponse[] {
  return sortPortfolioItemsForReview(items).filter((item) => {
    if (filter === "all") {
      return true;
    }

    if (filter === "active") {
      return isActivePortfolioStatus(item.status);
    }

    return item.status === filter;
  });
}

export function applyPortfolioSavedViewForReview(
  items: PortfolioItemResponse[],
  view: SavedViewResponse | null,
): PortfolioItemResponse[] {
  if (!view || view.surface !== "portfolio") {
    return sortPortfolioItemsForReview(items);
  }

  const filters = view.filters as SavedViewPortfolioFilters;
  const filteredItems = items.filter((item) => {
    if (filters.statuses && !filters.statuses.includes(item.status)) {
      return false;
    }
    if (filters.hasFlags !== undefined && (item.flags.length > 0) !== filters.hasFlags) {
      return false;
    }
    if (filters.maxRiskScore !== undefined && item.riskScore > filters.maxRiskScore) {
      return false;
    }
    if (filters.minConfidenceScore !== undefined && item.confidenceScore < filters.minConfidenceScore) {
      return false;
    }
    if (filters.queue === "needs_attention" && !portfolioItemNeedsAttention(item)) {
      return false;
    }
    if (filters.queue === "recently_changed" && new Date(item.statusUpdatedAt).getTime() === new Date(item.trackedAt).getTime()) {
      return false;
    }

    return true;
  });

  return sortPortfolioItemsForSavedView(filteredItems, view);
}

export function savedViewCriteriaLabel(view: SavedViewResponse): string {
  if (view.surface === "portfolio") {
    const filters = view.filters as SavedViewPortfolioFilters;
    const parts: string[] = [];
    if (filters.queue === "needs_attention") {
      parts.push("needs attention");
    }
    if (filters.queue === "recently_changed") {
      parts.push("recent status changes");
    }
    if (filters.statuses?.length) {
      parts.push(`status ${filters.statuses.map(portfolioStatusLabel).join(", ")}`);
    }
    if (filters.hasFlags !== undefined) {
      parts.push(filters.hasFlags ? "with flags" : "without flags");
    }
    if (filters.maxRiskScore !== undefined) {
      parts.push(`risk <= ${filters.maxRiskScore}`);
    }
    if (filters.minConfidenceScore !== undefined) {
      parts.push(`confidence >= ${filters.minConfidenceScore}`);
    }

    return parts.length > 0 ? parts.join(" · ") : "all portfolio items";
  }

  return "comparison work slice";
}

export function summarizePortfolioForReview(
  items: PortfolioItemResponse[],
  generatedAt = new Date().toISOString(),
): PortfolioSummaryResponse {
  const activeItems = items.filter((item) => isActivePortfolioStatus(item.status));
  const statusCounts = portfolioStatusOptions.map<PortfolioStatusCount>((status) => ({
    status,
    count: items.filter((item) => item.status === status).length,
    isActive: isActivePortfolioStatus(status),
  }));

  return {
    totalTrackedItems: items.length,
    activeItems: activeItems.length,
    readyItems: items.filter((item) => item.status === "ready").length,
    acquiredItems: items.filter((item) => item.status === "acquired").length,
    statusCounts,
    recentAdditions: buildRecentPortfolioAdditions(items),
    recentStatusChanges: buildRecentPortfolioStatusChanges(items),
    needsAttention: buildPortfolioAttentionSummaries(activeItems),
    generatedAt,
  };
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

function buildRecentPortfolioAdditions(items: PortfolioItemResponse[]): PortfolioActivitySummary[] {
  return [...items]
    .sort((left, right) => new Date(right.trackedAt).getTime() - new Date(left.trackedAt).getTime())
    .slice(0, 5)
    .map((item) => ({
      activityType: "added",
      occurredAt: item.trackedAt,
      message: item.sourceWatchlistItemId
        ? "Portfolio tracking started from a watchlist item."
        : "Portfolio tracking started from scored review.",
      item: toPortfolioSummaryRecord(item),
    }));
}

function sortPortfolioItemsForSavedView(items: PortfolioItemResponse[], view: SavedViewResponse): PortfolioItemResponse[] {
  const sort = view.sort;
  if (!sort) {
    return sortPortfolioItemsForReview(items);
  }

  return [...items].sort((left, right) => {
    const leftValue = portfolioSavedViewSortValue(left, sort.key);
    const rightValue = portfolioSavedViewSortValue(right, sort.key);
    return sort.direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
  });
}

function portfolioSavedViewSortValue(item: PortfolioItemResponse, key: NonNullable<SavedViewResponse["sort"]>["key"]): number {
  switch (key) {
    case "status_updated_at":
      return new Date(item.statusUpdatedAt).getTime();
    case "investment_score":
      return item.investmentScore;
    case "risk_score":
      return item.riskScore;
    case "confidence_score":
      return item.confidenceScore;
    case "tracked_at":
    case "added_at":
    case "decision_updated_at":
      return new Date(item.trackedAt).getTime();
  }
}

function portfolioItemNeedsAttention(item: PortfolioItemResponse): boolean {
  return (
    isActivePortfolioStatus(item.status) &&
    (item.status === "reviewing" || item.status === "tracked" || item.flags.length > 0 || item.confidenceScore < 60)
  );
}

function buildRecentPortfolioStatusChanges(items: PortfolioItemResponse[]): PortfolioActivitySummary[] {
  return items
    .filter((item) => new Date(item.statusUpdatedAt).getTime() !== new Date(item.trackedAt).getTime())
    .sort((left, right) => new Date(right.statusUpdatedAt).getTime() - new Date(left.statusUpdatedAt).getTime())
    .slice(0, 5)
    .map((item) => ({
      activityType: "status_changed",
      occurredAt: item.statusUpdatedAt,
      message: `Status changed to ${portfolioStatusLabel(item.status)}.`,
      item: toPortfolioSummaryRecord(item),
    }));
}

function buildPortfolioAttentionSummaries(items: PortfolioItemResponse[]): PortfolioAttentionSummary[] {
  return items
    .map((item) => ({
      item,
      reasons: portfolioAttentionReasons(item),
    }))
    .filter((summary): summary is { item: PortfolioItemResponse; reasons: PortfolioAttentionReason[] } => summary.reasons.length > 0)
    .sort((left, right) => {
      const severityDelta = attentionSeverityScore(right.reasons) - attentionSeverityScore(left.reasons);
      if (severityDelta !== 0) {
        return severityDelta;
      }

      const statusDelta = attentionStatusPriority(left.item.status) - attentionStatusPriority(right.item.status);
      if (statusDelta !== 0) {
        return statusDelta;
      }

      return new Date(right.item.statusUpdatedAt).getTime() - new Date(left.item.statusUpdatedAt).getTime();
    })
    .slice(0, 8)
    .map((summary) => ({
      item: toPortfolioSummaryRecord(summary.item),
      reasons: summary.reasons,
    }));
}

function portfolioAttentionReasons(item: PortfolioItemResponse): PortfolioAttentionReason[] {
  const reasons: PortfolioAttentionReason[] = [];

  if (item.status === "reviewing") {
    reasons.push({
      code: "review_status",
      severity: "info",
      message: "Item is explicitly marked for review.",
    });
  }

  if (item.status === "tracked") {
    reasons.push({
      code: "tracked_without_next_status",
      severity: "info",
      message: "Item is tracked but has not moved into a next decision status.",
    });
  }

  if (item.flags.length > 0) {
    reasons.push({
      code: "risk_flags",
      severity: "warning",
      message: `${item.flags.length} scoring flag${item.flags.length === 1 ? "" : "s"} need review.`,
    });
  }

  if (item.confidenceScore < 60) {
    reasons.push({
      code: "low_confidence",
      severity: "warning",
      message: "Supporting data confidence is below the review threshold.",
    });
  }

  return reasons;
}

function toPortfolioSummaryRecord(item: PortfolioItemResponse): PortfolioSummaryRecord {
  return {
    id: item.id,
    datasetId: item.datasetId,
    scoredRecordId: item.scoredRecordId,
    ...(item.sourceWatchlistItemId ? { sourceWatchlistItemId: item.sourceWatchlistItemId } : {}),
    status: item.status,
    statusUpdatedAt: item.statusUpdatedAt,
    sourceRowNumber: item.sourceRowNumber,
    normalizedFields: item.normalizedFields,
    investmentScore: item.investmentScore,
    riskScore: item.riskScore,
    confidenceScore: item.confidenceScore,
    flagCount: item.flags.length,
    ...(item.flags[0] ? { primaryFlag: item.flags[0] } : {}),
    trackedAt: item.trackedAt,
    updatedAt: item.updatedAt,
  };
}

function isActivePortfolioStatus(status: PortfolioStatus): boolean {
  return status !== "closed" && status !== "discarded";
}

function attentionSeverityScore(reasons: PortfolioAttentionReason[]): number {
  return reasons.reduce((score, reason) => score + (reason.severity === "warning" ? 2 : 1), 0);
}

function attentionStatusPriority(status: PortfolioStatus): number {
  switch (status) {
    case "reviewing":
      return 0;
    case "tracked":
      return 1;
    case "ready":
      return 2;
    case "acquired":
      return 3;
    case "closed":
    case "discarded":
      return 4;
  }
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
    case "workspace_comment_added":
      return "Workspace discussion";
    case "workspace_item_assigned":
      return "Workspace assignment";
  }
}

export type AlertDestination =
  | { surface: "dataset"; entityId: string; workspaceId?: string }
  | { surface: "comparison"; workspaceId: string }
  | { surface: "watchlist"; workspaceId: string }
  | { surface: "portfolio"; workspaceId: string }
  | null;

export function alertDestination(alert: AlertResponse): AlertDestination {
  if (!alert.relatedEntityType || !alert.relatedEntityId) {
    return null;
  }

  const workspaceId = alert.metadata?.workspaceId;
  switch (alert.relatedEntityType) {
    case "dataset":
      return {
        surface: "dataset",
        entityId: alert.relatedEntityId,
        ...(workspaceId ? { workspaceId } : {}),
      };
    case "comparison_item":
      return workspaceId ? { surface: "comparison", workspaceId } : null;
    case "watchlist_item":
      return workspaceId ? { surface: "watchlist", workspaceId } : null;
    case "portfolio_item":
      return workspaceId ? { surface: "portfolio", workspaceId } : null;
    case "job":
      return null;
  }
}

export function alertDestinationLabel(entityType: AlertRelatedEntityType): string {
  switch (entityType) {
    case "dataset":
      return "Open dataset";
    case "comparison_item":
      return "Open comparison";
    case "watchlist_item":
      return "Open watchlist";
    case "portfolio_item":
      return "Open portfolio";
    case "job":
      return "Open job";
  }
}

export function discussionAttentionLabel(attention: DiscussionAttentionResponse | null): string {
  if (!attention?.hasUnread) {
    return "Up to date";
  }
  return `${attention.unreadCount} unread`;
}

export function notificationDeliveryModeLabel(mode: NotificationDeliveryMode): string {
  switch (mode) {
    case "in_app_only":
      return "In-app only";
    case "delivery_eligible":
      return "Delivery-ready";
  }
}

export function notificationCadenceLabel(cadence: NotificationCadence): string {
  switch (cadence) {
    case "immediate":
      return "Immediate";
    case "digest":
      return "Digest-ready";
  }
}

export function notificationDeliveryStateLabel(state: NotificationDeliveryState): string {
  switch (state) {
    case "suppressed":
      return "Suppressed";
    case "in_app_only":
      return "In-app only";
    case "delivery_immediate":
      return "Delivery-ready immediate";
    case "delivery_digest":
      return "Delivery-ready digest";
  }
}

export function notificationDeliveryStatusLabel(status: NotificationDeliveryStatus): string {
  switch (status) {
    case "suppressed":
      return "Suppressed";
    case "in_app_only":
      return "In-app only";
    case "digest_ready":
      return "Waiting for digest";
    case "digest_processing":
      return "Building digest";
    case "pending":
      return "Sending";
    case "sent":
      return "Sent";
    case "failed":
      return "Failed";
    case "provider_disabled":
      return "Provider disabled";
  }
}

export function notificationDigestBatchStatusLabel(status: NotificationDigestBatchStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "sent":
      return "Sent";
    case "failed":
      return "Failed";
    case "provider_disabled":
      return "Provider disabled";
    case "suppressed":
      return "Suppressed";
    case "empty":
      return "No eligible items";
  }
}

export function notificationDeliveryStatusClassName(
  status: NotificationDeliveryStatus | NotificationDigestBatchStatus,
): string {
  switch (status) {
    case "sent":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "failed":
      return "border-red-200 bg-red-50 text-red-800";
    case "provider_disabled":
    case "suppressed":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "pending":
    case "processing":
    case "digest_processing":
      return "border-sky-200 bg-sky-50 text-sky-900";
    default:
      return "border-line bg-field text-ink";
  }
}

export function sortNotificationDeliveriesForReview(
  deliveries: NotificationDeliveryHistoryItem[],
): NotificationDeliveryHistoryItem[] {
  return [...deliveries].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export function sortNotificationDigestBatchesForReview(
  batches: NotificationDigestBatchResponse[],
): NotificationDigestBatchResponse[] {
  return [...batches].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
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
