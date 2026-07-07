import type { AlertDocument } from "@tax-lien/db";
import { AlertModel } from "@tax-lien/db";
import type {
  AlertMetadata,
  AlertRelatedEntityType,
  AlertSeverity,
  AlertStatus,
  AlertType,
  NotificationDeliveryPreparation,
  WorkspaceCommentEntityType,
} from "@tax-lien/types";

export interface StoredAlert {
  id: string;
  userId: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  relatedEntityType?: AlertRelatedEntityType;
  relatedEntityId?: string;
  metadata?: AlertMetadata;
  deliveryPreparation?: NotificationDeliveryPreparation;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAlertInput {
  userId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  relatedEntityType?: AlertRelatedEntityType;
  relatedEntityId?: string;
  metadata?: AlertMetadata;
  deliveryPreparation?: NotificationDeliveryPreparation;
}

export interface AlertStore {
  createAlert(input: CreateAlertInput): Promise<StoredAlert>;
  listAlertsForUser(userId: string): Promise<StoredAlert[]>;
  countUnreadForUser(userId: string): Promise<number>;
  markAlertReadForUser(alertId: string, userId: string, readAt: Date): Promise<StoredAlert | null>;
  markAllAlertsReadForUser(userId: string, readAt: Date): Promise<number>;
  markDiscussionAlertsReadForUser(
    userId: string,
    workspaceId: string,
    relatedEntityType: WorkspaceCommentEntityType,
    relatedEntityId: string,
    readAt: Date,
  ): Promise<number>;
}

export class MongoAlertStore implements AlertStore {
  public async createAlert(input: CreateAlertInput): Promise<StoredAlert> {
    const document = await AlertModel.create({
      userId: input.userId,
      type: input.type,
      severity: input.severity,
      message: input.message,
      ...(input.relatedEntityType ? { relatedEntityType: input.relatedEntityType } : {}),
      ...(input.relatedEntityId ? { relatedEntityId: input.relatedEntityId } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
      ...(input.deliveryPreparation ? { deliveryPreparation: toPersistedDeliveryPreparation(input.deliveryPreparation) } : {}),
      status: "unread",
    });
    return mapAlert(document);
  }

  public async listAlertsForUser(userId: string): Promise<StoredAlert[]> {
    const documents = await AlertModel.find({ userId }).sort({ createdAt: -1 }).limit(100).exec();
    return documents.map(mapAlert);
  }

  public async countUnreadForUser(userId: string): Promise<number> {
    return AlertModel.countDocuments({ userId, status: "unread" }).exec();
  }

  public async markAlertReadForUser(alertId: string, userId: string, readAt: Date): Promise<StoredAlert | null> {
    const document = await AlertModel.findOneAndUpdate(
      { _id: alertId, userId },
      {
        $set: {
          status: "read",
          readAt,
        },
      },
      { new: true },
    ).exec();

    return document ? mapAlert(document) : null;
  }

  public async markAllAlertsReadForUser(userId: string, readAt: Date): Promise<number> {
    const result = await AlertModel.updateMany(
      { userId, status: "unread" },
      {
        $set: {
          status: "read",
          readAt,
        },
      },
    ).exec();

    return result.modifiedCount;
  }

  public async markDiscussionAlertsReadForUser(
    userId: string,
    workspaceId: string,
    relatedEntityType: WorkspaceCommentEntityType,
    relatedEntityId: string,
    readAt: Date,
  ): Promise<number> {
    const result = await AlertModel.updateMany(
      {
        userId,
        type: "workspace_comment_added",
        status: "unread",
        relatedEntityType,
        relatedEntityId,
        "metadata.workspaceId": workspaceId,
      },
      {
        $set: {
          status: "read",
          readAt,
        },
      },
    ).exec();

    return result.modifiedCount;
  }
}

function toPersistedDeliveryPreparation(preparation: NotificationDeliveryPreparation): Record<string, unknown> {
  return {
    alertType: preparation.alertType,
    deliveryState: preparation.deliveryState,
    deliveryMode: preparation.deliveryMode,
    cadence: preparation.cadence,
    eligibleForDelivery: preparation.eligibleForDelivery,
    preparedAt: new Date(preparation.preparedAt),
    ...(preparation.payload
      ? {
          payload: {
            subject: preparation.payload.subject,
            summary: preparation.payload.summary,
            ...(preparation.payload.relatedEntityType ? { relatedEntityType: preparation.payload.relatedEntityType } : {}),
            ...(preparation.payload.relatedEntityId ? { relatedEntityId: preparation.payload.relatedEntityId } : {}),
            metadata: preparation.payload.metadata,
          },
        }
      : {}),
  };
}

export function mapAlert(document: AlertDocument): StoredAlert {
  return {
    id: document.id,
    userId: document.userId,
    type: document.type,
    severity: document.severity,
    status: document.status,
    message: document.message,
    ...(document.relatedEntityType ? { relatedEntityType: document.relatedEntityType } : {}),
    ...(document.relatedEntityId ? { relatedEntityId: document.relatedEntityId } : {}),
    ...(document.metadata
      ? {
          metadata: {
            ...(document.metadata.jobId ? { jobId: document.metadata.jobId } : {}),
            ...(document.metadata.datasetId ? { datasetId: document.metadata.datasetId } : {}),
            ...(document.metadata.scoredRecordCount !== undefined
              ? { scoredRecordCount: document.metadata.scoredRecordCount }
              : {}),
            ...(document.metadata.errorCode ? { errorCode: document.metadata.errorCode } : {}),
            ...(document.metadata.requestKind ? { requestKind: document.metadata.requestKind } : {}),
            ...(document.metadata.workspaceId ? { workspaceId: document.metadata.workspaceId } : {}),
            ...(document.metadata.commentId ? { commentId: document.metadata.commentId } : {}),
            ...(document.metadata.commentActorUserId
              ? { commentActorUserId: document.metadata.commentActorUserId }
              : {}),
            ...(document.metadata.commentActorEmail
              ? { commentActorEmail: document.metadata.commentActorEmail }
              : {}),
            ...(document.metadata.assignmentId ? { assignmentId: document.metadata.assignmentId } : {}),
            ...(document.metadata.assignmentActorUserId
              ? { assignmentActorUserId: document.metadata.assignmentActorUserId }
              : {}),
            ...(document.metadata.assignmentActorEmail
              ? { assignmentActorEmail: document.metadata.assignmentActorEmail }
              : {}),
            ...(document.metadata.followEventId ? { followEventId: document.metadata.followEventId } : {}),
            ...(document.metadata.followChangeType
              ? { followChangeType: document.metadata.followChangeType }
              : {}),
            ...(document.metadata.followActorUserId
              ? { followActorUserId: document.metadata.followActorUserId }
              : {}),
            ...(document.metadata.followActorEmail
              ? { followActorEmail: document.metadata.followActorEmail }
              : {}),
            ...(document.metadata.followUpId ? { followUpId: document.metadata.followUpId } : {}),
            ...(document.metadata.followUpDueAt ? { followUpDueAt: document.metadata.followUpDueAt } : {}),
            ...(document.metadata.followUpDueState ? { followUpDueState: document.metadata.followUpDueState } : {}),
          },
        }
      : {}),
    ...(document.deliveryPreparation
      ? {
          deliveryPreparation: {
            alertType: document.deliveryPreparation.alertType,
            deliveryState: document.deliveryPreparation.deliveryState,
            deliveryMode: document.deliveryPreparation.deliveryMode,
            cadence: document.deliveryPreparation.cadence,
            eligibleForDelivery: document.deliveryPreparation.eligibleForDelivery,
            preparedAt: document.deliveryPreparation.preparedAt.toISOString(),
            ...(document.deliveryPreparation.payload
              ? {
                  payload: {
                    subject: document.deliveryPreparation.payload.subject,
                    summary: document.deliveryPreparation.payload.summary,
                    ...(document.deliveryPreparation.payload.relatedEntityType
                      ? { relatedEntityType: document.deliveryPreparation.payload.relatedEntityType }
                      : {}),
                    ...(document.deliveryPreparation.payload.relatedEntityId
                      ? { relatedEntityId: document.deliveryPreparation.payload.relatedEntityId }
                      : {}),
                    metadata: {
                      ...(document.deliveryPreparation.payload.metadata.jobId
                        ? { jobId: document.deliveryPreparation.payload.metadata.jobId }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.datasetId
                        ? { datasetId: document.deliveryPreparation.payload.metadata.datasetId }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.scoredRecordCount !== undefined
                        ? { scoredRecordCount: document.deliveryPreparation.payload.metadata.scoredRecordCount }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.errorCode
                        ? { errorCode: document.deliveryPreparation.payload.metadata.errorCode }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.requestKind
                        ? { requestKind: document.deliveryPreparation.payload.metadata.requestKind }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.workspaceId
                        ? { workspaceId: document.deliveryPreparation.payload.metadata.workspaceId }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.commentId
                        ? { commentId: document.deliveryPreparation.payload.metadata.commentId }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.commentActorUserId
                        ? { commentActorUserId: document.deliveryPreparation.payload.metadata.commentActorUserId }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.commentActorEmail
                        ? { commentActorEmail: document.deliveryPreparation.payload.metadata.commentActorEmail }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.assignmentId
                        ? { assignmentId: document.deliveryPreparation.payload.metadata.assignmentId }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.assignmentActorUserId
                        ? { assignmentActorUserId: document.deliveryPreparation.payload.metadata.assignmentActorUserId }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.assignmentActorEmail
                        ? { assignmentActorEmail: document.deliveryPreparation.payload.metadata.assignmentActorEmail }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.followEventId
                        ? { followEventId: document.deliveryPreparation.payload.metadata.followEventId }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.followChangeType
                        ? { followChangeType: document.deliveryPreparation.payload.metadata.followChangeType }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.followActorUserId
                        ? { followActorUserId: document.deliveryPreparation.payload.metadata.followActorUserId }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.followActorEmail
                        ? { followActorEmail: document.deliveryPreparation.payload.metadata.followActorEmail }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.followUpId
                        ? { followUpId: document.deliveryPreparation.payload.metadata.followUpId }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.followUpDueAt
                        ? { followUpDueAt: document.deliveryPreparation.payload.metadata.followUpDueAt }
                        : {}),
                      ...(document.deliveryPreparation.payload.metadata.followUpDueState
                        ? { followUpDueState: document.deliveryPreparation.payload.metadata.followUpDueState }
                        : {}),
                    },
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(document.readAt ? { readAt: document.readAt } : {}),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
