import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type InternalJobStatusRecord = "queued" | "running" | "completed" | "failed";
export type InternalJobTypeRecord = "dataset_scoring";
export type InternalJobTargetTypeRecord = "dataset";

export interface InternalJobSummaryRecord {
  scoredRecordCount?: number;
}

export interface InternalJobErrorRecord {
  code: string;
  message: string;
}

export interface InternalJobRecord {
  userId: string;
  type: InternalJobTypeRecord;
  targetEntityType: InternalJobTargetTypeRecord;
  targetEntityId: string;
  status: InternalJobStatusRecord;
  summary?: InternalJobSummaryRecord;
  error?: InternalJobErrorRecord;
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type InternalJobDocument = HydratedDocument<InternalJobRecord>;

const internalJobSummarySchema = new Schema<InternalJobSummaryRecord>(
  {
    scoredRecordCount: { type: Number, min: 0 },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const internalJobErrorSchema = new Schema<InternalJobErrorRecord>(
  {
    code: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const internalJobSchema = new Schema<InternalJobRecord>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["dataset_scoring"],
      required: true,
      index: true,
    },
    targetEntityType: {
      type: String,
      enum: ["dataset"],
      required: true,
      index: true,
    },
    targetEntityId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      required: true,
      default: "queued",
      index: true,
    },
    summary: {
      type: internalJobSummarySchema,
    },
    error: {
      type: internalJobErrorSchema,
    },
    queuedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

internalJobSchema.index({ userId: 1, status: 1, queuedAt: -1 });
internalJobSchema.index({ userId: 1, targetEntityType: 1, targetEntityId: 1, queuedAt: -1 });

export const InternalJobModel: Model<InternalJobRecord> =
  mongoose.models.InternalJob ?? mongoose.model<InternalJobRecord>("InternalJob", internalJobSchema);
