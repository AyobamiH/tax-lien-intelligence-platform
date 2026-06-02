import type { ComparisonItemDocument } from "@tax-lien/db";
import { ComparisonItemModel } from "@tax-lien/db";
import type { ScoringResult } from "@tax-lien/scoring";
import type {
  ComparisonDecision,
  ComparisonSourceType,
  NormalizedScoredRecordFields,
} from "@tax-lien/types";

export interface StoredComparisonItem {
  id: string;
  userId: string;
  workspaceId: "default";
  datasetId: string;
  scoredRecordId: string;
  sourceType: ComparisonSourceType;
  sourceWatchlistItemId?: string;
  sourcePortfolioItemId?: string;
  decision: ComparisonDecision;
  decisionUpdatedAt: Date;
  note?: string;
  noteUpdatedAt?: Date;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  score: ScoringResult;
  scoredAt: Date;
  addedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateComparisonItemInput {
  userId: string;
  workspaceId: "default";
  datasetId: string;
  scoredRecordId: string;
  sourceType: ComparisonSourceType;
  sourceWatchlistItemId?: string;
  sourcePortfolioItemId?: string;
  decision: ComparisonDecision;
  decisionUpdatedAt: Date;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  score: ScoringResult;
  scoredAt: Date;
  addedAt: Date;
}

export interface UpdateComparisonItemInput {
  decision?: ComparisonDecision;
  decisionUpdatedAt?: Date;
  note?: string;
  clearNote?: boolean;
  noteUpdatedAt?: Date;
}

export interface CreateComparisonItemResult {
  item: StoredComparisonItem;
  alreadyExists: boolean;
}

export interface ComparisonStore {
  createItem(input: CreateComparisonItemInput): Promise<CreateComparisonItemResult>;
  listItemsForUser(userId: string): Promise<StoredComparisonItem[]>;
  findItemByIdForUser(comparisonItemId: string, userId: string): Promise<StoredComparisonItem | null>;
  updateItemForUser(
    comparisonItemId: string,
    userId: string,
    input: UpdateComparisonItemInput,
  ): Promise<StoredComparisonItem | null>;
  deleteItemForUser(comparisonItemId: string, userId: string): Promise<boolean>;
}

export class MongoComparisonStore implements ComparisonStore {
  public async createItem(input: CreateComparisonItemInput): Promise<CreateComparisonItemResult> {
    const existing = await ComparisonItemModel.findOne({
      userId: input.userId,
      workspaceId: input.workspaceId,
      scoredRecordId: input.scoredRecordId,
    }).exec();

    if (existing) {
      return {
        item: mapComparisonItem(existing),
        alreadyExists: true,
      };
    }

    try {
      const document = await ComparisonItemModel.create(input);
      return {
        item: mapComparisonItem(document),
        alreadyExists: false,
      };
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
        const duplicate = await ComparisonItemModel.findOne({
          userId: input.userId,
          workspaceId: input.workspaceId,
          scoredRecordId: input.scoredRecordId,
        }).exec();

        if (duplicate) {
          return {
            item: mapComparisonItem(duplicate),
            alreadyExists: true,
          };
        }
      }

      throw error;
    }
  }

  public async listItemsForUser(userId: string): Promise<StoredComparisonItem[]> {
    const documents = await ComparisonItemModel.find({ userId, workspaceId: "default" })
      .sort({ decision: 1, "score.investmentScore": -1, addedAt: -1 })
      .exec();
    return documents.map(mapComparisonItem);
  }

  public async findItemByIdForUser(comparisonItemId: string, userId: string): Promise<StoredComparisonItem | null> {
    const document = await ComparisonItemModel.findOne({
      _id: comparisonItemId,
      userId,
      workspaceId: "default",
    }).exec();
    return document ? mapComparisonItem(document) : null;
  }

  public async updateItemForUser(
    comparisonItemId: string,
    userId: string,
    input: UpdateComparisonItemInput,
  ): Promise<StoredComparisonItem | null> {
    const set: Record<string, unknown> = {};
    const unset: Record<string, true> = {};

    if (input.decision) {
      set.decision = input.decision;
      set.decisionUpdatedAt = input.decisionUpdatedAt ?? new Date();
    }

    if (input.clearNote) {
      unset.note = true;
      set.noteUpdatedAt = input.noteUpdatedAt ?? new Date();
    } else if (input.note !== undefined) {
      set.note = input.note;
      set.noteUpdatedAt = input.noteUpdatedAt ?? new Date();
    }

    const update = {
      ...(Object.keys(set).length > 0 ? { $set: set } : {}),
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
    };

    const document = await ComparisonItemModel.findOneAndUpdate(
      { _id: comparisonItemId, userId, workspaceId: "default" },
      update,
      { new: true },
    ).exec();

    return document ? mapComparisonItem(document) : null;
  }

  public async deleteItemForUser(comparisonItemId: string, userId: string): Promise<boolean> {
    const result = await ComparisonItemModel.deleteOne({
      _id: comparisonItemId,
      userId,
      workspaceId: "default",
    }).exec();
    return result.deletedCount === 1;
  }
}

export function mapComparisonItem(document: ComparisonItemDocument): StoredComparisonItem {
  return {
    id: document.id,
    userId: document.userId,
    workspaceId: document.workspaceId,
    datasetId: document.datasetId,
    scoredRecordId: document.scoredRecordId,
    sourceType: document.sourceType,
    ...(document.sourceWatchlistItemId ? { sourceWatchlistItemId: document.sourceWatchlistItemId } : {}),
    ...(document.sourcePortfolioItemId ? { sourcePortfolioItemId: document.sourcePortfolioItemId } : {}),
    decision: document.decision,
    decisionUpdatedAt: document.decisionUpdatedAt,
    ...(document.note ? { note: document.note } : {}),
    ...(document.noteUpdatedAt ? { noteUpdatedAt: document.noteUpdatedAt } : {}),
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
