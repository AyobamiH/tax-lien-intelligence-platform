import type { InternalJobSummary, MaintenanceDecision } from "@tax-lien/types";
import type { DatasetStore } from "../datasets/dataset-store.js";
import { ApiError } from "../errors/api-error.js";
import type { StoredInternalJob } from "../jobs/internal-job-store.js";
import type { InternalJobService } from "../jobs/internal-job-service.js";
import type { ScoredRecordStore, StaleDatasetSummary, StoredScoredRecord } from "../scoring/scored-record-store.js";
import {
  type MaintenancePolicy,
  evaluateMaintenancePolicy,
} from "./maintenance-policy.js";

export interface MaintenanceScanResult {
  scannedAt: string;
  staleDatasetCount: number;
  maintenanceJobsQueued: number;
  skippedDatasetCount: number;
}

export class MaintenanceService {
  private readonly datasetStore: DatasetStore;
  private readonly scoredRecordStore: ScoredRecordStore;
  private readonly internalJobService: InternalJobService;
  private readonly policy: MaintenancePolicy;

  public constructor(
    datasetStore: DatasetStore,
    scoredRecordStore: ScoredRecordStore,
    internalJobService: InternalJobService,
    policy: MaintenancePolicy,
  ) {
    this.datasetStore = datasetStore;
    this.scoredRecordStore = scoredRecordStore;
    this.internalJobService = internalJobService;
    this.policy = policy;
  }

  public async runScheduledMaintenance(now = new Date()): Promise<MaintenanceScanResult> {
    const staleDatasets = await this.scoredRecordStore.listStaleDatasetSummaries(now, this.policy.maxDatasetsPerRun);
    let maintenanceJobsQueued = 0;
    let skippedDatasetCount = 0;

    for (const staleDataset of staleDatasets) {
      const queued = await this.queueMaintenanceJobIfNeeded(staleDataset, now);
      if (queued) {
        maintenanceJobsQueued += 1;
      } else {
        skippedDatasetCount += 1;
      }
    }

    return {
      scannedAt: now.toISOString(),
      staleDatasetCount: staleDatasets.length,
      maintenanceJobsQueued,
      skippedDatasetCount,
    };
  }

  public async executeDatasetMaintenanceJob(job: StoredInternalJob, now = new Date()): Promise<InternalJobSummary> {
    if (job.type !== "dataset_maintenance" || job.targetEntityType !== "dataset") {
      throw new ApiError(400, "job_unsupported_type", "Job type is not supported by the maintenance worker.");
    }

    const dataset = await this.datasetStore.findDatasetByIdForUser(job.targetEntityId, job.userId);
    if (!dataset) {
      throw new ApiError(404, "dataset_not_found", "Dataset was not found.");
    }

    const scores = await this.scoredRecordStore.listScoresForDataset(job.userId, dataset.id);
    const staleRecordCount = countStaleRecords(scores, now);
    const latestPolicyRefresh = await this.internalJobService.findLatestTargetJob({
      userId: job.userId,
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: dataset.id,
    });
    const activeRefresh = await this.internalJobService.findActiveTargetJob({
      userId: job.userId,
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: dataset.id,
    });
    const policyEvaluation = evaluateMaintenancePolicy(this.policy, {
      staleRecordCount,
      hasActiveRefresh: Boolean(activeRefresh),
      ...(latestPolicyRefresh?.requestKind === "policy_refresh" && latestPolicyRefresh.completedAt
        ? { latestRefreshCompletedAt: latestPolicyRefresh.completedAt }
        : {}),
      ...(latestPolicyRefresh?.requestKind === "policy_refresh" && latestPolicyRefresh.failedAt
        ? { latestRefreshFailedAt: latestPolicyRefresh.failedAt }
        : {}),
      now,
    });

    if (!policyEvaluation.eligibleForPolicyRefresh) {
      return this.maintenanceSummary({
        decision: policyEvaluation.decision,
        staleRecordCount,
        now,
      });
    }

    const refreshJob = await this.internalJobService.enqueue({
      userId: job.userId,
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: dataset.id,
      requestKind: "policy_refresh",
    });

    return this.maintenanceSummary({
      decision: policyEvaluation.decision,
      staleRecordCount,
      now,
      refreshJobId: refreshJob.id,
    });
  }

  private async queueMaintenanceJobIfNeeded(staleDataset: StaleDatasetSummary, now: Date): Promise<boolean> {
    const [activeMaintenanceJob, activeRefreshJob, latestMaintenanceJob] = await Promise.all([
      this.internalJobService.findActiveTargetJob({
        userId: staleDataset.userId,
        type: "dataset_maintenance",
        targetEntityType: "dataset",
        targetEntityId: staleDataset.datasetId,
      }),
      this.internalJobService.findActiveTargetJob({
        userId: staleDataset.userId,
        type: "dataset_scoring",
        targetEntityType: "dataset",
        targetEntityId: staleDataset.datasetId,
      }),
      this.internalJobService.findLatestTargetJob({
        userId: staleDataset.userId,
        type: "dataset_maintenance",
        targetEntityType: "dataset",
        targetEntityId: staleDataset.datasetId,
      }),
    ]);

    if (
      activeMaintenanceJob ||
      activeRefreshJob ||
      recentlyHandled(latestMaintenanceJob?.completedAt, now, this.policy.minRefreshIntervalHours) ||
      recentlyHandled(latestMaintenanceJob?.failedAt, now, this.policy.failureSuppressionHours)
    ) {
      return false;
    }

    await this.internalJobService.enqueue({
      userId: staleDataset.userId,
      type: "dataset_maintenance",
      targetEntityType: "dataset",
      targetEntityId: staleDataset.datasetId,
      requestKind: "maintenance_scan",
    });

    return true;
  }

  private maintenanceSummary(input: {
    decision: MaintenanceDecision;
    staleRecordCount: number;
    now: Date;
    refreshJobId?: string;
  }): InternalJobSummary {
    return {
      maintenanceScannedDatasetCount: 1,
      maintenanceStaleDatasetCount: input.staleRecordCount > 0 ? 1 : 0,
      maintenanceRefreshJobCount: input.decision === "policy_refresh_queued" ? 1 : 0,
      maintenanceSkippedDatasetCount: input.decision === "policy_refresh_queued" ? 0 : 1,
      maintenanceDecision: input.decision,
      maintenanceRunAt: input.now.toISOString(),
      staleRecordCount: input.staleRecordCount,
      policyAutoRefreshEnabled: this.policy.autoRefreshEnabled,
      ...(input.refreshJobId ? { refreshJobId: input.refreshJobId } : {}),
    };
  }
}

function countStaleRecords(scores: StoredScoredRecord[], now: Date): number {
  return scores.filter((score) => {
    const reprocessAfter = score.enrichment?.freshness.reprocessAfter;
    const reprocessTime = reprocessAfter ? Date.parse(reprocessAfter) : Number.NaN;
    return score.enrichment?.freshness.reprocessEligible || (Number.isFinite(reprocessTime) && reprocessTime <= now.getTime());
  }).length;
}

function recentlyHandled(value: string | undefined, now: Date, hours: number): boolean {
  if (!value) {
    return false;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && now.getTime() - parsed < hours * 60 * 60 * 1000;
}
