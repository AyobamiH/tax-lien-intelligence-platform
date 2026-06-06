import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { NotificationDeliveryFailureCodeRecord } from "./notification-delivery.js";

export type NotificationDigestBatchStatusRecord =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "provider_disabled"
  | "suppressed"
  | "empty";

export interface NotificationDigestBatchRecord {
  userId: string;
  windowKey: string;
  status: NotificationDigestBatchStatusRecord;
  itemCount: number;
  subject?: string;
  provider?: string;
  providerMessageId?: string;
  attempts: number;
  startedAt?: Date;
  sentAt?: Date;
  failureCode?: NotificationDeliveryFailureCodeRecord;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDigestBatchDocument = HydratedDocument<NotificationDigestBatchRecord>;

const notificationDigestBatchSchema = new Schema<NotificationDigestBatchRecord>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    windowKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed", "provider_disabled", "suppressed", "empty"],
      required: true,
      index: true,
    },
    itemCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    provider: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    providerMessageId: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    attempts: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    startedAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    failureCode: {
      type: String,
      enum: ["provider_disabled", "recipient_missing", "provider_error"],
    },
    failureReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

notificationDigestBatchSchema.index({ userId: 1, windowKey: 1 }, { unique: true });
notificationDigestBatchSchema.index({ userId: 1, createdAt: -1 });

export const NotificationDigestBatchModel: Model<NotificationDigestBatchRecord> =
  mongoose.models.NotificationDigestBatch ??
  mongoose.model<NotificationDigestBatchRecord>("NotificationDigestBatch", notificationDigestBatchSchema);
