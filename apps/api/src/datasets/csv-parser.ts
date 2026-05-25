import path from "node:path";
import { parse } from "csv-parse/sync";
import { ApiError } from "../errors/api-error.js";

export const maxDatasetUploadBytes = 1024 * 1024;
export const maxDatasetRows = 10_000;
export const maxDatasetColumns = 200;
export const maxCsvRecordBytes = 64 * 1024;

const allowedMimeTypes = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
  "application/octet-stream",
]);

export interface CsvParseResult {
  originalFilename: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: string[];
}

export interface CsvUploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export function parseCsvUpload(file: CsvUploadFile): CsvParseResult {
  const originalFilename = sanitizeFilename(file.originalname);
  validateUploadMetadata(file, originalFilename);

  const content = file.buffer.toString("utf8");
  if (!content.trim()) {
    throw new ApiError(400, "dataset_empty_csv", "Uploaded CSV is empty.");
  }

  const rows = parseRows(content);
  if (rows.length === 0) {
    throw new ApiError(400, "dataset_empty_csv", "Uploaded CSV is empty.");
  }

  const headers = normalizeHeaders(rows[0] ?? []);
  validateHeaders(headers);

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    throw new ApiError(400, "dataset_no_data_rows", "Uploaded CSV must contain at least one data row.");
  }

  if (dataRows.length > maxDatasetRows) {
    throw new ApiError(413, "dataset_too_many_rows", `Uploaded CSV cannot exceed ${maxDatasetRows} data rows.`);
  }

  const invalidRows = dataRows.filter((row) => row.every((value) => !value.trim())).length;
  const validRows = dataRows.length - invalidRows;
  if (validRows === 0) {
    throw new ApiError(400, "dataset_no_valid_rows", "Uploaded CSV does not contain any usable data rows.");
  }

  return {
    originalFilename,
    rowCount: dataRows.length,
    columnCount: headers.length,
    headers,
    totalRows: dataRows.length,
    validRows,
    invalidRows,
    warnings: invalidRows > 0 ? [`${invalidRows} blank data row(s) were ignored for validation summary.`] : [],
  };
}

function sanitizeFilename(originalFilename: string): string {
  const baseName = path.basename(originalFilename).trim();
  return baseName.slice(0, 255) || "uploaded.csv";
}

function validateUploadMetadata(file: CsvUploadFile, originalFilename: string): void {
  const hasCsvExtension = originalFilename.toLowerCase().endsWith(".csv");
  const hasAllowedMimeType = allowedMimeTypes.has(file.mimetype);

  if (!hasCsvExtension && !hasAllowedMimeType) {
    throw new ApiError(400, "dataset_invalid_file_type", "Upload must be a CSV file.");
  }

  if (file.size <= 0) {
    throw new ApiError(400, "dataset_empty_csv", "Uploaded CSV is empty.");
  }

  if (file.size > maxDatasetUploadBytes) {
    throw new ApiError(413, "dataset_upload_too_large", "Uploaded CSV exceeds the 1 MiB limit.");
  }
}

function parseRows(content: string): string[][] {
  try {
    return parse(content, {
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: false,
      max_record_size: maxCsvRecordBytes,
    }) as string[][];
  } catch {
    throw new ApiError(400, "dataset_malformed_csv", "Uploaded CSV could not be parsed safely.");
  }
}

function normalizeHeaders(headerRow: string[]): string[] {
  return headerRow.map((header) => header.trim());
}

function validateHeaders(headers: string[]): void {
  if (headers.length === 0) {
    throw new ApiError(400, "dataset_missing_headers", "Uploaded CSV must include a header row.");
  }

  if (headers.some((header) => header.length === 0)) {
    throw new ApiError(400, "dataset_missing_headers", "Uploaded CSV contains a blank column header.");
  }

  if (headers.length > maxDatasetColumns) {
    throw new ApiError(400, "dataset_too_many_columns", `Uploaded CSV cannot exceed ${maxDatasetColumns} columns.`);
  }

  const uniqueHeaders = new Set(headers.map((header) => header.toLowerCase()));
  if (uniqueHeaders.size !== headers.length) {
    throw new ApiError(400, "dataset_duplicate_headers", "Uploaded CSV contains duplicate column headers.");
  }
}
