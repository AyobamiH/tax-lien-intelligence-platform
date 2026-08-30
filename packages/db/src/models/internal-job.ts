import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type InternalJobStatusRecord = "queued" | "running" | "completed" | "failed";
export type InternalJobTypeRecord = "dataset_scoring" | "dataset_maintenance";
export type InternalJobTargetTypeRecord = "dataset";
export type InternalJobRequestKindRecord = "score" | "refresh" | "policy_refresh" | "maintenance_scan";
export type MaintenanceDecisionRecord =
  | "not_stale"
  | "manual_refresh_only"
  | "policy_refresh_queued"
  | "active_refresh_exists"
  | "recent_refresh_suppressed"
  | "recent_failure_suppressed";

export interface InternalJobSummaryRecord {
  scoredRecordCount?: number;
  enrichedRecordCount?: number;
  enrichmentFallbackCount?: number;
  intelligenceCompletedCount?: number;
  intelligenceNotConfiguredCount?: number;
  intelligenceFailedCount?: number;
  earliestReprocessAfter?: string;
  maintenanceScannedDatasetCount?: number;
  maintenanceStaleDatasetCount?: number;
  maintenanceRefreshJobCount?: number;
  maintenanceSkippedDatasetCount?: number;
  maintenanceDecision?: MaintenanceDecisionRecord;
  maintenanceRunAt?: string;
  staleRecordCount?: number;
  refreshJobId?: string;
  policyAutoRefreshEnabled?: boolean;
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
  requestKind: InternalJobRequestKindRecord;
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
    enrichedRecordCount: { type: Number, min: 0 },
    enrichmentFallbackCount: { type: Number, min: 0 },
    intelligenceCompletedCount: { type: Number, min: 0 },
    intelligenceNotConfiguredCount: { type: Number, min: 0 },
    intelligenceFailedCount: { type: Number, min: 0 },
    earliestReprocessAfter: { type: String, trim: true, maxlength: 40 },
    maintenanceScannedDatasetCount: { type: Number, min: 0 },
    maintenanceStaleDatasetCount: { type: Number, min: 0 },
    maintenanceRefreshJobCount: { type: Number, min: 0 },
    maintenanceSkippedDatasetCount: { type: Number, min: 0 },
    maintenanceDecision: {
      type: String,
      enum: [
        "not_stale",
        "manual_refresh_only",
        "policy_refresh_queued",
        "active_refresh_exists",
        "recent_refresh_suppressed",
        "recent_failure_suppressed",
      ],
    },
    maintenanceRunAt: { type: String, trim: true, maxlength: 40 },
    staleRecordCount: { type: Number, min: 0 },
    refreshJobId: { type: String, trim: true },
    policyAutoRefreshEnabled: { type: Boolean },
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
      enum: ["dataset_scoring", "dataset_maintenance"],
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
    requestKind: {
      type: String,
      enum: ["score", "refresh", "policy_refresh", "maintenance_scan"],
      required: true,
      default: "score",
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
internalJobSchema.index({ userId: 1, type: 1, targetEntityType: 1, targetEntityId: 1, status: 1 });
internalJobSchema.index({ status: 1, queuedAt: 1, createdAt: 1 });

export const InternalJobModel: Model<InternalJobRecord> =
  mongoose.models.InternalJob ?? mongoose.model<InternalJobRecord>("InternalJob", internalJobSchema);
