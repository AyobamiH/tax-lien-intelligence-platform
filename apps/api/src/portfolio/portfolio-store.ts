import type { PortfolioItemDocument } from "@tax-lien/db";
import { PortfolioItemModel } from "@tax-lien/db";
import type { ScoringResult } from "@tax-lien/scoring";
import type { NormalizedScoredRecordFields, PortfolioStatus } from "@tax-lien/types";

export interface StoredPortfolioItem {
  id: string;
  userId: string;
  datasetId: string;
  scoredRecordId: string;
  sourceWatchlistItemId?: string;
  status: PortfolioStatus;
  statusUpdatedAt: Date;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  score: ScoringResult;
  scoredAt: Date;
  trackedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePortfolioItemInput {
  userId: string;
  datasetId: string;
  scoredRecordId: string;
  sourceWatchlistItemId?: string;
  status: PortfolioStatus;
  statusUpdatedAt: Date;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  score: ScoringResult;
  scoredAt: Date;
  trackedAt: Date;
}

export interface CreatePortfolioItemResult {
  item: StoredPortfolioItem;
  alreadyExists: boolean;
}

export interface PortfolioStore {
  createItem(input: CreatePortfolioItemInput): Promise<CreatePortfolioItemResult>;
  listItemsForUser(userId: string): Promise<StoredPortfolioItem[]>;
  findItemByIdForUser(portfolioItemId: string, userId: string): Promise<StoredPortfolioItem | null>;
  updateStatusForUser(
    portfolioItemId: string,
    userId: string,
    status: PortfolioStatus,
    statusUpdatedAt: Date,
  ): Promise<StoredPortfolioItem | null>;
  deleteItemForUser(portfolioItemId: string, userId: string): Promise<boolean>;
}

export class MongoPortfolioStore implements PortfolioStore {
  public async createItem(input: CreatePortfolioItemInput): Promise<CreatePortfolioItemResult> {
    const existing = await PortfolioItemModel.findOne({
      userId: input.userId,
      scoredRecordId: input.scoredRecordId,
    }).exec();

    if (existing) {
      return {
        item: mapPortfolioItem(existing),
        alreadyExists: true,
      };
    }

    try {
      const document = await PortfolioItemModel.create(input);
      return {
        item: mapPortfolioItem(document),
        alreadyExists: false,
      };
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
        const duplicate = await PortfolioItemModel.findOne({
          userId: input.userId,
          scoredRecordId: input.scoredRecordId,
        }).exec();

        if (duplicate) {
          return {
            item: mapPortfolioItem(duplicate),
            alreadyExists: true,
          };
        }
      }

      throw error;
    }
  }

  public async listItemsForUser(userId: string): Promise<StoredPortfolioItem[]> {
    const documents = await PortfolioItemModel.find({ userId })
      .sort({ status: 1, "score.investmentScore": -1, trackedAt: -1 })
      .exec();
    return documents.map(mapPortfolioItem);
  }

  public async findItemByIdForUser(portfolioItemId: string, userId: string): Promise<StoredPortfolioItem | null> {
    const document = await PortfolioItemModel.findOne({ _id: portfolioItemId, userId }).exec();
    return document ? mapPortfolioItem(document) : null;
  }

  public async updateStatusForUser(
    portfolioItemId: string,
    userId: string,
    status: PortfolioStatus,
    statusUpdatedAt: Date,
  ): Promise<StoredPortfolioItem | null> {
    const document = await PortfolioItemModel.findOneAndUpdate(
      { _id: portfolioItemId, userId },
      { $set: { status, statusUpdatedAt } },
      { new: true },
    ).exec();

    return document ? mapPortfolioItem(document) : null;
  }

  public async deleteItemForUser(portfolioItemId: string, userId: string): Promise<boolean> {
    const result = await PortfolioItemModel.deleteOne({ _id: portfolioItemId, userId }).exec();
    return result.deletedCount === 1;
  }
}

export function mapPortfolioItem(document: PortfolioItemDocument): StoredPortfolioItem {
  return {
    id: document.id,
    userId: document.userId,
    datasetId: document.datasetId,
    scoredRecordId: document.scoredRecordId,
    ...(document.sourceWatchlistItemId ? { sourceWatchlistItemId: document.sourceWatchlistItemId } : {}),
    status: document.status,
    statusUpdatedAt: document.statusUpdatedAt,
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
    trackedAt: document.trackedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
