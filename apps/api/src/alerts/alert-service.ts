import mongoose from "mongoose";
import type {
  AlertDetailResponse,
  AlertListResponse,
  AlertResponse,
  InternalJobError,
  InternalJobRequestKind,
  InternalJobStatus,
  InternalJobSummary,
  InternalJobTargetType,
  InternalJobType,
  MarkAllAlertsReadResponse,
  WorkspaceCommentEntityType,
} from "@tax-lien/types";
import { ApiError } from "../errors/api-error.js";
import type { NotificationDeliveryService } from "../notification-delivery/notification-delivery-service.js";
import type { NotificationPreferenceService } from "../notification-preferences/notification-preference-service.js";
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
  requestKind: InternalJobRequestKind;
  status: InternalJobStatus;
  summary?: InternalJobSummary;
  error?: InternalJobError;
}

export interface WorkspaceCommentAlertEvent {
  recipientUserId: string;
  workspaceId: string;
  actorUserId: string;
  actorEmail: string;
  relatedEntityType: WorkspaceCommentEntityType;
  relatedEntityId: string;
  commentId: string;
}

export class AlertService implements JobAlertSink {
  private readonly alertStore: AlertStore;
  private readonly notificationPreferenceService: NotificationPreferenceService | undefined;
  private readonly notificationDeliveryService: NotificationDeliveryService | undefined;

  public constructor(
    alertStore: AlertStore,
    notificationPreferenceService?: NotificationPreferenceService,
    notificationDeliveryService?: NotificationDeliveryService,
  ) {
    this.alertStore = alertStore;
    this.notificationPreferenceService = notificationPreferenceService;
    this.notificationDeliveryService = notificationDeliveryService;
  }

  public async createAlert(input: CreateAlertInput): Promise<AlertResponse> {
    return toAlertResponse(await this.alertStore.createAlert(input));
  }

  public async recordJobCompleted(job: JobAlertEvent): Promise<void> {
    if (job.type !== "dataset_scoring" || job.status !== "completed") {
      return;
    }

    const scoredRecordCount = job.summary?.scoredRecordCount ?? 0;
    const actionLabel = jobActionLabel(job.requestKind);
    await this.createPreferenceAwareAlert({
      userId: job.userId,
      type: "scoring_job_completed",
      severity: "info",
      message: `${actionLabel} completed. ${scoredRecordCount} records are ready for review.`,
      relatedEntityType: "dataset",
      relatedEntityId: job.targetEntityId,
      metadata: {
        jobId: job.id,
        datasetId: job.targetEntityId,
        scoredRecordCount,
        requestKind: job.requestKind,
      },
    });
  }

  public async recordJobFailed(job: JobAlertEvent): Promise<void> {
    if (job.type !== "dataset_scoring" || job.status !== "failed") {
      return;
    }

    await this.createPreferenceAwareAlert({
      userId: job.userId,
      type: "scoring_job_failed",
      severity: "error",
      message: `${jobActionLabel(job.requestKind)} failed. ${
        job.error?.message ?? "The scoring job needs attention."
      }`,
      relatedEntityType: "dataset",
      relatedEntityId: job.targetEntityId,
      metadata: {
        jobId: job.id,
        datasetId: job.targetEntityId,
        requestKind: job.requestKind,
        ...(job.error?.code ? { errorCode: job.error.code } : {}),
      },
    });
  }

  public async recordWorkspaceCommentAdded(event: WorkspaceCommentAlertEvent): Promise<void> {
    if (event.recipientUserId === event.actorUserId) {
      return;
    }

    await this.createPreferenceAwareAlert({
      userId: event.recipientUserId,
      type: "workspace_comment_added",
      severity: "info",
      message: `${event.actorEmail} added discussion to ${workspaceCommentTargetLabel(event.relatedEntityType)}.`,
      relatedEntityType: event.relatedEntityType,
      relatedEntityId: event.relatedEntityId,
      metadata: {
        workspaceId: event.workspaceId,
        commentId: event.commentId,
        commentActorUserId: event.actorUserId,
        commentActorEmail: event.actorEmail,
      },
    });
  }

  private async createPreferenceAwareAlert(input: CreateAlertInput): Promise<void> {
    if (!this.notificationPreferenceService) {
      await this.createAlert(input);
      return;
    }

    const result = await this.notificationPreferenceService.prepareAlertForDelivery(input);
    if (result.suppressed) {
      await this.notificationDeliveryService?.recordSuppressed(input, result.preparation);
      return;
    }

    const alert = await this.alertStore.createAlert({
      ...input,
      deliveryPreparation: result.preparation,
    });
    await this.notificationDeliveryService?.processAlertDelivery(alert, result.preparation);
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

  public async markWorkspaceDiscussionAlertsRead(
    userId: string,
    workspaceId: string,
    relatedEntityType: WorkspaceCommentEntityType,
    relatedEntityId: string,
  ): Promise<number> {
    return this.alertStore.markDiscussionAlertsReadForUser(
      userId,
      workspaceId,
      relatedEntityType,
      relatedEntityId,
      new Date(),
    );
  }
}

function jobActionLabel(requestKind: InternalJobRequestKind): string {
  switch (requestKind) {
    case "policy_refresh":
      return "Scheduled refresh";
    case "refresh":
      return "Refresh";
    default:
      return "Scoring";
  }
}

function workspaceCommentTargetLabel(entityType: WorkspaceCommentEntityType): string {
  switch (entityType) {
    case "dataset":
      return "a dataset";
    case "comparison_item":
      return "a comparison item";
    case "watchlist_item":
      return "a watchlist item";
    case "portfolio_item":
      return "a portfolio item";
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
    ...(alert.deliveryPreparation ? { deliveryPreparation: alert.deliveryPreparation } : {}),
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
