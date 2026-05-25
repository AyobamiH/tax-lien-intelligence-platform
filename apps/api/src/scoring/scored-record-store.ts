import type { ScoredRecordDocument } from "@tax-lien/db";
import { ScoredRecordModel } from "@tax-lien/db";
import type { ScoringResult } from "@tax-lien/scoring";
import type { NormalizedScoredRecordFields } from "@tax-lien/types";

export interface StoredScoredRecord {
  id: string;
  userId: string;
  datasetId: string;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  score: ScoringResult;
  scoredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScoredRecordInput {
  userId: string;
  datasetId: string;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  score: ScoringResult;
  scoredAt: Date;
}

export interface ScoredRecordStore {
  replaceScoresForDataset(
    userId: string,
    datasetId: string,
    records: CreateScoredRecordInput[],
  ): Promise<StoredScoredRecord[]>;
  listScoresForDataset(userId: string, datasetId: string): Promise<StoredScoredRecord[]>;
}

export class MongoScoredRecordStore implements ScoredRecordStore {
  public async replaceScoresForDataset(
    userId: string,
    datasetId: string,
    records: CreateScoredRecordInput[],
  ): Promise<StoredScoredRecord[]> {
    await ScoredRecordModel.deleteMany({ userId, datasetId }).exec();

    if (records.length === 0) {
      return [];
    }

    const documents = await ScoredRecordModel.insertMany(records, { ordered: true });
    return documents.map(mapScoredRecord);
  }

  public async listScoresForDataset(userId: string, datasetId: string): Promise<StoredScoredRecord[]> {
    const documents = await ScoredRecordModel.find({ userId, datasetId })
      .sort({ "score.investmentScore": -1, sourceRowNumber: 1 })
      .exec();
    return documents.map(mapScoredRecord);
  }
}

function mapScoredRecord(document: ScoredRecordDocument): StoredScoredRecord {
  return {
    id: document.id,
    userId: document.userId,
    datasetId: document.datasetId,
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
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
