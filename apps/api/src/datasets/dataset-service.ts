import mongoose from "mongoose";
import type {
  DatasetDetailResponse,
  DatasetListResponse,
  DatasetManualMappingContextResponse,
  DatasetManualMappingTarget,
  DatasetResponse,
  SaveDatasetManualMappingResponse,
} from "@tax-lien/types";
import { ApiError } from "../errors/api-error.js";
import { parseCsvUpload, type CsvUploadFile } from "./csv-parser.js";
import { applyCountyImportAdapters, genericImportSummary } from "./import-adapters.js";
import {
  applyManualMappingsToRows,
  buildManualMappingSummary,
  emptyManualMappingSummary,
  isManualMappingTarget,
  type ManualMappingValues,
} from "./manual-mapping.js";
import { calculateDatasetReadiness } from "./readiness.js";
import type { DatasetStore, StoredDataset } from "./dataset-store.js";

export interface CreateDatasetRequest {
  userId: string;
  file: CsvUploadFile;
  sourceLabel?: string;
}

export interface SaveDatasetManualMappingRequest {
  userId: string;
  datasetId: string;
  mappings: Record<string, string | null | undefined>;
}

export class DatasetService {
  private readonly store: DatasetStore;

  public constructor(store: DatasetStore) {
    this.store = store;
  }

  public async createDataset(request: CreateDatasetRequest): Promise<DatasetDetailResponse> {
    const parsedCsv = parseCsvUpload(request.file);
    const importResult = applyCountyImportAdapters(parsedCsv);
    const validationSummary = {
      totalRows: parsedCsv.totalRows,
      validRows: parsedCsv.validRows,
      invalidRows: parsedCsv.invalidRows,
      warnings: parsedCsv.warnings,
      errors: [],
    };
    const readinessSummary = calculateDatasetReadiness({
      sourceRows: importResult.sourceRows,
      importSummary: importResult.importSummary,
      validationSummary,
    });
    const sourceLabel = normalizeSourceLabel(request.sourceLabel);
    const dataset = await this.store.createDataset({
      userId: request.userId,
      originalFilename: parsedCsv.originalFilename,
      sourceType: "manual_csv",
      ...(sourceLabel ? { sourceLabel } : {}),
      status: "validated",
      rowCount: parsedCsv.rowCount,
      columnCount: parsedCsv.columnCount,
      headers: parsedCsv.headers,
      sourceRows: importResult.sourceRows,
      validationSummary,
      importSummary: importResult.importSummary,
      readinessSummary,
      uploadedAt: new Date(),
    });

    return { dataset: toDatasetResponse(dataset) };
  }

  public async listDatasets(userId: string): Promise<DatasetListResponse> {
    const datasets = await this.store.listDatasets(userId);
    return { datasets: datasets.map(toDatasetResponse) };
  }

  public async getDatasetForUser(datasetId: string, userId: string): Promise<DatasetDetailResponse> {
    if (!mongoose.Types.ObjectId.isValid(datasetId)) {
      throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
    }

    const dataset = await this.store.findDatasetByIdForUser(datasetId, userId);
    if (!dataset) {
      throw new ApiError(404, "dataset_not_found", "Dataset was not found.");
    }

    return { dataset: toDatasetResponse(dataset) };
  }

  public async getManualMappingContext(
    datasetId: string,
    userId: string,
  ): Promise<DatasetManualMappingContextResponse> {
    const dataset = await this.findOwnedDataset(datasetId, userId);
    return toManualMappingContextResponse(dataset);
  }

