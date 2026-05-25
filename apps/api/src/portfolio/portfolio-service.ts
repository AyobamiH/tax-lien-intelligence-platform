import mongoose from "mongoose";
import type {
  AddPortfolioItemResponse,
  DeletePortfolioItemResponse,
  PortfolioDetailResponse,
  PortfolioItemResponse,
  PortfolioListResponse,
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
