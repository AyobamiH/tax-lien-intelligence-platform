import mongoose from "mongoose";
import type { InternalJobError, InternalJobStatus, InternalJobSummary } from "@tax-lien/types";
import type {
  CreateInternalJobInput,
  InternalJobStore,
  StoredInternalJob,
} from "../../apps/api/src/jobs/internal-job-store.js";

export class InMemoryInternalJobStore implements InternalJobStore {
  private readonly jobsById = new Map<string, StoredInternalJob>();

  public async createJob(input: CreateInternalJobInput): Promise<StoredInternalJob> {
    const now = new Date();
    const job: StoredInternalJob = {
      id: new mongoose.Types.ObjectId().toString(),
      userId: input.userId,
      type: input.type,
      targetEntityType: input.targetEntityType,
      targetEntityId: input.targetEntityId,
      requestKind: input.requestKind,
      status: "queued",
      queuedAt: input.queuedAt,
      createdAt: now,
      updatedAt: now,
    };

    this.jobsById.set(job.id, job);
    return job;
  }

  public async claimNextQueuedJob(startedAt: Date): Promise<StoredInternalJob | null> {
    const nextJob = [...this.jobsById.values()]
      .filter((job) => job.status === "queued")
      .sort((left, right) => left.queuedAt.getTime() - right.queuedAt.getTime())[0];

    if (!nextJob) {
      return null;
    }

    return this.updateJob(nextJob.id, nextJob.userId, "running", {
      startedAt,
      completedAt: undefined,
      failedAt: undefined,
      error: undefined,
    });
  }

  public async findActiveJobForTarget(
    userId: string,
    type: StoredInternalJob["type"],
    targetEntityType: StoredInternalJob["targetEntityType"],
    targetEntityId: string,
  ): Promise<StoredInternalJob | null> {
    return (
      [...this.jobsById.values()]
        .filter(
          (job) =>
            job.userId === userId &&
            job.type === type &&
            job.targetEntityType === targetEntityType &&
            job.targetEntityId === targetEntityId &&
            (job.status === "queued" || job.status === "running"),
        )
        .sort((left, right) => left.queuedAt.getTime() - right.queuedAt.getTime())[0] ?? null
    );
  }

  public async findLatestJobForTarget(
    userId: string,
    type: StoredInternalJob["type"],
    targetEntityType: StoredInternalJob["targetEntityType"],
    targetEntityId: string,
  ): Promise<StoredInternalJob | null> {
    return (
      [...this.jobsById.values()]
        .filter(
          (job) =>
            job.userId === userId &&
            job.type === type &&
            job.targetEntityType === targetEntityType &&
            job.targetEntityId === targetEntityId,
        )
        .sort((left, right) => right.queuedAt.getTime() - left.queuedAt.getTime())[0] ?? null
    );
  }

  public async markRunning(jobId: string, userId: string, startedAt: Date): Promise<StoredInternalJob | null> {
    const current = await this.findJobByIdForUser(jobId, userId);
    if (!current || current.status !== "queued") {
      return null;
    }

    return this.updateJob(jobId, userId, "running", {
      startedAt,
      completedAt: undefined,
      failedAt: undefined,
      error: undefined,
    });
  }

  public async markCompleted(
    jobId: string,
    userId: string,
    completedAt: Date,
    summary: InternalJobSummary,
  ): Promise<StoredInternalJob | null> {
    return this.updateJob(jobId, userId, "completed", {
      completedAt,
      failedAt: undefined,
      error: undefined,
      summary,
    });
  }

  public async markFailed(
    jobId: string,
    userId: string,
    failedAt: Date,
    error: InternalJobError,
  ): Promise<StoredInternalJob | null> {
    return this.updateJob(jobId, userId, "failed", {
      failedAt,
      completedAt: undefined,
      summary: undefined,
      error,
    });
  }

  public async findJobByIdForUser(jobId: string, userId: string): Promise<StoredInternalJob | null> {
    const job = this.jobsById.get(jobId);
    if (!job || job.userId !== userId) {
      return null;
    }

    return job;
  }

  public listJobsForUser(userId: string): StoredInternalJob[] {
    return [...this.jobsById.values()].filter((job) => job.userId === userId);
  }

  private async updateJob(
    jobId: string,
    userId: string,
    status: InternalJobStatus,
    fields: Partial<Omit<StoredInternalJob, "id" | "userId" | "type" | "targetEntityType" | "targetEntityId" | "status">>,
  ): Promise<StoredInternalJob | null> {
    const current = await this.findJobByIdForUser(jobId, userId);
    if (!current) {
      return null;
    }

    const updated: StoredInternalJob = {
      id: current.id,
      userId: current.userId,
      type: current.type,
      targetEntityType: current.targetEntityType,
      targetEntityId: current.targetEntityId,
      requestKind: current.requestKind,
      status,
      queuedAt: current.queuedAt,
      ...(fields.summary ? { summary: fields.summary } : {}),
      ...(fields.error ? { error: fields.error } : {}),
      ...(fields.startedAt ?? current.startedAt ? { startedAt: fields.startedAt ?? current.startedAt } : {}),
      ...(fields.completedAt ? { completedAt: fields.completedAt } : {}),
      ...(fields.failedAt ? { failedAt: fields.failedAt } : {}),
      createdAt: current.createdAt,
      updatedAt: new Date(),
    };

    this.jobsById.set(jobId, updated);
    return updated;
  }
}
