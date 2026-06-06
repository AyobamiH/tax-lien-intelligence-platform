import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { AlertMetadataRecord, AlertRelatedEntityTypeRecord, AlertTypeRecord } from "./alert.js";
import type { NotificationCadenceRecord, NotificationDeliveryModeRecord } from "./notification-preference.js";

export type NotificationDeliveryChannelRecord = "email";
export type NotificationDeliveryStatusRecord =
  | "suppressed"
  | "in_app_only"
  | "digest_ready"
  | "digest_processing"
  | "pending"
  | "sent"
  | "failed"
  | "provider_disabled";
export type NotificationDeliveryFailureCodeRecord = "provider_disabled" | "recipient_missing" | "provider_error";

export interface NotificationDeliveryRecord {
  userId: string;
  alertId?: string;
  digestBatchId?: string;
  sourceKey: string;
  alertType: AlertTypeRecord;
  channel: NotificationDeliveryChannelRecord;
  status: NotificationDeliveryStatusRecord;
  deliveryMode: NotificationDeliveryModeRecord;
  cadence: NotificationCadenceRecord;
  recipientEmail?: string;
  subject?: string;
  summary?: string;
  relatedEntityType?: AlertRelatedEntityTypeRecord;
  relatedEntityId?: string;
  metadata?: AlertMetadataRecord;
  provider?: string;
  providerMessageId?: string;
  attempts: number;
  lastAttemptAt?: Date;
  sentAt?: Date;
  failureCode?: NotificationDeliveryFailureCodeRecord;
  failureReason?: string;
  preparedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDeliveryDocument = HydratedDocument<NotificationDeliveryRecord>;

const notificationDeliveryMetadataSchema = new Schema<AlertMetadataRecord>(
  {
    jobId: { type: String, trim: true },
    datasetId: { type: String, trim: true },
    scoredRecordCount: { type: Number, min: 0 },
    errorCode: { type: String, trim: true, maxlength: 120 },
    requestKind: { type: String, enum: ["score", "refresh", "policy_refresh", "maintenance_scan"] },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const notificationDeliverySchema = new Schema<NotificationDeliveryRecord>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    alertId: {
      type: String,
      trim: true,
      index: true,
    },
    digestBatchId: {
      type: String,
      trim: true,
      index: true,
    },
    sourceKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    alertType: {
      type: String,
      enum: ["scoring_job_completed", "scoring_job_failed"],
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["email"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "suppressed",
        "in_app_only",
        "digest_ready",
        "digest_processing",
        "pending",
        "sent",
        "failed",
        "provider_disabled",
      ],
      required: true,
      index: true,
    },
    deliveryMode: {
      type: String,
      enum: ["in_app_only", "delivery_eligible"],
      required: true,
    },
    cadence: {
      type: String,
      enum: ["immediate", "digest"],
      required: true,
    },
    recipientEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    relatedEntityType: {
      type: String,
      enum: ["dataset", "job"],
    },
    relatedEntityId: {
      type: String,
      trim: true,
    },
    metadata: {
      type: notificationDeliveryMetadataSchema,
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
    lastAttemptAt: {
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
    preparedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

notificationDeliverySchema.index({ userId: 1, sourceKey: 1, channel: 1 }, { unique: true });
notificationDeliverySchema.index({ userId: 1, status: 1, createdAt: -1 });
notificationDeliverySchema.index({ userId: 1, cadence: 1, status: 1, createdAt: 1 });

export const NotificationDeliveryModel: Model<NotificationDeliveryRecord> =
  mongoose.models.NotificationDelivery ??
  mongoose.model<NotificationDeliveryRecord>("NotificationDelivery", notificationDeliverySchema);
