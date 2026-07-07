import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { AlertTypeRecord } from "./alert.js";

export type NotificationDeliveryModeRecord = "in_app_only" | "delivery_eligible";
export type NotificationCadenceRecord = "immediate" | "digest";

export interface NotificationPreferenceRuleRecord {
  alertType: AlertTypeRecord;
  enabled: boolean;
  deliveryMode: NotificationDeliveryModeRecord;
  cadence: NotificationCadenceRecord;
}

export interface NotificationPreferenceRecord {
  userId: string;
  rules: NotificationPreferenceRuleRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationPreferenceDocument = HydratedDocument<NotificationPreferenceRecord>;

const notificationPreferenceRuleSchema = new Schema<NotificationPreferenceRuleRecord>(
  {
    alertType: {
      type: String,
      enum: [
        "scoring_job_completed",
        "scoring_job_failed",
        "workspace_comment_added",
        "workspace_item_assigned",
        "followed_item_changed",
        "follow_up_due",
      ],
      required: true,
    },
    enabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    deliveryMode: {
      type: String,
      enum: ["in_app_only", "delivery_eligible"],
      required: true,
      default: "in_app_only",
    },
    cadence: {
      type: String,
      enum: ["immediate", "digest"],
      required: true,
      default: "immediate",
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const notificationPreferenceSchema = new Schema<NotificationPreferenceRecord>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    rules: {
      type: [notificationPreferenceRuleSchema],
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const NotificationPreferenceModel: Model<NotificationPreferenceRecord> =
  mongoose.models.NotificationPreference ??
  mongoose.model<NotificationPreferenceRecord>("NotificationPreference", notificationPreferenceSchema);
