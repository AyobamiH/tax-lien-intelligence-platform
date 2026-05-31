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

export type PropertyTypeCategory = "residential" | "multifamily" | "commercial" | "land" | "unknown";

export interface NormalizedScoredRecordFields {
  parcelId?: string;
  lienAmount?: number;
  estimatedValue?: number;
  propertyType?: string;
  propertyTypeCategory: PropertyTypeCategory;
  address?: string;
}

export type EnrichmentAdapterId = "source_field_inference" | "census_geocoder";
export type EnrichmentConfidence = "low" | "medium" | "high";
export type EnrichedFieldName =
  | "parcelId"
  | "lienAmount"
  | "estimatedValue"
  | "propertyType"
  | "address"
  | "dataQuality"
  | "externalLocation";
export type ExternalEnrichmentProvider = "us_census_geocoder";
export type ExternalEnrichmentStatus = "matched" | "no_match" | "skipped" | "failed" | "timeout";

export interface EnrichedScoredRecordFields {
  parcelId?: string;
  lienAmount?: number;
  estimatedValue?: number;
  propertyType?: string;
  propertyTypeCategory?: PropertyTypeCategory;
  address?: string;
}

export interface EnrichmentSignal {
  adapterId: EnrichmentAdapterId;
  field: EnrichedFieldName;
  confidence: EnrichmentConfidence;
  message: string;
}

export interface ExternalEnrichmentResult {
  adapterId: EnrichmentAdapterId;
  provider: ExternalEnrichmentProvider;
  status: ExternalEnrichmentStatus;
  confidence: EnrichmentConfidence;
  message: string;
  normalizedAddress?: string;
  latitude?: number;
  longitude?: number;
  benchmark?: string;
  enrichedAt: string;
}

export interface EnrichmentResult {
  adapters: EnrichmentAdapterId[];
  dataQualityScore: number;
  inferredFields: EnrichedScoredRecordFields;
  externalResults?: ExternalEnrichmentResult[];
  signals: EnrichmentSignal[];
  flags: string[];
  reasoning: string[];
}

export interface ScoredRecordResponse {
  id: string;
  datasetId: string;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  enrichment?: EnrichmentResult;
  investmentScore: number;
  riskScore: number;
  liquidityScore: number;
  redemptionProbability: number;
  confidenceScore: number;
  valueCoverageRatio?: number;
  flags: string[];
  reasoning: string[];
  scoredAt: string;
  createdAt: string;
  updatedAt: string;
}

export type InternalJobStatus = "queued" | "running" | "completed" | "failed";
export type InternalJobType = "dataset_scoring";
export type InternalJobTargetType = "dataset";

export interface InternalJobSummary {
  scoredRecordCount?: number;
}

export interface InternalJobError {
  code: string;
  message: string;
}

export interface InternalJobResponse {
  id: string;
  type: InternalJobType;
  targetEntityType: InternalJobTargetType;
  targetEntityId: string;
  status: InternalJobStatus;
  summary?: InternalJobSummary;
  error?: InternalJobError;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobDetailResponse {
  job: InternalJobResponse;
}

export interface DatasetScoreRunResponse {
  datasetId: string;
  job: InternalJobResponse;
  scoredRecordCount: number;
  scores: ScoredRecordResponse[];
}

export interface DatasetScoreJobResponse {
  datasetId: string;
  job: InternalJobResponse;
}

export interface DatasetScoresResponse {
  datasetId: string;
  scores: ScoredRecordResponse[];
}

export type AlertType = "scoring_job_completed" | "scoring_job_failed";
export type AlertSeverity = "info" | "error";
export type AlertStatus = "unread" | "read";
export type AlertRelatedEntityType = "dataset" | "job";

export interface AlertMetadata {
  jobId?: string;
  datasetId?: string;
  scoredRecordCount?: number;
  errorCode?: string;
}

export interface AlertResponse {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  relatedEntityType?: AlertRelatedEntityType;
  relatedEntityId?: string;
  metadata?: AlertMetadata;
  createdAt: string;
  updatedAt: string;
  readAt?: string;
}

export interface AlertListResponse {
  alerts: AlertResponse[];
  unreadCount: number;
}

export interface AlertDetailResponse {
  alert: AlertResponse;
}

export interface MarkAllAlertsReadResponse {
  updatedCount: number;
}

export interface AddWatchlistItemRequest {
  scoredRecordId: string;
}

export interface WatchlistItemResponse {
  id: string;
  datasetId: string;
  scoredRecordId: string;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  investmentScore: number;
  riskScore: number;
  liquidityScore: number;
  redemptionProbability: number;
  confidenceScore: number;
  valueCoverageRatio?: number;
  flags: string[];
  reasoning: string[];
  scoredAt: string;
  addedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddWatchlistItemResponse {
  item: WatchlistItemResponse;
  alreadyExists: boolean;
}

export interface WatchlistListResponse {
  items: WatchlistItemResponse[];
}

export interface DeleteWatchlistItemResponse {
  deleted: true;
  id: string;
}

export type PortfolioStatus = "tracked" | "reviewing" | "ready" | "acquired" | "closed" | "discarded";

export interface AddPortfolioItemRequest {
  scoredRecordId?: string;
  watchlistItemId?: string;
  status?: PortfolioStatus;
}

export interface UpdatePortfolioItemRequest {
  status: PortfolioStatus;
}

export interface PortfolioItemResponse {
  id: string;
  datasetId: string;
  scoredRecordId: string;
  sourceWatchlistItemId?: string;
  status: PortfolioStatus;
  statusUpdatedAt: string;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  investmentScore: number;
  riskScore: number;
  liquidityScore: number;
  redemptionProbability: number;
  confidenceScore: number;
  valueCoverageRatio?: number;
  flags: string[];
  reasoning: string[];
  scoredAt: string;
  trackedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddPortfolioItemResponse {
  item: PortfolioItemResponse;
  alreadyExists: boolean;
}

export interface PortfolioListResponse {
  items: PortfolioItemResponse[];
}

export interface PortfolioDetailResponse {
  item: PortfolioItemResponse;
}

export interface UpdatePortfolioItemResponse {
  item: PortfolioItemResponse;
}

export interface DeletePortfolioItemResponse {
  deleted: true;
  id: string;
}
