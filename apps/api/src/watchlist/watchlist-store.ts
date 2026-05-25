import type { WatchlistItemDocument } from "@tax-lien/db";
import { WatchlistItemModel } from "@tax-lien/db";
import type { ScoringResult } from "@tax-lien/scoring";
import type { NormalizedScoredRecordFields } from "@tax-lien/types";

export interface StoredWatchlistItem {
  id: string;
  userId: string;
  datasetId: string;
  scoredRecordId: string;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  score: ScoringResult;
  scoredAt: Date;
  addedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWatchlistItemInput {
  userId: string;
  datasetId: string;
  scoredRecordId: string;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  score: ScoringResult;
  scoredAt: Date;
  addedAt: Date;
}

export interface CreateWatchlistItemResult {
  item: StoredWatchlistItem;
  alreadyExists: boolean;
}

export interface WatchlistStore {
  createItem(input: CreateWatchlistItemInput): Promise<CreateWatchlistItemResult>;
  listItemsForUser(userId: string): Promise<StoredWatchlistItem[]>;
  deleteItemForUser(watchlistItemId: string, userId: string): Promise<boolean>;
}

export class MongoWatchlistStore implements WatchlistStore {
  public async createItem(input: CreateWatchlistItemInput): Promise<CreateWatchlistItemResult> {
    const existing = await WatchlistItemModel.findOne({
      userId: input.userId,
      scoredRecordId: input.scoredRecordId,
    }).exec();

    if (existing) {
      return {
        item: mapWatchlistItem(existing),
        alreadyExists: true,
      };
    }

    try {
      const document = await WatchlistItemModel.create(input);
      return {
        item: mapWatchlistItem(document),
        alreadyExists: false,
      };
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
        const duplicate = await WatchlistItemModel.findOne({
          userId: input.userId,
          scoredRecordId: input.scoredRecordId,
        }).exec();

        if (duplicate) {
          return {
            item: mapWatchlistItem(duplicate),
            alreadyExists: true,
          };
        }
      }

      throw error;
    }
  }

  public async listItemsForUser(userId: string): Promise<StoredWatchlistItem[]> {
    const documents = await WatchlistItemModel.find({ userId })
      .sort({ "score.investmentScore": -1, "score.riskScore": 1, addedAt: -1 })
      .exec();
    return documents.map(mapWatchlistItem);
  }

  public async deleteItemForUser(watchlistItemId: string, userId: string): Promise<boolean> {
    const result = await WatchlistItemModel.deleteOne({ _id: watchlistItemId, userId }).exec();
    return result.deletedCount === 1;
  }
}

export function mapWatchlistItem(document: WatchlistItemDocument): StoredWatchlistItem {
  return {
    id: document.id,
    userId: document.userId,
    datasetId: document.datasetId,
    scoredRecordId: document.scoredRecordId,
    sourceRowNumber: document.sourceRowNumber,
    normalizedFields: {
      propertyTypeCategory: document.normalizedFields.propertyTypeCategory,
      ...(document.normalizedFields.parcelId ? { parcelId: document.normalizedFields.parcelId } : {}),
      ...(document.normalizedFields.lienAmount !== undefined ? { lienAmount: document.normalizedFields.lienAmount } : {}),
      ...(document.normalizedFields.estimatedValue !== undefined
        ? { estimatedValue: document.normalizedFields.estimatedValue }
        : {}),
      ...(document.normalizedFields.propertyType ? { propertyType: document.normalizedFields.propertyType } : {}),
      ...(document.normalizedFields.address ? { address: document.normalizedFields.address } : {}),
    },
    score: {
      investmentScore: document.score.investmentScore,
      riskScore: document.score.riskScore,
      liquidityScore: document.score.liquidityScore,
      redemptionProbability: document.score.redemptionProbability,
      confidenceScore: document.score.confidenceScore,
      ...(document.score.valueCoverageRatio !== undefined ? { valueCoverageRatio: document.score.valueCoverageRatio } : {}),
      flags: document.score.flags,
      reasoning: document.score.reasoning,
    },
    scoredAt: document.scoredAt,
    addedAt: document.addedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
