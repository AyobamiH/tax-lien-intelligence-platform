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
    details?: unknown;
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

export type WorkspaceRole = "owner" | "admin" | "member";
export type WorkspaceMembershipStatus = "active" | "inactive";

export interface WorkspacePermissions {
  canReadSharedData: boolean;
  canManageSharedData: boolean;
  canManageMembers: boolean;
  canRemoveMembers: boolean;
  canManageRoles: boolean;
  canRequestApprovals: boolean;
  canReviewApprovals: boolean;
  canExecuteSensitiveActions: boolean;
}

export interface WorkspaceResponse {
  id: string;
  name: string;
  role: WorkspaceRole;
  isDefault: boolean;
  memberCount: number;
  permissions: WorkspacePermissions;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberResponse {
  id: string;
  userId: string;
  email: string;
  role: WorkspaceRole;
  status: WorkspaceMembershipStatus;
  isDefault: boolean;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceListResponse {
  workspaces: WorkspaceResponse[];
  currentWorkspaceId: string;
}

export interface CurrentWorkspaceResponse {
  workspace: WorkspaceResponse;
}

export interface WorkspaceMembersResponse {
  members: WorkspaceMemberResponse[];
}

export interface AddWorkspaceMemberRequest {
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
}

export interface AddWorkspaceMemberResponse {
  member: WorkspaceMemberResponse;
}

export interface UpdateWorkspaceMemberRoleRequest {
  role: Exclude<WorkspaceRole, "owner">;
}

export interface UpdateWorkspaceMemberRoleResponse {
  member: WorkspaceMemberResponse;
}

export interface DeactivateWorkspaceMemberResponse {
  member: WorkspaceMemberResponse;
}

export type WorkspaceActivityCategory =
  | "data"
  | "decisions"
  | "portfolio"
  | "members"
  | "responsibility"
  | "approvals";
export type WorkspaceActivityEventType =
  | "dataset_uploaded"
  | "dataset_scoring_requested"
  | "dataset_refresh_requested"
  | "dataset_scoring_rate_limited"
  | "dataset_refresh_rate_limited"
  | "comparison_decision_changed"
  | "comparison_handoff_to_watchlist"
  | "comparison_handoff_to_portfolio"
  | "portfolio_status_changed"
  | "workspace_member_added"
  | "workspace_member_role_changed"
  | "workspace_member_removed"
  | "entity_assigned"
  | "entity_reassigned"
  | "entity_assignment_cleared"
  | "approval_requested"
  | "approval_approved"
  | "approval_rejected"
  | "approval_cancelled"
  | "decision_outcome_resolved";
export type WorkspaceActivityRelatedEntityType =
  | "dataset"
  | "job"
  | "comparison_item"
  | "watchlist_item"
  | "portfolio_item"
  | "workspace_membership";

export interface WorkspaceActivityActor {
  userId: string;
  email: string;
}

export interface WorkspaceActivityMetadata {
  datasetId?: string;
  datasetName?: string;
  jobId?: string;
  requestKind?: "score" | "refresh";
  rateLimitRetryAfterMs?: number;
  previousDecision?: ComparisonDecision;
  newDecision?: ComparisonDecision;
  targetEntityType?: WorkspaceAssignmentEntityType;
  targetEntityId?: string;
  previousStatus?: PortfolioStatus;
  newStatus?: PortfolioStatus;
  memberUserId?: string;
  memberEmail?: string;
  previousRole?: Exclude<WorkspaceRole, "owner">;
  role?: Exclude<WorkspaceRole, "owner">;
  assigneeUserId?: string;
  assigneeEmail?: string;
  previousAssigneeUserId?: string;
  previousAssigneeEmail?: string;
  approvalRequestId?: string;
  approvalAction?: ApprovalRequestedAction;
  approvalStatus?: ApprovalRequestStatus;
  approvalRequesterEmail?: string;
  approvalReviewerEmail?: string;
  decisionOutcomeId?: string;
  decisionOutcomeStatus?: DecisionOutcomeStatus;
  decisionOutcomeResolverEmail?: string;
}

export interface WorkspaceActivityResponse {
  id: string;
  workspaceId: string;
  actor: WorkspaceActivityActor;
  category: WorkspaceActivityCategory;
  eventType: WorkspaceActivityEventType;
  relatedEntityType: WorkspaceActivityRelatedEntityType;
  relatedEntityId: string;
  summary: string;
  metadata?: WorkspaceActivityMetadata;
  occurredAt: string;
}

export interface WorkspaceActivityListResponse {
  activities: WorkspaceActivityResponse[];
}

export type WorkspaceAssignmentEntityType =
  | "dataset"
  | "comparison_item"
  | "watchlist_item"
  | "portfolio_item";

export interface WorkspaceAssignmentActor {
  userId: string;
  email: string;
}

export interface WorkspaceAssignmentResponse {
  id: string;
  workspaceId: string;
  relatedEntityType: WorkspaceAssignmentEntityType;
  relatedEntityId: string;
  assignee: WorkspaceAssignmentActor;
  assignedBy: WorkspaceAssignmentActor;
  assignedAt: string;
  updatedAt: string;
}

export interface WorkspaceAssignmentDetailResponse {
  assignment: WorkspaceAssignmentResponse | null;
}

export interface UpdateWorkspaceAssignmentRequest {
  assigneeUserId: string;
}

export interface UpdateWorkspaceAssignmentResponse {
  assignment: WorkspaceAssignmentResponse;
  changed: boolean;
}

export interface ClearWorkspaceAssignmentResponse {
  relatedEntityType: WorkspaceAssignmentEntityType;
  relatedEntityId: string;
  cleared: boolean;
}

export interface AssignedToMeResponse {
  assignments: WorkspaceAssignmentResponse[];
}

export type ApprovalRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ApprovalTargetEntityType = "comparison_item";
export type ApprovalRequestedAction = "comparison_handoff_to_portfolio";

export interface ApprovalActor {
  userId: string;
  email: string;
  role: WorkspaceRole;
}

export interface ApprovalOutcome {
  targetEntityType: "portfolio_item";
  targetEntityId: string;
  alreadyExists: boolean;
}

export interface ApprovalRequestResponse {
  id: string;
  workspaceId: string;
  targetEntityType: ApprovalTargetEntityType;
  targetEntityId: string;
  requestedAction: ApprovalRequestedAction;
  status: ApprovalRequestStatus;
  requester: ApprovalActor;
  requestNote: string;
  reviewer?: ApprovalActor;
  reviewerResponseNote?: string;
  outcome?: ApprovalOutcome;
  canReview: boolean;
  canCancel: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface CreateApprovalRequestRequest {
  targetEntityType: ApprovalTargetEntityType;
  targetEntityId: string;
  requestedAction: ApprovalRequestedAction;
  requestNote: string;
}

export interface CreateApprovalRequestResponse {
  approval: ApprovalRequestResponse;
  alreadyPending: boolean;
}

export interface ApprovalRequestListResponse {
  approvals: ApprovalRequestResponse[];
}

export interface ApprovalRequestDetailResponse {
  approval: ApprovalRequestResponse;
}

export interface ResolveApprovalRequestRequest {
  responseNote?: string;
}

export type DecisionOutcomeTargetEntityType = "comparison_item";
export type DecisionOutcomeStatus = "approved" | "declined" | "deferred" | "archived";

export interface DecisionOutcomeActor {
  userId: string;
  email: string;
  role: WorkspaceRole;
}

export interface DecisionOutcomeResponse {
  id: string;
  workspaceId: string;
  targetEntityType: DecisionOutcomeTargetEntityType;
  targetEntityId: string;
  status: DecisionOutcomeStatus;
  resolver: DecisionOutcomeActor;
  note: string;
  resolvedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionOutcomeStateResponse {
  targetEntityType: DecisionOutcomeTargetEntityType;
  targetEntityId: string;
  resolved: boolean;
  outcome?: DecisionOutcomeResponse;
}

export interface UpsertDecisionOutcomeRequest {
  status: DecisionOutcomeStatus;
  note: string;
}

export interface UpsertDecisionOutcomeResponse {
  state: DecisionOutcomeStateResponse;
  changed: boolean;
}

export interface OutcomeReviewStatusCount {
  status: DecisionOutcomeStatus;
  count: number;
}

export interface OutcomeReviewEntityTypeCount {
  targetEntityType: DecisionOutcomeTargetEntityType;
  count: number;
}

export interface OutcomeReviewTargetSummary {
  targetEntityType: DecisionOutcomeTargetEntityType;
  targetEntityId: string;
  label: string;
  datasetId?: string;
  decision?: ComparisonDecision;
  investmentScore?: number;
  riskScore?: number;
  propertyTypeCategory?: string;
  sourceRowNumber?: number;
}

export interface OutcomeReviewResolution {
  outcome: DecisionOutcomeResponse;
  target: OutcomeReviewTargetSummary;
}

export type OutcomeReviewSignalSeverity = "info" | "warning";
export type OutcomeReviewSignalCode =
  | "no_resolved_items"
  | "unresolved_comparison_items"
  | "deferred_outcomes"
  | "recent_declines"
  | "no_recent_resolutions";

export interface OutcomeReviewSignal {
  code: OutcomeReviewSignalCode;
  severity: OutcomeReviewSignalSeverity;
  label: string;
  detail: string;
  count?: number;
}

export interface OutcomeReviewSummary {
  totalComparisonItems: number;
  resolvedItems: number;
  unresolvedItems: number;
  resolutionRate: number;
  recentResolvedItems: number;
  recentDeferredOrDeclinedItems: number;
  countsByStatus: OutcomeReviewStatusCount[];
  countsByEntityType: OutcomeReviewEntityTypeCount[];
}

export interface OutcomeReviewResponse {
  workspaceId: string;
  generatedAt: string;
  windowDays: number;
  summary: OutcomeReviewSummary;
  recentResolutions: OutcomeReviewResolution[];
  signals: OutcomeReviewSignal[];
}

export type WorkspaceCommentEntityType =
  | "dataset"
  | "comparison_item"
  | "watchlist_item"
  | "portfolio_item";

export interface WorkspaceCommentAuthor {
  userId: string;
  email: string;
}

export interface WorkspaceCommentResponse {
  id: string;
  workspaceId: string;
  author: WorkspaceCommentAuthor;
  relatedEntityType: WorkspaceCommentEntityType;
  relatedEntityId: string;
  body: string;
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceCommentListResponse {
  comments: WorkspaceCommentResponse[];
  attention: DiscussionAttentionResponse;
}

export interface CreateWorkspaceCommentRequest {
  body: string;
}

export interface CreateWorkspaceCommentResponse {
  comment: WorkspaceCommentResponse;
  attention: DiscussionAttentionResponse;
}

export interface DeleteWorkspaceCommentResponse {
  id: string;
  deleted: true;
}

export interface DiscussionAttentionResponse {
  workspaceId: string;
  relatedEntityType: WorkspaceCommentEntityType;
  relatedEntityId: string;
  unreadCount: number;
  hasUnread: boolean;
  lastReadAt?: string;
  latestCommentAt?: string;
}

export interface MarkDiscussionReadResponse {
  attention: DiscussionAttentionResponse;
}

export interface MyWorkCounts {
  assigned: number;
  approvals: number;
  unreadDiscussions: number;
  unreadMessages: number;
  following: number;
  totalActionable: number;
}

export interface MyWorkAssignmentQueue {
  count: number;
  items: WorkspaceAssignmentResponse[];
}

export interface MyWorkApprovalQueue {
  count: number;
  items: ApprovalRequestResponse[];
}

export interface MyWorkDiscussionQueue {
  count: number;
  unreadCount: number;
  items: DiscussionAttentionResponse[];
}

export type FollowTargetEntityType = WorkspaceCommentEntityType;
export type FollowedItemChangeType =
  | "assignment_changed"
  | "portfolio_status_changed"
  | "approval_resolved";

export interface FollowSubscriptionResponse {
  id: string;
  workspaceId: string;
  targetEntityType: FollowTargetEntityType;
  targetEntityId: string;
  followedAt: string;
}

export interface FollowStateResponse {
  targetEntityType: FollowTargetEntityType;
  targetEntityId: string;
  following: boolean;
  followerCount: number;
  subscription?: FollowSubscriptionResponse;
}

export interface FollowEntityResponse extends FollowStateResponse {
  alreadyFollowing: boolean;
}

export interface UnfollowEntityResponse {
  targetEntityType: FollowTargetEntityType;
  targetEntityId: string;
  unfollowed: boolean;
  followerCount: number;
}

export interface FollowListResponse {
  follows: FollowSubscriptionResponse[];
}

export type ReviewChecklistTargetEntityType =
  | "comparison_item"
  | "watchlist_item"
  | "portfolio_item";
export type ReviewChecklistProgressStatus =
  | "not_configured"
  | "not_started"
  | "in_progress"
  | "ready";

export interface ReviewChecklistTemplateItem {
  id: string;
  label: string;
  required: boolean;
  position: number;
}

export interface ReviewChecklistTemplateResponse {
  id: string;
  workspaceId: string;
  targetEntityType: ReviewChecklistTargetEntityType;
  name: string;
  active: boolean;
  version: number;
  items: ReviewChecklistTemplateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewChecklistTemplateListResponse {
  templates: ReviewChecklistTemplateResponse[];
}

export interface UpsertReviewChecklistTemplateRequest {
  name: string;
  active?: boolean;
  items: Array<{
    id?: string;
    label: string;
    required: boolean;
  }>;
}

export interface UpsertReviewChecklistTemplateResponse {
  template: ReviewChecklistTemplateResponse;
}

export interface ReviewChecklistCompletedBy {
  userId: string;
  email: string;
}

export interface ReviewChecklistItemState extends ReviewChecklistTemplateItem {
  completed: boolean;
  completedBy?: ReviewChecklistCompletedBy;
  completedAt?: string;
}

export interface ReviewChecklistInstanceResponse {
  id: string;
  workspaceId: string;
  targetEntityType: ReviewChecklistTargetEntityType;
  targetEntityId: string;
  templateId: string;
  templateName: string;
  templateVersion: number;
  items: ReviewChecklistItemState[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewChecklistProgress {
  status: ReviewChecklistProgressStatus;
  totalItems: number;
  completedItems: number;
  incompleteItems: number;
  requiredItems: number;
  completedRequiredItems: number;
  incompleteRequiredItems: number;
  allRequiredComplete: boolean;
}

export interface ReviewChecklistStateResponse {
  targetEntityType: ReviewChecklistTargetEntityType;
  targetEntityId: string;
  template?: ReviewChecklistTemplateResponse;
  checklist?: ReviewChecklistInstanceResponse;
  progress: ReviewChecklistProgress;
}

export interface UpdateReviewChecklistItemRequest {
  completed: boolean;
}

export interface UpdateReviewChecklistItemResponse {
  state: ReviewChecklistStateResponse;
}

export interface WorkspacePolicyRules {
  requireAssignmentBeforeComparisonHandoff: boolean;
  requireChecklistBeforeComparisonHandoff: boolean;
  requireApprovalForComparisonPortfolio: boolean;
}

export interface WorkspacePolicyResponse {
  workspaceId: string;
  rules: WorkspacePolicyRules;
  updatedByUserId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateWorkspacePolicyRequest {
  rules: WorkspacePolicyRules;
}

export type WorkspacePolicyAction =
  | "comparison_handoff_to_watchlist"
  | "comparison_handoff_to_portfolio"
  | "approval_request_comparison_portfolio"
  | "approval_execute_comparison_portfolio";

export type WorkspacePolicyRequirementCode =
  | "assignment_required"
  | "checklist_required"
  | "approval_required";

export interface WorkspacePolicyUnmetRequirement {
  code: WorkspacePolicyRequirementCode;
  message: string;
  resolution: string;
}

export interface WorkspacePolicyEvaluation {
  action: WorkspacePolicyAction;
  allowed: boolean;
  unmetRequirements: WorkspacePolicyUnmetRequirement[];
}

export type DecisionBriefTargetEntityType = "comparison_item";
export type DecisionBriefReadinessStatus =
  | "ready"
  | "blocked"
  | "needs_review"
  | "not_configured"
  | "resolved";

export interface DecisionBriefSummary {
  title: string;
  subtitle: string;
  readinessStatus: DecisionBriefReadinessStatus;
  decision?: ComparisonDecision;
  currentNote?: string;
  nextAction: string;
}

export interface DecisionBriefApprovalSummary {
  pendingCount: number;
  latest?: ApprovalRequestResponse;
  recent: ApprovalRequestResponse[];
}

export interface DecisionBriefPolicySummary {
  blocked: boolean;
  evaluations: WorkspacePolicyEvaluation[];
  unmetRequirements: WorkspacePolicyUnmetRequirement[];
}

export interface DecisionBriefDiscussionSummary {
  totalComments: number;
  comments: WorkspaceCommentResponse[];
  attention: DiscussionAttentionResponse;
}

export interface DecisionBriefHistorySummary {
  totalEvents: number;
  events: DecisionHistoryEventResponse[];
}

export interface DecisionBriefResponse {
  workspaceId: string;
  generatedAt: string;
  targetEntityType: DecisionBriefTargetEntityType;
  targetEntityId: string;
  summary: DecisionBriefSummary;
  target: ComparisonItemResponse;
  dataset?: DatasetResponse;
  outcome: DecisionOutcomeStateResponse;
  assignment: WorkspaceAssignmentResponse | null;
  checklist: ReviewChecklistStateResponse;
  approvals: DecisionBriefApprovalSummary;
  policy: DecisionBriefPolicySummary;
  history: DecisionBriefHistorySummary;
  discussion: DecisionBriefDiscussionSummary;
  exportText: string;
}

export interface MyWorkFollowingQueue {
  count: number;
  items: FollowSubscriptionResponse[];
}

export interface MyWorkResponse {
  workspaceId: string;
  generatedAt: string;
  counts: MyWorkCounts;
  queues: {
    assignments: MyWorkAssignmentQueue;
    approvals: MyWorkApprovalQueue;
    discussions: MyWorkDiscussionQueue;
    following: MyWorkFollowingQueue;
  };
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

export type AlertType =
  | "scoring_job_completed"
  | "scoring_job_failed"
  | "workspace_comment_added"
  | "workspace_item_assigned"
  | "followed_item_changed";
export type AlertSeverity = "info" | "error";
export type AlertStatus = "unread" | "read";
export type AlertRelatedEntityType =
  | "dataset"
  | "job"
  | "comparison_item"
  | "watchlist_item"
  | "portfolio_item";

export interface AlertMetadata {
  jobId?: string;
  datasetId?: string;
  scoredRecordCount?: number;
  errorCode?: string;
  requestKind?: InternalJobRequestKind;
  workspaceId?: string;
  commentId?: string;
  commentActorUserId?: string;
  commentActorEmail?: string;
  assignmentId?: string;
  assignmentActorUserId?: string;
  assignmentActorEmail?: string;
  followEventId?: string;
  followChangeType?: FollowedItemChangeType;
  followActorUserId?: string;
  followActorEmail?: string;
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
  deliveryPreparation?: NotificationDeliveryPreparation;
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

export type NotificationDeliveryMode = "in_app_only" | "delivery_eligible";
export type NotificationCadence = "immediate" | "digest";
export type NotificationDeliveryState = "suppressed" | "in_app_only" | "delivery_immediate" | "delivery_digest";
export type NotificationDeliveryChannel = "email";
export type NotificationDeliveryStatus =
  | "suppressed"
  | "in_app_only"
  | "digest_ready"
  | "digest_processing"
  | "pending"
  | "sent"
  | "failed"
  | "provider_disabled";
export type NotificationDeliveryFailureCode = "provider_disabled" | "recipient_missing" | "provider_error";
export type NotificationDigestBatchStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "provider_disabled"
  | "suppressed"
  | "empty";

export interface NotificationPreferenceRule {
  alertType: AlertType;
  enabled: boolean;
  deliveryMode: NotificationDeliveryMode;
  cadence: NotificationCadence;
}

export interface NotificationPreferencesResponse {
  id: string;
  rules: NotificationPreferenceRule[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferenceCategory {
  alertType: AlertType;
  label: string;
  description: string;
  supportsDelivery: boolean;
  supportsDigest: boolean;
  defaultRule: NotificationPreferenceRule;
}

export interface NotificationPreferencesDetailResponse {
  preferences: NotificationPreferencesResponse;
  categories: NotificationPreferenceCategory[];
}

export interface UpdateNotificationPreferencesRequest {
  rules: NotificationPreferenceRule[];
}

export interface UpdateNotificationPreferencesResponse {
  preferences: NotificationPreferencesResponse;
  categories: NotificationPreferenceCategory[];
}

export interface NotificationDeliveryPreparation {
  alertType: AlertType;
  deliveryState: NotificationDeliveryState;
  deliveryMode: NotificationDeliveryMode;
  cadence: NotificationCadence;
  eligibleForDelivery: boolean;
  preparedAt: string;
  payload?: {
    subject: string;
    summary: string;
    relatedEntityType?: AlertRelatedEntityType;
    relatedEntityId?: string;
    metadata: AlertMetadata;
  };
}

export interface NotificationDeliveryOutcome {
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  deliveryMode: NotificationDeliveryMode;
  cadence: NotificationCadence;
  attempts: number;
  provider?: string;
  providerMessageId?: string;
  failureCode?: NotificationDeliveryFailureCode;
  failureReason?: string;
  updatedAt: string;
}

export interface NotificationDeliveryHistoryItem {
  id: string;
  alertType: AlertType;
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  deliveryMode: NotificationDeliveryMode;
  cadence: NotificationCadence;
  subject?: string;
  summary?: string;
  relatedEntityType?: AlertRelatedEntityType;
  relatedEntityId?: string;
  digestBatchId?: string;
  attempts: number;
  failureCode?: NotificationDeliveryFailureCode;
  failureMessage?: string;
  preparedAt: string;
  sentAt?: string;
  updatedAt: string;
}

export interface NotificationDigestBatchResponse {
  id: string;
  status: NotificationDigestBatchStatus;
  itemCount: number;
  subject?: string;
  attempts: number;
  failureCode?: NotificationDeliveryFailureCode;
  failureMessage?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDeliveryHistoryResponse {
  deliveries: NotificationDeliveryHistoryItem[];
  digestBatches: NotificationDigestBatchResponse[];
}

export interface NotificationDigestProcessingResult {
  windowKey: string;
  usersConsidered: number;
  batchesCreated: number;
  batchesSent: number;
  batchesFailed: number;
  batchesSuppressed: number;
  providerDisabledBatches: number;
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

export interface PortfolioStatusCount {
  status: PortfolioStatus;
  count: number;
  isActive: boolean;
}

export type PortfolioSummaryActivityType = "added" | "status_changed";

export interface PortfolioSummaryRecord {
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
  confidenceScore: number;
  flagCount: number;
  primaryFlag?: string;
  trackedAt: string;
  updatedAt: string;
}

export interface PortfolioActivitySummary {
  activityType: PortfolioSummaryActivityType;
  occurredAt: string;
  message: string;
  item: PortfolioSummaryRecord;
}

export type PortfolioAttentionReasonCode =
  | "review_status"
  | "tracked_without_next_status"
  | "risk_flags"
  | "low_confidence";

export interface PortfolioAttentionReason {
  code: PortfolioAttentionReasonCode;
  severity: "info" | "warning";
  message: string;
}

export interface PortfolioAttentionSummary {
  item: PortfolioSummaryRecord;
  reasons: PortfolioAttentionReason[];
}

export interface PortfolioSummaryResponse {
  totalTrackedItems: number;
  activeItems: number;
  readyItems: number;
  acquiredItems: number;
  statusCounts: PortfolioStatusCount[];
  recentAdditions: PortfolioActivitySummary[];
  recentStatusChanges: PortfolioActivitySummary[];
  needsAttention: PortfolioAttentionSummary[];
  generatedAt: string;
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

export type DecisionHistoryRelatedEntityType = "comparison_item";
export type DecisionHistoryEventType =
  | "comparison_decision_changed"
  | "comparison_note_changed"
  | "comparison_handoff_to_watchlist"
  | "comparison_handoff_to_portfolio";

export type DecisionHistoryTargetEntityType = "watchlist_item" | "portfolio_item";
export type ComparisonHandoffResult = "created" | "already_exists";

export interface DecisionHistoryMetadata {
  workspaceId?: "default";
  datasetId?: string;
  scoredRecordId?: string;
  sourceType?: ComparisonSourceType;
  targetEntityType?: DecisionHistoryTargetEntityType;
  targetEntityId?: string;
  handoffResult?: ComparisonHandoffResult;
  portfolioStatus?: PortfolioStatus;
}

export interface DecisionHistoryEventResponse {
  id: string;
  relatedEntityType: DecisionHistoryRelatedEntityType;
  relatedEntityId: string;
  eventType: DecisionHistoryEventType;
  previousDecision?: ComparisonDecision;
  newDecision?: ComparisonDecision;
  previousNoteSnapshot?: string;
  noteSnapshot?: string;
  metadata?: DecisionHistoryMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionHistoryListResponse {
  events: DecisionHistoryEventResponse[];
}

export interface ComparisonHandoffToWatchlistResponse {
  destination: "watchlist";
  item: WatchlistItemResponse;
  alreadyExists: boolean;
  historyEvent: DecisionHistoryEventResponse;
}

export interface ComparisonHandoffToPortfolioResponse {
  destination: "portfolio";
  item: PortfolioItemResponse;
  alreadyExists: boolean;
  historyEvent: DecisionHistoryEventResponse;
}

export type SavedViewSurface = "portfolio" | "comparison";

export type SavedViewSortKey =
  | "tracked_at"
  | "status_updated_at"
  | "added_at"
  | "decision_updated_at"
  | "investment_score"
  | "risk_score"
  | "confidence_score";

export type SavedViewSortDirection = "asc" | "desc";

export type SavedViewPortfolioQueue = "needs_attention" | "recently_changed";
export type SavedViewComparisonQueue = "needs_decision" | "recent_decisions";

export interface SavedViewPortfolioFilters {
  statuses?: PortfolioStatus[];
  queue?: SavedViewPortfolioQueue;
  hasFlags?: boolean;
  maxRiskScore?: number;
  minConfidenceScore?: number;
}

export interface SavedViewComparisonFilters {
  decisions?: ComparisonDecision[];
  sourceTypes?: ComparisonSourceType[];
  queue?: SavedViewComparisonQueue;
  hasNote?: boolean;
}

export type SavedViewFilters = SavedViewPortfolioFilters | SavedViewComparisonFilters;

export interface SavedViewSort {
  key: SavedViewSortKey;
  direction: SavedViewSortDirection;
}

export interface SavedViewResponse {
  id: string;
  surface: SavedViewSurface;
  name: string;
  description?: string;
  filters: SavedViewFilters;
  sort?: SavedViewSort;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedViewRequest {
  surface: SavedViewSurface;
  name: string;
  description?: string;
  filters: SavedViewFilters;
  sort?: SavedViewSort;
}

export interface UpdateSavedViewRequest {
  name?: string;
  description?: string | null;
  filters?: SavedViewFilters;
  sort?: SavedViewSort | null;
}

export interface CreateSavedViewResponse {
  view: SavedViewResponse;
}

export interface SavedViewListResponse {
  views: SavedViewResponse[];
  queues: SavedViewResponse[];
}

export interface UpdateSavedViewResponse {
  view: SavedViewResponse;
}

export interface DeleteSavedViewResponse {
  deleted: true;
  id: string;
}

export interface ApplyPortfolioSavedViewResponse {
  view: SavedViewResponse;
  surface: "portfolio";
  items: PortfolioItemResponse[];
  summary: PortfolioSummaryResponse;
}

export interface ApplyComparisonSavedViewResponse {
  view: SavedViewResponse;
  surface: "comparison";
  items: ComparisonItemResponse[];
}

export type ApplySavedViewResponse = ApplyPortfolioSavedViewResponse | ApplyComparisonSavedViewResponse;
