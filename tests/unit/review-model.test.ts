import { describe, expect, it } from "vitest";
import type {
  AlertResponse,
  ComparisonItemResponse,
  DecisionHistoryEventResponse,
  DatasetResponse,
  NotificationDeliveryHistoryItem,
  NotificationDigestBatchResponse,
  PortfolioItemResponse,
  ScoredRecordResponse,
  WatchlistItemResponse,
  WorkspaceActivityResponse,
  WorkspaceAssignmentResponse,
} from "@tax-lien/types";
import {
  alertDestination,
  alertDestinationLabel,
  alertSeverityClassName,
  alertTypeLabel,
  approvalActionLabel,
  approvalStatusClassName,
  approvalStatusLabel,
  assignmentDestination,
  assignmentEntityLabel,
  applyPortfolioSavedViewForReview,
  buildComparisonByPortfolioId,
  buildComparisonByScoreId,
  buildComparisonByWatchlistId,
  buildPortfolioByScoreId,
  buildPortfolioByWatchlistId,
  buildWatchlistByScoreId,
  canChangeWorkspaceMemberRole,
  canRemoveWorkspaceMember,
  datasetImportPresentation,
  datasetNeedsImportRepair,
  datasetReadinessClassName,
  datasetReadinessLabel,
  datasetReadinessPresentation,
  datasetScoringStatusClassName,
  datasetScoringStatusLabel,
  filterPortfolioItemsForReview,
  filterScoresForReview,
  flagPreview,
  formatMoney,
  formatPercent,
  formatRatio,
  importProfileApplicationPresentation,
  importProfileMappingSourceLabel,
  manualMappingByTarget,
  manualMappingTargetPresentations,
  notificationCadenceLabel,
  notificationDeliveryModeLabel,
  notificationDeliveryStateLabel,
  notificationDeliveryStatusClassName,
  notificationDeliveryStatusLabel,
  notificationDigestBatchStatusLabel,
  primaryRecordLabel,
  comparisonDecisionClassName,
  comparisonDecisionLabel,
  comparisonDecisionOptions,
  decisionHistoryEventLabel,
  discussionAttentionDestination,
  discussionAttentionLabel,
  portfolioStatusClassName,
  portfolioStatusLabel,
  portfolioStatusOptions,
  reasoningPreview,
  savedViewCriteriaLabel,
  scoreBand,
  sortAlertsForReview,
  sortComparisonItemsForReview,
  sortDecisionHistoryForReview,
  sortNotificationDeliveriesForReview,
  sortNotificationDigestBatchesForReview,
  sortPortfolioItemsForReview,
  sortScoresForReview,
  sortWatchlistItemsForReview,
  summarizePortfolioForReview,
  summarizeScores,
  topReadinessIssues,
  workspaceActivityCategoryLabel,
  workspaceActivityDestination,
  workspaceActivityDestinationLabel,
  workspaceRoleLabel,
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

function comparisonItem(overrides: Partial<ComparisonItemResponse>): ComparisonItemResponse {
  return {
    id: "comparison-1",
    workspaceId: "default",
    datasetId: "dataset-1",
    scoredRecordId: "score-1",
    sourceType: "score",
    decision: "undecided",
    decisionUpdatedAt: "2026-05-25T00:00:00.000Z",
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

function alertResponse(overrides: Partial<AlertResponse>): AlertResponse {
  return {
    id: "alert-1",
    type: "scoring_job_completed",
    severity: "info",
    status: "unread",
    message: "Scoring completed. 2 records are ready for review.",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
    ...overrides,
  };
}

function decisionHistoryEvent(overrides: Partial<DecisionHistoryEventResponse>): DecisionHistoryEventResponse {
  return {
    id: "history-1",
    relatedEntityType: "comparison_item",
    relatedEntityId: "comparison-1",
    eventType: "comparison_decision_changed",
    previousDecision: "undecided",
    newDecision: "move_forward",
    noteSnapshot: "Confirm county sale terms.",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
    ...overrides,
  };
}

function datasetResponse(overrides: Partial<DatasetResponse>): DatasetResponse {
  return {
    id: "dataset-1",
    originalFilename: "county.csv",
    sourceType: "manual_csv",
    status: "validated",
    rowCount: 2,
    columnCount: 4,
    headers: ["parcel_id", "lien_amount"],
    validationSummary: {
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      warnings: [],
      errors: [],
    },
    importSummary: {
      adapterMatched: false,
      adapterId: "generic_csv",
      adapterName: "Generic CSV normalization",
      source: "generic_csv",
      confidence: "low",
      fallbackUsed: true,
      mappedFields: [],
      warnings: [],
    },
    readinessSummary: {
      status: "partial",
      score: 65,
      scoringRecommended: true,
      fieldCoverage: [
        {
          field: "parcel_id",
          label: "Parcel identifier",
          presentRows: 2,
          totalRows: 2,
          coveragePercent: 100,
          importance: "important",
        },
        {
          field: "lien_amount",
          label: "Lien amount",
          presentRows: 2,
          totalRows: 2,
          coveragePercent: 100,
          importance: "required",
        },
        {
          field: "estimated_value",
          label: "Estimated value",
          presentRows: 2,
          totalRows: 2,
          coveragePercent: 100,
          importance: "required",
        },
      ],
      issues: [
        {
          code: "generic_fallback_used",
          severity: "info",
          message: "No county-specific adapter matched; generic CSV mapping was used.",
        },
      ],
      guidance: ["Scoring is possible, but review warnings before trusting rankings."],
    },
    manualMapping: {
      mappings: [],
    },
    importProfile: {
      status: "none",
      matchedMappings: 0,
      totalMappings: 0,
      message: "No reusable import profile was applied.",
    },
    uploadedAt: "2026-05-25T00:00:00.000Z",
    createdAt: "2026-05-25T00:00:00.000Z",
    updatedAt: "2026-05-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("review model helpers", () => {
  it("presents the intentionally small workspace role set clearly", () => {
    expect(workspaceRoleLabel("owner")).toBe("Owner");
    expect(workspaceRoleLabel("admin")).toBe("Admin");
    expect(workspaceRoleLabel("member")).toBe("Member");
    expect(canChangeWorkspaceMemberRole("owner", "admin")).toBe(true);
    expect(canChangeWorkspaceMemberRole("admin", "member")).toBe(false);
    expect(canChangeWorkspaceMemberRole("owner", "owner")).toBe(false);
    expect(canRemoveWorkspaceMember("owner", "admin")).toBe(true);
    expect(canRemoveWorkspaceMember("admin", "member")).toBe(true);
    expect(canRemoveWorkspaceMember("admin", "admin")).toBe(false);
    expect(canRemoveWorkspaceMember("member", "member")).toBe(false);
    expect(canRemoveWorkspaceMember("owner", "owner")).toBe(false);
  });

  it("presents approval actions and states clearly", () => {
    expect(approvalActionLabel("comparison_handoff_to_portfolio")).toBe(
      "Move comparison item to portfolio",
    );
    expect(approvalStatusLabel("pending")).toBe("Pending");
    expect(approvalStatusLabel("approved")).toBe("Approved");
    expect(approvalStatusLabel("rejected")).toBe("Rejected");
    expect(approvalStatusLabel("cancelled")).toBe("Cancelled");
    expect(approvalStatusClassName("pending")).toContain("amber");
    expect(approvalStatusClassName("approved")).toContain("emerald");
    expect(approvalStatusClassName("rejected")).toContain("red");
  });

  it("maps workspace activity categories and affected surfaces", () => {
    const activity: WorkspaceActivityResponse = {
      id: "activity-1",
      workspaceId: "workspace-1",
      actor: { userId: "user-1", email: "owner@example.com" },
      category: "data",
      eventType: "dataset_uploaded",
      relatedEntityType: "dataset",
      relatedEntityId: "dataset-1",
      summary: "Uploaded dataset June sale.",
      metadata: { datasetId: "dataset-1", datasetName: "June sale" },
      occurredAt: "2026-06-11T12:00:00.000Z",
    };

    expect(workspaceActivityCategoryLabel("all")).toBe("All");
    expect(workspaceActivityCategoryLabel("decisions")).toBe("Decisions");
    expect(workspaceActivityCategoryLabel("responsibility")).toBe("Responsibility");
    expect(workspaceActivityCategoryLabel("approvals")).toBe("Approvals");
    const destination = workspaceActivityDestination(activity);
    expect(destination).toEqual({ surface: "dataset", datasetId: "dataset-1" });
    expect(destination && workspaceActivityDestinationLabel(destination)).toBe("Open dataset");
    expect(
      workspaceActivityDestination({
        ...activity,
        category: "members",
        eventType: "workspace_member_added",
        relatedEntityType: "workspace_membership",
      }),
    ).toEqual({ surface: "workspace" });
    expect(
      workspaceActivityDestination({
        ...activity,
        category: "members",
        eventType: "workspace_member_removed",
        relatedEntityType: "workspace_membership",
      }),
    ).toEqual({ surface: "workspace" });
    expect(
      workspaceActivityDestination({
        ...activity,
        category: "responsibility",
        eventType: "entity_assigned",
        relatedEntityType: "watchlist_item",
        relatedEntityId: "watchlist-1",
        metadata: {
          targetEntityType: "watchlist_item",
          assigneeUserId: "user-2",
          assigneeEmail: "member@example.com",
        },
      }),
    ).toEqual({ surface: "watchlist" });
    expect(
      workspaceActivityDestination({
        ...activity,
        category: "approvals",
        eventType: "approval_requested",
        relatedEntityType: "comparison_item",
        relatedEntityId: "comparison-1",
      }),
    ).toEqual({ surface: "approvals" });
    expect(workspaceActivityDestinationLabel({ surface: "approvals" })).toBe("Open approvals");
  });

  it("labels and routes assigned records to their operating surface", () => {
    const assignment: WorkspaceAssignmentResponse = {
      id: "assignment-1",
      workspaceId: "workspace-1",
      relatedEntityType: "dataset",
      relatedEntityId: "dataset-1",
      assignee: { userId: "user-2", email: "member@example.com" },
      assignedBy: { userId: "user-1", email: "owner@example.com" },
      assignedAt: "2026-06-12T12:00:00.000Z",
      updatedAt: "2026-06-12T12:00:00.000Z",
    };

    expect(assignmentEntityLabel("comparison_item")).toBe("Comparison item");
    expect(assignmentDestination(assignment)).toEqual({
      surface: "dataset",
      datasetId: "dataset-1",
    });
    expect(
      assignmentDestination({
        ...assignment,
        relatedEntityType: "portfolio_item",
        relatedEntityId: "portfolio-1",
      }),
    ).toEqual({ surface: "portfolio" });
  });

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

  it("summarizes portfolio status distribution, activity, attention, and filters", () => {
    const tracked = portfolioItem({
      id: "tracked",
      scoredRecordId: "score-tracked",
      status: "tracked",
      trackedAt: "2026-05-25T01:00:00.000Z",
      statusUpdatedAt: "2026-05-25T01:00:00.000Z",
    });
    const reviewing = portfolioItem({
      id: "reviewing",
      scoredRecordId: "score-reviewing",
      status: "reviewing",
      flags: ["Missing estimated value"],
      confidenceScore: 55,
      trackedAt: "2026-05-25T02:00:00.000Z",
      statusUpdatedAt: "2026-05-25T04:00:00.000Z",
    });
    const ready = portfolioItem({
      id: "ready",
      scoredRecordId: "score-ready",
      status: "ready",
      trackedAt: "2026-05-25T03:00:00.000Z",
      statusUpdatedAt: "2026-05-25T03:00:00.000Z",
    });
    const closed = portfolioItem({
      id: "closed",
      scoredRecordId: "score-closed",
      status: "closed",
      trackedAt: "2026-05-25T00:30:00.000Z",
      statusUpdatedAt: "2026-05-25T05:00:00.000Z",
    });

    const summary = summarizePortfolioForReview([tracked, reviewing, ready, closed], "2026-05-25T06:00:00.000Z");

    expect(summary).toMatchObject({
      totalTrackedItems: 4,
      activeItems: 3,
      readyItems: 1,
      acquiredItems: 0,
      generatedAt: "2026-05-25T06:00:00.000Z",
    });
    expect(summary.statusCounts.find((count) => count.status === "closed")).toEqual({
      status: "closed",
      count: 1,
      isActive: false,
    });
    expect(summary.recentAdditions.map((activity) => activity.item.id)).toEqual(["ready", "reviewing", "tracked", "closed"]);
    expect(summary.recentStatusChanges.map((activity) => activity.item.id)).toEqual(["closed", "reviewing"]);
    expect(summary.needsAttention[0]).toMatchObject({
      item: { id: "reviewing" },
      reasons: expect.arrayContaining([
        expect.objectContaining({ code: "review_status" }),
        expect.objectContaining({ code: "risk_flags" }),
        expect.objectContaining({ code: "low_confidence" }),
      ]),
    });
    expect(filterPortfolioItemsForReview([tracked, reviewing, ready, closed], "active").map((item) => item.id)).toEqual([
      "tracked",
      "reviewing",
      "ready",
    ]);
    expect(filterPortfolioItemsForReview([tracked, reviewing, ready, closed], "ready").map((item) => item.id)).toEqual([
      "ready",
    ]);
  });

  it("applies saved portfolio views and describes deterministic criteria", () => {
    const tracked = portfolioItem({
      id: "tracked",
      status: "tracked",
      flags: ["Needs property type review"],
      trackedAt: "2026-05-25T01:00:00.000Z",
      statusUpdatedAt: "2026-05-25T01:00:00.000Z",
    });
    const ready = portfolioItem({
      id: "ready",
      status: "ready",
      riskScore: 12,
      confidenceScore: 92,
      trackedAt: "2026-05-25T03:00:00.000Z",
      statusUpdatedAt: "2026-05-25T03:00:00.000Z",
    });
    const closed = portfolioItem({
      id: "closed",
      status: "closed",
      flags: ["Historical flag"],
      trackedAt: "2026-05-25T04:00:00.000Z",
      statusUpdatedAt: "2026-05-25T04:00:00.000Z",
    });
    const view = {
      id: "view-1",
      surface: "portfolio" as const,
      name: "Attention",
      filters: { queue: "needs_attention" as const, hasFlags: true },
      sort: { key: "tracked_at" as const, direction: "desc" as const },
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
    };

    expect(applyPortfolioSavedViewForReview([tracked, ready, closed], view).map((item) => item.id)).toEqual(["tracked"]);
    expect(savedViewCriteriaLabel(view)).toBe("needs attention · with flags");
  });

  it("builds comparison state, labels decisions, and sorts decision records", () => {
    const undecided = comparisonItem({
      id: "undecided",
      scoredRecordId: "score-undecided",
      sourceType: "score",
      decision: "undecided",
      investmentScore: 75,
      riskScore: 20,
    });
    const moveForward = comparisonItem({
      id: "move-forward",
      scoredRecordId: "score-move-forward",
      sourceType: "portfolio",
      sourcePortfolioItemId: "portfolio-move-forward",
      decision: "move_forward",
      investmentScore: 96,
      riskScore: 5,
    });
    const keepReviewing = comparisonItem({
      id: "keep-reviewing",
      scoredRecordId: "score-keep-reviewing",
      sourceType: "watchlist",
      sourceWatchlistItemId: "watch-keep-reviewing",
      decision: "keep_reviewing",
      investmentScore: 88,
      riskScore: 12,
    });

    const sorted = sortComparisonItemsForReview([moveForward, keepReviewing, undecided]);
    const byScoreId = buildComparisonByScoreId(sorted);
    const byWatchlistId = buildComparisonByWatchlistId(sorted);
    const byPortfolioId = buildComparisonByPortfolioId(sorted);

    expect(comparisonDecisionOptions).toEqual(["undecided", "keep_reviewing", "move_forward", "rejected"]);
    expect(sorted.map((item) => item.id)).toEqual(["undecided", "keep-reviewing", "move-forward"]);
    expect(byScoreId.get("score-move-forward")?.id).toBe("move-forward");
    expect(byWatchlistId.get("watch-keep-reviewing")?.id).toBe("keep-reviewing");
    expect(byPortfolioId.get("portfolio-move-forward")?.id).toBe("move-forward");
    expect(comparisonDecisionLabel("move_forward")).toBe("Move forward");
    expect(comparisonDecisionClassName("rejected")).toContain("red");
  });

  it("sorts and labels comparison decision history for review", () => {
    const olderDecisionChange = decisionHistoryEvent({
      id: "older-decision",
      eventType: "comparison_decision_changed",
      createdAt: "2026-05-25T01:00:00.000Z",
    });
    const newerNoteChange = decisionHistoryEvent({
      id: "newer-note",
      eventType: "comparison_note_changed",
      previousNoteSnapshot: "Initial county review.",
      noteSnapshot: "Confirmed sale terms.",
      createdAt: "2026-05-25T02:00:00.000Z",
    });

    const sorted = sortDecisionHistoryForReview([olderDecisionChange, newerNoteChange]);

    expect(sorted.map((event) => event.id)).toEqual(["newer-note", "older-decision"]);
    expect(decisionHistoryEventLabel("comparison_decision_changed")).toBe("Decision changed");
    expect(decisionHistoryEventLabel("comparison_note_changed")).toBe("Note changed");
    expect(decisionHistoryEventLabel("comparison_handoff_to_watchlist")).toBe("Sent to watchlist");
    expect(decisionHistoryEventLabel("comparison_handoff_to_portfolio")).toBe("Tracked in portfolio");
  });

  it("sorts and labels alerts for the monitoring surface", () => {
    const olderUnread = alertResponse({ id: "older-unread", createdAt: "2026-05-25T01:00:00.000Z" });
    const newerRead = alertResponse({
      id: "newer-read",
      status: "read",
      readAt: "2026-05-25T03:00:00.000Z",
      createdAt: "2026-05-25T03:00:00.000Z",
    });
    const newerUnread = alertResponse({
      id: "newer-unread",
      type: "scoring_job_failed",
      severity: "error",
      createdAt: "2026-05-25T02:00:00.000Z",
    });

    expect(sortAlertsForReview([newerRead, olderUnread, newerUnread]).map((alert) => alert.id)).toEqual([
      "newer-unread",
      "older-unread",
      "newer-read",
    ]);
    expect(alertTypeLabel("scoring_job_completed")).toBe("Scoring completed");
    expect(alertTypeLabel("scoring_job_failed")).toBe("Scoring failed");
    expect(alertTypeLabel("workspace_comment_added")).toBe("Workspace discussion");
    expect(alertTypeLabel("workspace_item_assigned")).toBe("Workspace assignment");
    expect(alertSeverityClassName("error")).toContain("red");
    expect(notificationDeliveryModeLabel("in_app_only")).toBe("In-app only");
    expect(notificationDeliveryModeLabel("delivery_eligible")).toBe("Delivery-ready");
    expect(notificationCadenceLabel("digest")).toBe("Digest-ready");
    expect(notificationDeliveryStateLabel("delivery_immediate")).toBe("Delivery-ready immediate");
    expect(notificationDeliveryStatusLabel("digest_processing")).toBe("Building digest");
    expect(notificationDigestBatchStatusLabel("provider_disabled")).toBe("Provider disabled");
    expect(notificationDeliveryStatusClassName("failed")).toContain("red");
  });

  it("routes discussion alerts and labels unread attention", () => {
    const alert = alertResponse({
      type: "workspace_comment_added",
      relatedEntityType: "watchlist_item",
      relatedEntityId: "watch-1",
      metadata: { workspaceId: "workspace-1", commentId: "comment-1" },
    });

    expect(alertDestination(alert)).toEqual({
      surface: "watchlist",
      workspaceId: "workspace-1",
    });
    expect(alertDestinationLabel("watchlist_item")).toBe("Open watchlist");
    expect(
      discussionAttentionLabel({
        workspaceId: "workspace-1",
        relatedEntityType: "watchlist_item",
        relatedEntityId: "watch-1",
        unreadCount: 3,
        hasUnread: true,
      }),
    ).toBe("3 unread");
    expect(discussionAttentionLabel(null)).toBe("Up to date");
    expect(
      discussionAttentionDestination({
        workspaceId: "workspace-1",
        relatedEntityType: "dataset",
        relatedEntityId: "dataset-1",
        unreadCount: 1,
        hasUnread: true,
      }),
    ).toEqual({ surface: "dataset", datasetId: "dataset-1" });
    expect(
      discussionAttentionDestination({
        workspaceId: "workspace-1",
        relatedEntityType: "portfolio_item",
        relatedEntityId: "portfolio-1",
        unreadCount: 2,
        hasUnread: true,
      }),
    ).toEqual({ surface: "portfolio" });
  });

  it("orders notification delivery history and digest batches newest first", () => {
    const olderDelivery: NotificationDeliveryHistoryItem = {
      id: "older",
      alertType: "scoring_job_completed",
      channel: "email",
      status: "sent",
      deliveryMode: "delivery_eligible",
      cadence: "digest",
      attempts: 1,
      preparedAt: "2026-06-05T00:00:00.000Z",
      updatedAt: "2026-06-05T01:00:00.000Z",
    };
    const newerDelivery: NotificationDeliveryHistoryItem = {
      ...olderDelivery,
      id: "newer",
      cadence: "immediate",
      updatedAt: "2026-06-06T01:00:00.000Z",
    };
    const olderBatch: NotificationDigestBatchResponse = {
      id: "batch-older",
      status: "sent",
      itemCount: 2,
      attempts: 1,
      createdAt: "2026-06-05T00:00:00.000Z",
      updatedAt: "2026-06-05T01:00:00.000Z",
    };
    const newerBatch: NotificationDigestBatchResponse = {
      ...olderBatch,
      id: "batch-newer",
      createdAt: "2026-06-06T00:00:00.000Z",
      updatedAt: "2026-06-06T01:00:00.000Z",
    };

    expect(sortNotificationDeliveriesForReview([olderDelivery, newerDelivery]).map((item) => item.id)).toEqual([
      "newer",
      "older",
    ]);
    expect(sortNotificationDigestBatchesForReview([olderBatch, newerBatch]).map((item) => item.id)).toEqual([
      "batch-newer",
      "batch-older",
    ]);
  });

  it("labels dataset refresh and scoring status states", () => {
    expect(datasetScoringStatusLabel("not_scored")).toBe("Not scored");
    expect(datasetScoringStatusLabel("refresh_requested")).toBe("Refresh queued");
    expect(datasetScoringStatusLabel("refresh_in_progress")).toBe("Refresh running");
    expect(datasetScoringStatusLabel("refresh_completed")).toBe("Refresh completed");
    expect(datasetScoringStatusClassName("stale")).toContain("amber");
    expect(datasetScoringStatusClassName("refresh_failed")).toContain("red");
    expect(datasetScoringStatusClassName("fresh")).toContain("emerald");
  });

  it("formats dataset import summaries for upload and review surfaces", () => {
    expect(datasetImportPresentation(datasetResponse({}))).toEqual({
      label: "Generic CSV handling",
      status: "Generic CSV fallback",
      detail: "0 mapped fields · low confidence",
    });

    expect(
      datasetImportPresentation(
        datasetResponse({
          importSummary: {
            adapterMatched: true,
            adapterId: "maricopa_tax_lien_v1",
            adapterName: "Maricopa-style tax lien CSV",
            source: "county_adapter",
            confidence: "high",
            fallbackUsed: false,
            mappedFields: ["parcel_id", "lien_amount", "estimated_value", "property_type", "address"],
            warnings: ["Maricopa-style adapter could not map property_type."],
          },
        }),
      ),
    ).toEqual({
      label: "Maricopa-style tax lien CSV",
      status: "County adapter matched",
      detail: "5 mapped fields · high confidence",
      warning: "Maricopa-style adapter could not map property_type.",
    });
  });

  it("labels dataset readiness and orders issue previews by severity", () => {
    const dataset = datasetResponse({
      readinessSummary: {
        status: "blocked",
        score: 25,
        scoringRecommended: false,
        fieldCoverage: [],
        issues: [
          {
            code: "generic_fallback_used",
            severity: "info",
            message: "No county-specific adapter matched; generic CSV mapping was used.",
          },
          {
            code: "missing_estimated_value",
            severity: "error",
            message: "Estimated value was not recognized in any usable row.",
            field: "estimated_value",
          },
          {
            code: "missing_property_type",
            severity: "warning",
            message: "Property type was not recognized in any usable row.",
            field: "property_type",
          },
        ],
        guidance: ["Do not rely on scoring until required fields are recognized."],
      },
    });

    expect(datasetReadinessLabel("ready")).toBe("Ready");
    expect(datasetReadinessLabel("partial")).toBe("Partial");
    expect(datasetReadinessClassName("blocked")).toContain("red");
    expect(datasetReadinessPresentation(dataset)).toEqual({
      label: "Blocked",
      className: expect.stringContaining("red"),
      actionText: "Improve the import before relying on scoring.",
    });
    expect(topReadinessIssues(dataset, 2).map((issue) => issue.code)).toEqual([
      "missing_estimated_value",
      "missing_property_type",
    ]);
    expect(datasetNeedsImportRepair(dataset)).toBe(true);
  });

  it("summarizes manual mapping state for repair surfaces", () => {
    const dataset = datasetResponse({
      readinessSummary: {
        status: "ready",
        score: 95,
        scoringRecommended: true,
        fieldCoverage: [],
        issues: [],
        guidance: ["Import quality is strong enough for scoring review."],
      },
      manualMapping: {
        updatedAt: "2026-06-01T00:00:00.000Z",
        mappings: [
          {
            targetField: "lien_amount",
            sourceColumn: "Tax Balance",
            source: "manual",
            updatedAt: "2026-06-01T00:00:00.000Z",
          },
        ],
      },
    });

    expect(manualMappingTargetPresentations.map((target) => target.targetField)).toEqual([
      "parcel_id",
      "lien_amount",
      "estimated_value",
      "property_type",
      "address",
    ]);
    expect(manualMappingByTarget(dataset).get("lien_amount")?.sourceColumn).toBe("Tax Balance");
    expect(datasetNeedsImportRepair(dataset)).toBe(false);
  });

  it("summarizes import profile application state for reuse surfaces", () => {
    const suggested = datasetResponse({
      importProfile: {
        status: "suggested",
        profileId: "profile-1",
        profileName: "County import",
        confidence: "medium",
        matchedMappings: 5,
        totalMappings: 5,
        message: "Import profile \"County import\" was suggested using 5/5 mapped column(s).",
      },
    });
    const applied = datasetResponse({
      importProfile: {
        status: "auto_applied",
        profileId: "profile-1",
        profileName: "County import",
        confidence: "high",
        matchedMappings: 5,
        totalMappings: 5,
        message: "Import profile \"County import\" was applied automatically using 5/5 mapped column(s).",
        appliedAt: "2026-06-01T00:00:00.000Z",
      },
      manualMapping: {
        mappings: [
          {
            targetField: "lien_amount",
            sourceColumn: "Tax Balance",
            source: "import_profile",
            updatedAt: "2026-06-01T00:00:00.000Z",
          },
        ],
      },
    });

    expect(importProfileApplicationPresentation(suggested)).toMatchObject({
      label: "Profile suggested",
      canApplySuggestedProfile: true,
    });
    expect(importProfileApplicationPresentation(applied)).toMatchObject({
      label: "Profile applied",
      canApplySuggestedProfile: false,
    });
    expect(importProfileMappingSourceLabel(manualMappingByTarget(applied).get("lien_amount")!.source)).toBe("Profile");
  });
});
