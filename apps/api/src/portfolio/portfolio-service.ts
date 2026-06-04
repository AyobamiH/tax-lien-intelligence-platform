import mongoose from "mongoose";
import type {
  AddPortfolioItemResponse,
  DeletePortfolioItemResponse,
  PortfolioActivitySummary,
  PortfolioAttentionReason,
  PortfolioAttentionSummary,
  PortfolioDetailResponse,
  PortfolioItemResponse,
  PortfolioListResponse,
  PortfolioStatusCount,
  PortfolioSummaryRecord,
  PortfolioSummaryResponse,
  PortfolioStatus,
  UpdatePortfolioItemResponse,
} from "@tax-lien/types";
import type { ScoringResult } from "@tax-lien/scoring";
import type { NormalizedScoredRecordFields } from "@tax-lien/types";
import { ApiError } from "../errors/api-error.js";
import type { ScoredRecordStore, StoredScoredRecord } from "../scoring/scored-record-store.js";
import type { StoredWatchlistItem, WatchlistStore } from "../watchlist/watchlist-store.js";
import type { PortfolioStore, StoredPortfolioItem } from "./portfolio-store.js";

export const portfolioStatuses = ["tracked", "reviewing", "ready", "acquired", "closed", "discarded"] as const;

export interface AddPortfolioItemInput {
  scoredRecordId?: string;
  watchlistItemId?: string;
  status?: PortfolioStatus;
}

interface PortfolioSourceSnapshot {
  datasetId: string;
  scoredRecordId: string;
  sourceWatchlistItemId?: string;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  score: ScoringResult;
  scoredAt: Date;
}

export class PortfolioService {
  private readonly portfolioStore: PortfolioStore;
  private readonly scoredRecordStore: ScoredRecordStore;
  private readonly watchlistStore: WatchlistStore;

  public constructor(
    portfolioStore: PortfolioStore,
    scoredRecordStore: ScoredRecordStore,
    watchlistStore: WatchlistStore,
  ) {
    this.portfolioStore = portfolioStore;
    this.scoredRecordStore = scoredRecordStore;
    this.watchlistStore = watchlistStore;
  }

  public async addItem(userId: string, input: AddPortfolioItemInput): Promise<AddPortfolioItemResponse> {
    const status = input.status ?? "tracked";
    assertPortfolioStatus(status);
    const source = await this.resolveSource(userId, input);
    const now = new Date();

    const result = await this.portfolioStore.createItem({
      userId,
      datasetId: source.datasetId,
      scoredRecordId: source.scoredRecordId,
      ...(source.sourceWatchlistItemId ? { sourceWatchlistItemId: source.sourceWatchlistItemId } : {}),
      status,
      statusUpdatedAt: now,
      sourceRowNumber: source.sourceRowNumber,
      normalizedFields: source.normalizedFields,
      score: source.score,
      scoredAt: source.scoredAt,
      trackedAt: now,
    });

    return {
      item: toPortfolioItemResponse(result.item),
      alreadyExists: result.alreadyExists,
    };
  }

  public async listItems(userId: string): Promise<PortfolioListResponse> {
    const items = await this.portfolioStore.listItemsForUser(userId);
    return {
      items: items.map(toPortfolioItemResponse),
    };
  }

  public async getSummary(userId: string): Promise<PortfolioSummaryResponse> {
    const items = await this.portfolioStore.listItemsForUser(userId);
    return buildPortfolioSummary(items);
  }

  public async getItem(userId: string, portfolioItemId: string): Promise<PortfolioDetailResponse> {
    assertObjectId(portfolioItemId, "portfolio_invalid_item_id", "Portfolio item id is invalid.");
    const item = await this.portfolioStore.findItemByIdForUser(portfolioItemId, userId);
    if (!item) {
      throw new ApiError(404, "portfolio_item_not_found", "Portfolio item was not found.");
    }

    return {
      item: toPortfolioItemResponse(item),
    };
  }

  public async updateStatus(
    userId: string,
    portfolioItemId: string,
    status: PortfolioStatus,
  ): Promise<UpdatePortfolioItemResponse> {
    assertObjectId(portfolioItemId, "portfolio_invalid_item_id", "Portfolio item id is invalid.");
    assertPortfolioStatus(status);
    const item = await this.portfolioStore.updateStatusForUser(portfolioItemId, userId, status, new Date());
    if (!item) {
      throw new ApiError(404, "portfolio_item_not_found", "Portfolio item was not found.");
    }

    return {
      item: toPortfolioItemResponse(item),
    };
  }

