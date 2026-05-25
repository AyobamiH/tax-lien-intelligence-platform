import mongoose from "mongoose";
import type {
  AlertDetailResponse,
  AlertListResponse,
  AlertResponse,
  InternalJobError,
  InternalJobStatus,
  InternalJobSummary,
  InternalJobTargetType,
  InternalJobType,
  MarkAllAlertsReadResponse,
} from "@tax-lien/types";
import { ApiError } from "../errors/api-error.js";
import type { AlertStore, CreateAlertInput, StoredAlert } from "./alert-store.js";

export interface JobAlertSink {
  recordJobCompleted(job: JobAlertEvent): Promise<void>;
  recordJobFailed(job: JobAlertEvent): Promise<void>;
}

export interface JobAlertEvent {
  id: string;
  userId: string;
  type: InternalJobType;
  targetEntityType: InternalJobTargetType;
  targetEntityId: string;
  status: InternalJobStatus;
  summary?: InternalJobSummary;
  error?: InternalJobError;
}

export class AlertService implements JobAlertSink {
  private readonly alertStore: AlertStore;

  public constructor(alertStore: AlertStore) {
    this.alertStore = alertStore;
  }

  public async createAlert(input: CreateAlertInput): Promise<AlertResponse> {
    return toAlertResponse(await this.alertStore.createAlert(input));
  }

  public async recordJobCompleted(job: JobAlertEvent): Promise<void> {
    if (job.type !== "dataset_scoring" || job.status !== "completed") {
      return;
    }

    const scoredRecordCount = job.summary?.scoredRecordCount ?? 0;
    await this.createAlert({
      userId: job.userId,
      type: "scoring_job_completed",
      severity: "info",
      message: `Scoring completed. ${scoredRecordCount} records are ready for review.`,
      relatedEntityType: "dataset",
      relatedEntityId: job.targetEntityId,
      metadata: {
        jobId: job.id,
        datasetId: job.targetEntityId,
        scoredRecordCount,
      },
    });
  }

  public async recordJobFailed(job: JobAlertEvent): Promise<void> {
    if (job.type !== "dataset_scoring" || job.status !== "failed") {
      return;
    }

    await this.createAlert({
      userId: job.userId,
      type: "scoring_job_failed",
      severity: "error",
      message: `Scoring failed. ${job.error?.message ?? "The scoring job needs attention."}`,
      relatedEntityType: "dataset",
      relatedEntityId: job.targetEntityId,
      metadata: {
        jobId: job.id,
        datasetId: job.targetEntityId,
        ...(job.error?.code ? { errorCode: job.error.code } : {}),
      },
    });
  }

  public async listAlerts(userId: string): Promise<AlertListResponse> {
    const [alerts, unreadCount] = await Promise.all([
      this.alertStore.listAlertsForUser(userId),
      this.alertStore.countUnreadForUser(userId),
    ]);

    return {
      alerts: alerts.map(toAlertResponse),
      unreadCount,
    };
  }

  public async markAlertRead(userId: string, alertId: string): Promise<AlertDetailResponse> {
    assertAlertId(alertId);
    const alert = await this.alertStore.markAlertReadForUser(alertId, userId, new Date());
    if (!alert) {
      throw new ApiError(404, "alert_not_found", "Alert was not found.");
    }

    return {
      alert: toAlertResponse(alert),
    };
  }

  public async markAllAlertsRead(userId: string): Promise<MarkAllAlertsReadResponse> {
    return {
      updatedCount: await this.alertStore.markAllAlertsReadForUser(userId, new Date()),
    };
  }
}

export function toAlertResponse(alert: StoredAlert): AlertResponse {
  return {
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    status: alert.status,
    message: alert.message,
    ...(alert.relatedEntityType ? { relatedEntityType: alert.relatedEntityType } : {}),
    ...(alert.relatedEntityId ? { relatedEntityId: alert.relatedEntityId } : {}),
    ...(alert.metadata ? { metadata: alert.metadata } : {}),
    createdAt: alert.createdAt.toISOString(),
    updatedAt: alert.updatedAt.toISOString(),
    ...(alert.readAt ? { readAt: alert.readAt.toISOString() } : {}),
  };
}

function assertAlertId(alertId: string): void {
  if (!mongoose.Types.ObjectId.isValid(alertId)) {
    throw new ApiError(400, "alert_invalid_id", "Alert id is invalid.");
  }
}
