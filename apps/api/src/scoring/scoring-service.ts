import mongoose from "mongoose";
import { SCORING_PACKAGE_VERSION, scoreLienCandidate } from "@tax-lien/scoring";
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
import { applyManualMappingsToRows } from "../datasets/manual-mapping.js";
import { createDefaultEnrichmentService, type EnrichmentService } from "../enrichment/enrichment-service.js";
import { ApiError } from "../errors/api-error.js";
import { buildCandidateEvidence } from "../intelligence/candidate-evidence.js";
import {
  IntelligenceServiceClient,
  type IntelligenceEvaluator,
} from "../intelligence/intelligence-client.js";
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
  private readonly intelligenceEvaluator: IntelligenceEvaluator;
  private readonly intelligenceConcurrency: number;

  public constructor(
    datasetStore: DatasetStore,
    scoredRecordStore: ScoredRecordStore,
    internalJobService: InternalJobService,
    enrichmentService: EnrichmentService = createDefaultEnrichmentService(),
    maintenancePolicy: MaintenancePolicy = createMaintenancePolicy(apiConfig.maintenance),
    intelligenceEvaluator: IntelligenceEvaluator = new IntelligenceServiceClient(apiConfig.intelligence),
    intelligenceConcurrency = apiConfig.intelligence.maxConcurrency,
  ) {
    this.datasetStore = datasetStore;
    this.scoredRecordStore = scoredRecordStore;
    this.internalJobService = internalJobService;
    this.enrichmentService = enrichmentService;
    this.maintenancePolicy = maintenancePolicy;
    this.intelligenceEvaluator = intelligenceEvaluator;
    this.intelligenceConcurrency = Math.max(1, Math.floor(intelligenceConcurrency));
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
    const result = await this.executeDatasetScoring(
      dataset.id,
      job.userId,
      applyManualMappingsToRows(dataset.sourceRows, dataset.manualMapping),
      {
        authority: dataset.sourceLabel?.trim()
          ? `User-provided source label: ${dataset.sourceLabel.trim()}`
          : `User-uploaded file: ${dataset.originalFilename}`,
        observedAt: dataset.uploadedAt,
        jurisdiction: { country: "unknown", state: "unknown", county: "unknown" },
      },
    );
    const intelligenceCounts = summarizeIntelligence(result.scores);
    const summary: InternalJobSummary = {
      scoredRecordCount: result.scoredRecordCount,
      ...(result.enrichedRecordCount !== undefined ? { enrichedRecordCount: result.enrichedRecordCount } : {}),
      ...(result.enrichmentFallbackCount !== undefined ? { enrichmentFallbackCount: result.enrichmentFallbackCount } : {}),
      ...(result.earliestReprocessAfter ? { earliestReprocessAfter: result.earliestReprocessAfter } : {}),
      intelligenceCompletedCount: intelligenceCounts.completed,
      intelligenceNotConfiguredCount: intelligenceCounts.notConfigured,
      intelligenceFailedCount: intelligenceCounts.failed,
    };

    return summary;
  }

  private async executeDatasetScoring(
    datasetId: string,
    userId: string,
    sourceRows: StoredDatasetSourceRow[],
    sourceContext: {
      authority: string;
      observedAt: Date;
      jurisdiction: { country: string; state: string; county: string };
    },
  ): Promise<Omit<DatasetScoreRunResponse, "job">> {
    if (sourceRows.length === 0) {
      throw new ApiError(400, "score_no_source_rows", "Dataset does not contain scoreable source rows.");
    }

    const scoredAt = new Date();
    const pendingRecords: Array<{
      record: Omit<CreateScoredRecordInput, "intelligence">;
      evidence: ReturnType<typeof buildCandidateEvidence>;
    }> = [];

    for (const sourceRow of sourceRows) {
      const normalized = normalizeDatasetRow(sourceRow);
      const enriched = await this.enrichmentService.enrichRow(sourceRow, normalized);
      const score = scoreLienCandidate(enriched.scoreableRecord);
      const evidence = buildCandidateEvidence({
        datasetId,
        sourceRowNumber: enriched.sourceRowNumber,
        sourceAuthority: sourceContext.authority,
        jurisdiction: sourceContext.jurisdiction,
        sourceObservedAt: sourceContext.observedAt,
        evaluationRequestedAt: scoredAt,
        scoreableRecord: enriched.scoreableRecord,
        enrichment: enriched.enrichment,
      });
      const normalizationWarnings = filterResolvedNormalizationWarnings(normalized.warnings, enriched.normalizedFields);
      const flags = [...new Set([...score.flags, ...normalizationWarnings, ...enriched.enrichment.flags])];
      const reasoning = [
        ...new Set([
          ...score.reasoning,
          ...normalizationWarnings.map((warning) => `Normalization warning: ${warning}`),
          ...enriched.enrichment.reasoning.map((reason) => `Enrichment note: ${reason}`),
        ]),
      ];

      pendingRecords.push({
        evidence,
        record: {
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
        },
      });
    }

    const evaluations = await mapWithConcurrency(
      pendingRecords,
      this.intelligenceConcurrency,
      (pending) => this.intelligenceEvaluator.evaluate(pending.evidence),
    );
    const records: CreateScoredRecordInput[] = pendingRecords.map((pending, index) => ({
      ...pending.record,
      intelligence: evaluations[index]!,
    }));

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

async function mapWithConcurrency<T, R>(
  items: T[],
  maxConcurrency: number,
  operation: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await operation(items[index]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(maxConcurrency, items.length) }, () => worker()),
  );
  return results;
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
    legacyScoring: {
      packageVersion: SCORING_PACKAGE_VERSION,
      methodology: "fixed_rule_heuristic",
      redemptionSignalKind: "heuristic_not_probability",
    },
    intelligence: record.intelligence ?? {
      state: "not_configured",
      message: "No versioned intelligence evaluation is stored for this historical score.",
    },
    scoredAt: record.scoredAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function summarizeIntelligence(scores: ScoredRecordResponse[]): {
  completed: number;
  notConfigured: number;
  failed: number;
} {
  let completed = 0;
  let notConfigured = 0;
  let failed = 0;
  for (const score of scores) {
    switch (score.intelligence?.state) {
      case "completed":
        completed += 1;
        break;
      case "failed":
        failed += 1;
        break;
      case "not_configured":
      case undefined:
        notConfigured += 1;
        break;
    }
  }
  return { completed, notConfigured, failed };
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
