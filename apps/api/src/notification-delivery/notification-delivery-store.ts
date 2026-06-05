import type { NotificationDeliveryDocument } from "@tax-lien/db";
import { NotificationDeliveryModel } from "@tax-lien/db";
import type {
  AlertMetadata,
  AlertRelatedEntityType,
  AlertType,
  NotificationCadence,
  NotificationDeliveryChannel,
  NotificationDeliveryFailureCode,
  NotificationDeliveryMode,
  NotificationDeliveryStatus,
} from "@tax-lien/types";

export interface StoredNotificationDelivery {
  id: string;
  userId: string;
  alertId?: string;
  sourceKey: string;
  alertType: AlertType;
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  deliveryMode: NotificationDeliveryMode;
  cadence: NotificationCadence;
  recipientEmail?: string;
  subject?: string;
  summary?: string;
  relatedEntityType?: AlertRelatedEntityType;
  relatedEntityId?: string;
  metadata?: AlertMetadata;
  provider?: string;
  providerMessageId?: string;
  attempts: number;
  lastAttemptAt?: Date;
  sentAt?: Date;
  failureCode?: NotificationDeliveryFailureCode;
  failureReason?: string;
  preparedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDeliverySourceQuery {
  userId: string;
  sourceKey: string;
  channel: NotificationDeliveryChannel;
}

export interface CreateNotificationDeliveryInput {
  userId: string;
  alertId?: string;
  sourceKey: string;
  alertType: AlertType;
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  deliveryMode: NotificationDeliveryMode;
  cadence: NotificationCadence;
  recipientEmail?: string;
  subject?: string;
  summary?: string;
  relatedEntityType?: AlertRelatedEntityType;
  relatedEntityId?: string;
  metadata?: AlertMetadata;
  provider?: string;
  attempts?: number;
  failureCode?: NotificationDeliveryFailureCode;
  failureReason?: string;
  preparedAt: Date;
}

export interface UpdateNotificationDeliveryInput {
  status?: NotificationDeliveryStatus;
  recipientEmail?: string;
  provider?: string;
  providerMessageId?: string;
  attempts?: number;
  lastAttemptAt?: Date;
  sentAt?: Date;
  failureCode?: NotificationDeliveryFailureCode;
  failureReason?: string;
}

export interface NotificationDeliveryStore {
  findBySource(query: NotificationDeliverySourceQuery): Promise<StoredNotificationDelivery | null>;
  createDeliveryOnce(input: CreateNotificationDeliveryInput): Promise<StoredNotificationDelivery>;
  updateDelivery(id: string, input: UpdateNotificationDeliveryInput): Promise<StoredNotificationDelivery>;
  listDigestReadyForUser(userId: string): Promise<StoredNotificationDelivery[]>;
}

export class MongoNotificationDeliveryStore implements NotificationDeliveryStore {
  public async findBySource(query: NotificationDeliverySourceQuery): Promise<StoredNotificationDelivery | null> {
    const document = await NotificationDeliveryModel.findOne({
      userId: query.userId,
      sourceKey: query.sourceKey,
      channel: query.channel,
    }).exec();

    return document ? mapNotificationDelivery(document) : null;
  }

  public async createDeliveryOnce(input: CreateNotificationDeliveryInput): Promise<StoredNotificationDelivery> {
    const document = await NotificationDeliveryModel.findOneAndUpdate(
      {
        userId: input.userId,
        sourceKey: input.sourceKey,
        channel: input.channel,
      },
      {
        $setOnInsert: {
          userId: input.userId,
          ...(input.alertId ? { alertId: input.alertId } : {}),
          sourceKey: input.sourceKey,
          alertType: input.alertType,
          channel: input.channel,
          status: input.status,
          deliveryMode: input.deliveryMode,
          cadence: input.cadence,
          ...(input.recipientEmail ? { recipientEmail: input.recipientEmail } : {}),
          ...(input.subject ? { subject: input.subject } : {}),
          ...(input.summary ? { summary: input.summary } : {}),
          ...(input.relatedEntityType ? { relatedEntityType: input.relatedEntityType } : {}),
          ...(input.relatedEntityId ? { relatedEntityId: input.relatedEntityId } : {}),
          ...(input.metadata ? { metadata: input.metadata } : {}),
          ...(input.provider ? { provider: input.provider } : {}),
          attempts: input.attempts ?? 0,
          ...(input.failureCode ? { failureCode: input.failureCode } : {}),
          ...(input.failureReason ? { failureReason: input.failureReason } : {}),
          preparedAt: input.preparedAt,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();

    return mapNotificationDelivery(document);
  }

  public async updateDelivery(id: string, input: UpdateNotificationDeliveryInput): Promise<StoredNotificationDelivery> {
    const document = await NotificationDeliveryModel.findByIdAndUpdate(id, { $set: input }, { new: true }).exec();
    if (!document) {
      throw new Error("Notification delivery outbox entry was not found.");
    }

    return mapNotificationDelivery(document);
  }

  public async listDigestReadyForUser(userId: string): Promise<StoredNotificationDelivery[]> {
    const documents = await NotificationDeliveryModel.find({
      userId,
      channel: "email",
      status: "digest_ready",
    })
      .sort({ createdAt: 1 })
      .exec();

    return documents.map(mapNotificationDelivery);
  }
}

export function mapNotificationDelivery(document: NotificationDeliveryDocument): StoredNotificationDelivery {
  return {
    id: document.id,
    userId: document.userId,
    ...(document.alertId ? { alertId: document.alertId } : {}),
    sourceKey: document.sourceKey,
    alertType: document.alertType,
    channel: document.channel,
    status: document.status,
    deliveryMode: document.deliveryMode,
    cadence: document.cadence,
    ...(document.recipientEmail ? { recipientEmail: document.recipientEmail } : {}),
    ...(document.subject ? { subject: document.subject } : {}),
    ...(document.summary ? { summary: document.summary } : {}),
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
    ...(document.provider ? { provider: document.provider } : {}),
    ...(document.providerMessageId ? { providerMessageId: document.providerMessageId } : {}),
    attempts: document.attempts,
    ...(document.lastAttemptAt ? { lastAttemptAt: document.lastAttemptAt } : {}),
    ...(document.sentAt ? { sentAt: document.sentAt } : {}),
    ...(document.failureCode ? { failureCode: document.failureCode } : {}),
    ...(document.failureReason ? { failureReason: document.failureReason } : {}),
    preparedAt: document.preparedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
