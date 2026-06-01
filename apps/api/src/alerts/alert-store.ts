import type { AlertDocument } from "@tax-lien/db";
import { AlertModel } from "@tax-lien/db";
import type {
  AlertMetadata,
  AlertRelatedEntityType,
  AlertSeverity,
  AlertStatus,
  AlertType,
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
}

export interface AlertStore {
  createAlert(input: CreateAlertInput): Promise<StoredAlert>;
  listAlertsForUser(userId: string): Promise<StoredAlert[]>;
  countUnreadForUser(userId: string): Promise<number>;
  markAlertReadForUser(alertId: string, userId: string, readAt: Date): Promise<StoredAlert | null>;
  markAllAlertsReadForUser(userId: string, readAt: Date): Promise<number>;
}

export class MongoAlertStore implements AlertStore {
  public async createAlert(input: CreateAlertInput): Promise<StoredAlert> {
    const document = await AlertModel.create({
      ...input,
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
          },
        }
      : {}),
    ...(document.readAt ? { readAt: document.readAt } : {}),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
