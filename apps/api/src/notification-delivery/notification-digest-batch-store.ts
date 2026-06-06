import type { NotificationDigestBatchDocument } from "@tax-lien/db";
import { NotificationDigestBatchModel } from "@tax-lien/db";
import type {
  NotificationDeliveryFailureCode,
  NotificationDigestBatchStatus,
} from "@tax-lien/types";

export interface StoredNotificationDigestBatch {
  id: string;
  userId: string;
  windowKey: string;
  status: NotificationDigestBatchStatus;
  itemCount: number;
  subject?: string;
  provider?: string;
  providerMessageId?: string;
  attempts: number;
  startedAt?: Date;
  sentAt?: Date;
  failureCode?: NotificationDeliveryFailureCode;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationDigestBatchInput {
  userId: string;
  windowKey: string;
}

export interface UpdateNotificationDigestBatchInput {
  status?: NotificationDigestBatchStatus;
  itemCount?: number;
  subject?: string;
  provider?: string;
  providerMessageId?: string;
  attempts?: number;
  startedAt?: Date;
  sentAt?: Date;
  failureCode?: NotificationDeliveryFailureCode;
  failureReason?: string;
}

export interface NotificationDigestBatchStore {
  createBatchOnce(input: CreateNotificationDigestBatchInput): Promise<StoredNotificationDigestBatch>;
  claimBatchForProcessing(batchId: string, startedAt: Date): Promise<StoredNotificationDigestBatch | null>;
  updateBatch(batchId: string, input: UpdateNotificationDigestBatchInput): Promise<StoredNotificationDigestBatch>;
  listHistoryForUser(userId: string, limit: number): Promise<StoredNotificationDigestBatch[]>;
}

export class MongoNotificationDigestBatchStore implements NotificationDigestBatchStore {
  public async createBatchOnce(input: CreateNotificationDigestBatchInput): Promise<StoredNotificationDigestBatch> {
    const document = await NotificationDigestBatchModel.findOneAndUpdate(
      { userId: input.userId, windowKey: input.windowKey },
      {
        $setOnInsert: {
          userId: input.userId,
          windowKey: input.windowKey,
          status: "pending",
          itemCount: 0,
          attempts: 0,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();

    return mapNotificationDigestBatch(document);
  }

  public async claimBatchForProcessing(
    batchId: string,
    startedAt: Date,
  ): Promise<StoredNotificationDigestBatch | null> {
    const document = await NotificationDigestBatchModel.findOneAndUpdate(
      { _id: batchId, status: "pending" },
      {
        $set: {
          status: "processing",
          startedAt,
        },
      },
      { new: true },
    ).exec();

    return document ? mapNotificationDigestBatch(document) : null;
  }

  public async updateBatch(
    batchId: string,
    input: UpdateNotificationDigestBatchInput,
  ): Promise<StoredNotificationDigestBatch> {
    const document = await NotificationDigestBatchModel.findByIdAndUpdate(
      batchId,
      { $set: input },
      { new: true },
    ).exec();
    if (!document) {
      throw new Error("Notification digest batch was not found.");
    }

    return mapNotificationDigestBatch(document);
  }

  public async listHistoryForUser(userId: string, limit: number): Promise<StoredNotificationDigestBatch[]> {
    const documents = await NotificationDigestBatchModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    return documents.map(mapNotificationDigestBatch);
  }
}

export function mapNotificationDigestBatch(
  document: NotificationDigestBatchDocument,
): StoredNotificationDigestBatch {
  return {
    id: document.id,
    userId: document.userId,
    windowKey: document.windowKey,
    status: document.status,
    itemCount: document.itemCount,
    ...(document.subject ? { subject: document.subject } : {}),
    ...(document.provider ? { provider: document.provider } : {}),
    ...(document.providerMessageId ? { providerMessageId: document.providerMessageId } : {}),
    attempts: document.attempts,
    ...(document.startedAt ? { startedAt: document.startedAt } : {}),
    ...(document.sentAt ? { sentAt: document.sentAt } : {}),
    ...(document.failureCode ? { failureCode: document.failureCode } : {}),
    ...(document.failureReason ? { failureReason: document.failureReason } : {}),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
