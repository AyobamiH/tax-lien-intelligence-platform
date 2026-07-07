import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type AlertTypeRecord =
  | "scoring_job_completed"
  | "scoring_job_failed"
  | "workspace_comment_added"
  | "workspace_item_assigned"
  | "followed_item_changed"
  | "follow_up_due";
export type AlertSeverityRecord = "info" | "error";
export type AlertStatusRecord = "unread" | "read";
export type AlertRelatedEntityTypeRecord =
  | "dataset"
  | "job"
  | "comparison_item"
  | "watchlist_item"
  | "portfolio_item";

export interface AlertMetadataRecord {
  jobId?: string;
  datasetId?: string;
  scoredRecordCount?: number;
  errorCode?: string;
  requestKind?: "score" | "refresh" | "policy_refresh" | "maintenance_scan";
  workspaceId?: string;
  commentId?: string;
  commentActorUserId?: string;
  commentActorEmail?: string;
  assignmentId?: string;
  assignmentActorUserId?: string;
  assignmentActorEmail?: string;
  followEventId?: string;
  followChangeType?: "assignment_changed" | "portfolio_status_changed" | "approval_resolved";
  followActorUserId?: string;
  followActorEmail?: string;
  followUpId?: string;
  followUpDueAt?: string;
  followUpDueState?: "upcoming" | "due" | "overdue" | "cleared" | "none";
}

export interface AlertDeliveryPreparationPayloadRecord {
  subject: string;
  summary: string;
  relatedEntityType?: AlertRelatedEntityTypeRecord;
  relatedEntityId?: string;
  metadata: AlertMetadataRecord;
}

export interface AlertDeliveryPreparationRecord {
  alertType: AlertTypeRecord;
  deliveryState: "suppressed" | "in_app_only" | "delivery_immediate" | "delivery_digest";
  deliveryMode: "in_app_only" | "delivery_eligible";
  cadence: "immediate" | "digest";
  eligibleForDelivery: boolean;
  preparedAt: Date;
  payload?: AlertDeliveryPreparationPayloadRecord;
}

export interface AlertRecord {
  userId: string;
  type: AlertTypeRecord;
  severity: AlertSeverityRecord;
  status: AlertStatusRecord;
  message: string;
  relatedEntityType?: AlertRelatedEntityTypeRecord;
  relatedEntityId?: string;
  metadata?: AlertMetadataRecord;
  deliveryPreparation?: AlertDeliveryPreparationRecord;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AlertDocument = HydratedDocument<AlertRecord>;

const alertMetadataSchema = new Schema<AlertMetadataRecord>(
  {
    jobId: { type: String, trim: true },
    datasetId: { type: String, trim: true },
    scoredRecordCount: { type: Number, min: 0 },
    errorCode: { type: String, trim: true, maxlength: 120 },
    requestKind: { type: String, enum: ["score", "refresh", "policy_refresh", "maintenance_scan"] },
    workspaceId: { type: String, trim: true },
    commentId: { type: String, trim: true },
    commentActorUserId: { type: String, trim: true },
    commentActorEmail: { type: String, trim: true, lowercase: true, maxlength: 320 },
    assignmentId: { type: String, trim: true },
    assignmentActorUserId: { type: String, trim: true },
    assignmentActorEmail: { type: String, trim: true, lowercase: true, maxlength: 320 },
    followEventId: { type: String, trim: true },
    followChangeType: {
      type: String,
      enum: ["assignment_changed", "portfolio_status_changed", "approval_resolved"],
    },
    followActorUserId: { type: String, trim: true },
    followActorEmail: { type: String, trim: true, lowercase: true, maxlength: 320 },
    followUpId: { type: String, trim: true },
    followUpDueAt: { type: String, trim: true },
    followUpDueState: { type: String, enum: ["upcoming", "due", "overdue", "cleared", "none"] },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const alertDeliveryPreparationPayloadSchema = new Schema<AlertDeliveryPreparationPayloadRecord>(
  {
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    summary: { type: String, required: true, trim: true, maxlength: 500 },
    relatedEntityType: {
      type: String,
      enum: ["dataset", "job", "comparison_item", "watchlist_item", "portfolio_item"],
    },
    relatedEntityId: { type: String, trim: true },
    metadata: {
      type: alertMetadataSchema,
      required: true,
      default: {},
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const alertDeliveryPreparationSchema = new Schema<AlertDeliveryPreparationRecord>(
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
    deliveryState: {
      type: String,
      enum: ["suppressed", "in_app_only", "delivery_immediate", "delivery_digest"],
      required: true,
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
    eligibleForDelivery: {
      type: Boolean,
      required: true,
    },
    preparedAt: {
      type: Date,
      required: true,
    },
    payload: {
      type: alertDeliveryPreparationPayloadSchema,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const alertSchema = new Schema<AlertRecord>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
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
      index: true,
    },
    severity: {
      type: String,
      enum: ["info", "error"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["unread", "read"],
      required: true,
      default: "unread",
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    relatedEntityType: {
      type: String,
      enum: ["dataset", "job", "comparison_item", "watchlist_item", "portfolio_item"],
      index: true,
    },
    relatedEntityId: {
      type: String,
      trim: true,
      index: true,
    },
    metadata: {
      type: alertMetadataSchema,
    },
    deliveryPreparation: {
      type: alertDeliveryPreparationSchema,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

alertSchema.index({ userId: 1, status: 1, createdAt: -1 });
alertSchema.index({ userId: 1, createdAt: -1 });

export const AlertModel: Model<AlertRecord> =
  mongoose.models.Alert ?? mongoose.model<AlertRecord>("Alert", alertSchema);
