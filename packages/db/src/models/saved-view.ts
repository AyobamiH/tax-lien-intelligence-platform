import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { ComparisonDecisionRecord, ComparisonSourceTypeRecord } from "./comparison-item.js";
import type { PortfolioStatusRecord } from "./portfolio-item.js";

export type SavedViewSurfaceRecord = "portfolio" | "comparison";
export type SavedViewSortKeyRecord =
  | "tracked_at"
  | "status_updated_at"
  | "added_at"
  | "decision_updated_at"
  | "investment_score"
  | "risk_score"
  | "confidence_score";
export type SavedViewSortDirectionRecord = "asc" | "desc";
export type SavedViewPortfolioQueueRecord = "needs_attention" | "recently_changed";
export type SavedViewComparisonQueueRecord = "needs_decision" | "recent_decisions";

export interface SavedViewPortfolioFiltersRecord {
  statuses?: PortfolioStatusRecord[];
  queue?: SavedViewPortfolioQueueRecord;
  hasFlags?: boolean;
  maxRiskScore?: number;
  minConfidenceScore?: number;
}

export interface SavedViewComparisonFiltersRecord {
  decisions?: ComparisonDecisionRecord[];
  sourceTypes?: ComparisonSourceTypeRecord[];
  queue?: SavedViewComparisonQueueRecord;
  hasNote?: boolean;
}

export type SavedViewFiltersRecord = SavedViewPortfolioFiltersRecord | SavedViewComparisonFiltersRecord;

export interface SavedViewSortRecord {
  key: SavedViewSortKeyRecord;
  direction: SavedViewSortDirectionRecord;
}

export interface SavedViewRecord {
  userId: string;
  surface: SavedViewSurfaceRecord;
  name: string;
  description?: string;
  filters: SavedViewFiltersRecord;
  sort?: SavedViewSortRecord;
  createdAt: Date;
  updatedAt: Date;
}

export type SavedViewDocument = HydratedDocument<SavedViewRecord>;

const savedViewFiltersSchema = new Schema<SavedViewFiltersRecord>(
  {
    statuses: {
      type: [String],
      enum: ["tracked", "reviewing", "ready", "acquired", "closed", "discarded"],
    },
    decisions: {
      type: [String],
      enum: ["undecided", "keep_reviewing", "move_forward", "rejected"],
    },
    sourceTypes: {
      type: [String],
      enum: ["score", "watchlist", "portfolio"],
    },
    queue: {
      type: String,
      enum: ["needs_attention", "recently_changed", "needs_decision", "recent_decisions"],
    },
    hasFlags: {
      type: Boolean,
    },
    hasNote: {
      type: Boolean,
    },
    maxRiskScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    minConfidenceScore: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const savedViewSortSchema = new Schema<SavedViewSortRecord>(
  {
    key: {
      type: String,
      enum: [
        "tracked_at",
        "status_updated_at",
        "added_at",
        "decision_updated_at",
        "investment_score",
        "risk_score",
        "confidence_score",
      ],
      required: true,
    },
    direction: {
      type: String,
      enum: ["asc", "desc"],
      required: true,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const savedViewSchema = new Schema<SavedViewRecord>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    surface: {
      type: String,
      enum: ["portfolio", "comparison"],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 240,
    },
    filters: {
      type: savedViewFiltersSchema,
      required: true,
      default: {},
    },
    sort: {
      type: savedViewSortSchema,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

savedViewSchema.index({ userId: 1, surface: 1, updatedAt: -1 });
savedViewSchema.index({ userId: 1, name: 1 });

export const SavedViewModel: Model<SavedViewRecord> =
  mongoose.models.SavedView ?? mongoose.model<SavedViewRecord>("SavedView", savedViewSchema);
