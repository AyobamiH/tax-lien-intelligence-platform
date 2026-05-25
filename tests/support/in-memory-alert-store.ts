import mongoose from "mongoose";
import type { AlertStatus } from "@tax-lien/types";
import type { AlertStore, CreateAlertInput, StoredAlert } from "../../apps/api/src/alerts/alert-store.js";

export class InMemoryAlertStore implements AlertStore {
  private readonly alertsById = new Map<string, StoredAlert>();

  public async createAlert(input: CreateAlertInput): Promise<StoredAlert> {
    const now = new Date();
    const alert: StoredAlert = {
      id: new mongoose.Types.ObjectId().toString(),
      userId: input.userId,
      type: input.type,
      severity: input.severity,
      status: "unread",
      message: input.message,
      ...(input.relatedEntityType ? { relatedEntityType: input.relatedEntityType } : {}),
      ...(input.relatedEntityId ? { relatedEntityId: input.relatedEntityId } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
      createdAt: now,
      updatedAt: now,
    };

    this.alertsById.set(alert.id, alert);
    return alert;
  }

  public async listAlertsForUser(userId: string): Promise<StoredAlert[]> {
    return [...this.alertsById.values()]
      .filter((alert) => alert.userId === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  public async countUnreadForUser(userId: string): Promise<number> {
    return [...this.alertsById.values()].filter((alert) => alert.userId === userId && alert.status === "unread").length;
  }

  public async markAlertReadForUser(alertId: string, userId: string, readAt: Date): Promise<StoredAlert | null> {
    const alert = this.alertsById.get(alertId);
    if (!alert || alert.userId !== userId) {
      return null;
    }

    const updated = this.updateAlertStatus(alert, "read", readAt);
    this.alertsById.set(alertId, updated);
    return updated;
  }

  public async markAllAlertsReadForUser(userId: string, readAt: Date): Promise<number> {
    let updatedCount = 0;

    for (const alert of this.alertsById.values()) {
      if (alert.userId !== userId || alert.status === "read") {
        continue;
      }

      this.alertsById.set(alert.id, this.updateAlertStatus(alert, "read", readAt));
      updatedCount += 1;
    }

    return updatedCount;
  }

  private updateAlertStatus(alert: StoredAlert, status: AlertStatus, readAt: Date): StoredAlert {
    return {
      ...alert,
      status,
      readAt,
      updatedAt: new Date(),
    };
  }
}
