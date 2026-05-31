import mongoose from "mongoose";
import { scoreLienCandidate } from "@tax-lien/scoring";
import type {
  DatasetScoreJobResponse,
  DatasetScoreRunResponse,
  DatasetScoresResponse,
  InternalJobSummary,
  ScoredRecordResponse,
} from "@tax-lien/types";
import type { DatasetStore, StoredDatasetSourceRow } from "../datasets/dataset-store.js";
import { createDefaultEnrichmentService, type EnrichmentService } from "../enrichment/enrichment-service.js";
import { ApiError } from "../errors/api-error.js";
import type { StoredInternalJob } from "../jobs/internal-job-store.js";
import type { InternalJobService } from "../jobs/internal-job-service.js";
import { normalizeDatasetRow } from "./normalization.js";
import type { CreateScoredRecordInput, ScoredRecordStore, StoredScoredRecord } from "./scored-record-store.js";

export class ScoringService {
  private readonly datasetStore: DatasetStore;
  private readonly scoredRecordStore: ScoredRecordStore;
  private readonly internalJobService: InternalJobService;
  private readonly enrichmentService: EnrichmentService;

  public constructor(
    datasetStore: DatasetStore,
    scoredRecordStore: ScoredRecordStore,
    internalJobService: InternalJobService,
    enrichmentService: EnrichmentService = createDefaultEnrichmentService(),
  ) {
    this.datasetStore = datasetStore;
    this.scoredRecordStore = scoredRecordStore;
    this.internalJobService = internalJobService;
    this.enrichmentService = enrichmentService;
  }

  public async scoreDataset(datasetId: string, userId: string): Promise<DatasetScoreJobResponse> {
    const dataset = await this.getDatasetForScoring(datasetId, userId);

    const job = await this.internalJobService.enqueue({
      userId,
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: dataset.id,
    });

    return {
      datasetId: dataset.id,
      job,
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

  public async executeDatasetScoringJob(job: StoredInternalJob): Promise<InternalJobSummary> {
    if (job.type !== "dataset_scoring" || job.targetEntityType !== "dataset") {
      throw new ApiError(400, "job_unsupported_type", "Job type is not supported by the scoring worker.");
    }

    const dataset = await this.getDatasetForScoring(job.targetEntityId, job.userId);
    const result = await this.executeDatasetScoring(dataset.id, job.userId, dataset.sourceRows);

    return {
      scoredRecordCount: result.scoredRecordCount,
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
      const enriched = this.enrichmentService.enrichRow(sourceRow, normalized);
      const score = scoreLienCandidate(enriched.scoreableRecord);
      const normalizationWarnings = filterResolvedNormalizationWarnings(normalized.warnings, enriched.normalizedFields);
      const flags = [...new Set([...score.flags, ...normalizationWarnings, ...enriched.enrichment.flags])];
      const reasoning = [
        ...new Set([
          ...score.reasoning,
          ...normalizationWarnings.map((warning) => `Normalization warning: ${warning}`),
          ...enriched.enrichment.reasoning.map((reason) => `Enrichment note: ${reason}`),
        ]),
      ];

      return {
        userId,
        datasetId,
        sourceRowNumber: enriched.sourceRowNumber,
        normalizedFields: enriched.normalizedFields,
        enrichment: enriched.enrichment,
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
    ...(record.enrichment ? { enrichment: record.enrichment } : {}),
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

function filterResolvedNormalizationWarnings(
  warnings: string[],
  normalizedFields: ReturnType<typeof normalizeDatasetRow>["normalizedFields"],
): string[] {
  return warnings.filter((warning) => {
    if (warning === "No parcel identifier column could be mapped.") {
      return !normalizedFields.parcelId;
    }

    if (warning === "No positive lien amount could be mapped.") {
      return normalizedFields.lienAmount === undefined;
    }

    if (warning === "No positive property value could be mapped.") {
      return normalizedFields.estimatedValue === undefined;
    }

    if (warning === "No property type could be mapped.") {
      return !normalizedFields.propertyType;
    }

    return true;
  });
}
