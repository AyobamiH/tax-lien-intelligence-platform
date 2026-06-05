import mongoose from "mongoose";
import type {
  CreateNotificationDeliveryInput,
  NotificationDeliverySourceQuery,
  NotificationDeliveryStore,
  StoredNotificationDelivery,
  UpdateNotificationDeliveryInput,
} from "../../apps/api/src/notification-delivery/notification-delivery-store.js";

export class InMemoryNotificationDeliveryStore implements NotificationDeliveryStore {
  private readonly deliveriesById = new Map<string, StoredNotificationDelivery>();
  private readonly idsBySource = new Map<string, string>();

  public async findBySource(query: NotificationDeliverySourceQuery): Promise<StoredNotificationDelivery | null> {
    const id = this.idsBySource.get(sourceIndexKey(query.userId, query.sourceKey, query.channel));
    return id ? (this.deliveriesById.get(id) ?? null) : null;
  }

  public async createDeliveryOnce(input: CreateNotificationDeliveryInput): Promise<StoredNotificationDelivery> {
    const sourceKey = sourceIndexKey(input.userId, input.sourceKey, input.channel);
    const existingId = this.idsBySource.get(sourceKey);
    if (existingId) {
      return this.deliveriesById.get(existingId) as StoredNotificationDelivery;
    }

    const now = new Date();
    const delivery: StoredNotificationDelivery = {
      id: new mongoose.Types.ObjectId().toString(),
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
      createdAt: now,
      updatedAt: now,
    };

    this.deliveriesById.set(delivery.id, delivery);
    this.idsBySource.set(sourceKey, delivery.id);
    return delivery;
  }

  public async updateDelivery(id: string, input: UpdateNotificationDeliveryInput): Promise<StoredNotificationDelivery> {
    const current = this.deliveriesById.get(id);
    if (!current) {
      throw new Error("Notification delivery outbox entry was not found.");
    }

    const updated: StoredNotificationDelivery = {
      ...current,
      ...input,
      updatedAt: new Date(),
    };
    this.deliveriesById.set(id, updated);
    return updated;
  }

  public async listDigestReadyForUser(userId: string): Promise<StoredNotificationDelivery[]> {
    return [...this.deliveriesById.values()]
      .filter((delivery) => delivery.userId === userId && delivery.channel === "email" && delivery.status === "digest_ready")
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  public listAll(): StoredNotificationDelivery[] {
    return [...this.deliveriesById.values()];
  }
}

function sourceIndexKey(userId: string, sourceKey: string, channel: string): string {
  return `${userId}:${sourceKey}:${channel}`;
}
