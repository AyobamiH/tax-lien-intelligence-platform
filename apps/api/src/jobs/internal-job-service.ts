import mongoose from "mongoose";
import type {
  InternalJobError,
  InternalJobResponse,
  InternalJobSummary,
  InternalJobTargetType,
  InternalJobType,
  JobDetailResponse,
} from "@tax-lien/types";
import type { JobAlertSink } from "../alerts/alert-service.js";
import { ApiError, isApiError } from "../errors/api-error.js";
import type { InternalJobStore, StoredInternalJob } from "./internal-job-store.js";

export interface ExecuteInternalJobInput<TResult> {
  userId: string;
  type: InternalJobType;
  targetEntityType: InternalJobTargetType;
  targetEntityId: string;
  run: () => Promise<TResult>;
  summarize: (result: TResult) => InternalJobSummary;
}

export interface EnqueueInternalJobInput {
  userId: string;
  type: InternalJobType;
  targetEntityType: InternalJobTargetType;
  targetEntityId: string;
}

export interface ExecuteInternalJobResult<TResult> {
  job: InternalJobResponse;
  result: TResult;
}

export class InternalJobService {
  private readonly jobStore: InternalJobStore;
  private readonly alertSink: JobAlertSink | undefined;

  public constructor(jobStore: InternalJobStore, alertSink?: JobAlertSink) {
    this.jobStore = jobStore;
    this.alertSink = alertSink;
  }

  public async enqueue(input: EnqueueInternalJobInput): Promise<InternalJobResponse> {
    const job = await this.jobStore.createJob({
      ...input,
      queuedAt: new Date(),
    });

    return toInternalJobResponse(job);
  }

  public async claimNextJob(): Promise<StoredInternalJob | null> {
    return this.jobStore.claimNextQueuedJob(new Date());
  }

  public async execute<TResult>(input: ExecuteInternalJobInput<TResult>): Promise<ExecuteInternalJobResult<TResult>> {
    const queuedJob = await this.jobStore.createJob({
      userId: input.userId,
      type: input.type,
      targetEntityType: input.targetEntityType,
      targetEntityId: input.targetEntityId,
      queuedAt: new Date(),
    });

    const runningJob = await this.jobStore.markRunning(queuedJob.id, input.userId, new Date());
    if (!runningJob) {
      throw new ApiError(500, "job_lifecycle_failed", "Internal job could not be started.");
    }

    return this.runClaimedJob({
      job: runningJob,
      run: input.run,
      summarize: input.summarize,
    });
  }

  public async runClaimedJob<TResult>(input: {
    job: StoredInternalJob;
    run: () => Promise<TResult>;
    summarize: (result: TResult) => InternalJobSummary;
  }): Promise<ExecuteInternalJobResult<TResult>> {
    try {
      const result = await input.run();
      const completedJob = await this.completeJob(input.job, input.summarize(result));

      return {
        job: completedJob,
        result,
      };
    } catch (error: unknown) {
      await this.failJob(input.job, error);
      throw error;
    }
  }

  public async completeJob(job: StoredInternalJob, summary: InternalJobSummary): Promise<InternalJobResponse> {
    const completedJob = await this.jobStore.markCompleted(job.id, job.userId, new Date(), summary);
    if (!completedJob) {
      throw new ApiError(500, "job_lifecycle_failed", "Internal job could not be completed.");
    }

    await this.recordCompletedAlert(completedJob);
    return toInternalJobResponse(completedJob);
  }

  public async failJob(job: StoredInternalJob, error: unknown): Promise<InternalJobResponse> {
    const failedJob = await this.jobStore.markFailed(job.id, job.userId, new Date(), safeJobError(error));
    if (!failedJob) {
      throw new ApiError(500, "job_lifecycle_failed", "Internal job could not be failed safely.");
    }

    await this.recordFailedAlert(failedJob);
    return toInternalJobResponse(failedJob);
  }

  public async getJob(userId: string, jobId: string): Promise<JobDetailResponse> {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new ApiError(400, "job_invalid_id", "Job id is invalid.");
    }

    const job = await this.jobStore.findJobByIdForUser(jobId, userId);
    if (!job) {
      throw new ApiError(404, "job_not_found", "Job was not found.");
    }

    return {
      job: toInternalJobResponse(job),
    };
  }

  private async recordCompletedAlert(job: StoredInternalJob): Promise<void> {
    try {
      await this.alertSink?.recordJobCompleted(job);
    } catch {
      // Alerts are monitoring records; they must not rewrite the completed job outcome.
    }
  }

  private async recordFailedAlert(job: StoredInternalJob): Promise<void> {
    try {
      await this.alertSink?.recordJobFailed(job);
    } catch {
      // Preserve the original execution failure if alert recording also fails.
    }
  }
}

export function toInternalJobResponse(job: StoredInternalJob): InternalJobResponse {
  return {
    id: job.id,
    type: job.type,
    targetEntityType: job.targetEntityType,
    targetEntityId: job.targetEntityId,
    status: job.status,
    ...(job.summary ? { summary: job.summary } : {}),
    ...(job.error ? { error: job.error } : {}),
    queuedAt: job.queuedAt.toISOString(),
    ...(job.startedAt ? { startedAt: job.startedAt.toISOString() } : {}),
    ...(job.completedAt ? { completedAt: job.completedAt.toISOString() } : {}),
    ...(job.failedAt ? { failedAt: job.failedAt.toISOString() } : {}),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

function safeJobError(error: unknown): InternalJobError {
  if (isApiError(error)) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    code: "job_execution_failed",
    message: "Job execution failed.",
  };
}
