import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type PropertyTypeCategoryRecord = "residential" | "multifamily" | "commercial" | "land" | "unknown";
export type EnrichmentAdapterIdRecord = "source_field_inference";
export type EnrichmentConfidenceRecord = "low" | "medium" | "high";
export type EnrichedFieldNameRecord =
  | "parcelId"
  | "lienAmount"
  | "estimatedValue"
  | "propertyType"
  | "address"
  | "dataQuality";

export interface NormalizedScoredRecordFieldsRecord {
  parcelId?: string;
  lienAmount?: number;
  estimatedValue?: number;
  propertyType?: string;
  propertyTypeCategory: PropertyTypeCategoryRecord;
  address?: string;
}

export interface ScoredRecordScoreRecord {
  investmentScore: number;
  riskScore: number;
  liquidityScore: number;
  redemptionProbability: number;
  confidenceScore: number;
  valueCoverageRatio?: number;
  flags: string[];
  reasoning: string[];
}

export interface EnrichedScoredRecordFieldsRecord {
  parcelId?: string;
  lienAmount?: number;
  estimatedValue?: number;
  propertyType?: string;
  propertyTypeCategory?: PropertyTypeCategoryRecord;
  address?: string;
}

export interface EnrichmentSignalRecord {
  adapterId: EnrichmentAdapterIdRecord;
  field: EnrichedFieldNameRecord;
  confidence: EnrichmentConfidenceRecord;
  message: string;
}

export interface EnrichmentResultRecord {
  adapters: EnrichmentAdapterIdRecord[];
  dataQualityScore: number;
  inferredFields: EnrichedScoredRecordFieldsRecord;
  signals: EnrichmentSignalRecord[];
  flags: string[];
  reasoning: string[];
}

export interface ScoredRecordRecord {
  userId: string;
  datasetId: string;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFieldsRecord;
  enrichment?: EnrichmentResultRecord;
  score: ScoredRecordScoreRecord;
  scoredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ScoredRecordDocument = HydratedDocument<ScoredRecordRecord>;

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

const scoredRecordScoreSchema = new Schema<ScoredRecordScoreRecord>(
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

const enrichedFieldsSchema = new Schema<EnrichedScoredRecordFieldsRecord>(
  {
    parcelId: { type: String, trim: true, maxlength: 120 },
    lienAmount: { type: Number, min: 0 },
    estimatedValue: { type: Number, min: 0 },
    propertyType: { type: String, trim: true, maxlength: 120 },
    propertyTypeCategory: {
      type: String,
      enum: ["residential", "multifamily", "commercial", "land", "unknown"],
    },
    address: { type: String, trim: true, maxlength: 255 },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const enrichmentSignalSchema = new Schema<EnrichmentSignalRecord>(
  {
    adapterId: {
      type: String,
      enum: ["source_field_inference"],
      required: true,
    },
    field: {
      type: String,
      enum: ["parcelId", "lienAmount", "estimatedValue", "propertyType", "address", "dataQuality"],
      required: true,
    },
    confidence: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
    },
    message: { type: String, required: true, trim: true, maxlength: 255 },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const enrichmentResultSchema = new Schema<EnrichmentResultRecord>(
  {
    adapters: {
      type: [String],
      required: true,
      default: [],
      enum: ["source_field_inference"],
    },
    dataQualityScore: { type: Number, required: true, min: 0, max: 100 },
    inferredFields: {
      type: enrichedFieldsSchema,
      required: true,
      default: {},
    },
    signals: {
      type: [enrichmentSignalSchema],
      required: true,
      default: [],
    },
    flags: { type: [String], required: true, default: [] },
    reasoning: { type: [String], required: true, default: [] },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const scoredRecordSchema = new Schema<ScoredRecordRecord>(
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
    sourceRowNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    normalizedFields: {
      type: normalizedFieldsSchema,
      required: true,
    },
    enrichment: {
      type: enrichmentResultSchema,
    },
    score: {
      type: scoredRecordScoreSchema,
      required: true,
    },
    scoredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

scoredRecordSchema.index({ userId: 1, datasetId: 1, sourceRowNumber: 1 }, { unique: true });
scoredRecordSchema.index({ userId: 1, datasetId: 1, "score.investmentScore": -1 });

export const ScoredRecordModel: Model<ScoredRecordRecord> =
  mongoose.models.ScoredRecord ?? mongoose.model<ScoredRecordRecord>("ScoredRecord", scoredRecordSchema);
