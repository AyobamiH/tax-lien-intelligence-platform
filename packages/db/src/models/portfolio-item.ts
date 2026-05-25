import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type {
  NormalizedScoredRecordFieldsRecord,
  ScoredRecordScoreRecord,
} from "./scored-record.js";

export type PortfolioStatusRecord = "tracked" | "reviewing" | "ready" | "acquired" | "closed" | "discarded";

export interface PortfolioItemRecord {
  userId: string;
  datasetId: string;
  scoredRecordId: string;
  sourceWatchlistItemId?: string;
  status: PortfolioStatusRecord;
  statusUpdatedAt: Date;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFieldsRecord;
  score: ScoredRecordScoreRecord;
  scoredAt: Date;
  trackedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type PortfolioItemDocument = HydratedDocument<PortfolioItemRecord>;

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

const portfolioItemSchema = new Schema<PortfolioItemRecord>(
  {
    userId: {
      type: String,
      required: true,
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
    sourceWatchlistItemId: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ["tracked", "reviewing", "ready", "acquired", "closed", "discarded"],
      required: true,
      default: "tracked",
      index: true,
    },
    statusUpdatedAt: {
      type: Date,
      required: true,
      default: Date.now,
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
    trackedAt: {
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

portfolioItemSchema.index({ userId: 1, scoredRecordId: 1 }, { unique: true });
portfolioItemSchema.index({ userId: 1, status: 1, trackedAt: -1 });
portfolioItemSchema.index({ userId: 1, trackedAt: -1 });

export const PortfolioItemModel: Model<PortfolioItemRecord> =
  mongoose.models.PortfolioItem ?? mongoose.model<PortfolioItemRecord>("PortfolioItem", portfolioItemSchema);
