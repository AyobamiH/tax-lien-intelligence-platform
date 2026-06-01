import type { DatasetDocument } from "@tax-lien/db";
import { DatasetModel } from "@tax-lien/db";
import type {
  DatasetImportConfidence,
  DatasetImportProfileApplicationSummary,
  DatasetImportSummary,
  DatasetManualMappingSummary,
  DatasetManualMappingSource,
  DatasetManualMappingTarget,
  DatasetReadinessSummary,
  DatasetValidationSummary,
} from "@tax-lien/types";

export interface StoredDataset {
  id: string;
  userId: string;
  originalFilename: string;
  sourceType: "manual_csv";
  sourceLabel?: string;
  status: "validated";
  rowCount: number;
  columnCount: number;
  headers: string[];
  sourceRows: StoredDatasetSourceRow[];
  validationSummary: DatasetValidationSummary;
  importSummary?: DatasetImportSummary;
  readinessSummary?: DatasetReadinessSummary;
  manualMapping?: DatasetManualMappingSummary;
  importProfile?: DatasetImportProfileApplicationSummary;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredDatasetSourceRow {
  rowNumber: number;
  fields: Record<string, string>;
}

export interface CreateDatasetInput {
  userId: string;
  originalFilename: string;
  sourceType: "manual_csv";
  sourceLabel?: string;
  status: "validated";
  rowCount: number;
  columnCount: number;
  headers: string[];
  sourceRows: StoredDatasetSourceRow[];
  validationSummary: DatasetValidationSummary;
  importSummary?: DatasetImportSummary;
  readinessSummary?: DatasetReadinessSummary;
  manualMapping?: DatasetManualMappingSummary;
  importProfile?: DatasetImportProfileApplicationSummary;
  uploadedAt: Date;
}

export interface DatasetStore {
  createDataset(input: CreateDatasetInput): Promise<StoredDataset>;
  listDatasets(userId: string): Promise<StoredDataset[]>;
  findDatasetByIdForUser(datasetId: string, userId: string): Promise<StoredDataset | null>;
  updateManualMappingForUser(input: {
    datasetId: string;
    userId: string;
    manualMapping: DatasetManualMappingSummary;
    readinessSummary: DatasetReadinessSummary;
    importProfile?: DatasetImportProfileApplicationSummary;
  }): Promise<StoredDataset | null>;
}

function mapDataset(document: DatasetDocument): StoredDataset {
  const dataset: StoredDataset = {
    id: document.id,
    userId: document.userId,
    originalFilename: document.originalFilename,
    sourceType: document.sourceType,
    status: document.status,
    rowCount: document.rowCount,
    columnCount: document.columnCount,
    headers: document.headers,
    sourceRows: document.sourceRows.map((sourceRow) => ({
      rowNumber: sourceRow.rowNumber,
      fields: normalizeStoredFields(sourceRow.fields),
    })),
    validationSummary: {
      totalRows: document.validationSummary.totalRows,
      validRows: document.validationSummary.validRows,
      invalidRows: document.validationSummary.invalidRows,
      warnings: document.validationSummary.warnings,
      errors: document.validationSummary.errorMessages,
    },
    ...(document.importSummary
      ? {
          importSummary: {
            adapterMatched: document.importSummary.adapterMatched,
            adapterId: document.importSummary.adapterId,
            adapterName: document.importSummary.adapterName,
            source: document.importSummary.source,
            confidence: document.importSummary.confidence,
            fallbackUsed: document.importSummary.fallbackUsed,
            mappedFields: document.importSummary.mappedFields,
            warnings: document.importSummary.warnings,
          },
        }
      : {}),
    ...(document.readinessSummary
      ? {
          readinessSummary: {
            status: document.readinessSummary.status,
            score: document.readinessSummary.score,
            scoringRecommended: document.readinessSummary.scoringRecommended,
            fieldCoverage: document.readinessSummary.fieldCoverage.map((coverage) => ({
              field: coverage.field,
              label: coverage.label,
              presentRows: coverage.presentRows,
              totalRows: coverage.totalRows,
              coveragePercent: coverage.coveragePercent,
              importance: coverage.importance,
            })),
            issues: document.readinessSummary.issues.map((issue) => ({
              code: issue.code,
              severity: issue.severity,
              message: issue.message,
              ...(issue.field ? { field: issue.field } : {}),
            })),
            guidance: document.readinessSummary.guidance,
          },
        }
      : {}),
    ...(document.manualMapping
      ? {
          manualMapping: {
            mappings: document.manualMapping.mappings.map((mapping) => ({
              targetField: mapping.targetField,
              sourceColumn: mapping.sourceColumn,
              source: mapping.source,
              updatedAt: mapping.updatedAt.toISOString(),
            })),
            ...(document.manualMapping.updatedAt
              ? { updatedAt: document.manualMapping.updatedAt.toISOString() }
              : {}),
          },
        }
      : {}),
    ...(document.importProfile
      ? {
          importProfile: {
            status: document.importProfile.status,
            matchedMappings: document.importProfile.matchedMappings,
            totalMappings: document.importProfile.totalMappings,
            message: document.importProfile.message,
            ...(document.importProfile.profileId ? { profileId: document.importProfile.profileId } : {}),
            ...(document.importProfile.profileName ? { profileName: document.importProfile.profileName } : {}),
            ...(document.importProfile.confidence ? { confidence: document.importProfile.confidence } : {}),
            ...(document.importProfile.appliedAt
              ? { appliedAt: document.importProfile.appliedAt.toISOString() }
              : {}),
          },
        }
      : {}),
    uploadedAt: document.uploadedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };

  if (document.sourceLabel) {
    dataset.sourceLabel = document.sourceLabel;
  }

  return dataset;
}

export class MongoDatasetStore implements DatasetStore {
  public async createDataset(input: CreateDatasetInput): Promise<StoredDataset> {
    const { importProfile, importSummary, manualMapping, readinessSummary, validationSummary, ...datasetInput } = input;
    const document = await DatasetModel.create({
      ...datasetInput,
      validationSummary: {
        totalRows: validationSummary.totalRows,
        validRows: validationSummary.validRows,
        invalidRows: validationSummary.invalidRows,
        warnings: validationSummary.warnings,
        errorMessages: validationSummary.errors,
      },
      ...(importSummary ? { importSummary } : {}),
      ...(readinessSummary ? { readinessSummary } : {}),
      ...(manualMapping ? { manualMapping: toManualMappingRecord(manualMapping) } : {}),
      ...(importProfile ? { importProfile: toImportProfileApplicationRecord(importProfile) } : {}),
    });
    return mapDataset(document);
  }

