import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type { DatasetImportAdapterIdRecord, DatasetManualMappingTargetRecord } from "./dataset.js";

export interface ImportProfileMappingRuleRecord {
  targetField: DatasetManualMappingTargetRecord;
  sourceColumn: string;
}

export interface ImportProfileApplicabilityRecord {
  headerSignature: string[];
  sourceColumns: string[];
  adapterId: DatasetImportAdapterIdRecord;
  columnCount: number;
}

export interface ImportProfileRecord {
  userId: string;
  name: string;
  sourceLabel?: string;
  adapterId: DatasetImportAdapterIdRecord;
  adapterName: string;
  mappings: ImportProfileMappingRuleRecord[];
  applicability: ImportProfileApplicabilityRecord;
  createdFromDatasetId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ImportProfileDocument = HydratedDocument<ImportProfileRecord>;

const importProfileMappingRuleSchema = new Schema<ImportProfileMappingRuleRecord>(
  {
    targetField: {
      type: String,
      enum: ["parcel_id", "lien_amount", "estimated_value", "property_type", "address"],
      required: true,
    },
    sourceColumn: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const importProfileApplicabilitySchema = new Schema<ImportProfileApplicabilityRecord>(
  {
    headerSignature: {
      type: [String],
      required: true,
      default: [],
    },
    sourceColumns: {
      type: [String],
      required: true,
      default: [],
    },
    adapterId: {
      type: String,
      enum: ["generic_csv", "maricopa_tax_lien_v1"],
      required: true,
    },
    columnCount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const importProfileSchema = new Schema<ImportProfileRecord>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    sourceLabel: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    adapterId: {
      type: String,
      enum: ["generic_csv", "maricopa_tax_lien_v1"],
      required: true,
    },
    adapterName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    mappings: {
      type: [importProfileMappingRuleSchema],
      required: true,
      default: [],
    },
    applicability: {
      type: importProfileApplicabilitySchema,
      required: true,
    },
    createdFromDatasetId: {
      type: String,
      trim: true,
      maxlength: 64,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

importProfileSchema.index({ userId: 1, updatedAt: -1 });

export const ImportProfileModel: Model<ImportProfileRecord> =
  mongoose.models.ImportProfile ?? mongoose.model<ImportProfileRecord>("ImportProfile", importProfileSchema);
