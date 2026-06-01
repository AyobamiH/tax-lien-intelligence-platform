import mongoose from "mongoose";
import type {
  ApplyImportProfileToDatasetResponse,
  DatasetDetailResponse,
  DatasetImportProfileApplicationSummary,
  DatasetListResponse,
  DatasetManualMappingContextResponse,
  DatasetManualMappingTarget,
  DatasetResponse,
  ImportProfileListResponse,
  ImportProfileMappingRule,
  ImportProfileResponse,
  SaveImportProfileFromDatasetResponse,
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
import type { ImportProfileStore, StoredImportProfile } from "./import-profile-store.js";
import { NoopImportProfileStore } from "./import-profile-store.js";
import {
  buildImportProfileApplicability,
  emptyImportProfileApplication,
  findBestImportProfileMatch,
  importProfileApplicationFromMatch,
  manualMappingFromProfileMatch,
  evaluateImportProfileMatch,
} from "./import-profiles.js";

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

export interface SaveImportProfileFromDatasetRequest {
  userId: string;
  datasetId: string;
  name?: string;
}

export interface ApplyImportProfileToDatasetRequest {
  userId: string;
  datasetId: string;
  profileId: string;
}

export class DatasetService {
  private readonly store: DatasetStore;
  private readonly importProfileStore: ImportProfileStore;

  public constructor(store: DatasetStore, importProfileStore: ImportProfileStore = new NoopImportProfileStore()) {
    this.store = store;
    this.importProfileStore = importProfileStore;
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
    const profileMatch = findBestImportProfileMatch(
      await this.importProfileStore.listProfiles(request.userId),
      parsedCsv.headers,
    );
    const profileTimestamp = new Date();
    const manualMapping = profileMatch?.canAutoApply
      ? manualMappingFromProfileMatch(profileMatch, profileTimestamp)
      : emptyManualMappingSummary();
    const importProfile = profileMatch
      ? importProfileApplicationFromMatch(
          profileMatch,
          profileMatch.canAutoApply ? "auto_applied" : "suggested",
          profileTimestamp,
        )
      : emptyImportProfileApplication();
    const effectiveSourceRows = profileMatch?.canAutoApply
      ? applyManualMappingsToRows(importResult.sourceRows, manualMapping)
      : importResult.sourceRows;
    const readinessSummary = calculateDatasetReadiness({
      sourceRows: effectiveSourceRows,
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
      manualMapping,
      importProfile,
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
      importProfile: emptyImportProfileApplication(),
    });

    if (!updatedDataset) {
      throw new ApiError(404, "dataset_not_found", "Dataset was not found.");
    }

    return toManualMappingContextResponse(updatedDataset);
  }

  public async listImportProfiles(userId: string): Promise<ImportProfileListResponse> {
    const profiles = await this.importProfileStore.listProfiles(userId);
    return { profiles: profiles.map(toImportProfileResponse) };
  }

  public async saveImportProfileFromDataset(
    request: SaveImportProfileFromDatasetRequest,
  ): Promise<SaveImportProfileFromDatasetResponse> {
    const dataset = await this.findOwnedDataset(request.datasetId, request.userId);
    const mappings = validateProfileMappings(dataset);
    const importSummary = dataset.importSummary ?? genericImportSummary();
    const name = normalizeImportProfileName(
      request.name,
      dataset.sourceLabel ?? dataset.originalFilename.replace(/\.csv$/i, ""),
    );
    const profile = await this.importProfileStore.createProfile({
      userId: request.userId,
      name,
      ...(dataset.sourceLabel ? { sourceLabel: dataset.sourceLabel } : {}),
      adapterId: importSummary.adapterId,
      adapterName: importSummary.adapterName,
      mappings,
      applicability: buildImportProfileApplicability({
        headers: dataset.headers,
        adapterId: importSummary.adapterId,
        mappings,
      }),
      createdFromDatasetId: dataset.id,
    });

    return { profile: toImportProfileResponse(profile) };
  }

  public async applyImportProfileToDataset(
    request: ApplyImportProfileToDatasetRequest,
  ): Promise<ApplyImportProfileToDatasetResponse> {
    const dataset = await this.findOwnedDataset(request.datasetId, request.userId);

    if (!mongoose.Types.ObjectId.isValid(request.profileId)) {
      throw new ApiError(400, "import_profile_invalid_id", "Import profile id is invalid.");
    }

    const profile = await this.importProfileStore.findProfileByIdForUser(request.profileId, request.userId);
    if (!profile) {
      throw new ApiError(404, "import_profile_not_found", "Import profile was not found.");
    }

    const match = evaluateImportProfileMatch(profile, dataset.headers);
    if (!match) {
      throw new ApiError(400, "import_profile_not_applicable", "Import profile does not match this dataset's columns.");
    }

    const timestamp = new Date();
    const manualMapping = manualMappingFromProfileMatch(match, timestamp);
    const importProfile = importProfileApplicationFromMatch(match, "user_applied", timestamp);
    const importSummary = dataset.importSummary ?? genericImportSummary();
    const readinessSummary = calculateDatasetReadiness({
      sourceRows: applyManualMappingsToRows(dataset.sourceRows, manualMapping),
      importSummary,
      validationSummary: dataset.validationSummary,
    });

    const updatedDataset = await this.store.updateManualMappingForUser({
      datasetId: dataset.id,
      userId: request.userId,
      manualMapping,
      readinessSummary,
      importProfile,
    });

    if (!updatedDataset) {
      throw new ApiError(404, "dataset_not_found", "Dataset was not found.");
    }

    return {
      dataset: toDatasetResponse(updatedDataset),
      appliedProfile: toImportProfileResponse(profile),
    };
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
  const importProfile = dataset.importProfile ?? emptyImportProfileApplication();
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
    importProfile,
    uploadedAt: dataset.uploadedAt.toISOString(),
    createdAt: dataset.createdAt.toISOString(),
    updatedAt: dataset.updatedAt.toISOString(),
  };
}

function toImportProfileResponse(profile: StoredImportProfile): ImportProfileResponse {
  return {
    id: profile.id,
    name: profile.name,
    ...(profile.sourceLabel ? { sourceLabel: profile.sourceLabel } : {}),
    adapterId: profile.adapterId,
    adapterName: profile.adapterName,
    mappings: profile.mappings,
    applicability: profile.applicability,
    ...(profile.createdFromDatasetId ? { createdFromDatasetId: profile.createdFromDatasetId } : {}),
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
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

function validateProfileMappings(dataset: StoredDataset): ImportProfileMappingRule[] {
  const manualMapping = dataset.manualMapping ?? emptyManualMappingSummary();
  if (manualMapping.mappings.length === 0) {
    throw new ApiError(400, "import_profile_no_mapping", "Save field mappings before creating an import profile.");
  }

  const availableColumnSet = new Set(dataset.headers);
  const mappings = manualMapping.mappings.map((mapping) => {
    if (!availableColumnSet.has(mapping.sourceColumn)) {
      throw new ApiError(400, "import_profile_invalid_mapping", "Import profile mapping references a missing source column.");
    }

    return {
      targetField: mapping.targetField,
      sourceColumn: mapping.sourceColumn,
    };
  });

  const hasRequiredValueMapping = mappings.some((mapping) => mapping.targetField === "lien_amount")
    && mappings.some((mapping) => mapping.targetField === "estimated_value");
  if (!hasRequiredValueMapping || !dataset.readinessSummary?.scoringRecommended) {
    throw new ApiError(400, "import_profile_not_ready", "Only mappings that make a dataset scoring-ready can be saved as profiles.");
  }

  return mappings;
}

function normalizeImportProfileName(name: string | undefined, fallbackName: string): string {
  const normalized = (name?.trim() || `${fallbackName.trim() || "Dataset"} import profile`).slice(0, 120);
  if (!normalized) {
    throw new ApiError(400, "import_profile_invalid_name", "Import profile name is required.");
  }

  if (/[\u0000-\u001F\u007F]/u.test(normalized)) {
    throw new ApiError(400, "import_profile_invalid_name", "Import profile name cannot contain control characters.");
  }

  return normalized;
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
