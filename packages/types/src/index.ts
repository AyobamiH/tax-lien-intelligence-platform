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
export type DatasetImportAdapterId = "generic_csv" | "maricopa_tax_lien_v1";
export type DatasetImportSource = "generic_csv" | "county_adapter";
export type DatasetImportConfidence = "low" | "medium" | "high";
export type DatasetReadinessStatus = "ready" | "partial" | "weak" | "blocked";
export type DatasetReadinessIssueSeverity = "info" | "warning" | "error";
export type DatasetReadinessFieldName = "parcel_id" | "lien_amount" | "estimated_value" | "property_type" | "address";
export type DatasetManualMappingTarget = DatasetReadinessFieldName;
export type DatasetManualMappingSource = "manual" | "import_profile";
export type DatasetImportProfileApplicationStatus = "none" | "suggested" | "auto_applied" | "user_applied";

export interface DatasetValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: string[];
  errors: string[];
}

export interface DatasetImportSummary {
  adapterMatched: boolean;
  adapterId: DatasetImportAdapterId;
  adapterName: string;
  source: DatasetImportSource;
  confidence: DatasetImportConfidence;
  fallbackUsed: boolean;
  mappedFields: string[];
  warnings: string[];
}

export interface DatasetReadinessFieldCoverage {
  field: DatasetReadinessFieldName;
  label: string;
  presentRows: number;
  totalRows: number;
  coveragePercent: number;
  importance: "required" | "important" | "helpful";
}

export interface DatasetReadinessIssue {
  code: string;
  severity: DatasetReadinessIssueSeverity;
  message: string;
  field?: DatasetReadinessFieldName;
}

export interface DatasetReadinessSummary {
  status: DatasetReadinessStatus;
  score: number;
  scoringRecommended: boolean;
  fieldCoverage: DatasetReadinessFieldCoverage[];
  issues: DatasetReadinessIssue[];
  guidance: string[];
}

export interface DatasetManualMappingEntry {
  targetField: DatasetManualMappingTarget;
  sourceColumn: string;
  source: DatasetManualMappingSource;
  updatedAt: string;
}

export interface DatasetManualMappingSummary {
  mappings: DatasetManualMappingEntry[];
  updatedAt?: string;
}

