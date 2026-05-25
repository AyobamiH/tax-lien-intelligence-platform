import mongoose from "mongoose";
import type {
  AddWatchlistItemResponse,
  DeleteWatchlistItemResponse,
  WatchlistItemResponse,
  WatchlistListResponse,
} from "@tax-lien/types";
import { ApiError } from "../errors/api-error.js";
import type { ScoredRecordStore } from "../scoring/scored-record-store.js";
import type { StoredWatchlistItem, WatchlistStore } from "./watchlist-store.js";

export class WatchlistService {
  private readonly watchlistStore: WatchlistStore;
  private readonly scoredRecordStore: ScoredRecordStore;

  public constructor(watchlistStore: WatchlistStore, scoredRecordStore: ScoredRecordStore) {
    this.watchlistStore = watchlistStore;
    this.scoredRecordStore = scoredRecordStore;
  }

  public async addItem(userId: string, scoredRecordId: string): Promise<AddWatchlistItemResponse> {
    if (!mongoose.Types.ObjectId.isValid(scoredRecordId)) {
      throw new ApiError(400, "watchlist_invalid_scored_record_id", "Scored record id is invalid.");
    }

    const scoredRecord = await this.scoredRecordStore.findScoreByIdForUser(scoredRecordId, userId);
    if (!scoredRecord) {
      throw new ApiError(404, "watchlist_scored_record_not_found", "Scored record was not found.");
    }

    const result = await this.watchlistStore.createItem({
      userId,
      datasetId: scoredRecord.datasetId,
      scoredRecordId: scoredRecord.id,
      sourceRowNumber: scoredRecord.sourceRowNumber,
      normalizedFields: scoredRecord.normalizedFields,
      score: scoredRecord.score,
      scoredAt: scoredRecord.scoredAt,
      addedAt: new Date(),
    });

    return {
      item: toWatchlistItemResponse(result.item),
      alreadyExists: result.alreadyExists,
    };
  }

  public async listItems(userId: string): Promise<WatchlistListResponse> {
    const items = await this.watchlistStore.listItemsForUser(userId);
    return {
      items: items.map(toWatchlistItemResponse),
    };
  }

  public async deleteItem(userId: string, watchlistItemId: string): Promise<DeleteWatchlistItemResponse> {
    if (!mongoose.Types.ObjectId.isValid(watchlistItemId)) {
      throw new ApiError(400, "watchlist_invalid_item_id", "Watchlist item id is invalid.");
    }

    const deleted = await this.watchlistStore.deleteItemForUser(watchlistItemId, userId);
    if (!deleted) {
      throw new ApiError(404, "watchlist_item_not_found", "Watchlist item was not found.");
    }

    return {
      deleted: true,
      id: watchlistItemId,
    };
  }
}

export function toWatchlistItemResponse(item: StoredWatchlistItem): WatchlistItemResponse {
  return {
    id: item.id,
    datasetId: item.datasetId,
    scoredRecordId: item.scoredRecordId,
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
    addedAt: item.addedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
