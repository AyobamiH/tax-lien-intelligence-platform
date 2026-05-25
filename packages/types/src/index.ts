export type RuntimeEnvironment = "development" | "test" | "production";

export type HealthStatus = "ok" | "degraded";

export interface HealthResponse {
  service: "tax-lien-api";
  status: HealthStatus;
  timestamp: string;
  environment: RuntimeEnvironment;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export type TenantId = string;

export interface AuthUserResponse {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSuccessResponse {
  token: string;
  user: AuthUserResponse;
}

export interface AuthMeResponse {
  user: AuthUserResponse;
}

export interface AuthenticatedPrincipal {
  userId: string;
  email: string;
}

export type DatasetStatus = "validated";
export type DatasetSourceType = "manual_csv";

export interface DatasetValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: string[];
  errors: string[];
}

export interface DatasetResponse {
  id: string;
  originalFilename: string;
  sourceType: DatasetSourceType;
  sourceLabel?: string;
  status: DatasetStatus;
  rowCount: number;
  columnCount: number;
  headers: string[];
  validationSummary: DatasetValidationSummary;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetListResponse {
  datasets: DatasetResponse[];
}

export interface DatasetDetailResponse {
  dataset: DatasetResponse;
}
