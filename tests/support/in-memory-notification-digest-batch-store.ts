import mongoose from "mongoose";
import type {
  CreateNotificationDigestBatchInput,
  NotificationDigestBatchStore,
  StoredNotificationDigestBatch,
  UpdateNotificationDigestBatchInput,
} from "../../apps/api/src/notification-delivery/notification-digest-batch-store.js";

export class InMemoryNotificationDigestBatchStore implements NotificationDigestBatchStore {
  private readonly batchesById = new Map<string, StoredNotificationDigestBatch>();
  private readonly idsByWindow = new Map<string, string>();

  public async createBatchOnce(input: CreateNotificationDigestBatchInput): Promise<StoredNotificationDigestBatch> {
    const key = windowIndexKey(input.userId, input.windowKey);
    const existingId = this.idsByWindow.get(key);
    if (existingId) {
      return this.batchesById.get(existingId) as StoredNotificationDigestBatch;
    }

    const now = new Date();
    const batch: StoredNotificationDigestBatch = {
      id: new mongoose.Types.ObjectId().toString(),
      userId: input.userId,
      windowKey: input.windowKey,
      status: "pending",
      itemCount: 0,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.batchesById.set(batch.id, batch);
    this.idsByWindow.set(key, batch.id);
    return batch;
  }

  public async claimBatchForProcessing(
    batchId: string,
    startedAt: Date,
  ): Promise<StoredNotificationDigestBatch | null> {
    const current = this.batchesById.get(batchId);
    if (!current || current.status !== "pending") {
      return null;
    }

    const updated: StoredNotificationDigestBatch = {
      ...current,
      status: "processing",
      startedAt,
      updatedAt: new Date(),
    };
    this.batchesById.set(batchId, updated);
    return updated;
  }

  public async updateBatch(
    batchId: string,
    input: UpdateNotificationDigestBatchInput,
  ): Promise<StoredNotificationDigestBatch> {
    const current = this.batchesById.get(batchId);
    if (!current) {
      throw new Error("Notification digest batch was not found.");
    }

    const updated: StoredNotificationDigestBatch = {
      ...current,
      ...input,
      updatedAt: new Date(),
    };
    this.batchesById.set(batchId, updated);
    return updated;
  }

  public async listHistoryForUser(userId: string, limit: number): Promise<StoredNotificationDigestBatch[]> {
    return [...this.batchesById.values()]
      .filter((batch) => batch.userId === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, limit);
  }

  public listAll(): StoredNotificationDigestBatch[] {
    return [...this.batchesById.values()];
  }
}

function windowIndexKey(userId: string, windowKey: string): string {
  return `${userId}:${windowKey}`;
}
