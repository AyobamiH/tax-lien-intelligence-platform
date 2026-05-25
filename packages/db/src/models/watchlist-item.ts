import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type {
  NormalizedScoredRecordFieldsRecord,
  ScoredRecordScoreRecord,
} from "./scored-record.js";

export interface WatchlistItemRecord {
  userId: string;
  datasetId: string;
  scoredRecordId: string;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFieldsRecord;
  score: ScoredRecordScoreRecord;
  scoredAt: Date;
  addedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type WatchlistItemDocument = HydratedDocument<WatchlistItemRecord>;

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

const watchlistItemSchema = new Schema<WatchlistItemRecord>(
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

watchlistItemSchema.index({ userId: 1, scoredRecordId: 1 }, { unique: true });
watchlistItemSchema.index({ userId: 1, addedAt: -1 });
watchlistItemSchema.index({ userId: 1, datasetId: 1 });

export const WatchlistItemModel: Model<WatchlistItemRecord> =
  mongoose.models.WatchlistItem ?? mongoose.model<WatchlistItemRecord>("WatchlistItem", watchlistItemSchema);
