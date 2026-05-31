import type { ScoredRecordDocument } from "@tax-lien/db";
import { ScoredRecordModel } from "@tax-lien/db";
import type { ScoringResult } from "@tax-lien/scoring";
import type { EnrichmentResult, NormalizedScoredRecordFields } from "@tax-lien/types";

export interface StoredScoredRecord {
  id: string;
  userId: string;
  datasetId: string;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  enrichment?: EnrichmentResult;
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
  enrichment: EnrichmentResult;
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
  findScoreByIdForUser(scoredRecordId: string, userId: string): Promise<StoredScoredRecord | null>;
}

export class MongoScoredRecordStore implements ScoredRecordStore {
  public async replaceScoresForDataset(
    userId: string,
    datasetId: string,
    records: CreateScoredRecordInput[],
  ): Promise<StoredScoredRecord[]> {
    if (records.length === 0) {
      await ScoredRecordModel.deleteMany({ userId, datasetId }).exec();
      return [];
    }

    const sourceRowNumbers = records.map((record) => record.sourceRowNumber);
    await ScoredRecordModel.deleteMany({
      userId,
      datasetId,
      sourceRowNumber: { $nin: sourceRowNumbers },
    }).exec();

    await ScoredRecordModel.bulkWrite(
      records.map((record) => ({
        updateOne: {
          filter: {
            userId,
            datasetId,
            sourceRowNumber: record.sourceRowNumber,
          },
          update: {
            $set: {
              normalizedFields: record.normalizedFields,
              enrichment: record.enrichment,
              score: record.score,
              scoredAt: record.scoredAt,
            },
            $setOnInsert: {
              userId,
              datasetId,
              sourceRowNumber: record.sourceRowNumber,
            },
          },
          upsert: true,
        },
      })),
    );

    return this.listScoresForDataset(userId, datasetId);
  }

  public async listScoresForDataset(userId: string, datasetId: string): Promise<StoredScoredRecord[]> {
    const documents = await ScoredRecordModel.find({ userId, datasetId })
      .sort({ "score.investmentScore": -1, sourceRowNumber: 1 })
      .exec();
    return documents.map(mapScoredRecord);
  }

  public async findScoreByIdForUser(scoredRecordId: string, userId: string): Promise<StoredScoredRecord | null> {
    const document = await ScoredRecordModel.findOne({ _id: scoredRecordId, userId }).exec();
    return document ? mapScoredRecord(document) : null;
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
    ...(document.enrichment ? { enrichment: mapEnrichmentResult(document.enrichment) } : {}),
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

function mapEnrichmentResult(enrichment: NonNullable<ScoredRecordDocument["enrichment"]>): EnrichmentResult {
  return {
    adapters: enrichment.adapters,
    dataQualityScore: enrichment.dataQualityScore,
    inferredFields: {
      ...(enrichment.inferredFields.parcelId ? { parcelId: enrichment.inferredFields.parcelId } : {}),
      ...(enrichment.inferredFields.lienAmount !== undefined ? { lienAmount: enrichment.inferredFields.lienAmount } : {}),
      ...(enrichment.inferredFields.estimatedValue !== undefined
        ? { estimatedValue: enrichment.inferredFields.estimatedValue }
        : {}),
      ...(enrichment.inferredFields.propertyType ? { propertyType: enrichment.inferredFields.propertyType } : {}),
      ...(enrichment.inferredFields.propertyTypeCategory
        ? { propertyTypeCategory: enrichment.inferredFields.propertyTypeCategory }
        : {}),
      ...(enrichment.inferredFields.address ? { address: enrichment.inferredFields.address } : {}),
    },
    signals: enrichment.signals.map((signal) => ({
      adapterId: signal.adapterId,
      field: signal.field,
      confidence: signal.confidence,
      message: signal.message,
    })),
    flags: enrichment.flags,
    reasoning: enrichment.reasoning,
  };
}
