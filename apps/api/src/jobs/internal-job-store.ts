import type { InternalJobDocument } from "@tax-lien/db";
import { InternalJobModel } from "@tax-lien/db";
import type {
  InternalJobError,
  InternalJobRequestKind,
  InternalJobStatus,
  InternalJobSummary,
  InternalJobTargetType,
  InternalJobType,
} from "@tax-lien/types";

export interface StoredInternalJob {
  id: string;
  userId: string;
  type: InternalJobType;
  targetEntityType: InternalJobTargetType;
  targetEntityId: string;
  requestKind: InternalJobRequestKind;
  status: InternalJobStatus;
  summary?: InternalJobSummary;
  error?: InternalJobError;
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInternalJobInput {
  userId: string;
  type: InternalJobType;
  targetEntityType: InternalJobTargetType;
  targetEntityId: string;
  requestKind: InternalJobRequestKind;
  queuedAt: Date;
}

export interface InternalJobStore {
  createJob(input: CreateInternalJobInput): Promise<StoredInternalJob>;
  claimNextQueuedJob(startedAt: Date): Promise<StoredInternalJob | null>;
  findActiveJobForTarget(
    userId: string,
    type: InternalJobType,
    targetEntityType: InternalJobTargetType,
    targetEntityId: string,
  ): Promise<StoredInternalJob | null>;
  findLatestJobForTarget(
    userId: string,
    type: InternalJobType,
    targetEntityType: InternalJobTargetType,
    targetEntityId: string,
  ): Promise<StoredInternalJob | null>;
  markRunning(jobId: string, userId: string, startedAt: Date): Promise<StoredInternalJob | null>;
  markCompleted(
    jobId: string,
    userId: string,
    completedAt: Date,
    summary: InternalJobSummary,
  ): Promise<StoredInternalJob | null>;
  markFailed(
    jobId: string,
    userId: string,
    failedAt: Date,
    error: InternalJobError,
  ): Promise<StoredInternalJob | null>;
  findJobByIdForUser(jobId: string, userId: string): Promise<StoredInternalJob | null>;
}

export class MongoInternalJobStore implements InternalJobStore {
  public async createJob(input: CreateInternalJobInput): Promise<StoredInternalJob> {
    const document = await InternalJobModel.create({
      ...input,
      status: "queued",
    });
    return mapInternalJob(document);
  }

  public async claimNextQueuedJob(startedAt: Date): Promise<StoredInternalJob | null> {
    const document = await InternalJobModel.findOneAndUpdate(
      { status: "queued" },
      {
        $set: {
          status: "running",
          startedAt,
        },
        $unset: {
          error: "",
          completedAt: "",
          failedAt: "",
        },
      },
      {
        new: true,
        sort: {
          queuedAt: 1,
          createdAt: 1,
        },
      },
    ).exec();

    return document ? mapInternalJob(document) : null;
  }

  public async findActiveJobForTarget(
    userId: string,
    type: InternalJobType,
    targetEntityType: InternalJobTargetType,
    targetEntityId: string,
  ): Promise<StoredInternalJob | null> {
    const document = await InternalJobModel.findOne({
      userId,
      type,
      targetEntityType,
      targetEntityId,
      status: { $in: ["queued", "running"] },
    })
      .sort({ queuedAt: 1, createdAt: 1 })
      .exec();

    return document ? mapInternalJob(document) : null;
  }

  public async findLatestJobForTarget(
    userId: string,
    type: InternalJobType,
    targetEntityType: InternalJobTargetType,
    targetEntityId: string,
  ): Promise<StoredInternalJob | null> {
    const document = await InternalJobModel.findOne({
      userId,
      type,
      targetEntityType,
      targetEntityId,
    })
      .sort({ queuedAt: -1, createdAt: -1 })
      .exec();

    return document ? mapInternalJob(document) : null;
  }

  public async markRunning(jobId: string, userId: string, startedAt: Date): Promise<StoredInternalJob | null> {
    const document = await InternalJobModel.findOneAndUpdate(
      { _id: jobId, userId, status: "queued" },
      {
        $set: {
          status: "running",
          startedAt,
        },
        $unset: {
          error: "",
          completedAt: "",
          failedAt: "",
        },
      },
      { new: true },
    ).exec();

    return document ? mapInternalJob(document) : null;
  }

  public async markCompleted(
    jobId: string,
    userId: string,
    completedAt: Date,
    summary: InternalJobSummary,
  ): Promise<StoredInternalJob | null> {
    const document = await InternalJobModel.findOneAndUpdate(
      { _id: jobId, userId },
      {
        $set: {
          status: "completed",
          completedAt,
          summary,
        },
        $unset: {
          error: "",
          failedAt: "",
        },
      },
      { new: true },
    ).exec();

    return document ? mapInternalJob(document) : null;
  }

  public async markFailed(
    jobId: string,
    userId: string,
    failedAt: Date,
    error: InternalJobError,
  ): Promise<StoredInternalJob | null> {
    const document = await InternalJobModel.findOneAndUpdate(
      { _id: jobId, userId },
      {
        $set: {
          status: "failed",
          failedAt,
          error,
        },
        $unset: {
          completedAt: "",
          summary: "",
        },
      },
      { new: true },
    ).exec();

    return document ? mapInternalJob(document) : null;
  }

  public async findJobByIdForUser(jobId: string, userId: string): Promise<StoredInternalJob | null> {
    const document = await InternalJobModel.findOne({ _id: jobId, userId }).exec();
    return document ? mapInternalJob(document) : null;
  }
}

export function mapInternalJob(document: InternalJobDocument): StoredInternalJob {
  return {
    id: document.id,
    userId: document.userId,
    type: document.type,
    targetEntityType: document.targetEntityType,
    targetEntityId: document.targetEntityId,
    requestKind: document.requestKind ?? "score",
    status: document.status,
    ...(document.summary
      ? {
          summary: {
            ...(document.summary.scoredRecordCount !== undefined
              ? { scoredRecordCount: document.summary.scoredRecordCount }
              : {}),
            ...(document.summary.enrichedRecordCount !== undefined
              ? { enrichedRecordCount: document.summary.enrichedRecordCount }
              : {}),
            ...(document.summary.enrichmentFallbackCount !== undefined
              ? { enrichmentFallbackCount: document.summary.enrichmentFallbackCount }
              : {}),
            ...(document.summary.earliestReprocessAfter
              ? { earliestReprocessAfter: document.summary.earliestReprocessAfter }
              : {}),
          },
        }
      : {}),
    ...(document.error
      ? {
          error: {
            code: document.error.code,
            message: document.error.message,
          },
        }
      : {}),
    queuedAt: document.queuedAt,
    ...(document.startedAt ? { startedAt: document.startedAt } : {}),
    ...(document.completedAt ? { completedAt: document.completedAt } : {}),
    ...(document.failedAt ? { failedAt: document.failedAt } : {}),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
