import type { IntelligenceEvaluationRecord, ScoredRecordDocument } from "@tax-lien/db";
import { ScoredRecordModel } from "@tax-lien/db";
import type { ScoringResult } from "@tax-lien/scoring";
import { validateEngineResultV1 } from "@tax-lien/engine-contract";
import type {
  EnrichmentResult,
  IntelligenceEvaluationResponse,
  NormalizedScoredRecordFields,
} from "@tax-lien/types";

export interface StoredScoredRecord {
  id: string;
  userId: string;
  datasetId: string;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  enrichment?: EnrichmentResult;
  intelligence?: IntelligenceEvaluationResponse;
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
  intelligence?: IntelligenceEvaluationResponse;
  score: ScoringResult;
  scoredAt: Date;
}

export interface StaleDatasetSummary {
  userId: string;
  datasetId: string;
  staleRecordCount: number;
  earliestReprocessAfter: string;
  latestScoredAt: Date;
}

export interface ScoredRecordStore {
  replaceScoresForDataset(
    userId: string,
    datasetId: string,
    records: CreateScoredRecordInput[],
  ): Promise<StoredScoredRecord[]>;
  listScoresForDataset(userId: string, datasetId: string): Promise<StoredScoredRecord[]>;
  findScoreByIdForUser(scoredRecordId: string, userId: string): Promise<StoredScoredRecord | null>;
  listStaleDatasetSummaries(now: Date, limit: number): Promise<StaleDatasetSummary[]>;
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
              ...(record.intelligence ? { intelligence: toIntelligenceEvaluationRecord(record.intelligence) } : {}),
              score: record.score,
              scoredAt: record.scoredAt,
            },
            ...(!record.intelligence ? { $unset: { intelligence: "" } } : {}),
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

  public async listStaleDatasetSummaries(now: Date, limit: number): Promise<StaleDatasetSummary[]> {
    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 250));
    const nowIso = now.toISOString();
    const summaries = await ScoredRecordModel.aggregate<{
      _id: { userId: string; datasetId: string };
      staleRecordCount: number;
      earliestReprocessAfter: string;
      latestScoredAt: Date;
    }>([
      {
        $match: {
          $or: [
            { "enrichment.freshness.reprocessEligible": true },
            { "enrichment.freshness.reprocessAfter": { $lte: nowIso } },
          ],
        },
      },
      {
        $group: {
          _id: {
            userId: "$userId",
            datasetId: "$datasetId",
          },
          staleRecordCount: { $sum: 1 },
          earliestReprocessAfter: { $min: "$enrichment.freshness.reprocessAfter" },
          latestScoredAt: { $max: "$scoredAt" },
        },
      },
      { $sort: { earliestReprocessAfter: 1, "_id.userId": 1, "_id.datasetId": 1 } },
      { $limit: safeLimit },
    ]).exec();

    return summaries.map((summary) => ({
      userId: summary._id.userId,
      datasetId: summary._id.datasetId,
      staleRecordCount: summary.staleRecordCount,
      earliestReprocessAfter: summary.earliestReprocessAfter,
      latestScoredAt: summary.latestScoredAt,
    }));
  }
}

function toIntelligenceEvaluationRecord(
  intelligence: IntelligenceEvaluationResponse,
): IntelligenceEvaluationRecord {
  const attemptedAt = intelligence.attemptedAt ? new Date(intelligence.attemptedAt) : undefined;
  if (attemptedAt && Number.isNaN(attemptedAt.getTime())) {
    throw new Error("Intelligence attemptedAt must be a valid timestamp.");
  }
  if (intelligence.state !== "not_configured" && !attemptedAt) {
    throw new Error("Attempted intelligence states must include attemptedAt.");
  }
  switch (intelligence.state) {
    case "completed": {
      const validation = validateEngineResultV1(intelligence.result);
      if (!validation.valid) {
        throw new Error(`Completed intelligence result is invalid: ${validation.errors.join("; ")}`);
      }
      return {
        state: "completed",
        message: intelligence.message,
        attemptedAt: attemptedAt!,
        result: intelligence.result,
      };
    }
    case "failed":
      return {
        state: "failed",
        message: intelligence.message,
        attemptedAt: attemptedAt!,
        failureCode: intelligence.failureCode,
      };
    case "not_configured":
      return {
        state: "not_configured",
        message: intelligence.message,
        ...(attemptedAt ? { attemptedAt } : {}),
      };
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
    ...(document.intelligence ? { intelligence: mapIntelligenceEvaluation(document.intelligence) } : {}),
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

function mapIntelligenceEvaluation(
  intelligence: NonNullable<ScoredRecordDocument["intelligence"]>,
): IntelligenceEvaluationResponse {
  const attemptedAt = intelligence.attemptedAt?.toISOString();
  if (
    intelligence.state === "completed" &&
    intelligence.result !== undefined &&
    validateEngineResultV1(intelligence.result).valid
  ) {
    return {
      state: "completed",
      message: intelligence.message,
      ...(attemptedAt ? { attemptedAt } : {}),
      result: intelligence.result,
    };
  }

  if (intelligence.state === "not_configured") {
    return {
      state: "not_configured",
      message: intelligence.message,
      ...(attemptedAt ? { attemptedAt } : {}),
    };
  }

  return {
    state: "failed",
    failureCode: intelligence.failureCode ?? "invalid_service_response",
    message:
      intelligence.state === "completed"
        ? "Stored versioned intelligence failed contract validation and was not returned."
        : intelligence.message,
    ...(attemptedAt ? { attemptedAt } : {}),
  };
}

function mapEnrichmentResult(enrichment: NonNullable<ScoredRecordDocument["enrichment"]>): EnrichmentResult {
  const enrichedAt = enrichment.enrichedAt ?? new Date(0).toISOString();
  return {
    adapters: enrichment.adapters,
    orchestrationVersion: enrichment.orchestrationVersion ?? "legacy-enrichment-v0",
    enrichedAt,
    adapterOutcomes: (enrichment.adapterOutcomes ?? []).map((outcome) => ({
      adapterId: outcome.adapterId,
      stage: outcome.stage,
      status: outcome.status,
      message: outcome.message,
      startedAt: outcome.startedAt,
      completedAt: outcome.completedAt,
    })),
    freshness: enrichment.freshness
      ? {
          status: enrichment.freshness.status,
          enrichedAt: enrichment.freshness.enrichedAt,
          staleAt: enrichment.freshness.staleAt,
          reprocessAfter: enrichment.freshness.reprocessAfter,
          reprocessEligible: enrichment.freshness.reprocessEligible,
          sourceVersion: enrichment.freshness.sourceVersion,
        }
      : {
          status: "unknown",
          enrichedAt,
          staleAt: enrichedAt,
          reprocessAfter: enrichedAt,
          reprocessEligible: false,
          sourceVersion: "legacy-enrichment-v0",
        },
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
    ...(enrichment.externalResults && enrichment.externalResults.length > 0
      ? {
          externalResults: enrichment.externalResults.map((result) => ({
            adapterId: result.adapterId,
            provider: result.provider,
            status: result.status,
            confidence: result.confidence,
            message: result.message,
            ...(result.normalizedAddress ? { normalizedAddress: result.normalizedAddress } : {}),
            ...(result.latitude !== undefined ? { latitude: result.latitude } : {}),
            ...(result.longitude !== undefined ? { longitude: result.longitude } : {}),
            ...(result.benchmark ? { benchmark: result.benchmark } : {}),
            enrichedAt: result.enrichedAt,
          })),
        }
      : {}),
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
