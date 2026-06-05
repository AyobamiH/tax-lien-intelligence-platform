import type { NotificationPreferenceDocument } from "@tax-lien/db";
import { NotificationPreferenceModel } from "@tax-lien/db";
import type { NotificationPreferenceRule } from "@tax-lien/types";

export interface StoredNotificationPreferences {
  id: string;
  userId: string;
  rules: NotificationPreferenceRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveNotificationPreferencesInput {
  userId: string;
  rules: NotificationPreferenceRule[];
}

export interface NotificationPreferenceStore {
  findForUser(userId: string): Promise<StoredNotificationPreferences | null>;
  upsertForUser(input: SaveNotificationPreferencesInput): Promise<StoredNotificationPreferences>;
}

export class MongoNotificationPreferenceStore implements NotificationPreferenceStore {
  public async findForUser(userId: string): Promise<StoredNotificationPreferences | null> {
    const document = await NotificationPreferenceModel.findOne({ userId }).exec();
    return document ? mapNotificationPreferences(document) : null;
  }

  public async upsertForUser(input: SaveNotificationPreferencesInput): Promise<StoredNotificationPreferences> {
    const document = await NotificationPreferenceModel.findOneAndUpdate(
      { userId: input.userId },
      { $set: { rules: input.rules } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();

    return mapNotificationPreferences(document);
  }
}

export function mapNotificationPreferences(document: NotificationPreferenceDocument): StoredNotificationPreferences {
  return {
    id: document.id,
    userId: document.userId,
    rules: document.rules.map((rule) => ({
      alertType: rule.alertType,
      enabled: rule.enabled,
      deliveryMode: rule.deliveryMode,
      cadence: rule.cadence,
    })),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
