import mongoose from "mongoose";
import type {
  InternalJobError,
  InternalJobResponse,
  InternalJobSummary,
  InternalJobTargetType,
  InternalJobType,
  JobDetailResponse,
} from "@tax-lien/types";
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

export interface ExecuteInternalJobResult<TResult> {
  job: InternalJobResponse;
  result: TResult;
}

export class InternalJobService {
  private readonly jobStore: InternalJobStore;

  public constructor(jobStore: InternalJobStore) {
    this.jobStore = jobStore;
  }

  public async execute<TResult>(input: ExecuteInternalJobInput<TResult>): Promise<ExecuteInternalJobResult<TResult>> {
    const queuedAt = new Date();
    const queuedJob = await this.jobStore.createJob({
      userId: input.userId,
      type: input.type,
      targetEntityType: input.targetEntityType,
      targetEntityId: input.targetEntityId,
      queuedAt,
    });

    const runningJob = await this.jobStore.markRunning(queuedJob.id, input.userId, new Date());
    if (!runningJob) {
      throw new ApiError(500, "job_lifecycle_failed", "Internal job could not be started.");
    }

    try {
      const result = await input.run();
      const completedJob = await this.jobStore.markCompleted(
        queuedJob.id,
        input.userId,
        new Date(),
        input.summarize(result),
      );
      if (!completedJob) {
        throw new ApiError(500, "job_lifecycle_failed", "Internal job could not be completed.");
      }

      return {
        job: toInternalJobResponse(completedJob),
        result,
      };
    } catch (error: unknown) {
      await this.jobStore.markFailed(queuedJob.id, input.userId, new Date(), safeJobError(error));
      throw error;
    }
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
