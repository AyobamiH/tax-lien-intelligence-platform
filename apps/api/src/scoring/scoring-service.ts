import mongoose from "mongoose";
import { scoreLienCandidate } from "@tax-lien/scoring";
import type {
  DatasetRefreshJobResponse,
  DatasetScoreJobResponse,
  DatasetScoringStatus,
  DatasetScoringStatusResponse,
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
import {
  createMaintenancePolicy,
  type MaintenancePolicy,
  maintenanceStatusForDataset,
} from "../maintenance/maintenance-policy.js";
import { apiConfig } from "../config/env.js";
import { normalizeDatasetRow } from "./normalization.js";
import type { CreateScoredRecordInput, ScoredRecordStore, StoredScoredRecord } from "./scored-record-store.js";

export class ScoringService {
  private readonly datasetStore: DatasetStore;
  private readonly scoredRecordStore: ScoredRecordStore;
  private readonly internalJobService: InternalJobService;
  private readonly enrichmentService: EnrichmentService;
  private readonly maintenancePolicy: MaintenancePolicy;

  public constructor(
    datasetStore: DatasetStore,
    scoredRecordStore: ScoredRecordStore,
    internalJobService: InternalJobService,
    enrichmentService: EnrichmentService = createDefaultEnrichmentService(),
    maintenancePolicy: MaintenancePolicy = createMaintenancePolicy(apiConfig.maintenance),
  ) {
    this.datasetStore = datasetStore;
    this.scoredRecordStore = scoredRecordStore;
    this.internalJobService = internalJobService;
    this.enrichmentService = enrichmentService;
    this.maintenancePolicy = maintenancePolicy;
  }

  public async scoreDataset(datasetId: string, userId: string): Promise<DatasetScoreJobResponse> {
    const dataset = await this.getDatasetForScoring(datasetId, userId);

    const job = await this.internalJobService.enqueue({
      userId,
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: dataset.id,
      requestKind: "score",
    });

    return {
      datasetId: dataset.id,
      job,
    };
  }

  public async refreshDataset(datasetId: string, userId: string): Promise<DatasetRefreshJobResponse> {
    const dataset = await this.getDatasetForScoring(datasetId, userId);
    const activeJob = await this.internalJobService.findActiveTargetJob({
      userId,
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: dataset.id,
    });

    if (activeJob) {
      return {
        datasetId: dataset.id,
        job: activeJob,
        requestStatus: "already_running",
        message: "A scoring refresh is already queued or running for this dataset.",
      };
    }

    const job = await this.internalJobService.enqueue({
      userId,
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: dataset.id,
      requestKind: "refresh",
    });

    return {
      datasetId: dataset.id,
      job,
      requestStatus: "queued",
      message: "Dataset refresh has been queued for worker processing.",
    };
  }

  public async getScoringStatus(datasetId: string, userId: string): Promise<DatasetScoringStatusResponse> {
    const dataset = await this.getDatasetForScoring(datasetId, userId);
    const [scores, activeJob, latestJob] = await Promise.all([
      this.scoredRecordStore.listScoresForDataset(userId, dataset.id),
      this.internalJobService.findActiveTargetJob({
        userId,
        type: "dataset_scoring",
        targetEntityType: "dataset",
        targetEntityId: dataset.id,
      }),
      this.internalJobService.findLatestTargetJob({
        userId,
        type: "dataset_scoring",
        targetEntityType: "dataset",
        targetEntityId: dataset.id,
      }),
    ]);
    const scoreFreshness = summarizeScoreFreshness(scores);
    const maintenance = maintenanceStatusForDataset({
      policy: this.maintenancePolicy,
      staleRecordCount: scoreFreshness.staleRecordCount,
      hasActiveRefresh: Boolean(activeJob),
      ...(latestJob?.requestKind === "policy_refresh" && latestJob.completedAt
        ? { latestRefreshCompletedAt: latestJob.completedAt }
        : {}),
      ...(latestJob?.requestKind === "policy_refresh" && latestJob.failedAt
        ? { latestRefreshFailedAt: latestJob.failedAt }
        : {}),
      now: new Date(),
    });

    return {
      datasetId: dataset.id,
      status: datasetScoringStatus({ scores, activeJob, latestJob, staleRecordCount: scoreFreshness.staleRecordCount }),
      scoredRecordCount: scores.length,
      staleRecordCount: scoreFreshness.staleRecordCount,
      maintenance,
      ...(scoreFreshness.latestScoredAt ? { latestScoredAt: scoreFreshness.latestScoredAt } : {}),
      ...(scoreFreshness.earliestReprocessAfter
        ? { earliestReprocessAfter: scoreFreshness.earliestReprocessAfter }
        : {}),
      ...(activeJob ? { activeJob } : {}),
      ...(latestJob ? { latestJob } : {}),
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
    const summary: InternalJobSummary = {
      scoredRecordCount: result.scoredRecordCount,
      ...(result.enrichedRecordCount !== undefined ? { enrichedRecordCount: result.enrichedRecordCount } : {}),
      ...(result.enrichmentFallbackCount !== undefined ? { enrichmentFallbackCount: result.enrichmentFallbackCount } : {}),
      ...(result.earliestReprocessAfter ? { earliestReprocessAfter: result.earliestReprocessAfter } : {}),
    };

    return summary;
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
    const records: CreateScoredRecordInput[] = [];

    for (const sourceRow of sourceRows) {
      const normalized = normalizeDatasetRow(sourceRow);
      const enriched = await this.enrichmentService.enrichRow(sourceRow, normalized);
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

      records.push({
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
      });
    }

    const storedRecords = await this.scoredRecordStore.replaceScoresForDataset(userId, datasetId, records);
    const enrichmentFallbackCount = records.filter((record) =>
      record.enrichment.adapterOutcomes.some((outcome) => outcome.status === "skipped" || outcome.status === "partial" || outcome.status === "failed"),
    ).length;
    const earliestReprocessAfter = earliestIsoString(records.map((record) => record.enrichment.freshness.reprocessAfter));

    return {
      datasetId,
      scoredRecordCount: storedRecords.length,
      enrichedRecordCount: records.length,
      enrichmentFallbackCount,
      ...(earliestReprocessAfter ? { earliestReprocessAfter } : {}),
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

function summarizeScoreFreshness(scores: StoredScoredRecord[]): {
  staleRecordCount: number;
  latestScoredAt?: string;
  earliestReprocessAfter?: string;
} {
  const now = Date.now();
  let staleRecordCount = 0;
  let latestScoredAt: string | undefined;
  let latestScoredAtTime = Number.NEGATIVE_INFINITY;
  const reprocessAfterValues: string[] = [];

  for (const score of scores) {
    const scoredAtTime = score.scoredAt.getTime();
    if (Number.isFinite(scoredAtTime) && scoredAtTime > latestScoredAtTime) {
      latestScoredAt = score.scoredAt.toISOString();
      latestScoredAtTime = scoredAtTime;
    }

    const reprocessAfter = score.enrichment?.freshness.reprocessAfter;
    if (reprocessAfter) {
      reprocessAfterValues.push(reprocessAfter);
      const reprocessTime = Date.parse(reprocessAfter);
      if (score.enrichment?.freshness.reprocessEligible || (Number.isFinite(reprocessTime) && reprocessTime <= now)) {
        staleRecordCount += 1;
      }
    }
  }

  const earliestReprocessAfter = earliestIsoString(reprocessAfterValues);

  return {
    staleRecordCount,
    ...(latestScoredAt ? { latestScoredAt } : {}),
    ...(earliestReprocessAfter ? { earliestReprocessAfter } : {}),
  };
}

function datasetScoringStatus(input: {
  scores: StoredScoredRecord[];
  activeJob: Awaited<ReturnType<InternalJobService["findActiveTargetJob"]>>;
  latestJob: Awaited<ReturnType<InternalJobService["findLatestTargetJob"]>>;
  staleRecordCount: number;
}): DatasetScoringStatus {
  if (input.activeJob?.status === "queued") {
    return "refresh_requested";
  }

  if (input.activeJob?.status === "running") {
    return "refresh_in_progress";
  }

  if (input.latestJob?.status === "failed") {
    return "refresh_failed";
  }

  if (input.scores.length === 0) {
    return "not_scored";
  }

  if (
    (input.latestJob?.requestKind === "refresh" || input.latestJob?.requestKind === "policy_refresh") &&
    input.latestJob.status === "completed"
  ) {
    return "refresh_completed";
  }

  if (input.staleRecordCount > 0) {
    return "stale";
  }

  return "fresh";
}

function earliestIsoString(values: string[]): string | undefined {
  let earliest: string | undefined;
  let earliestTime = Number.POSITIVE_INFINITY;

  for (const value of values) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed < earliestTime) {
      earliest = value;
      earliestTime = parsed;
    }
  }

  return earliest;
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
