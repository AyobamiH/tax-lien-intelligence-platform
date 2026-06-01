import type { InternalJobResponse, InternalJobSummary } from "@tax-lien/types";
import { ApiError } from "../errors/api-error.js";
import type { StoredInternalJob } from "../jobs/internal-job-store.js";
import type { InternalJobService } from "../jobs/internal-job-service.js";
import type { MaintenanceService } from "../maintenance/maintenance-service.js";
import type { ScoringService } from "../scoring/scoring-service.js";

export type WorkerProcessStatus = "idle" | "completed" | "failed";

export interface WorkerProcessResult {
  status: WorkerProcessStatus;
  job?: InternalJobResponse;
}

export class WorkerJobProcessor {
  private readonly internalJobService: InternalJobService;
  private readonly scoringService: ScoringService;
  private readonly maintenanceService: MaintenanceService | undefined;

  public constructor(
    internalJobService: InternalJobService,
    scoringService: ScoringService,
    maintenanceService?: MaintenanceService,
  ) {
    this.internalJobService = internalJobService;
    this.scoringService = scoringService;
    this.maintenanceService = maintenanceService;
  }

  public async processNextJob(): Promise<WorkerProcessResult> {
    const job = await this.internalJobService.claimNextJob();
    if (!job) {
      return {
        status: "idle",
      };
    }

    return this.processClaimedJob(job);
  }

  public async processBatch(limit: number): Promise<WorkerProcessResult[]> {
    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 25));
    const results: WorkerProcessResult[] = [];

    for (let index = 0; index < safeLimit; index += 1) {
      const result = await this.processNextJob();
      results.push(result);
      if (result.status === "idle") {
        break;
      }
    }

    return results;
  }

  private async processClaimedJob(job: StoredInternalJob): Promise<WorkerProcessResult> {
    try {
      const summary = await this.runJob(job);
      const completedJob = await this.internalJobService.completeJob(job, summary);

      return {
        status: "completed",
        job: completedJob,
      };
    } catch (error: unknown) {
      const failedJob = await this.internalJobService.failJob(job, error);

      return {
        status: "failed",
        job: failedJob,
      };
    }
  }

  private async runJob(job: StoredInternalJob): Promise<InternalJobSummary> {
    switch (job.type) {
      case "dataset_scoring":
        return this.scoringService.executeDatasetScoringJob(job);
      case "dataset_maintenance":
        if (!this.maintenanceService) {
          throw new ApiError(400, "job_unsupported_type", "Maintenance worker service is not configured.");
        }

        return this.maintenanceService.executeDatasetMaintenanceJob(job);
    }

    throw new ApiError(400, "job_unsupported_type", "Job type is not supported by this worker.");
  }
}