export interface DatasetImportProfileApplicationSummary {
  status: DatasetImportProfileApplicationStatus;
  matchedMappings: number;
  totalMappings: number;
  message: string;
  profileId?: string;
  profileName?: string;
  confidence?: DatasetImportConfidence;
  appliedAt?: string;
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
  importSummary: DatasetImportSummary;
  readinessSummary: DatasetReadinessSummary;
  manualMapping: DatasetManualMappingSummary;
  importProfile: DatasetImportProfileApplicationSummary;
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

export type SaveDatasetManualMappingRequest = {
  mappings: Partial<Record<DatasetManualMappingTarget, string | null>>;
};

export interface DatasetManualMappingContextResponse {
  dataset: DatasetResponse;
  availableColumns: string[];
  manualMapping: DatasetManualMappingSummary;
}

export type SaveDatasetManualMappingResponse = DatasetManualMappingContextResponse;

export interface ImportProfileMappingRule {
  targetField: DatasetManualMappingTarget;
  sourceColumn: string;
}

export interface ImportProfileApplicabilitySummary {
  headerSignature: string[];
  sourceColumns: string[];
  adapterId: DatasetImportAdapterId;
  columnCount: number;
}

export interface ImportProfileResponse {
  id: string;
  name: string;
  sourceLabel?: string;
  adapterId: DatasetImportAdapterId;
  adapterName: string;
  mappings: ImportProfileMappingRule[];
  applicability: ImportProfileApplicabilitySummary;
  createdFromDatasetId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportProfileListResponse {
  profiles: ImportProfileResponse[];
}

export interface SaveImportProfileFromDatasetRequest {
  name?: string;
}

export interface SaveImportProfileFromDatasetResponse {
  profile: ImportProfileResponse;
}

export interface ApplyImportProfileToDatasetRequest {
  profileId: string;
}

export interface ApplyImportProfileToDatasetResponse {
  dataset: DatasetResponse;
  appliedProfile: ImportProfileResponse;
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
export type EnrichmentAdapterStage = "internal" | "external";
export type EnrichmentAdapterOutcomeStatus = "success" | "skipped" | "partial" | "failed";
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
export type EnrichmentFreshnessStatus = "fresh" | "stale" | "unknown";

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

export interface EnrichmentAdapterOutcome {
  adapterId: EnrichmentAdapterId;
  stage: EnrichmentAdapterStage;
  status: EnrichmentAdapterOutcomeStatus;
  message: string;
  startedAt: string;
  completedAt: string;
}

export interface EnrichmentFreshness {
  status: EnrichmentFreshnessStatus;
  enrichedAt: string;
  staleAt: string;
  reprocessAfter: string;
  reprocessEligible: boolean;
  sourceVersion: string;
}

export interface EnrichmentResult {
  adapters: EnrichmentAdapterId[];
  orchestrationVersion: string;
  enrichedAt: string;
  adapterOutcomes: EnrichmentAdapterOutcome[];
  freshness: EnrichmentFreshness;
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
export type InternalJobType = "dataset_scoring" | "dataset_maintenance";
export type InternalJobTargetType = "dataset";
export type InternalJobRequestKind = "score" | "refresh" | "policy_refresh" | "maintenance_scan";
export type MaintenanceDecision =
  | "not_stale"
  | "manual_refresh_only"
  | "policy_refresh_queued"
  | "active_refresh_exists"
  | "recent_refresh_suppressed"
  | "recent_failure_suppressed";

export interface InternalJobSummary {
  scoredRecordCount?: number;
  enrichedRecordCount?: number;
  enrichmentFallbackCount?: number;
  earliestReprocessAfter?: string;
  maintenanceScannedDatasetCount?: number;
  maintenanceStaleDatasetCount?: number;
  maintenanceRefreshJobCount?: number;
  maintenanceSkippedDatasetCount?: number;
  maintenanceDecision?: MaintenanceDecision;
  maintenanceRunAt?: string;
  staleRecordCount?: number;
  refreshJobId?: string;
  policyAutoRefreshEnabled?: boolean;
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
  requestKind: InternalJobRequestKind;
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
  enrichedRecordCount?: number;
  enrichmentFallbackCount?: number;
  earliestReprocessAfter?: string;
  scores: ScoredRecordResponse[];
}

export interface DatasetScoreJobResponse {
  datasetId: string;
  job: InternalJobResponse;
}

export type DatasetRefreshRequestStatus = "queued" | "already_running";

export interface DatasetRefreshJobResponse {
  datasetId: string;
  job: InternalJobResponse;
  requestStatus: DatasetRefreshRequestStatus;
  message: string;
}

export type DatasetScoringStatus =
  | "not_scored"
  | "fresh"
  | "stale"
  | "refresh_requested"
  | "refresh_in_progress"
  | "refresh_failed"
  | "refresh_completed";

export interface DatasetScoringStatusResponse {
  datasetId: string;
  status: DatasetScoringStatus;
  scoredRecordCount: number;
  staleRecordCount: number;
  latestScoredAt?: string;
  earliestReprocessAfter?: string;
  maintenance: DatasetMaintenanceStatus;
  activeJob?: InternalJobResponse;
  latestJob?: InternalJobResponse;
}

export type DatasetMaintenanceMode = "manual_refresh_only" | "policy_auto_refresh";

export interface DatasetMaintenanceStatus {
  mode: DatasetMaintenanceMode;
  autoRefreshEnabled: boolean;
  eligibleForPolicyRefresh: boolean;
  message: string;
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
  requestKind?: InternalJobRequestKind;
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

export type ComparisonSourceType = "score" | "watchlist" | "portfolio";

export type ComparisonDecision = "undecided" | "keep_reviewing" | "move_forward" | "rejected";

export interface AddComparisonItemRequest {
  scoredRecordId?: string;
  watchlistItemId?: string;
  portfolioItemId?: string;
}

export interface UpdateComparisonItemRequest {
  decision?: ComparisonDecision;
  note?: string | null;
}

export interface ComparisonItemResponse {
  id: string;
  workspaceId: "default";
  datasetId: string;
  scoredRecordId: string;
  sourceType: ComparisonSourceType;
  sourceWatchlistItemId?: string;
  sourcePortfolioItemId?: string;
  decision: ComparisonDecision;
  decisionUpdatedAt: string;
  note?: string;
  noteUpdatedAt?: string;
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

export interface AddComparisonItemResponse {
  item: ComparisonItemResponse;
  alreadyExists: boolean;
}

export interface ComparisonListResponse {
  items: ComparisonItemResponse[];
}

export interface UpdateComparisonItemResponse {
  item: ComparisonItemResponse;
}

export interface DeleteComparisonItemResponse {
  deleted: true;
  id: string;
}
