import type { DatasetDocument } from "@tax-lien/db";
import { DatasetModel } from "@tax-lien/db";
import type { DatasetImportSummary, DatasetValidationSummary } from "@tax-lien/types";

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
  uploadedAt: Date;
}

export interface DatasetStore {
  createDataset(input: CreateDatasetInput): Promise<StoredDataset>;
  listDatasets(userId: string): Promise<StoredDataset[]>;
  findDatasetByIdForUser(datasetId: string, userId: string): Promise<StoredDataset | null>;
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
    const document = await DatasetModel.create({
      ...input,
      validationSummary: {
        totalRows: input.validationSummary.totalRows,
        validRows: input.validationSummary.validRows,
        invalidRows: input.validationSummary.invalidRows,
        warnings: input.validationSummary.warnings,
        errorMessages: input.validationSummary.errors,
      },
      ...(input.importSummary ? { importSummary: input.importSummary } : {}),
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
}

function normalizeStoredFields(fields: Record<string, string> | Map<string, string>): Record<string, string> {
  if (fields instanceof Map) {
    return Object.fromEntries(fields.entries());
  }

  return fields;
}
