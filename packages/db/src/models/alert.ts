import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type AlertTypeRecord = "scoring_job_completed" | "scoring_job_failed";
export type AlertSeverityRecord = "info" | "error";
export type AlertStatusRecord = "unread" | "read";
export type AlertRelatedEntityTypeRecord = "dataset" | "job";

export interface AlertMetadataRecord {
  jobId?: string;
  datasetId?: string;
  scoredRecordCount?: number;
  errorCode?: string;
  requestKind?: "score" | "refresh";
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
    requestKind: { type: String, enum: ["score", "refresh"] },
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
      enum: ["scoring_job_completed", "scoring_job_failed"],
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
      enum: ["dataset", "job"],
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