  public async saveManualMapping(request: SaveDatasetManualMappingRequest): Promise<SaveDatasetManualMappingResponse> {
    const dataset = await this.findOwnedDataset(request.datasetId, request.userId);
    const mappingValues = validateManualMappings(request.mappings, dataset.headers);
    const manualMapping = buildManualMappingSummary(mappingValues, new Date());
    const importSummary = dataset.importSummary ?? genericImportSummary();
    const effectiveSourceRows = applyManualMappingsToRows(dataset.sourceRows, manualMapping);
    const readinessSummary = calculateDatasetReadiness({
      sourceRows: effectiveSourceRows,
      importSummary,
      validationSummary: dataset.validationSummary,
    });

    const updatedDataset = await this.store.updateManualMappingForUser({
      datasetId: dataset.id,
      userId: request.userId,
      manualMapping,
      readinessSummary,
    });

    if (!updatedDataset) {
      throw new ApiError(404, "dataset_not_found", "Dataset was not found.");
    }

    return toManualMappingContextResponse(updatedDataset);
  }

  private async findOwnedDataset(datasetId: string, userId: string): Promise<StoredDataset> {
    if (!mongoose.Types.ObjectId.isValid(datasetId)) {
      throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
    }

    const dataset = await this.store.findDatasetByIdForUser(datasetId, userId);
    if (!dataset) {
      throw new ApiError(404, "dataset_not_found", "Dataset was not found.");
    }

    return dataset;
  }
}

export function toDatasetResponse(dataset: StoredDataset): DatasetResponse {
  const importSummary = dataset.importSummary ?? genericImportSummary();
  const manualMapping = dataset.manualMapping ?? emptyManualMappingSummary();
  const readinessSummary = dataset.readinessSummary ?? calculateDatasetReadiness({
    sourceRows: applyManualMappingsToRows(dataset.sourceRows, manualMapping),
    importSummary,
    validationSummary: dataset.validationSummary,
  });

  return {
    id: dataset.id,
    originalFilename: dataset.originalFilename,
    sourceType: dataset.sourceType,
    ...(dataset.sourceLabel ? { sourceLabel: dataset.sourceLabel } : {}),
    status: dataset.status,
    rowCount: dataset.rowCount,
    columnCount: dataset.columnCount,
    headers: dataset.headers,
    validationSummary: dataset.validationSummary,
    importSummary,
    readinessSummary,
    manualMapping,
    uploadedAt: dataset.uploadedAt.toISOString(),
    createdAt: dataset.createdAt.toISOString(),
    updatedAt: dataset.updatedAt.toISOString(),
  };
}

function toManualMappingContextResponse(dataset: StoredDataset): DatasetManualMappingContextResponse {
  const datasetResponse = toDatasetResponse(dataset);
  return {
    dataset: datasetResponse,
    availableColumns: dataset.headers,
    manualMapping: datasetResponse.manualMapping,
  };
}

function validateManualMappings(
  mappings: Record<string, string | null | undefined>,
  availableColumns: string[],
): ManualMappingValues {
  const availableColumnSet = new Set(availableColumns);
  const usedSourceColumns = new Map<string, DatasetManualMappingTarget>();
  const validated: ManualMappingValues = {};

  for (const [targetField, rawSourceColumn] of Object.entries(mappings)) {
    if (!isManualMappingTarget(targetField)) {
      throw new ApiError(400, "manual_mapping_invalid_target", "Manual mapping target field is not supported.");
    }

    const sourceColumn = rawSourceColumn?.trim();
    if (!sourceColumn) {
      validated[targetField] = null;
      continue;
    }

    if (!availableColumnSet.has(sourceColumn)) {
      throw new ApiError(400, "manual_mapping_invalid_source_column", "Manual mapping source column was not found.");
    }

    const existingTarget = usedSourceColumns.get(sourceColumn);
    if (existingTarget && existingTarget !== targetField) {
      throw new ApiError(400, "manual_mapping_duplicate_source_column", "A source column can only map to one target field.");
    }

    usedSourceColumns.set(sourceColumn, targetField);
    validated[targetField] = sourceColumn;
  }

  return validated;
}

function normalizeSourceLabel(sourceLabel: string | undefined): string | undefined {
  const normalized = sourceLabel?.trim();
  if (!normalized) {
    return undefined;
  }

  if (normalized.length > 120) {
    throw new ApiError(400, "dataset_invalid_source_label", "Source label cannot exceed 120 characters.");
  }

  return normalized;
}