  public async deleteItem(userId: string, portfolioItemId: string): Promise<DeletePortfolioItemResponse> {
    assertObjectId(portfolioItemId, "portfolio_invalid_item_id", "Portfolio item id is invalid.");
    const deleted = await this.portfolioStore.deleteItemForUser(portfolioItemId, userId);
    if (!deleted) {
      throw new ApiError(404, "portfolio_item_not_found", "Portfolio item was not found.");
    }

    return {
      deleted: true,
      id: portfolioItemId,
    };
  }

  private async resolveSource(userId: string, input: AddPortfolioItemInput): Promise<PortfolioSourceSnapshot> {
    const hasScoredRecordId = typeof input.scoredRecordId === "string" && input.scoredRecordId.trim().length > 0;
    const hasWatchlistItemId = typeof input.watchlistItemId === "string" && input.watchlistItemId.trim().length > 0;

    if (hasScoredRecordId === hasWatchlistItemId) {
      throw new ApiError(
        400,
        "portfolio_invalid_source",
        "Provide exactly one scoredRecordId or watchlistItemId.",
      );
    }

    if (hasWatchlistItemId) {
      const watchlistItemId = input.watchlistItemId as string;
      assertObjectId(watchlistItemId, "portfolio_invalid_watchlist_item_id", "Watchlist item id is invalid.");
      const watchlistItem = await this.watchlistStore.findItemByIdForUser(watchlistItemId, userId);
      if (!watchlistItem) {
        throw new ApiError(404, "portfolio_watchlist_item_not_found", "Watchlist item was not found.");
      }

      return snapshotFromWatchlistItem(watchlistItem);
    }

    const scoredRecordId = input.scoredRecordId as string;
    assertObjectId(scoredRecordId, "portfolio_invalid_scored_record_id", "Scored record id is invalid.");
    const scoredRecord = await this.scoredRecordStore.findScoreByIdForUser(scoredRecordId, userId);
    if (!scoredRecord) {
      throw new ApiError(404, "portfolio_scored_record_not_found", "Scored record was not found.");
    }

    return snapshotFromScoredRecord(scoredRecord);
  }
}

