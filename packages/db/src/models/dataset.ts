import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export type DatasetStatus = "validated";
export type DatasetSourceType = "manual_csv";

export interface DatasetValidationSummaryRecord {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: string[];
  errorMessages: string[];
}

export interface DatasetSourceRowRecord {
  rowNumber: number;
  fields: Record<string, string>;
}

export interface DatasetRecord {
  userId: string;
  originalFilename: string;
  sourceType: DatasetSourceType;
  sourceLabel?: string;
  status: DatasetStatus;
  rowCount: number;
  columnCount: number;
  headers: string[];
  sourceRows: DatasetSourceRowRecord[];
  validationSummary: DatasetValidationSummaryRecord;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type DatasetDocument = HydratedDocument<DatasetRecord>;

const datasetValidationSummarySchema = new Schema<DatasetValidationSummaryRecord>(
  {
    totalRows: { type: Number, required: true, min: 0 },
    validRows: { type: Number, required: true, min: 0 },
    invalidRows: { type: Number, required: true, min: 0 },
    warnings: { type: [String], required: true, default: [] },
    errorMessages: { type: [String], required: true, default: [] },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const datasetSourceRowSchema = new Schema<DatasetSourceRowRecord>(
  {
    rowNumber: { type: Number, required: true, min: 1 },
    fields: {
      type: Map,
      of: String,
      required: true,
      default: {},
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const datasetSchema = new Schema<DatasetRecord>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    sourceType: {
      type: String,
      enum: ["manual_csv"],
      required: true,
    },
    sourceLabel: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    status: {
      type: String,
      enum: ["validated"],
      required: true,
      index: true,
    },
    rowCount: {
      type: Number,
      required: true,
      min: 0,
    },
    columnCount: {
      type: Number,
      required: true,
      min: 0,
    },
    headers: {
      type: [String],
      required: true,
      default: [],
    },
    sourceRows: {
      type: [datasetSourceRowSchema],
      required: true,
      default: [],
    },
    validationSummary: {
      type: datasetValidationSummarySchema,
      required: true,
    },
    uploadedAt: {
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

datasetSchema.index({ userId: 1, createdAt: -1 });

export const DatasetModel: Model<DatasetRecord> =
  mongoose.models.Dataset ?? mongoose.model<DatasetRecord>("Dataset", datasetSchema);
