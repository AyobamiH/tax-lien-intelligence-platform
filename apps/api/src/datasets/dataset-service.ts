import mongoose from "mongoose";
import type { DatasetDetailResponse, DatasetListResponse, DatasetResponse } from "@tax-lien/types";
import { ApiError } from "../errors/api-error.js";
import { parseCsvUpload, type CsvUploadFile } from "./csv-parser.js";
import type { DatasetStore, StoredDataset } from "./dataset-store.js";

export interface CreateDatasetRequest {
  userId: string;
  file: CsvUploadFile;
  sourceLabel?: string;
}

export class DatasetService {
  private readonly store: DatasetStore;

  public constructor(store: DatasetStore) {
    this.store = store;
  }

  public async createDataset(request: CreateDatasetRequest): Promise<DatasetDetailResponse> {
    const parsedCsv = parseCsvUpload(request.file);
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
      sourceRows: parsedCsv.sourceRows,
      validationSummary: {
        totalRows: parsedCsv.totalRows,
        validRows: parsedCsv.validRows,
        invalidRows: parsedCsv.invalidRows,
        warnings: parsedCsv.warnings,
        errors: [],
      },
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
}

export function toDatasetResponse(dataset: StoredDataset): DatasetResponse {
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
    uploadedAt: dataset.uploadedAt.toISOString(),
    createdAt: dataset.createdAt.toISOString(),
    updatedAt: dataset.updatedAt.toISOString(),
  };
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