export function toPortfolioItemResponse(item: StoredPortfolioItem): PortfolioItemResponse {
  return {
    id: item.id,
    datasetId: item.datasetId,
    scoredRecordId: item.scoredRecordId,
    ...(item.sourceWatchlistItemId ? { sourceWatchlistItemId: item.sourceWatchlistItemId } : {}),
    status: item.status,
    statusUpdatedAt: item.statusUpdatedAt.toISOString(),
    sourceRowNumber: item.sourceRowNumber,
    normalizedFields: item.normalizedFields,
    investmentScore: item.score.investmentScore,
    riskScore: item.score.riskScore,
    liquidityScore: item.score.liquidityScore,
    redemptionProbability: item.score.redemptionProbability,
    confidenceScore: item.score.confidenceScore,
    ...(item.score.valueCoverageRatio !== undefined ? { valueCoverageRatio: item.score.valueCoverageRatio } : {}),
    flags: item.score.flags,
    reasoning: item.score.reasoning,
    scoredAt: item.scoredAt.toISOString(),
    trackedAt: item.trackedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function buildPortfolioSummary(items: StoredPortfolioItem[], generatedAt = new Date()): PortfolioSummaryResponse {
  const activeItems = items.filter(isActivePortfolioItem);
  const statusCounts = portfolioStatuses.map<PortfolioStatusCount>((status) => ({
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
    recentAdditions: buildRecentAdditions(items),
    recentStatusChanges: buildRecentStatusChanges(items),
    needsAttention: buildAttentionSummaries(activeItems),
    generatedAt: generatedAt.toISOString(),
  };
}

function buildRecentAdditions(items: StoredPortfolioItem[]): PortfolioActivitySummary[] {
  return [...items]
    .sort((left, right) => right.trackedAt.getTime() - left.trackedAt.getTime())
    .slice(0, 5)
    .map((item) => ({
      activityType: "added",
      occurredAt: item.trackedAt.toISOString(),
      message: item.sourceWatchlistItemId
        ? "Portfolio tracking started from a watchlist item."
        : "Portfolio tracking started from scored review.",
      item: toPortfolioSummaryRecord(item),
    }));
}

function buildRecentStatusChanges(items: StoredPortfolioItem[]): PortfolioActivitySummary[] {
  return items
    .filter((item) => item.statusUpdatedAt.getTime() !== item.trackedAt.getTime())
    .sort((left, right) => right.statusUpdatedAt.getTime() - left.statusUpdatedAt.getTime())
    .slice(0, 5)
    .map((item) => ({
      activityType: "status_changed",
      occurredAt: item.statusUpdatedAt.toISOString(),
      message: `Status changed to ${item.status}.`,
      item: toPortfolioSummaryRecord(item),
    }));
}

function buildAttentionSummaries(items: StoredPortfolioItem[]): PortfolioAttentionSummary[] {
  return items
    .map((item) => ({
      item,
      reasons: attentionReasonsForItem(item),
    }))
    .filter((summary): summary is { item: StoredPortfolioItem; reasons: PortfolioAttentionReason[] } => summary.reasons.length > 0)
    .sort((left, right) => {
      const severityDelta = attentionSeverityScore(right.reasons) - attentionSeverityScore(left.reasons);
      if (severityDelta !== 0) {
        return severityDelta;
      }

      const statusDelta = attentionStatusPriority(left.item.status) - attentionStatusPriority(right.item.status);
      if (statusDelta !== 0) {
        return statusDelta;
      }

      return right.item.statusUpdatedAt.getTime() - left.item.statusUpdatedAt.getTime();
    })
    .slice(0, 8)
    .map((summary) => ({
      item: toPortfolioSummaryRecord(summary.item),
      reasons: summary.reasons,
    }));
}

function attentionReasonsForItem(item: StoredPortfolioItem): PortfolioAttentionReason[] {
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

  if (item.score.flags.length > 0) {
    reasons.push({
      code: "risk_flags",
      severity: "warning",
      message: `${item.score.flags.length} scoring flag${item.score.flags.length === 1 ? "" : "s"} need review.`,
    });
  }

  if (item.score.confidenceScore < 60) {
    reasons.push({
      code: "low_confidence",
      severity: "warning",
      message: "Supporting data confidence is below the review threshold.",
    });
  }

  return reasons;
}

function toPortfolioSummaryRecord(item: StoredPortfolioItem): PortfolioSummaryRecord {
  return {
    id: item.id,
    datasetId: item.datasetId,
    scoredRecordId: item.scoredRecordId,
    ...(item.sourceWatchlistItemId ? { sourceWatchlistItemId: item.sourceWatchlistItemId } : {}),
    status: item.status,
    statusUpdatedAt: item.statusUpdatedAt.toISOString(),
    sourceRowNumber: item.sourceRowNumber,
    normalizedFields: item.normalizedFields,
    investmentScore: item.score.investmentScore,
    riskScore: item.score.riskScore,
    confidenceScore: item.score.confidenceScore,
    flagCount: item.score.flags.length,
    ...(item.score.flags[0] ? { primaryFlag: item.score.flags[0] } : {}),
    trackedAt: item.trackedAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function isActivePortfolioItem(item: StoredPortfolioItem): boolean {
  return isActivePortfolioStatus(item.status);
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

function snapshotFromWatchlistItem(item: StoredWatchlistItem): PortfolioSourceSnapshot {
  return {
    datasetId: item.datasetId,
    scoredRecordId: item.scoredRecordId,
    sourceWatchlistItemId: item.id,
    sourceRowNumber: item.sourceRowNumber,
    normalizedFields: item.normalizedFields,
    score: item.score,
    scoredAt: item.scoredAt,
  };
}

function snapshotFromScoredRecord(record: StoredScoredRecord): PortfolioSourceSnapshot {
  return {
    datasetId: record.datasetId,
    scoredRecordId: record.id,
    sourceRowNumber: record.sourceRowNumber,
    normalizedFields: record.normalizedFields,
    score: record.score,
    scoredAt: record.scoredAt,
  };
}

function assertPortfolioStatus(status: string): asserts status is PortfolioStatus {
  if (!(portfolioStatuses as readonly string[]).includes(status)) {
    throw new ApiError(400, "portfolio_invalid_status", "Portfolio status is invalid.");
  }
}

function assertObjectId(id: string, code: string, message: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, code, message);
  }
}
