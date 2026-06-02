import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type {
  NormalizedScoredRecordFieldsRecord,
  ScoredRecordScoreRecord,
} from "./scored-record.js";

export type ComparisonSourceTypeRecord = "score" | "watchlist" | "portfolio";

export type ComparisonDecisionRecord = "undecided" | "keep_reviewing" | "move_forward" | "rejected";

export interface ComparisonItemRecord {
  userId: string;
  workspaceId: "default";
  datasetId: string;
  scoredRecordId: string;
  sourceType: ComparisonSourceTypeRecord;
  sourceWatchlistItemId?: string;
  sourcePortfolioItemId?: string;
  decision: ComparisonDecisionRecord;
  decisionUpdatedAt: Date;
  note?: string;
  noteUpdatedAt?: Date;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFieldsRecord;
  score: ScoredRecordScoreRecord;
  scoredAt: Date;
  addedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ComparisonItemDocument = HydratedDocument<ComparisonItemRecord>;

const normalizedFieldsSchema = new Schema<NormalizedScoredRecordFieldsRecord>(
  {
    parcelId: { type: String, trim: true, maxlength: 120 },
    lienAmount: { type: Number, min: 0 },
    estimatedValue: { type: Number, min: 0 },
    propertyType: { type: String, trim: true, maxlength: 120 },
    propertyTypeCategory: {
      type: String,
      enum: ["residential", "multifamily", "commercial", "land", "unknown"],
      required: true,
    },
    address: { type: String, trim: true, maxlength: 255 },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const scoreSchema = new Schema<ScoredRecordScoreRecord>(
  {
    investmentScore: { type: Number, required: true, min: 0, max: 100 },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    liquidityScore: { type: Number, required: true, min: 0, max: 100 },
    redemptionProbability: { type: Number, required: true, min: 0, max: 1 },
    confidenceScore: { type: Number, required: true, min: 0, max: 100 },
    valueCoverageRatio: { type: Number, min: 0 },
    flags: { type: [String], required: true, default: [] },
    reasoning: { type: [String], required: true, default: [] },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const comparisonItemSchema = new Schema<ComparisonItemRecord>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    workspaceId: {
      type: String,
      enum: ["default"],
      required: true,
      default: "default",
      index: true,
    },
    datasetId: {
      type: String,
      required: true,
      index: true,
    },
    scoredRecordId: {
      type: String,
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ["score", "watchlist", "portfolio"],
      required: true,
      index: true,
    },
    sourceWatchlistItemId: {
      type: String,
      index: true,
    },
    sourcePortfolioItemId: {
      type: String,
      index: true,
    },
    decision: {
      type: String,
      enum: ["undecided", "keep_reviewing", "move_forward", "rejected"],
      required: true,
      default: "undecided",
      index: true,
    },
    decisionUpdatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    noteUpdatedAt: {
      type: Date,
    },
    sourceRowNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    normalizedFields: {
      type: normalizedFieldsSchema,
      required: true,
    },
    score: {
      type: scoreSchema,
      required: true,
    },
    scoredAt: {
      type: Date,
      required: true,
    },
    addedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

comparisonItemSchema.index({ userId: 1, workspaceId: 1, scoredRecordId: 1 }, { unique: true });
comparisonItemSchema.index({ userId: 1, workspaceId: 1, decision: 1, addedAt: -1 });
comparisonItemSchema.index({ userId: 1, workspaceId: 1, datasetId: 1 });

export const ComparisonItemModel: Model<ComparisonItemRecord> =
  mongoose.models.ComparisonItem ?? mongoose.model<ComparisonItemRecord>("ComparisonItem", comparisonItemSchema);