  public async listDatasets(userId: string): Promise<StoredDataset[]> {
    const documents = await DatasetModel.find({ userId }).sort({ createdAt: -1 }).exec();
    return documents.map(mapDataset);
  }

  public async findDatasetByIdForUser(datasetId: string, userId: string): Promise<StoredDataset | null> {
    const document = await DatasetModel.findOne({ _id: datasetId, userId }).exec();
    return document ? mapDataset(document) : null;
  }

  public async updateManualMappingForUser(input: {
    datasetId: string;
    userId: string;
    manualMapping: DatasetManualMappingSummary;
    readinessSummary: DatasetReadinessSummary;
    importProfile?: DatasetImportProfileApplicationSummary;
  }): Promise<StoredDataset | null> {
    const document = await DatasetModel.findOneAndUpdate(
      { _id: input.datasetId, userId: input.userId },
      {
        $set: {
          manualMapping: toManualMappingRecord(input.manualMapping),
          readinessSummary: input.readinessSummary,
          ...(input.importProfile ? { importProfile: toImportProfileApplicationRecord(input.importProfile) } : {}),
        },
      },
      { new: true, runValidators: true },
    ).exec();

    return document ? mapDataset(document) : null;
  }
}

function normalizeStoredFields(fields: Record<string, string> | Map<string, string>): Record<string, string> {
  if (fields instanceof Map) {
    return Object.fromEntries(fields.entries());
  }

  return fields;
}

function toManualMappingRecord(manualMapping: DatasetManualMappingSummary): {
  mappings: {
    targetField: DatasetManualMappingTarget;
    sourceColumn: string;
    source: DatasetManualMappingSource;
    updatedAt: Date;
  }[];
  updatedAt?: Date;
} {
  return {
    mappings: manualMapping.mappings.map((mapping) => ({
      targetField: mapping.targetField,
      sourceColumn: mapping.sourceColumn,
      source: mapping.source,
      updatedAt: new Date(mapping.updatedAt),
    })),
    ...(manualMapping.updatedAt ? { updatedAt: new Date(manualMapping.updatedAt) } : {}),
  };
}

function toImportProfileApplicationRecord(importProfile: DatasetImportProfileApplicationSummary): {
  status: DatasetImportProfileApplicationSummary["status"];
  matchedMappings: number;
  totalMappings: number;
  message: string;
  profileId?: string;
  profileName?: string;
  confidence?: DatasetImportConfidence;
  appliedAt?: Date;
} {
  return {
    status: importProfile.status,
    matchedMappings: importProfile.matchedMappings,
    totalMappings: importProfile.totalMappings,
    message: importProfile.message,
    ...(importProfile.profileId ? { profileId: importProfile.profileId } : {}),
    ...(importProfile.profileName ? { profileName: importProfile.profileName } : {}),
    ...(importProfile.confidence ? { confidence: importProfile.confidence } : {}),
    ...(importProfile.appliedAt ? { appliedAt: new Date(importProfile.appliedAt) } : {}),
  };
}
