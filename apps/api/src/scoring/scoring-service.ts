import mongoose from "mongoose";
import { scoreLienCandidate } from "@tax-lien/scoring";
import type { DatasetScoreRunResponse, DatasetScoresResponse, ScoredRecordResponse } from "@tax-lien/types";
import type { DatasetStore, StoredDatasetSourceRow } from "../datasets/dataset-store.js";
import { ApiError } from "../errors/api-error.js";
import type { InternalJobService } from "../jobs/internal-job-service.js";
import { normalizeDatasetRow } from "./normalization.js";
import type { CreateScoredRecordInput, ScoredRecordStore, StoredScoredRecord } from "./scored-record-store.js";

export class ScoringService {
  private readonly datasetStore: DatasetStore;
  private readonly scoredRecordStore: ScoredRecordStore;
  private readonly internalJobService: InternalJobService;

  public constructor(
    datasetStore: DatasetStore,
    scoredRecordStore: ScoredRecordStore,
    internalJobService: InternalJobService,
  ) {
    this.datasetStore = datasetStore;
    this.scoredRecordStore = scoredRecordStore;
    this.internalJobService = internalJobService;
  }

  public async scoreDataset(datasetId: string, userId: string): Promise<DatasetScoreRunResponse> {
    const dataset = await this.getDatasetForScoring(datasetId, userId);

    const execution = await this.internalJobService.execute({
      userId,
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: dataset.id,
      run: () => this.executeDatasetScoring(dataset.id, userId, dataset.sourceRows),
      summarize: (result) => ({
        scoredRecordCount: result.scoredRecordCount,
      }),
    });

    return {
      ...execution.result,
      job: execution.job,
    };
  }

  public async listScores(datasetId: string, userId: string): Promise<DatasetScoresResponse> {
    const dataset = await this.getDatasetForScoring(datasetId, userId);
    const scores = await this.scoredRecordStore.listScoresForDataset(userId, dataset.id);

    return {
      datasetId: dataset.id,
      scores: scores.map(toScoredRecordResponse),
    };
  }

  private async executeDatasetScoring(
    datasetId: string,
    userId: string,
    sourceRows: StoredDatasetSourceRow[],
  ): Promise<Omit<DatasetScoreRunResponse, "job">> {
    if (sourceRows.length === 0) {
      throw new ApiError(400, "score_no_source_rows", "Dataset does not contain scoreable source rows.");
    }

    const scoredAt = new Date();
    const records: CreateScoredRecordInput[] = sourceRows.map((sourceRow) => {
      const normalized = normalizeDatasetRow(sourceRow);
      const score = scoreLienCandidate(normalized.scoreableRecord);
      const flags = [...new Set([...score.flags, ...normalized.warnings])];
      const reasoning = [
        ...new Set([
          ...score.reasoning,
          ...normalized.warnings.map((warning) => `Normalization warning: ${warning}`),
        ]),
      ];

      return {
        userId,
        datasetId,
        sourceRowNumber: normalized.sourceRowNumber,
        normalizedFields: normalized.normalizedFields,
        score: {
          ...score,
          flags,
          reasoning,
        },
        scoredAt,
      };
    });

    const storedRecords = await this.scoredRecordStore.replaceScoresForDataset(userId, datasetId, records);

    return {
      datasetId,
      scoredRecordCount: storedRecords.length,
      scores: storedRecords.map(toScoredRecordResponse),
    };
  }

  private async getDatasetForScoring(datasetId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(datasetId)) {
      throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
    }

    const dataset = await this.datasetStore.findDatasetByIdForUser(datasetId, userId);
    if (!dataset) {
      throw new ApiError(404, "dataset_not_found", "Dataset was not found.");
    }

    return dataset;
  }
}

export function toScoredRecordResponse(record: StoredScoredRecord): ScoredRecordResponse {
  return {
    id: record.id,
    datasetId: record.datasetId,
    sourceRowNumber: record.sourceRowNumber,
    normalizedFields: record.normalizedFields,
    investmentScore: record.score.investmentScore,
    riskScore: record.score.riskScore,
    liquidityScore: record.score.liquidityScore,
    redemptionProbability: record.score.redemptionProbability,
    confidenceScore: record.score.confidenceScore,
    ...(record.score.valueCoverageRatio !== undefined ? { valueCoverageRatio: record.score.valueCoverageRatio } : {}),
    flags: record.score.flags,
    reasoning: record.score.reasoning,
    scoredAt: record.scoredAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
