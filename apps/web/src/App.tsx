import { useEffect, useMemo, useState } from "react";
import type {
  AlertResponse,
  ApprovalRequestResponse,
  ApprovalRequestStatus,
  AuthUserResponse,
  ComparisonDecision,
  ComparisonHandoffToPortfolioResponse,
  ComparisonHandoffToWatchlistResponse,
  DecisionHistoryEventResponse,
  ComparisonItemResponse,
  DatasetManualMappingTarget,
  DatasetResponse,
  DatasetScoringStatusResponse,
  DecisionBriefResponse,
  DecisionBriefTargetEntityType,
  DecisionOutcomeStateResponse,
  DecisionOutcomeStatus,
  DecisionOutcomeTargetEntityType,
  DiscussionAttentionResponse,
  FollowStateResponse,
  FollowSubscriptionResponse,
  FollowTargetEntityType,
  FollowUpStateResponse,
  FollowUpTargetEntityType,
  InternalJobResponse,
  MyWorkResponse,
  OutcomeReviewResolution,
  OutcomeReviewResponse,
  ReviewChecklistProgress,
  ReviewChecklistStateResponse,
  ReviewChecklistTargetEntityType,
  ReviewChecklistTemplateResponse,
  NotificationDeliveryHistoryItem,
  NotificationDigestBatchResponse,
  NotificationPreferenceCategory,
  NotificationPreferenceRule,
  NotificationPreferencesResponse,
  PortfolioItemResponse,
  PortfolioStatus,
  PortfolioSummaryRecord,
  PortfolioSummaryResponse,
  SavedViewResponse,
  ScoredRecordResponse,
  WatchlistItemResponse,
  WorkspaceMemberResponse,
  WorkspaceResponse,
  WorkspaceRole,
  WorkspaceActivityCategory,
  WorkspaceActivityResponse,
  WorkspaceCommentEntityType,
  WorkspaceCommentResponse,
  WorkspaceAssignmentEntityType,
  WorkspaceAssignmentResponse,
  WorkspacePolicyRules,
  WorkspacePolicyResponse,
} from "@tax-lien/types";
import {
  ApiClientError,
  approveApprovalRequest,
  addWorkspaceMember,
  addComparisonItem,
  addPortfolioItem,
  addWatchlistItem,
  applySavedView,
  applyDatasetImportProfile,
  createSavedView,
  createWorkspaceComment,
  clearWorkspaceAssignment,
  clearFollowUp,
  cancelApprovalRequest,
  createApprovalRequest,
  createDataset,
  deactivateWorkspaceMember,
  deleteSavedView,
  deleteWorkspaceComment,
  getCurrentUser,
  getDecisionBrief,
  getDecisionOutcomeState,
  getDataset,
  getDatasetScoringStatus,
  getFollowState,
  getFollowUpState,
  getJob,
  getMyWork,
  getReviewChecklistState,
  getNotificationPreferences,
  getOutcomeReview,
  getPortfolioSummary,
  handoffComparisonToPortfolio,
  handoffComparisonToWatchlist,
  followEntity,
  listAlerts,
  listComparison,
  listComparisonHistory,
  listDatasets,
  listDatasetScores,
  listNotificationDeliveryHistory,
  listPortfolio,
  listSavedViews,
  listWatchlist,
  listWorkspaceMembers,
  listWorkspaceActivity,
  listWorkspaceComments,
  listAssignedToMe,
  listApprovalRequests,
  listReviewChecklistTemplates,
  listWorkspaces,
  login,
  markAlertRead,
  markAllAlertsRead,
  markWorkspaceDiscussionRead,
  getWorkspaceAssignment,
  getWorkspacePolicy,
  register,
  rejectApprovalRequest,
  removeComparisonItem,
  removePortfolioItem,
  removeWatchlistItem,
  resolveDecisionOutcome,
  refreshDatasetScoring,
  saveDatasetImportProfile,
  saveDatasetManualMapping,
  scoreDataset,
  setActiveWorkspaceId,
  updateComparisonItem,
  updateNotificationPreferences,
  updatePortfolioItemStatus,
  updateReviewChecklistItem,
  updateWorkspaceMemberRole,
  updateWorkspaceAssignment,
  updateWorkspacePolicy,
  upsertReviewChecklistTemplate,
  unfollowEntity,
  upsertFollowUp,
} from "./api";
import {
  alertSeverityClassName,
  alertDestination,
  alertDestinationLabel,
  alertTypeLabel,
  approvalActionLabel,
  approvalStatusClassName,
  approvalStatusLabel,
  assignmentDestination,
  assignmentEntityLabel,
  applyPortfolioSavedViewForReview,
  buildComparisonByPortfolioId,
  buildComparisonByScoreId,
  buildComparisonByWatchlistId,
  buildPortfolioByScoreId,
  buildPortfolioByWatchlistId,
  buildWatchlistByScoreId,
  canChangeWorkspaceMemberRole,
  canRemoveWorkspaceMember,
  comparisonDecisionClassName,
  comparisonDecisionLabel,
  comparisonDecisionOptions,
  decisionHistoryEventLabel,
  discussionAttentionDestination,
  discussionAttentionLabel,
  datasetImportPresentation,
  datasetNeedsImportRepair,
  datasetReadinessPresentation,
  datasetScoringStatusClassName,
  datasetScoringStatusLabel,
  filterPortfolioItemsForReview,
  filterScoresForReview,
  flagPreview,
  formatMoney,
  formatPercent,
  formatRatio,
  importProfileApplicationPresentation,
  importProfileMappingSourceLabel,
  manualMappingByTarget,
  manualMappingTargetPresentations,
  notificationCadenceLabel,
  notificationDeliveryStatusClassName,
  notificationDeliveryStatusLabel,
  notificationDeliveryModeLabel,
  notificationDeliveryStateLabel,
  notificationDigestBatchStatusLabel,
  portfolioStatusClassName,
  portfolioStatusLabel,
  portfolioStatusOptions,
  primaryRecordLabel,
  reasoningPreview,
  reviewChecklistReadinessMessage,
  reviewChecklistStatusClassName,
  reviewChecklistStatusLabel,
  reviewChecklistTargetLabel,
  savedViewCriteriaLabel,
  scoreBand,
  sortAlertsForReview,
  sortComparisonItemsForReview,
  sortDecisionHistoryForReview,
  sortNotificationDeliveriesForReview,
  sortNotificationDigestBatchesForReview,
  sortPortfolioItemsForReview,
  sortWatchlistItemsForReview,
  summarizePortfolioForReview,
  type PortfolioReviewFilter,
  type ScoreFilter,
  summarizeScores,
  topReadinessIssues,
  workspaceActivityCategoryLabel,
  workspaceActivityDestination,
  workspaceActivityDestinationLabel,
  workspaceRoleLabel,
} from "./review-model";
import { WorkspaceCommentBody } from "./workspace-comment-body";

const authStorageKey = "tax-lien-review-session";

type PageState =
  | { name: "my-work" }
  | { name: "datasets" }
  | { name: "dataset"; datasetId: string }
  | { name: "watchlist" }
  | { name: "portfolio" }
  | { name: "comparison" }
  | { name: "alerts" }
  | { name: "notifications" }
  | { name: "delivery-history" }
  | { name: "activity" }
  | { name: "outcome-review" }
  | { name: "assignments" }
  | { name: "approvals" }
  | { name: "decision-brief"; entityType: DecisionBriefTargetEntityType; entityId: string }
  | { name: "workspace" };

type AuthMode = "login" | "register";

interface StoredSession {
  token: string;
  user: AuthUserResponse;
}

interface DatasetDetailState {
  dataset: DatasetResponse | null;
  scores: ScoredRecordResponse[];
  scoringStatus: DatasetScoringStatusResponse | null;
  selectedScoreId: string | null;
  lastScoringJob: InternalJobResponse | null;
  isLoading: boolean;
  isScoring: boolean;
  error: string | null;
}

interface DatasetUploadState {
  isSubmitting: boolean;
  error: string | null;
  uploadedDataset: DatasetResponse | null;
}

interface WatchlistState {
  items: WatchlistItemResponse[];
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
}

interface PortfolioState {
  items: PortfolioItemResponse[];
  summary: PortfolioSummaryResponse | null;
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
}

interface SavedViewsState {
  views: SavedViewResponse[];
  queues: SavedViewResponse[];
  activeView: SavedViewResponse | null;
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
}

interface ComparisonState {
  items: ComparisonItemResponse[];
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
}

interface AlertsState {
  alerts: AlertResponse[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
}

interface NotificationPreferencesState {
  preferences: NotificationPreferencesResponse | null;
  categories: NotificationPreferenceCategory[];
  isLoading: boolean;
  error: string | null;
  success: string | null;
  isSaving: boolean;
}

interface NotificationDeliveryHistoryState {
  deliveries: NotificationDeliveryHistoryItem[];
  digestBatches: NotificationDigestBatchResponse[];
  isLoading: boolean;
  error: string | null;
}

interface WorkspaceState {
  workspaces: WorkspaceResponse[];
  current: WorkspaceResponse | null;
  members: WorkspaceMemberResponse[];
  isLoading: boolean;
  error: string | null;
  success: string | null;
  actionId: string | null;
}

interface WorkspaceActivityState {
  activities: WorkspaceActivityResponse[];
  category: WorkspaceActivityCategory | "all";
  isLoading: boolean;
  error: string | null;
}

function App() {
  const [session, setSession] = useState<StoredSession | null>(() => loadStoredSession());
  const [page, setPage] = useState<PageState>(() => readRoute());
  const [datasets, setDatasets] = useState<DatasetResponse[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [datasetsError, setDatasetsError] = useState<string | null>(null);
  const [datasetUpload, setDatasetUpload] = useState<DatasetUploadState>({
    isSubmitting: false,
    error: null,
    uploadedDataset: null,
  });
  const [watchlist, setWatchlist] = useState<WatchlistState>({
    items: [],
    isLoading: false,
    error: null,
    actionId: null,
  });
  const [portfolio, setPortfolio] = useState<PortfolioState>({
    items: [],
    summary: null,
    isLoading: false,
    error: null,
    actionId: null,
  });
  const [savedViews, setSavedViews] = useState<SavedViewsState>({
    views: [],
    queues: [],
    activeView: null,
    isLoading: false,
    error: null,
    actionId: null,
  });
  const [comparison, setComparison] = useState<ComparisonState>({
    items: [],
    isLoading: false,
    error: null,
    actionId: null,
  });
  const [alerts, setAlerts] = useState<AlertsState>({
    alerts: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    actionId: null,
  });
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferencesState>({
    preferences: null,
    categories: [],
    isLoading: false,
    error: null,
    success: null,
    isSaving: false,
  });
  const [notificationDeliveryHistory, setNotificationDeliveryHistory] =
    useState<NotificationDeliveryHistoryState>({
      deliveries: [],
      digestBatches: [],
      isLoading: false,
      error: null,
    });
  const [workspace, setWorkspace] = useState<WorkspaceState>({
    workspaces: [],
    current: null,
    members: [],
    isLoading: false,
    error: null,
    success: null,
    actionId: null,
  });
  const [workspaceActivity, setWorkspaceActivity] = useState<WorkspaceActivityState>({
    activities: [],
    category: "all",
    isLoading: false,
    error: null,
  });
  const authToken = session?.token ?? null;

  useEffect(() => {
    const handlePopState = () => setPage(readRoute());
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    void refreshSession(session.token, setSession);
  }, [session?.token]);

  useEffect(() => {
    if (!authToken) {
      setActiveWorkspaceId(null);
      setWorkspace({
        workspaces: [],
        current: null,
        members: [],
        isLoading: false,
        error: null,
        success: null,
        actionId: null,
      });
      setWorkspaceActivity({
        activities: [],
        category: "all",
        isLoading: false,
        error: null,
      });
      return;
    }

    void refreshWorkspaceContext(authToken);
  }, [authToken]);

  useEffect(() => {
    if (!authToken) {
      setDatasets([]);
      setDatasetUpload({
        isSubmitting: false,
        error: null,
        uploadedDataset: null,
      });
      setWatchlist({
        items: [],
        isLoading: false,
        error: null,
        actionId: null,
      });
      setPortfolio({
        items: [],
        summary: null,
        isLoading: false,
        error: null,
        actionId: null,
      });
      setSavedViews({
        views: [],
        queues: [],
        activeView: null,
        isLoading: false,
        error: null,
        actionId: null,
      });
      setComparison({
        items: [],
        isLoading: false,
        error: null,
        actionId: null,
      });
      setAlerts({
        alerts: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
        actionId: null,
      });
      setNotificationPreferences({
        preferences: null,
        categories: [],
        isLoading: false,
        error: null,
        success: null,
        isSaving: false,
      });
      setNotificationDeliveryHistory({
        deliveries: [],
        digestBatches: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    setDatasetsLoading(true);
    setDatasetsError(null);

    listDatasets(authToken)
      .then((result) => {
        setDatasets(result.datasets);
      })
      .catch((error: unknown) => {
        setDatasetsError(errorMessage(error));
        if (isAuthError(error)) {
          clearSession(setSession);
        }
      })
      .finally(() => setDatasetsLoading(false));
  }, [authToken]);

  async function refreshWorkspaceContext(token: string, workspaceId?: string): Promise<boolean> {
    setWorkspace((current) => ({ ...current, isLoading: true, error: null, success: null }));
    setActiveWorkspaceId(workspaceId ?? null);

    try {
      const result = await listWorkspaces(token);
      const selectedId = workspaceId ?? result.currentWorkspaceId;
      setActiveWorkspaceId(selectedId);
      const membersResult = await listWorkspaceMembers(token);
      const current = result.workspaces.find((candidate) => candidate.id === selectedId) ?? null;
      setWorkspace({
        workspaces: result.workspaces,
        current,
        members: membersResult.members,
        isLoading: false,
        error: null,
        success: null,
        actionId: null,
      });
      return true;
    } catch (error: unknown) {
      setWorkspace((current) => ({
        ...current,
        isLoading: false,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
      return false;
    }
  }

  async function refreshWorkspaceActivity(
    token: string,
    category: WorkspaceActivityCategory | "all" = workspaceActivity.category,
  ): Promise<void> {
    setWorkspaceActivity((current) => ({
      ...current,
      activities: current.category === category ? current.activities : [],
      category,
      isLoading: true,
      error: null,
    }));
    try {
      const result = await listWorkspaceActivity(token, category === "all" ? undefined : category);
      setWorkspaceActivity({
        activities: result.activities,
        category,
        isLoading: false,
        error: null,
      });
    } catch (error: unknown) {
      setWorkspaceActivity((current) => ({
        ...current,
        category,
        isLoading: false,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function switchWorkspace(workspaceId: string): Promise<boolean> {
    if (!session) {
      return false;
    }
    if (workspaceId === workspace.current?.id) {
      return true;
    }

    if (!(await refreshWorkspaceContext(session.token, workspaceId))) {
      return false;
    }
    setDatasetsLoading(true);
    setDatasetsError(null);
    try {
      const result = await listDatasets(session.token);
      setDatasets(result.datasets);
      await Promise.all([
        refreshWatchlist(session.token),
        refreshPortfolio(session.token),
        refreshComparison(session.token),
      ]);
      setWorkspaceActivity({
        activities: [],
        category: "all",
        isLoading: false,
        error: null,
      });
      navigate({ name: "my-work" }, setPage);
      return true;
    } catch (error: unknown) {
      setDatasetsError(errorMessage(error));
      return false;
    } finally {
      setDatasetsLoading(false);
    }
  }

  async function createWorkspaceMember(
    email: string,
    role: Exclude<WorkspaceRole, "owner">,
  ): Promise<void> {
    if (!session) {
      return;
    }
    setWorkspace((current) => ({ ...current, actionId: "add", error: null, success: null }));
    try {
      const result = await addWorkspaceMember(session.token, email, role);
      setWorkspace((current) => ({
        ...current,
        members: [...current.members, result.member],
        current: current.current
          ? { ...current.current, memberCount: current.current.memberCount + 1 }
          : null,
        actionId: null,
        success: `${result.member.email} was added to this workspace.`,
      }));
    } catch (error: unknown) {
      setWorkspace((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
    }
  }

  async function changeWorkspaceMemberRole(
    membershipId: string,
    role: Exclude<WorkspaceRole, "owner">,
  ): Promise<void> {
    if (!session) {
      return;
    }
    setWorkspace((current) => ({ ...current, actionId: membershipId, error: null, success: null }));
    try {
      const result = await updateWorkspaceMemberRole(session.token, membershipId, role);
      setWorkspace((current) => ({
        ...current,
        members: current.members.map((member) =>
          member.id === result.member.id ? result.member : member,
        ),
        actionId: null,
        success: `${result.member.email} is now ${result.member.role}.`,
      }));
    } catch (error: unknown) {
      setWorkspace((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
    }
  }

  async function removeWorkspaceMember(membershipId: string): Promise<void> {
    if (!session) {
      return;
    }
    setWorkspace((current) => ({ ...current, actionId: membershipId, error: null, success: null }));
    try {
      const result = await deactivateWorkspaceMember(session.token, membershipId);
      setWorkspace((current) => ({
        ...current,
        members: current.members.filter((member) => member.id !== result.member.id),
        current: current.current
          ? { ...current.current, memberCount: Math.max(1, current.current.memberCount - 1) }
          : null,
        actionId: null,
        success: `${result.member.email} no longer has access to this workspace.`,
      }));
    } catch (error: unknown) {
      setWorkspace((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
    }
  }

  async function openPersonalDataset(datasetId: string): Promise<void> {
    if (!session) {
      return;
    }
    const personalWorkspace = workspace.workspaces.find((candidate) => candidate.isDefault);
    if (personalWorkspace && personalWorkspace.id !== workspace.current?.id) {
      if (!(await switchWorkspace(personalWorkspace.id))) {
        return;
      }
    }
    navigate({ name: "dataset", datasetId }, setPage);
  }

  async function openAlertRelated(alert: AlertResponse): Promise<void> {
    const destination = alertDestination(alert);
    if (!destination) {
      return;
    }

    if (destination.workspaceId && destination.workspaceId !== workspace.current?.id) {
      if (!(await switchWorkspace(destination.workspaceId))) {
        return;
      }
    }

    switch (destination.surface) {
      case "dataset":
        if (!destination.workspaceId) {
          await openPersonalDataset(destination.entityId);
        } else {
          navigate({ name: "dataset", datasetId: destination.entityId }, setPage);
        }
        break;
      case "comparison":
        navigate({ name: "comparison" }, setPage);
        break;
      case "watchlist":
        navigate({ name: "watchlist" }, setPage);
        break;
      case "portfolio":
        navigate({ name: "portfolio" }, setPage);
        break;
    }

    if (alert.status === "unread") {
      void markOneAlertRead(alert.id);
    }
  }

  function openAssignment(assignment: WorkspaceAssignmentResponse): void {
    const destination = assignmentDestination(assignment);
    if (!destination) {
      return;
    }
    switch (destination.surface) {
      case "dataset":
        navigate({ name: "dataset", datasetId: destination.datasetId }, setPage);
        return;
      case "comparison":
        navigate({ name: "comparison" }, setPage);
        return;
      case "watchlist":
        navigate({ name: "watchlist" }, setPage);
        return;
      case "portfolio":
        navigate({ name: "portfolio" }, setPage);
        return;
      case "workspace":
        return;
      case "approvals":
        navigate({ name: "approvals" }, setPage);
        return;
    }
  }

  function openDiscussionAttention(attention: DiscussionAttentionResponse): void {
    const destination = discussionAttentionDestination(attention);
    if (!destination) {
      return;
    }
    switch (destination.surface) {
      case "dataset":
        navigate({ name: "dataset", datasetId: destination.datasetId }, setPage);
        return;
      case "comparison":
        navigate({ name: "comparison" }, setPage);
        return;
      case "watchlist":
        navigate({ name: "watchlist" }, setPage);
        return;
      case "portfolio":
        navigate({ name: "portfolio" }, setPage);
        return;
      case "workspace":
      case "approvals":
        return;
    }
  }

  function openFollow(subscription: FollowSubscriptionResponse): void {
    switch (subscription.targetEntityType) {
      case "dataset":
        navigate({ name: "dataset", datasetId: subscription.targetEntityId }, setPage);
        return;
      case "comparison_item":
        navigate({ name: "comparison" }, setPage);
        return;
      case "watchlist_item":
        navigate({ name: "watchlist" }, setPage);
        return;
      case "portfolio_item":
        navigate({ name: "portfolio" }, setPage);
        return;
    }
  }

  function openWorkspaceActivity(activity: WorkspaceActivityResponse): void {
    const destination = workspaceActivityDestination(activity);
    if (!destination) {
      return;
    }

    switch (destination.surface) {
      case "dataset":
        navigate({ name: "dataset", datasetId: destination.datasetId }, setPage);
        return;
      case "comparison":
        navigate({ name: "comparison" }, setPage);
        return;
      case "watchlist":
        navigate({ name: "watchlist" }, setPage);
        return;
      case "portfolio":
        navigate({ name: "portfolio" }, setPage);
        return;
      case "workspace":
        navigate({ name: "workspace" }, setPage);
        return;
      case "approvals":
        navigate({ name: "approvals" }, setPage);
        return;
    }
  }

  useEffect(() => {
    if (!authToken) {
      return;
    }

    void refreshWatchlist(authToken);
    void refreshPortfolio(authToken);
    void refreshComparison(authToken);
    void refreshAlerts(authToken);
    void refreshSavedViews(authToken);
    void refreshNotificationPreferences(authToken);
    void refreshNotificationDeliveryHistory(authToken);
  }, [authToken]);

  useEffect(() => {
    if (!authToken || page.name !== "activity" || !workspace.current) {
      return;
    }

    void refreshWorkspaceActivity(authToken, workspaceActivity.category);
  }, [authToken, page.name, workspace.current?.id]);

  function handleSignedIn(nextSession: StoredSession): void {
    sessionStorage.setItem(authStorageKey, JSON.stringify(nextSession));
    setSession(nextSession);
    navigate({ name: "my-work" }, setPage);
  }

  function handleSignOut(): void {
    clearSession(setSession);
    navigate({ name: "my-work" }, setPage);
  }

  async function uploadDatasetFromBrowser(file: File | null, sourceLabel: string): Promise<void> {
    if (!session) {
      return;
    }

    if (!file) {
      setDatasetUpload({
        isSubmitting: false,
        error: "Choose a CSV file before uploading.",
        uploadedDataset: null,
      });
      return;
    }

    setDatasetUpload({
      isSubmitting: true,
      error: null,
      uploadedDataset: null,
    });

    try {
      const result = await createDataset(session.token, { file, sourceLabel });
      setDatasets((current) => [result.dataset, ...current.filter((dataset) => dataset.id !== result.dataset.id)]);
      setDatasetsError(null);
      setDatasetUpload({
        isSubmitting: false,
        error: null,
        uploadedDataset: result.dataset,
      });
      navigate({ name: "dataset", datasetId: result.dataset.id }, setPage);
    } catch (error: unknown) {
      setDatasetUpload({
        isSubmitting: false,
        error: errorMessage(error),
        uploadedDataset: null,
      });
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function refreshWatchlist(token: string): Promise<void> {
    setWatchlist((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const result = await listWatchlist(token);
      setWatchlist((current) => ({
        ...current,
        items: result.items,
        isLoading: false,
        error: null,
      }));
    } catch (error: unknown) {
      setWatchlist((current) => ({
        ...current,
        isLoading: false,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function refreshPortfolio(token: string): Promise<void> {
    setPortfolio((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const [result, summary] = await Promise.all([listPortfolio(token), getPortfolioSummary(token)]);
      setPortfolio((current) => ({
        ...current,
        items: result.items,
        summary,
        isLoading: false,
        error: null,
      }));
    } catch (error: unknown) {
      setPortfolio((current) => ({
        ...current,
        isLoading: false,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function refreshSavedViews(token: string): Promise<void> {
    setSavedViews((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const result = await listSavedViews(token);
      setSavedViews((current) => ({
        ...current,
        views: result.views,
        queues: result.queues,
        activeView:
          current.activeView && [...result.views, ...result.queues].some((view) => view.id === current.activeView?.id)
            ? current.activeView
            : null,
        isLoading: false,
        error: null,
      }));
    } catch (error: unknown) {
      setSavedViews((current) => ({
        ...current,
        isLoading: false,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function saveCurrentPortfolioView(name: string, filter: PortfolioReviewFilter): Promise<void> {
    if (!session) {
      return;
    }

    setSavedViews((current) => ({ ...current, actionId: "save-portfolio-view", error: null }));

    try {
      const filters =
        filter === "all"
          ? {}
          : filter === "active"
            ? { statuses: portfolioStatusOptions.filter((status) => status !== "closed" && status !== "discarded") }
            : { statuses: [filter] };
      const result = await createSavedView(session.token, {
        surface: "portfolio",
        name,
        filters,
        sort: { key: "tracked_at", direction: "desc" },
      });
      setSavedViews((current) => ({
        ...current,
        views: [result.view, ...current.views.filter((view) => view.id !== result.view.id)],
        activeView: result.view,
        actionId: null,
        error: null,
      }));
    } catch (error: unknown) {
      setSavedViews((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function applyPortfolioSavedView(savedViewId: string | null): Promise<void> {
    if (!session) {
      return;
    }

    if (!savedViewId) {
      setSavedViews((current) => ({ ...current, activeView: null, actionId: null, error: null }));
      await refreshPortfolio(session.token);
      return;
    }

    setSavedViews((current) => ({ ...current, actionId: savedViewId, error: null }));

    try {
      const result = await applySavedView(session.token, savedViewId);
      if (result.surface !== "portfolio") {
        throw new ApiClientError(400, "saved_view_wrong_surface", "Saved view does not target portfolio.");
      }
      setPortfolio((current) => ({
        ...current,
        items: result.items,
        summary: result.summary,
      }));
      setSavedViews((current) => ({
        ...current,
        activeView: result.view,
        actionId: null,
        error: null,
      }));
    } catch (error: unknown) {
      setSavedViews((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function removeSavedPortfolioView(savedViewId: string): Promise<void> {
    if (!session) {
      return;
    }

    setSavedViews((current) => ({ ...current, actionId: savedViewId, error: null }));

    try {
      await deleteSavedView(session.token, savedViewId);
      setSavedViews((current) => ({
        ...current,
        views: current.views.filter((view) => view.id !== savedViewId),
        activeView: current.activeView?.id === savedViewId ? null : current.activeView,
        actionId: null,
        error: null,
      }));
    } catch (error: unknown) {
      setSavedViews((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function refreshComparison(token: string): Promise<void> {
    setComparison((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const result = await listComparison(token);
      setComparison((current) => ({
        ...current,
        items: sortComparisonItemsForReview(result.items),
        isLoading: false,
        error: null,
      }));
    } catch (error: unknown) {
      setComparison((current) => ({
        ...current,
        isLoading: false,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function refreshAlerts(token: string): Promise<void> {
    setAlerts((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const result = await listAlerts(token);
      setAlerts((current) => ({
        ...current,
        alerts: sortAlertsForReview(result.alerts),
        unreadCount: result.unreadCount,
        isLoading: false,
        error: null,
      }));
    } catch (error: unknown) {
      setAlerts((current) => ({
        ...current,
        isLoading: false,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function refreshNotificationPreferences(token: string): Promise<void> {
    setNotificationPreferences((current) => ({ ...current, isLoading: true, error: null, success: null }));

    try {
      const result = await getNotificationPreferences(token);
      setNotificationPreferences((current) => ({
        ...current,
        preferences: result.preferences,
        categories: result.categories,
        isLoading: false,
        error: null,
      }));
    } catch (error: unknown) {
      setNotificationPreferences((current) => ({
        ...current,
        isLoading: false,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function refreshNotificationDeliveryHistory(token: string): Promise<void> {
    setNotificationDeliveryHistory((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const result = await listNotificationDeliveryHistory(token);
      setNotificationDeliveryHistory({
        deliveries: sortNotificationDeliveriesForReview(result.deliveries),
        digestBatches: sortNotificationDigestBatchesForReview(result.digestBatches),
        isLoading: false,
        error: null,
      });
    } catch (error: unknown) {
      setNotificationDeliveryHistory((current) => ({
        ...current,
        isLoading: false,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function saveNotificationPreferenceRules(rules: NotificationPreferenceRule[]): Promise<void> {
    if (!session) {
      return;
    }

    setNotificationPreferences((current) => ({ ...current, isSaving: true, error: null, success: null }));

    try {
      const result = await updateNotificationPreferences(session.token, { rules });
      setNotificationPreferences((current) => ({
        ...current,
        preferences: result.preferences,
        categories: result.categories,
        isSaving: false,
        error: null,
        success: "Notification preferences saved.",
      }));
    } catch (error: unknown) {
      setNotificationPreferences((current) => ({
        ...current,
        isSaving: false,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function markOneAlertRead(alertId: string): Promise<void> {
    if (!session) {
      return;
    }

    setAlerts((current) => ({ ...current, actionId: alertId, error: null }));

    try {
      const result = await markAlertRead(session.token, alertId);
      setAlerts((current) => ({
        ...current,
        alerts: sortAlertsForReview(
          current.alerts.map((alert) => (alert.id === result.alert.id ? result.alert : alert)),
        ),
        unreadCount:
          current.alerts.find((alert) => alert.id === result.alert.id)?.status === "unread"
            ? Math.max(0, current.unreadCount - 1)
            : current.unreadCount,
        actionId: null,
        error: null,
      }));
    } catch (error: unknown) {
      setAlerts((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function markEveryAlertRead(): Promise<void> {
    if (!session) {
      return;
    }

    setAlerts((current) => ({ ...current, actionId: "read-all", error: null }));

    try {
      await markAllAlertsRead(session.token);
      const readAt = new Date().toISOString();
      setAlerts((current) => ({
        ...current,
        alerts: sortAlertsForReview(
          current.alerts.map((alert) => ({
            ...alert,
            status: "read",
            readAt: alert.readAt ?? readAt,
          })),
        ),
        unreadCount: 0,
        actionId: null,
        error: null,
      }));
    } catch (error: unknown) {
      setAlerts((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function addScoreToWatchlist(scoredRecordId: string): Promise<void> {
    if (!session) {
      return;
    }

    setWatchlist((current) => ({ ...current, actionId: scoredRecordId, error: null }));

    try {
      const result = await addWatchlistItem(session.token, scoredRecordId);
      setWatchlist((current) => upsertWatchlistItem(current, result.item));
    } catch (error: unknown) {
      setWatchlist((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function removeFromWatchlist(watchlistItemId: string): Promise<void> {
    if (!session) {
      return;
    }

    setWatchlist((current) => ({ ...current, actionId: watchlistItemId, error: null }));

    try {
      await removeWatchlistItem(session.token, watchlistItemId);
      setWatchlist((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== watchlistItemId),
        actionId: null,
        error: null,
      }));
    } catch (error: unknown) {
      setWatchlist((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function addScoreToPortfolio(scoredRecordId: string): Promise<void> {
    if (!session) {
      return;
    }

    setPortfolio((current) => ({ ...current, actionId: scoredRecordId, error: null }));

    try {
      const result = await addPortfolioItem(session.token, { scoredRecordId });
      setPortfolio((current) => upsertPortfolioItem(current, result.item));
    } catch (error: unknown) {
      setPortfolio((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function addWatchlistToPortfolio(watchlistItemId: string): Promise<void> {
    if (!session) {
      return;
    }

    setPortfolio((current) => ({ ...current, actionId: watchlistItemId, error: null }));

    try {
      const result = await addPortfolioItem(session.token, { watchlistItemId });
      setPortfolio((current) => upsertPortfolioItem(current, result.item));
    } catch (error: unknown) {
      setPortfolio((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function updatePortfolioStatus(portfolioItemId: string, status: PortfolioStatus): Promise<void> {
    if (!session) {
      return;
    }

    setPortfolio((current) => ({ ...current, actionId: portfolioItemId, error: null }));

    try {
      const result = await updatePortfolioItemStatus(session.token, portfolioItemId, status);
      setPortfolio((current) => upsertPortfolioItem(current, result.item));
    } catch (error: unknown) {
      setPortfolio((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function removeFromPortfolio(portfolioItemId: string): Promise<void> {
    if (!session) {
      return;
    }

    setPortfolio((current) => ({ ...current, actionId: portfolioItemId, error: null }));

    try {
      await removePortfolioItem(session.token, portfolioItemId);
      setPortfolio((current) => ({
        ...current,
        items: sortPortfolioItemsForReview(current.items.filter((item) => item.id !== portfolioItemId)),
        summary: summarizePortfolioForReview(current.items.filter((item) => item.id !== portfolioItemId)),
        actionId: null,
        error: null,
      }));
    } catch (error: unknown) {
      setPortfolio((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function addScoreToComparison(scoredRecordId: string): Promise<void> {
    if (!session) {
      return;
    }

    setComparison((current) => ({ ...current, actionId: scoredRecordId, error: null }));

    try {
      const result = await addComparisonItem(session.token, { scoredRecordId });
      setComparison((current) => upsertComparisonItem(current, result.item));
    } catch (error: unknown) {
      setComparison((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function addWatchlistToComparison(watchlistItemId: string): Promise<void> {
    if (!session) {
      return;
    }

    setComparison((current) => ({ ...current, actionId: watchlistItemId, error: null }));

    try {
      const result = await addComparisonItem(session.token, { watchlistItemId });
      setComparison((current) => upsertComparisonItem(current, result.item));
    } catch (error: unknown) {
      setComparison((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function addPortfolioToComparison(portfolioItemId: string): Promise<void> {
    if (!session) {
      return;
    }

    setComparison((current) => ({ ...current, actionId: portfolioItemId, error: null }));

    try {
      const result = await addComparisonItem(session.token, { portfolioItemId });
      setComparison((current) => upsertComparisonItem(current, result.item));
    } catch (error: unknown) {
      setComparison((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function updateComparisonDecisionNote(
    comparisonItemId: string,
    input: { decision?: ComparisonDecision; note?: string | null },
  ): Promise<void> {
    if (!session) {
      return;
    }

    setComparison((current) => ({ ...current, actionId: comparisonItemId, error: null }));

    try {
      const result = await updateComparisonItem(session.token, comparisonItemId, input);
      setComparison((current) => upsertComparisonItem(current, result.item));
    } catch (error: unknown) {
      setComparison((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  async function handoffComparisonItemToWatchlist(
    comparisonItemId: string,
  ): Promise<ComparisonHandoffToWatchlistResponse> {
    if (!session) {
      throw new ApiClientError(401, "auth_missing_token", "Authentication token is required.");
    }

    setComparison((current) => ({ ...current, actionId: comparisonItemId, error: null }));

    try {
      const result = await handoffComparisonToWatchlist(session.token, comparisonItemId);
      setWatchlist((current) => upsertWatchlistItem(current, result.item));
      setComparison((current) => ({ ...current, actionId: null, error: null }));
      return result;
    } catch (error: unknown) {
      setComparison((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
      throw error;
    }
  }

  async function handoffComparisonItemToPortfolio(
    comparisonItemId: string,
  ): Promise<ComparisonHandoffToPortfolioResponse> {
    if (!session) {
      throw new ApiClientError(401, "auth_missing_token", "Authentication token is required.");
    }

    setComparison((current) => ({ ...current, actionId: comparisonItemId, error: null }));

    try {
      const result = await handoffComparisonToPortfolio(session.token, comparisonItemId, { status: "tracked" });
      setPortfolio((current) => upsertPortfolioItem(current, result.item));
      setComparison((current) => ({ ...current, actionId: null, error: null }));
      return result;
    } catch (error: unknown) {
      setComparison((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
      throw error;
    }
  }

  async function removeFromComparison(comparisonItemId: string): Promise<void> {
    if (!session) {
      return;
    }

    setComparison((current) => ({ ...current, actionId: comparisonItemId, error: null }));

    try {
      await removeComparisonItem(session.token, comparisonItemId);
      setComparison((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== comparisonItemId),
        actionId: null,
        error: null,
      }));
    } catch (error: unknown) {
      setComparison((current) => ({
        ...current,
        actionId: null,
        error: errorMessage(error),
      }));
      if (isAuthError(error)) {
        clearSession(setSession);
      }
    }
  }

  if (!session) {
    return <AuthScreen onSignedIn={handleSignedIn} />;
  }

  return (
    <main className="min-h-screen bg-field text-ink">
      <AppHeader
        user={session.user}
        page={page}
        watchlistCount={watchlist.items.length}
        portfolioCount={portfolio.items.length}
        comparisonCount={comparison.items.length}
        unreadAlertCount={alerts.unreadCount}
        workspace={workspace}
        onNavigate={(nextPage) => navigate(nextPage, setPage)}
        onWorkspaceChange={(workspaceId) => void switchWorkspace(workspaceId)}
        onSignOut={handleSignOut}
      />
      {workspace.current && !workspace.current.permissions.canManageSharedData ? (
        <div className="border-b border-amber-200 bg-amber-50">
          <p className="mx-auto max-w-7xl px-4 py-2 text-sm text-amber-900">
            You have read-only member access in {workspace.current.name}. Owners and admins manage shared
            datasets and decisions.
          </p>
        </div>
      ) : null}
      <div
        key={workspace.current?.id ?? "workspace-loading"}
        className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[320px_1fr]"
      >
        <DatasetListPanel
          datasets={datasets}
          isLoading={datasetsLoading}
          error={datasetsError}
          activeDatasetId={page.name === "dataset" ? page.datasetId : null}
          watchlistCount={watchlist.items.length}
          portfolioCount={portfolio.items.length}
          comparisonCount={comparison.items.length}
          unreadAlertCount={alerts.unreadCount}
          isWatchlistActive={page.name === "watchlist"}
          isPortfolioActive={page.name === "portfolio"}
          isComparisonActive={page.name === "comparison"}
          isAlertsActive={page.name === "alerts"}
          uploadState={datasetUpload}
          onUpload={uploadDatasetFromBrowser}
          onSelect={(datasetId) => navigate({ name: "dataset", datasetId }, setPage)}
          onWatchlistSelect={() => navigate({ name: "watchlist" }, setPage)}
          onPortfolioSelect={() => navigate({ name: "portfolio" }, setPage)}
          onComparisonSelect={() => navigate({ name: "comparison" }, setPage)}
          onAlertsSelect={() => navigate({ name: "alerts" }, setPage)}
          onRetry={() => {
            setDatasetsLoading(true);
            setDatasetsError(null);
            listDatasets(session.token)
              .then((result) => setDatasets(result.datasets))
              .catch((error: unknown) => setDatasetsError(errorMessage(error)))
              .finally(() => setDatasetsLoading(false));
          }}
        />
        {page.name === "my-work" ? (
          <MyWorkPage
            token={session.token}
            workspaceId={workspace.current?.id ?? ""}
            onOpenAssignment={openAssignment}
            onOpenApproval={() => navigate({ name: "approvals" }, setPage)}
            onOpenDiscussion={openDiscussionAttention}
            onOpenFollow={openFollow}
          />
        ) : page.name === "dataset" ? (
          <DatasetDetailPage
            token={session.token}
            datasetId={page.datasetId}
            watchlistItems={watchlist.items}
            watchlistActionId={watchlist.actionId}
            watchlistError={watchlist.error}
            portfolioItems={portfolio.items}
            portfolioActionId={portfolio.actionId}
            portfolioError={portfolio.error}
            comparisonItems={comparison.items}
            comparisonActionId={comparison.actionId}
            comparisonError={comparison.error}
            onAddToWatchlist={(scoredRecordId) => void addScoreToWatchlist(scoredRecordId)}
            onRemoveFromWatchlist={(watchlistItemId) => void removeFromWatchlist(watchlistItemId)}
            onAddScoreToPortfolio={(scoredRecordId) => void addScoreToPortfolio(scoredRecordId)}
            onRemoveFromPortfolio={(portfolioItemId) => void removeFromPortfolio(portfolioItemId)}
            onAddScoreToComparison={(scoredRecordId) => void addScoreToComparison(scoredRecordId)}
            onRemoveFromComparison={(comparisonItemId) => void removeFromComparison(comparisonItemId)}
            onScoringJobUpdated={() => void refreshAlerts(session.token)}
          />
        ) : page.name === "watchlist" ? (
          <WatchlistPage
            token={session.token}
            items={watchlist.items}
            isLoading={watchlist.isLoading}
            error={watchlist.error}
            actionId={watchlist.actionId}
            portfolioItems={portfolio.items}
            portfolioActionId={portfolio.actionId}
            portfolioError={portfolio.error}
            comparisonItems={comparison.items}
            comparisonActionId={comparison.actionId}
            comparisonError={comparison.error}
            onRetry={() => void refreshWatchlist(session.token)}
            onRemove={(watchlistItemId) => void removeFromWatchlist(watchlistItemId)}
            onTrack={(watchlistItemId) => void addWatchlistToPortfolio(watchlistItemId)}
            onCompare={(watchlistItemId) => void addWatchlistToComparison(watchlistItemId)}
            onRemoveFromComparison={(comparisonItemId) => void removeFromComparison(comparisonItemId)}
          />
        ) : page.name === "portfolio" ? (
          <PortfolioPage
            token={session.token}
            items={portfolio.items}
            summary={portfolio.summary}
            savedViews={savedViews}
            isLoading={portfolio.isLoading}
            error={portfolio.error}
            actionId={portfolio.actionId}
            comparisonItems={comparison.items}
            comparisonActionId={comparison.actionId}
            comparisonError={comparison.error}
            onRetry={() => void refreshPortfolio(session.token)}
            onStatusChange={(portfolioItemId, status) => void updatePortfolioStatus(portfolioItemId, status)}
            onRemove={(portfolioItemId) => void removeFromPortfolio(portfolioItemId)}
            onCompare={(portfolioItemId) => void addPortfolioToComparison(portfolioItemId)}
            onRemoveFromComparison={(comparisonItemId) => void removeFromComparison(comparisonItemId)}
            onSaveView={(name, filter) => void saveCurrentPortfolioView(name, filter)}
            onApplyView={(savedViewId) => void applyPortfolioSavedView(savedViewId)}
            onDeleteView={(savedViewId) => void removeSavedPortfolioView(savedViewId)}
          />
        ) : page.name === "comparison" ? (
          <ComparisonPage
            token={session.token}
            canExecuteSensitiveActions={
              workspace.current?.permissions.canExecuteSensitiveActions ?? false
            }
            canResolveDecisions={workspace.current?.permissions.canManageSharedData ?? false}
            items={comparison.items}
            isLoading={comparison.isLoading}
            error={comparison.error}
            actionId={comparison.actionId}
            onRetry={() => void refreshComparison(session.token)}
            onUpdate={updateComparisonDecisionNote}
            onHandoffToWatchlist={handoffComparisonItemToWatchlist}
            onHandoffToPortfolio={handoffComparisonItemToPortfolio}
            onOpenWatchlist={() => navigate({ name: "watchlist" }, setPage)}
            onOpenPortfolio={() => navigate({ name: "portfolio" }, setPage)}
            onOpenDecisionBrief={(comparisonItemId) =>
              navigate(
                { name: "decision-brief", entityType: "comparison_item", entityId: comparisonItemId },
                setPage,
              )
            }
            onRemove={(comparisonItemId) => void removeFromComparison(comparisonItemId)}
          />
        ) : page.name === "decision-brief" ? (
          <DecisionBriefPage
            token={session.token}
            entityType={page.entityType}
            entityId={page.entityId}
            canResolveDecisions={workspace.current?.permissions.canManageSharedData ?? false}
            onBack={() => navigate({ name: "comparison" }, setPage)}
          />
        ) : page.name === "approvals" ? (
          <ApprovalQueuePage
            token={session.token}
            onOpenComparison={() => navigate({ name: "comparison" }, setPage)}
            onApproved={() => void refreshPortfolio(session.token)}
          />
        ) : page.name === "assignments" ? (
          <AssignedToMePage
            token={session.token}
            onOpen={openAssignment}
          />
        ) : page.name === "alerts" ? (
          <AlertsPage
            alerts={alerts.alerts}
            unreadCount={alerts.unreadCount}
            isLoading={alerts.isLoading}
            error={alerts.error}
            actionId={alerts.actionId}
            onRetry={() => void refreshAlerts(session.token)}
            onMarkRead={(alertId) => void markOneAlertRead(alertId)}
            onMarkAllRead={() => void markEveryAlertRead()}
            onOpenRelated={(alert) => void openAlertRelated(alert)}
          />
        ) : page.name === "notifications" ? (
          <NotificationPreferencesPage
            state={notificationPreferences}
            onRetry={() => void refreshNotificationPreferences(session.token)}
            onSave={(rules) => void saveNotificationPreferenceRules(rules)}
          />
        ) : page.name === "delivery-history" ? (
          <NotificationDeliveryHistoryPage
            state={notificationDeliveryHistory}
            onRetry={() => void refreshNotificationDeliveryHistory(session.token)}
            onOpenDataset={(datasetId) => void openPersonalDataset(datasetId)}
          />
        ) : page.name === "activity" ? (
          <WorkspaceActivityPage
            workspaceName={workspace.current?.name ?? "Workspace"}
            state={workspaceActivity}
            onCategoryChange={(category) => void refreshWorkspaceActivity(session.token, category)}
            onRetry={() => void refreshWorkspaceActivity(session.token)}
            onOpen={openWorkspaceActivity}
          />
        ) : page.name === "outcome-review" ? (
          <OutcomeReviewPage
            token={session.token}
            workspaceId={workspace.current?.id ?? ""}
            onOpenResolution={(resolution) =>
              navigate(
                {
                  name: "decision-brief",
                  entityType: "comparison_item",
                  entityId: resolution.target.targetEntityId,
                },
                setPage,
              )
            }
          />
        ) : page.name === "workspace" ? (
          <WorkspacePage
            token={session.token}
            state={workspace}
            currentUserId={session.user.id}
            onRetry={() => void refreshWorkspaceContext(session.token, workspace.current?.id)}
            onAddMember={(email, role) => void createWorkspaceMember(email, role)}
            onRoleChange={(membershipId, role) => void changeWorkspaceMemberRole(membershipId, role)}
            onRemoveMember={(membershipId) => void removeWorkspaceMember(membershipId)}
          />
        ) : (
          <ReviewHome
            datasets={datasets}
            watchlistCount={watchlist.items.length}
            portfolioCount={portfolio.items.length}
            comparisonCount={comparison.items.length}
            unreadAlertCount={alerts.unreadCount}
            isLoading={datasetsLoading}
          />
        )}
      </div>
    </main>
  );
}

function AuthScreen({ onSignedIn }: { onSignedIn: (session: StoredSession) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = mode === "login"
        ? await login({ email, password })
        : await register({ email, password });
      onSignedIn({ token: result.token, user: result.user });
    } catch (apiError: unknown) {
      setError(errorMessage(apiError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-field text-ink">
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_420px]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pine">
            Tax Lien Intelligence Platform
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
            Review scored lien opportunities with visible reasoning.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/75">
            Upload datasets, run scoring, and review records through authenticated tenant-scoped workflows.
            The browser shows only personal data or workspaces where the signed-in user is an active member.
          </p>
        </div>
        <form onSubmit={(event) => void submit(event)} className="border border-line bg-white p-5 shadow-sm">
          <div className="flex border border-line text-sm font-medium">
            <button
              type="button"
              className={`flex-1 px-3 py-2 ${mode === "login" ? "bg-pine text-white" : "bg-white text-ink"}`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`flex-1 px-3 py-2 ${mode === "register" ? "bg-pine text-white" : "bg-white text-ink"}`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>
          <label className="mt-5 block text-sm font-semibold" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full border border-line px-3 py-2"
            required
          />
          <label className="mt-4 block text-sm font-semibold" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full border border-line px-3 py-2"
            required
          />
          {error ? (
            <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 w-full bg-pine px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Working..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}

function AppHeader({
  user,
  page,
  watchlistCount,
  portfolioCount,
  comparisonCount,
  unreadAlertCount,
  workspace,
  onNavigate,
  onWorkspaceChange,
  onSignOut,
}: {
  user: AuthUserResponse;
  page: PageState;
  watchlistCount: number;
  portfolioCount: number;
  comparisonCount: number;
  unreadAlertCount: number;
  workspace: WorkspaceState;
  onNavigate: (page: PageState) => void;
  onWorkspaceChange: (workspaceId: string) => void;
  onSignOut: () => void;
}) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="min-w-[220px]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">Tax Lien Intelligence</p>
          <h1 className="text-xl font-semibold">Dataset Review</h1>
          {workspace.current ? (
            <button
              type="button"
              onClick={() => onNavigate({ name: "workspace" })}
              className="mt-1 text-left text-xs font-medium text-ink/70 hover:text-pine"
            >
              {workspace.current.name} · {workspaceRoleLabel(workspace.current.role)}
              {!workspace.current.permissions.canManageSharedData ? " · Read only" : ""}
            </button>
          ) : null}
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => onNavigate({ name: "my-work" })}
            className={`border border-line px-3 py-2 font-medium ${
              page.name === "my-work" ? "bg-field" : "bg-white"
            }`}
          >
            My work
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: "datasets" })}
            className={`border border-line px-3 py-2 font-medium ${
              page.name === "datasets" || page.name === "dataset" ? "bg-field" : "bg-white"
            }`}
          >
            Datasets
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: "watchlist" })}
            className={`border border-line px-3 py-2 font-medium ${page.name === "watchlist" ? "bg-field" : "bg-white"}`}
          >
            Watchlist ({watchlistCount})
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: "portfolio" })}
            className={`border border-line px-3 py-2 font-medium ${page.name === "portfolio" ? "bg-field" : "bg-white"}`}
          >
            Portfolio ({portfolioCount})
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: "comparison" })}
            className={`border border-line px-3 py-2 font-medium ${page.name === "comparison" ? "bg-field" : "bg-white"}`}
          >
            Compare ({comparisonCount})
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: "assignments" })}
            className={`border border-line px-3 py-2 font-medium ${page.name === "assignments" ? "bg-field" : "bg-white"}`}
          >
            Assigned to me
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: "approvals" })}
            className={`border border-line px-3 py-2 font-medium ${
              page.name === "approvals" ? "bg-field" : "bg-white"
            }`}
          >
            Approvals
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: "alerts" })}
            className={`border border-line px-3 py-2 font-medium ${page.name === "alerts" ? "bg-field" : "bg-white"}`}
          >
            Alerts ({unreadAlertCount})
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: "notifications" })}
            className={`border border-line px-3 py-2 font-medium ${page.name === "notifications" ? "bg-field" : "bg-white"}`}
          >
            Notifications
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: "delivery-history" })}
            className={`border border-line px-3 py-2 font-medium ${
              page.name === "delivery-history" ? "bg-field" : "bg-white"
            }`}
          >
            Delivery History
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: "activity" })}
            className={`border border-line px-3 py-2 font-medium ${
              page.name === "activity" ? "bg-field" : "bg-white"
            }`}
          >
            Activity
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: "outcome-review" })}
            className={`border border-line px-3 py-2 font-medium ${
              page.name === "outcome-review" ? "bg-field" : "bg-white"
            }`}
          >
            Outcomes
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: "workspace" })}
            className={`border border-line px-3 py-2 font-medium ${
              page.name === "workspace" ? "bg-field" : "bg-white"
            }`}
          >
            Workspace
          </button>
        </nav>
        <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
          {workspace.workspaces.length > 1 && workspace.current ? (
            <select
              aria-label="Current workspace"
              value={workspace.current.id}
              onChange={(event) => onWorkspaceChange(event.target.value)}
              className="max-w-[220px] border border-line bg-white px-3 py-2"
            >
              {workspace.workspaces.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          ) : null}
          <span className="max-w-[220px] truncate text-ink/70">{user.email}</span>
          <button type="button" onClick={onSignOut} className="border border-line px-3 py-2 font-medium">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function DatasetListPanel({
  datasets,
  isLoading,
  error,
  activeDatasetId,
  watchlistCount,
  portfolioCount,
  comparisonCount,
  unreadAlertCount,
  isWatchlistActive,
  isPortfolioActive,
  isComparisonActive,
  isAlertsActive,
  uploadState,
  onUpload,
  onSelect,
  onWatchlistSelect,
  onPortfolioSelect,
  onComparisonSelect,
  onAlertsSelect,
  onRetry,
}: {
  datasets: DatasetResponse[];
  isLoading: boolean;
  error: string | null;
  activeDatasetId: string | null;
  watchlistCount: number;
  portfolioCount: number;
  comparisonCount: number;
  unreadAlertCount: number;
  isWatchlistActive: boolean;
  isPortfolioActive: boolean;
  isComparisonActive: boolean;
  isAlertsActive: boolean;
  uploadState: DatasetUploadState;
  onUpload: (file: File | null, sourceLabel: string) => Promise<void>;
  onSelect: (datasetId: string) => void;
  onWatchlistSelect: () => void;
  onPortfolioSelect: () => void;
  onComparisonSelect: () => void;
  onAlertsSelect: () => void;
  onRetry: () => void;
}) {
  return (
    <aside className="border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">Datasets</h2>
      </div>
      <DatasetUploadPanel uploadState={uploadState} onUpload={onUpload} onSelect={onSelect} />
      <button
        type="button"
        onClick={onWatchlistSelect}
        className={`block w-full border-b border-line px-4 py-3 text-left hover:bg-field ${
          isWatchlistActive ? "bg-field" : "bg-white"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Watchlist</span>
          <span className="border border-line px-2 py-1 text-xs">{watchlistCount} kept</span>
        </div>
        <p className="mt-1 text-xs text-ink/60">Compare records saved from scored results.</p>
      </button>
      <button
        type="button"
        onClick={onPortfolioSelect}
        className={`block w-full border-b border-line px-4 py-3 text-left hover:bg-field ${
          isPortfolioActive ? "bg-field" : "bg-white"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Portfolio</span>
          <span className="border border-line px-2 py-1 text-xs">{portfolioCount} tracked</span>
        </div>
        <p className="mt-1 text-xs text-ink/60">Track active decisions and status.</p>
      </button>
      <button
        type="button"
        onClick={onComparisonSelect}
        className={`block w-full border-b border-line px-4 py-3 text-left hover:bg-field ${
          isComparisonActive ? "bg-field" : "bg-white"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Compare</span>
          <span className="border border-line px-2 py-1 text-xs">{comparisonCount} records</span>
        </div>
        <p className="mt-1 text-xs text-ink/60">Review candidates side by side with notes.</p>
      </button>
      <button
        type="button"
        onClick={onAlertsSelect}
        className={`block w-full border-b border-line px-4 py-3 text-left hover:bg-field ${
          isAlertsActive ? "bg-field" : "bg-white"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Alerts</span>
          <span className="border border-line px-2 py-1 text-xs">{unreadAlertCount} unread</span>
        </div>
        <p className="mt-1 text-xs text-ink/60">Review scoring outcomes that need visibility.</p>
      </button>
      {isLoading ? <PanelMessage label="Loading datasets..." /> : null}
      {error ? <PanelError message={error} onRetry={onRetry} /> : null}
      {!isLoading && !error && datasets.length === 0 ? (
        <PanelMessage label="No datasets found. Upload a CSV to begin review." />
      ) : null}
      <div className="divide-y divide-line">
        {datasets.map((dataset) => (
          <button
            key={dataset.id}
            type="button"
            onClick={() => onSelect(dataset.id)}
            className={`block w-full px-4 py-3 text-left hover:bg-field ${
              activeDatasetId === dataset.id ? "bg-field" : "bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{dataset.sourceLabel ?? dataset.originalFilename}</p>
                <p className="mt-1 truncate text-xs text-ink/60">{dataset.originalFilename}</p>
              </div>
              <span className="shrink-0 border border-line px-2 py-1 text-xs">{dataset.rowCount} rows</span>
            </div>
            <p className="mt-2 text-xs text-ink/60">
              {dataset.validationSummary.validRows} valid / {dataset.validationSummary.invalidRows} invalid
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`border px-2 py-1 text-xs font-semibold ${datasetReadinessPresentation(dataset).className}`}>
                {datasetReadinessPresentation(dataset).label}
              </span>
              <span className="truncate text-xs text-ink/60">{datasetImportPresentation(dataset).label}</span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function DatasetUploadPanel({
  uploadState,
  onUpload,
  onSelect,
}: {
  uploadState: DatasetUploadState;
  onUpload: (file: File | null, sourceLabel: string) => Promise<void>;
  onSelect: (datasetId: string) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const uploadedDataset = uploadState.uploadedDataset;
  const importPresentation = uploadedDataset ? datasetImportPresentation(uploadedDataset) : null;
  const readinessPresentation = uploadedDataset ? datasetReadinessPresentation(uploadedDataset) : null;

  useEffect(() => {
    if (!uploadState.uploadedDataset) {
      return;
    }

    setSelectedFile(null);
    setSourceLabel("");
    setFileInputKey((current) => current + 1);
  }, [uploadState.uploadedDataset?.id]);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await onUpload(selectedFile, sourceLabel);
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="border-b border-line bg-field px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Upload CSV</h3>
          <p className="mt-1 text-xs text-ink/60">Manual import with adapter/fallback visibility.</p>
        </div>
      </div>
      <label className="mt-4 block text-xs font-semibold uppercase text-ink/60" htmlFor="dataset-upload-file">
        CSV file
      </label>
      <input
        key={fileInputKey}
        id="dataset-upload-file"
        type="file"
        accept=".csv,text/csv"
        disabled={uploadState.isSubmitting}
        onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
        className="mt-2 w-full border border-line bg-white px-3 py-2 text-xs file:mr-3 file:border-0 file:bg-pine file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60"
      />
      <p className="mt-2 truncate text-xs text-ink/60">{selectedFile ? selectedFile.name : "No file selected"}</p>
      <label className="mt-3 block text-xs font-semibold uppercase text-ink/60" htmlFor="dataset-source-label">
        Source label
      </label>
      <input
        id="dataset-source-label"
        type="text"
        value={sourceLabel}
        disabled={uploadState.isSubmitting}
        onChange={(event) => setSourceLabel(event.target.value)}
        placeholder="Optional county or sale label"
        className="mt-2 w-full border border-line bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      />
      {uploadState.error ? (
        <div className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{uploadState.error}</div>
      ) : null}
      {uploadedDataset && importPresentation ? (
        <div className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <p className="font-semibold">Uploaded {uploadedDataset.originalFilename}</p>
          <p className="mt-1">
            {importPresentation.status}: {importPresentation.label} · {importPresentation.detail}
          </p>
          {readinessPresentation ? (
            <p className="mt-1">
              Readiness: {readinessPresentation.label} · score {uploadedDataset.readinessSummary.score}/100
            </p>
          ) : null}
          {uploadedDataset.importProfile.status !== "none" ? (
            <p className="mt-1">{uploadedDataset.importProfile.message}</p>
          ) : null}
          {importPresentation.warning ? <p className="mt-1 text-amber-900">{importPresentation.warning}</p> : null}
          <button
            type="button"
            onClick={() => onSelect(uploadedDataset.id)}
            className="mt-2 border border-emerald-300 bg-white px-2 py-1 font-semibold text-emerald-900"
          >
            Review dataset
          </button>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={uploadState.isSubmitting}
        className="mt-4 w-full bg-pine px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploadState.isSubmitting ? "Uploading..." : "Upload dataset"}
      </button>
    </form>
  );
}

function ReviewHome({
  datasets,
  watchlistCount,
  portfolioCount,
  comparisonCount,
  unreadAlertCount,
  isLoading,
}: {
  datasets: DatasetResponse[];
  watchlistCount: number;
  portfolioCount: number;
  comparisonCount: number;
  unreadAlertCount: number;
  isLoading: boolean;
}) {
  return (
    <section className="border border-line bg-white p-6">
      <h2 className="text-2xl font-semibold">Scored Results Review</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <Metric label="Datasets" value={isLoading ? "..." : String(datasets.length)} />
        <Metric label="Watchlist" value={String(watchlistCount)} />
        <Metric label="Portfolio" value={String(portfolioCount)} />
        <Metric label="Compare" value={String(comparisonCount)} />
        <Metric label="Unread Alerts" value={String(unreadAlertCount)} />
        <Metric
          label="Rows Uploaded"
          value={isLoading ? "..." : String(datasets.reduce((total, dataset) => total + dataset.rowCount, 0))}
        />
        <Metric
          label="Validation Warnings"
          value={isLoading ? "..." : String(datasets.reduce((total, dataset) => total + dataset.validationSummary.warnings.length, 0))}
        />
      </div>
      <div className="mt-6 border border-line bg-field p-4 text-sm text-ink/75">
        Upload a CSV or select a dataset to review scoring status, run scoring, and inspect record-level reasoning.
      </div>
    </section>
  );
}

function DatasetDetailPage({
  token,
  datasetId,
  watchlistItems,
  watchlistActionId,
  watchlistError,
  portfolioItems,
  portfolioActionId,
  portfolioError,
  comparisonItems,
  comparisonActionId,
  comparisonError,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onAddScoreToPortfolio,
  onRemoveFromPortfolio,
  onAddScoreToComparison,
  onRemoveFromComparison,
  onScoringJobUpdated,
}: {
  token: string;
  datasetId: string;
  watchlistItems: WatchlistItemResponse[];
  watchlistActionId: string | null;
  watchlistError: string | null;
  portfolioItems: PortfolioItemResponse[];
  portfolioActionId: string | null;
  portfolioError: string | null;
  comparisonItems: ComparisonItemResponse[];
  comparisonActionId: string | null;
  comparisonError: string | null;
  onAddToWatchlist: (scoredRecordId: string) => void;
  onRemoveFromWatchlist: (watchlistItemId: string) => void;
  onAddScoreToPortfolio: (scoredRecordId: string) => void;
  onRemoveFromPortfolio: (portfolioItemId: string) => void;
  onAddScoreToComparison: (scoredRecordId: string) => void;
  onRemoveFromComparison: (comparisonItemId: string) => void;
  onScoringJobUpdated: () => void;
}) {
  const [state, setState] = useState<DatasetDetailState>({
    dataset: null,
    scores: [],
    scoringStatus: null,
    selectedScoreId: null,
    lastScoringJob: null,
    isLoading: true,
    isScoring: false,
    error: null,
  });
  const [filter, setFilter] = useState<ScoreFilter>("all");
  const [query, setQuery] = useState("");
  const [mappingState, setMappingState] = useState<{
    isSaving: boolean;
    error: string | null;
    success: string | null;
  }>({
    isSaving: false,
    error: null,
    success: null,
  });
  const [profileState, setProfileState] = useState<{
    isSaving: boolean;
    isApplying: boolean;
    error: string | null;
    success: string | null;
  }>({
    isSaving: false,
    isApplying: false,
    error: null,
    success: null,
  });

  useEffect(() => {
    setState({
      dataset: null,
      scores: [],
      scoringStatus: null,
      selectedScoreId: null,
      lastScoringJob: null,
      isLoading: true,
      isScoring: false,
      error: null,
    });
    setMappingState({
      isSaving: false,
      error: null,
      success: null,
    });
    setProfileState({
      isSaving: false,
      isApplying: false,
      error: null,
      success: null,
    });

    Promise.all([getDataset(token, datasetId), listDatasetScores(token, datasetId), getDatasetScoringStatus(token, datasetId)])
      .then(([datasetResult, scoresResult, scoringStatusResult]) => {
        setState({
          dataset: datasetResult.dataset,
          scores: scoresResult.scores,
          scoringStatus: scoringStatusResult,
          selectedScoreId: scoresResult.scores[0]?.id ?? null,
          lastScoringJob: scoringStatusResult.activeJob ?? scoringStatusResult.latestJob ?? null,
          isLoading: false,
          isScoring: Boolean(scoringStatusResult.activeJob),
          error: null,
        });
      })
      .catch((error: unknown) => {
        setState((current) => ({
          ...current,
          isLoading: false,
          error: errorMessage(error),
        }));
      });
  }, [datasetId, token]);

  const visibleScores = useMemo(
    () => filterScoresForReview(state.scores, filter, query),
    [state.scores, filter, query],
  );
  const stats = useMemo(() => summarizeScores(state.scores), [state.scores]);
  const watchlistByScoreId = useMemo(() => buildWatchlistByScoreId(watchlistItems), [watchlistItems]);
  const portfolioByScoreId = useMemo(() => buildPortfolioByScoreId(portfolioItems), [portfolioItems]);
  const comparisonByScoreId = useMemo(() => buildComparisonByScoreId(comparisonItems), [comparisonItems]);
  const datasetWatchlistCount = state.scores.filter((score) => watchlistByScoreId.has(score.id)).length;
  const datasetPortfolioCount = state.scores.filter((score) => portfolioByScoreId.has(score.id)).length;
  const datasetComparisonCount = state.scores.filter((score) => comparisonByScoreId.has(score.id)).length;
  const selectedScore = state.scores.find((score) => score.id === state.selectedScoreId) ?? visibleScores[0] ?? null;

  useEffect(() => {
    const job = state.lastScoringJob;
    if (!job || !isActiveJobStatus(job.status)) {
      return;
    }

    const jobId = job.id;
    let isCancelled = false;

    async function pollJob(): Promise<void> {
      try {
        const jobResult = await getJob(token, jobId);
        if (isCancelled) {
          return;
        }

        if (jobResult.job.status === "completed") {
          const scoresResult = await listDatasetScores(token, datasetId);
          if (isCancelled) {
            return;
          }

          setState((current) => ({
            ...current,
            scores: scoresResult.scores,
            scoringStatus: {
              ...(current.scoringStatus ? withoutActiveJob(current.scoringStatus) : {
                datasetId,
                scoredRecordCount: scoresResult.scores.length,
                staleRecordCount: 0,
                maintenance: defaultMaintenanceStatus(),
                status: "refresh_completed",
              }),
              status:
                jobResult.job.requestKind === "refresh" || jobResult.job.requestKind === "policy_refresh"
                  ? "refresh_completed"
                  : "fresh",
              scoredRecordCount: scoresResult.scores.length,
              staleRecordCount: 0,
              latestJob: jobResult.job,
            },
            selectedScoreId: scoresResult.scores[0]?.id ?? current.selectedScoreId,
            lastScoringJob: jobResult.job,
            isScoring: false,
            error: null,
          }));
          onScoringJobUpdated();
          return;
        }

        if (jobResult.job.status === "failed") {
          setState((current) => ({
            ...current,
            scoringStatus: current.scoringStatus
              ? {
                  ...withoutActiveJob(current.scoringStatus),
                  status: "refresh_failed",
                  latestJob: jobResult.job,
                }
              : current.scoringStatus,
            lastScoringJob: jobResult.job,
            isScoring: false,
            error: jobResult.job.error?.message ?? "Scoring job failed.",
          }));
          onScoringJobUpdated();
          return;
        }

        setState((current) => ({
          ...current,
          scoringStatus: current.scoringStatus
            ? {
                ...current.scoringStatus,
                status: jobResult.job.status === "queued" ? "refresh_requested" : "refresh_in_progress",
                activeJob: jobResult.job,
                latestJob: jobResult.job,
              }
            : current.scoringStatus,
          lastScoringJob: jobResult.job,
          isScoring: jobResult.job.status === "queued" || jobResult.job.status === "running",
        }));
      } catch (error: unknown) {
        if (isCancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          isScoring: false,
          error: errorMessage(error),
        }));
      }
    }

    void pollJob();
    const interval = window.setInterval(() => {
      void pollJob();
    }, 2000);

    return () => {
      isCancelled = true;
      window.clearInterval(interval);
    };
  }, [datasetId, state.lastScoringJob?.id, state.lastScoringJob?.status, token]);

  async function runScoring(): Promise<void> {
    setState((current) => ({ ...current, isScoring: true, error: null }));

    try {
      const result = await scoreDataset(token, datasetId);
      setState((current) => ({
        ...current,
        scoringStatus: current.scoringStatus
          ? {
              ...current.scoringStatus,
              status: "refresh_requested",
              activeJob: result.job,
              latestJob: result.job,
            }
          : current.scoringStatus,
        lastScoringJob: result.job,
        isScoring: true,
        error: null,
      }));
      onScoringJobUpdated();
    } catch (error: unknown) {
      setState((current) => ({
        ...current,
        isScoring: false,
        error: errorMessage(error),
      }));
    }
  }

  async function refreshScoring(): Promise<void> {
    setState((current) => ({ ...current, isScoring: true, error: null }));

    try {
      const result = await refreshDatasetScoring(token, datasetId);
      setState((current) => ({
        ...current,
        scoringStatus: current.scoringStatus
          ? {
              ...current.scoringStatus,
              status: result.job.status === "running" ? "refresh_in_progress" : "refresh_requested",
              activeJob: result.job,
              latestJob: result.job,
            }
          : current.scoringStatus,
        lastScoringJob: result.job,
        isScoring: result.job.status === "queued" || result.job.status === "running",
        error: result.requestStatus === "already_running" ? result.message : null,
      }));
      onScoringJobUpdated();
    } catch (error: unknown) {
      setState((current) => ({
        ...current,
        isScoring: false,
        error: errorMessage(error),
      }));
    }
  }

  async function saveManualMappingRepair(
    mappings: Partial<Record<DatasetManualMappingTarget, string | null>>,
  ): Promise<void> {
    setMappingState({
      isSaving: true,
      error: null,
      success: null,
    });

    try {
      const result = await saveDatasetManualMapping(token, datasetId, { mappings });
      setState((current) => ({
        ...current,
        dataset: result.dataset,
        error: null,
      }));
      setMappingState({
        isSaving: false,
        error: null,
        success: result.dataset.readinessSummary.scoringRecommended
          ? "Mapping saved. Readiness has been re-evaluated; run scoring to refresh records."
          : "Mapping saved. Readiness was re-evaluated, but this dataset still needs repair before scoring is reliable.",
      });
    } catch (error: unknown) {
      setMappingState({
        isSaving: false,
        error: errorMessage(error),
        success: null,
      });
    }
  }

  async function saveCurrentMappingAsProfile(name: string): Promise<void> {
    setProfileState({
      isSaving: true,
      isApplying: false,
      error: null,
      success: null,
    });

    try {
      const normalizedName = name.trim();
      const result = await saveDatasetImportProfile(token, datasetId, normalizedName ? { name: normalizedName } : {});
      setProfileState({
        isSaving: false,
        isApplying: false,
        error: null,
        success: `Import profile "${result.profile.name}" saved for future matching uploads.`,
      });
    } catch (error: unknown) {
      setProfileState({
        isSaving: false,
        isApplying: false,
        error: errorMessage(error),
        success: null,
      });
    }
  }

  async function applySuggestedImportProfile(profileId: string): Promise<void> {
    setProfileState({
      isSaving: false,
      isApplying: true,
      error: null,
      success: null,
    });

    try {
      const result = await applyDatasetImportProfile(token, datasetId, { profileId });
      setState((current) => ({
        ...current,
        dataset: result.dataset,
        error: null,
      }));
      setProfileState({
        isSaving: false,
        isApplying: false,
        error: null,
        success: `Import profile "${result.appliedProfile.name}" applied. Readiness has been re-evaluated.`,
      });
    } catch (error: unknown) {
      setProfileState({
        isSaving: false,
        isApplying: false,
        error: errorMessage(error),
        success: null,
      });
    }
  }

  if (state.isLoading) {
    return <PanelMessage label="Loading dataset review..." />;
  }

  if (!state.dataset) {
    return <PanelError message={state.error ?? "Dataset could not be loaded."} />;
  }

  const importPresentation = datasetImportPresentation(state.dataset);
  const readinessPresentation = datasetReadinessPresentation(state.dataset);

  return (
    <section className="min-w-0 space-y-5">
      <div className="border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Dataset</p>
            <h2 className="mt-1 truncate text-2xl font-semibold">{state.dataset.sourceLabel ?? state.dataset.originalFilename}</h2>
            <p className="mt-1 text-sm text-ink/60">{state.dataset.originalFilename}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`border px-3 py-2 text-xs font-semibold ${readinessPresentation.className}`}>
              Readiness: {readinessPresentation.label}
            </span>
            {state.scoringStatus ? (
              <span className={`border px-3 py-2 text-xs font-semibold ${datasetScoringStatusClassName(state.scoringStatus.status)}`}>
                {datasetScoringStatusLabel(state.scoringStatus.status)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void runScoring()}
              disabled={state.isScoring}
              className="bg-pine px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state.isScoring ? "Scoring..." : state.scores.length > 0 ? "Re-run scoring" : "Run scoring"}
            </button>
            {state.scores.length > 0 ? (
              <button
                type="button"
                onClick={() => void refreshScoring()}
                disabled={state.isScoring}
                className="border border-line bg-white px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state.isScoring ? "Refresh pending" : "Refresh"}
              </button>
            ) : null}
          </div>
        </div>
        <FollowControl token={token} entityType="dataset" entityId={datasetId} />
        {state.error ? (
          <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</div>
        ) : null}
        {watchlistError ? (
          <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{watchlistError}</div>
        ) : null}
        {portfolioError ? (
          <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{portfolioError}</div>
        ) : null}
        {comparisonError ? (
          <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{comparisonError}</div>
        ) : null}
        {state.lastScoringJob ? (
          <div className={`mt-4 border px-3 py-2 text-sm ${jobStatusClassName(state.lastScoringJob.status)}`}>
            {jobRequestKindLabel(state.lastScoringJob.requestKind)} job{" "}
            {shortId(state.lastScoringJob.id)} is {state.lastScoringJob.status}.{" "}
            {state.lastScoringJob.status === "completed"
              ? `${state.lastScoringJob.summary?.scoredRecordCount ?? state.scores.length} records are ready for review.`
              : state.lastScoringJob.status === "failed"
                ? state.lastScoringJob.error?.message ?? "The scoring worker reported a failure."
                : "The background worker will update this view when processing finishes."}
          </div>
        ) : null}
        <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-8">
          <Metric label="Rows" value={String(state.dataset.rowCount)} />
          <Metric label="Scores" value={String(stats.count)} />
          <Metric label="Avg Investment" value={stats.count > 0 ? String(stats.averageInvestmentScore) : "-"} />
          <Metric label="Flagged" value={stats.count > 0 ? String(stats.flaggedCount) : "-"} />
          <Metric label="Stale" value={state.scoringStatus ? String(state.scoringStatus.staleRecordCount) : "-"} />
          <Metric label="Kept" value={String(datasetWatchlistCount)} />
          <Metric label="Tracked" value={String(datasetPortfolioCount)} />
          <Metric label="Compare" value={String(datasetComparisonCount)} />
        </div>
        {state.scoringStatus?.earliestReprocessAfter ? (
          <p className="mt-3 text-xs text-ink/60">
            Earliest refresh point: {formatDateTime(state.scoringStatus.earliestReprocessAfter)}
          </p>
        ) : null}
        {state.scoringStatus ? (
          <p className="mt-2 text-xs text-ink/60">
            Maintenance:{" "}
            {state.scoringStatus.maintenance.mode === "policy_auto_refresh"
              ? "policy auto-refresh"
              : "manual refresh only"} ·{" "}
            {state.scoringStatus.maintenance.message}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-ink/60">
          Import: {importPresentation.status} · {importPresentation.label} · {importPresentation.detail}
        </p>
        {importPresentation.warning ? (
          <p className="mt-1 text-xs text-amber-800">{importPresentation.warning}</p>
        ) : null}
        <DatasetReadinessPanel
          dataset={state.dataset}
          isSaving={mappingState.isSaving}
          error={mappingState.error}
          success={mappingState.success}
          profileState={profileState}
          onSaveMapping={(mappings) => void saveManualMappingRepair(mappings)}
          onSaveProfile={(name) => void saveCurrentMappingAsProfile(name)}
          onApplyProfile={(profileId) => void applySuggestedImportProfile(profileId)}
        />
      </div>

      {state.scores.length === 0 ? (
        <div className="border border-line bg-white p-5">
          <h3 className="text-lg font-semibold">No scored records yet</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Run scoring to derive review records from this dataset's stored source rows.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <ScoreTable
            scores={visibleScores}
            totalCount={state.scores.length}
            selectedScoreId={selectedScore?.id ?? null}
            filter={filter}
            query={query}
            onFilterChange={setFilter}
            onQueryChange={setQuery}
            onSelect={(scoreId) => setState((current) => ({ ...current, selectedScoreId: scoreId }))}
            watchlistByScoreId={watchlistByScoreId}
            watchlistActionId={watchlistActionId}
            onAddToWatchlist={onAddToWatchlist}
            onRemoveFromWatchlist={onRemoveFromWatchlist}
            portfolioByScoreId={portfolioByScoreId}
            portfolioActionId={portfolioActionId}
            onAddToPortfolio={onAddScoreToPortfolio}
            onRemoveFromPortfolio={onRemoveFromPortfolio}
            comparisonByScoreId={comparisonByScoreId}
            comparisonActionId={comparisonActionId}
            onAddToComparison={onAddScoreToComparison}
            onRemoveFromComparison={onRemoveFromComparison}
          />
          <ScoreDetail
            score={selectedScore}
            watchlistItem={selectedScore ? watchlistByScoreId.get(selectedScore.id) ?? null : null}
            watchlistActionId={watchlistActionId}
            onAddToWatchlist={onAddToWatchlist}
            onRemoveFromWatchlist={onRemoveFromWatchlist}
            portfolioItem={selectedScore ? portfolioByScoreId.get(selectedScore.id) ?? null : null}
            portfolioActionId={portfolioActionId}
            onAddToPortfolio={onAddScoreToPortfolio}
            onRemoveFromPortfolio={onRemoveFromPortfolio}
            comparisonItem={selectedScore ? comparisonByScoreId.get(selectedScore.id) ?? null : null}
            comparisonActionId={comparisonActionId}
            onAddToComparison={onAddScoreToComparison}
            onRemoveFromComparison={onRemoveFromComparison}
          />
        </div>
      )}
      <WorkspaceCommentThread
        key={`dataset:${datasetId}`}
        token={token}
        entityType="dataset"
        entityId={datasetId}
      />
      <WorkspaceAssignmentControl token={token} entityType="dataset" entityId={datasetId} />
    </section>
  );
}

function DatasetReadinessPanel({
  dataset,
  isSaving,
  error,
  success,
  profileState,
  onSaveMapping,
  onSaveProfile,
  onApplyProfile,
}: {
  dataset: DatasetResponse;
  isSaving: boolean;
  error: string | null;
  success: string | null;
  profileState: {
    isSaving: boolean;
    isApplying: boolean;
    error: string | null;
    success: string | null;
  };
  onSaveMapping: (mappings: Partial<Record<DatasetManualMappingTarget, string | null>>) => void;
  onSaveProfile: (name: string) => void;
  onApplyProfile: (profileId: string) => void;
}) {
  const readinessPresentation = datasetReadinessPresentation(dataset);
  const topIssues = topReadinessIssues(dataset, 4);
  const showRepair = datasetNeedsImportRepair(dataset) || dataset.manualMapping.mappings.length > 0;

  return (
    <div className="mt-4 border border-line bg-field p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/60">Import readiness</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`border px-2 py-1 text-xs font-semibold ${readinessPresentation.className}`}>
              {readinessPresentation.label}
            </span>
            <span className="text-sm text-ink/70">{readinessPresentation.actionText}</span>
          </div>
        </div>
        <Metric label="Readiness Score" value={`${dataset.readinessSummary.score}/100`} />
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-5">
        {dataset.readinessSummary.fieldCoverage.map((coverage) => (
          <div key={coverage.field} className="border border-line bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold">{coverage.label}</span>
              <span className="text-xs text-ink/60">{coverage.coveragePercent}%</span>
            </div>
            <p className="mt-1 text-xs text-ink/60">
              {coverage.presentRows}/{coverage.totalRows} rows · {coverage.importance}
            </p>
          </div>
        ))}
      </div>

      {topIssues.length > 0 ? (
        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {topIssues.map((issue) => (
            <div key={`${issue.code}-${issue.field ?? "dataset"}`} className={`border px-3 py-2 text-xs ${readinessIssueClassName(issue.severity)}`}>
              <p className="font-semibold">{readinessIssueLabel(issue.severity)}</p>
              <p className="mt-1 leading-5">{issue.message}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-ink/60">No readiness warnings were detected for this import.</p>
      )}

      <ul className="mt-4 grid gap-1 text-xs text-ink/70 md:grid-cols-2">
        {dataset.readinessSummary.guidance.map((guidance) => (
          <li key={guidance}>- {guidance}</li>
        ))}
      </ul>

      {showRepair ? (
        <ManualMappingRepairForm
          dataset={dataset}
          isSaving={isSaving}
          error={error}
          success={success}
          profileState={profileState}
          onSave={onSaveMapping}
          onSaveProfile={onSaveProfile}
          onApplyProfile={onApplyProfile}
        />
      ) : null}
    </div>
  );
}

function ManualMappingRepairForm({
  dataset,
  isSaving,
  error,
  success,
  profileState,
  onSave,
  onSaveProfile,
  onApplyProfile,
}: {
  dataset: DatasetResponse;
  isSaving: boolean;
  error: string | null;
  success: string | null;
  profileState: {
    isSaving: boolean;
    isApplying: boolean;
    error: string | null;
    success: string | null;
  };
  onSave: (mappings: Partial<Record<DatasetManualMappingTarget, string | null>>) => void;
  onSaveProfile: (name: string) => void;
  onApplyProfile: (profileId: string) => void;
}) {
  const manualMappings = useMemo(() => manualMappingByTarget(dataset), [dataset.manualMapping]);
  const profilePresentation = importProfileApplicationPresentation(dataset);
  const [profileName, setProfileName] = useState(dataset.sourceLabel ?? dataset.originalFilename.replace(/\.csv$/i, ""));
  const [mappingValues, setMappingValues] = useState<Partial<Record<DatasetManualMappingTarget, string>>>(() =>
    Object.fromEntries(
      manualMappingTargetPresentations.flatMap((target) => {
        const sourceColumn = manualMappings.get(target.targetField)?.sourceColumn;
        return sourceColumn ? [[target.targetField, sourceColumn]] : [];
      }),
    ),
  );

  useEffect(() => {
    setMappingValues(
      Object.fromEntries(
        manualMappingTargetPresentations.flatMap((target) => {
          const sourceColumn = manualMappings.get(target.targetField)?.sourceColumn;
          return sourceColumn ? [[target.targetField, sourceColumn]] : [];
        }),
      ),
    );
  }, [dataset.id, dataset.manualMapping.updatedAt, dataset.manualMapping.mappings.length]);

  useEffect(() => {
    setProfileName(dataset.sourceLabel ?? dataset.originalFilename.replace(/\.csv$/i, ""));
  }, [dataset.id, dataset.sourceLabel, dataset.originalFilename]);

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSave(
      Object.fromEntries(
        manualMappingTargetPresentations.map((target) => [
          target.targetField,
          mappingValues[target.targetField]?.trim() || null,
        ]),
      ),
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Repair field mapping</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-ink/60">
            Map source columns to the scoring fields that matter most. This creates a dataset-specific repair
            configuration; stored source rows are not rewritten.
          </p>
        </div>
        <span className="border border-line bg-field px-2 py-1 text-xs">{dataset.headers.length} source columns</span>
      </div>

      <div className={`mt-4 border px-3 py-2 text-xs ${profilePresentation.className}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{profilePresentation.label}</p>
            <p className="mt-1 leading-5">{profilePresentation.detail}</p>
          </div>
          {profilePresentation.canApplySuggestedProfile && dataset.importProfile.profileId ? (
            <button
              type="button"
              disabled={profileState.isApplying}
              onClick={() => onApplyProfile(dataset.importProfile.profileId ?? "")}
              className="border border-amber-300 bg-white px-3 py-2 font-semibold text-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {profileState.isApplying ? "Applying..." : "Apply profile"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {manualMappingTargetPresentations.map((target) => {
          const manualMapping = manualMappings.get(target.targetField);
          const automaticallyMapped = dataset.importSummary.mappedFields.includes(target.targetField);
          const statusText = manualMapping
            ? `${importProfileMappingSourceLabel(manualMapping.source)}: ${manualMapping.sourceColumn}`
            : automaticallyMapped
              ? "Automatic mapping recognized"
              : "Not recognized automatically";

          return (
            <label key={target.targetField} className="block border border-line bg-field p-3">
              <span className="text-xs font-semibold uppercase text-ink/60">{target.label}</span>
              <span className="mt-1 block text-xs leading-5 text-ink/60">{target.description}</span>
              <select
                value={mappingValues[target.targetField] ?? ""}
                disabled={isSaving}
                onChange={(event) =>
                  setMappingValues((current) => ({
                    ...current,
                    [target.targetField]: event.target.value,
                  }))
                }
                className="mt-2 w-full border border-line bg-white px-2 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">No manual mapping</option>
                {dataset.headers.map((header) => (
                  <option key={`${target.targetField}-${header}`} value={header}>
                    {header}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-xs text-ink/60">{statusText}</span>
            </label>
          );
        })}
      </div>

      {error ? <div className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div> : null}
      {success ? (
        <div className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">{success}</div>
      ) : null}

      <button
        type="submit"
        disabled={isSaving}
        className="mt-4 bg-pine px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving mapping..." : "Save mapping and re-check readiness"}
      </button>

      {dataset.manualMapping.mappings.length > 0 ? (
        <div className="mt-4 border border-line bg-field p-3">
          <label className="block text-xs font-semibold uppercase text-ink/60" htmlFor={`profile-name-${dataset.id}`}>
            Reusable profile name
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id={`profile-name-${dataset.id}`}
              value={profileName}
              disabled={profileState.isSaving}
              maxLength={120}
              onChange={(event) => setProfileName(event.target.value)}
              className="min-w-0 flex-1 border border-line bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="button"
              disabled={profileState.isSaving}
              onClick={() => onSaveProfile(profileName)}
              className="border border-pine bg-white px-4 py-2 text-sm font-semibold text-pine disabled:cursor-not-allowed disabled:opacity-60"
            >
              {profileState.isSaving ? "Saving profile..." : "Save as reusable profile"}
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-ink/60">
            Profiles are private to your account and reuse only deterministic column mappings on future matching uploads.
          </p>
        </div>
      ) : null}

      {profileState.error ? (
        <div className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{profileState.error}</div>
      ) : null}
      {profileState.success ? (
        <div className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {profileState.success}
        </div>
      ) : null}
    </form>
  );
}

function readinessIssueLabel(severity: DatasetResponse["readinessSummary"]["issues"][number]["severity"]): string {
  switch (severity) {
    case "error":
      return "Blocking issue";
    case "warning":
      return "Review warning";
    case "info":
      return "Context note";
  }
}

function readinessIssueClassName(severity: DatasetResponse["readinessSummary"]["issues"][number]["severity"]): string {
  switch (severity) {
    case "error":
      return "border-red-200 bg-red-50 text-red-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-900";
  }
}

function AlertsPage({
  alerts,
  unreadCount,
  isLoading,
  error,
  actionId,
  onRetry,
  onMarkRead,
  onMarkAllRead,
  onOpenRelated,
}: {
  alerts: AlertResponse[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
  onRetry: () => void;
  onMarkRead: (alertId: string) => void;
  onMarkAllRead: () => void;
  onOpenRelated: (alert: AlertResponse) => void;
}) {
  const sortedAlerts = useMemo(() => sortAlertsForReview(alerts), [alerts]);
  const failureCount = sortedAlerts.filter((alert) => alert.severity === "error").length;

  if (isLoading && sortedAlerts.length === 0) {
    return <PanelMessage label="Loading alerts..." />;
  }

  return (
    <section className="min-w-0 space-y-5">
      <div className="border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Monitoring Layer</p>
            <h2 className="mt-1 text-2xl font-semibold">Alerts</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/70">
              Review important scoring outcomes and new workspace discussion without exposing private payloads.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Metric label="Unread" value={String(unreadCount)} />
            <Metric label="Failures" value={String(failureCount)} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onRetry} className="border border-line px-3 py-2 text-sm font-semibold">
            Refresh
          </button>
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0 || actionId === "read-all"}
            className="border border-line px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionId === "read-all" ? "Marking..." : "Mark all read"}
          </button>
        </div>
        {error ? <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      </div>

      {sortedAlerts.length === 0 && !isLoading ? (
        <div className="border border-line bg-white p-5">
          <h3 className="text-lg font-semibold">No alerts yet</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Scoring outcomes and new workspace discussion will appear here when attention is needed.
          </p>
          {error ? <PanelError message={error} onRetry={onRetry} /> : null}
        </div>
      ) : (
        <div className="border border-line bg-white">
          <div className="border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">
              Recent Events ({sortedAlerts.length})
            </h3>
          </div>
          <div className="divide-y divide-line">
            {sortedAlerts.map((alert) => (
              <article key={alert.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[160px_minmax(0,1fr)_220px]">
                <div>
                  <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${alertSeverityClassName(alert.severity)}`}>
                    {alertTypeLabel(alert.type)}
                  </span>
                  <p className="mt-2 text-xs text-ink/55">{formatDateTime(alert.createdAt)}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold">{alert.message}</h4>
                    <span className="border border-line px-2 py-1 text-xs">
                      {alert.status === "unread" ? "Unread" : "Read"}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-xs text-ink/65 sm:grid-cols-3">
                    {alert.metadata?.jobId ? <DetailTerm label="Job" value={shortId(alert.metadata.jobId)} /> : null}
                    {alert.metadata?.datasetId ? <DetailTerm label="Dataset" value={shortId(alert.metadata.datasetId)} /> : null}
                    {alert.metadata?.scoredRecordCount !== undefined ? (
                      <DetailTerm label="Records" value={String(alert.metadata.scoredRecordCount)} />
                    ) : null}
                    {alert.metadata?.errorCode ? <DetailTerm label="Code" value={alert.metadata.errorCode} /> : null}
                    {alert.metadata?.workspaceId ? (
                      <DetailTerm label="Workspace" value={shortId(alert.metadata.workspaceId)} />
                    ) : null}
                    {alert.relatedEntityId ? (
                      <DetailTerm label="Record" value={shortId(alert.relatedEntityId)} />
                    ) : null}
                  </dl>
                </div>
                <div className="flex flex-wrap items-start justify-end gap-2">
                  {alertDestination(alert) && alert.relatedEntityType ? (
                    <button
                      type="button"
                      onClick={() => onOpenRelated(alert)}
                      className="border border-line px-3 py-2 text-xs font-semibold"
                    >
                      {alertDestinationLabel(alert.relatedEntityType)}
                    </button>
                  ) : null}
                  {alert.status === "unread" ? (
                    <button
                      type="button"
                      disabled={actionId === alert.id}
                      onClick={() => onMarkRead(alert.id)}
                      className="border border-line px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionId === alert.id ? "Marking" : "Mark read"}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ComparisonPage({
  token,
  canExecuteSensitiveActions,
  canResolveDecisions,
  items,
  isLoading,
  error,
  actionId,
  onRetry,
  onUpdate,
  onHandoffToWatchlist,
  onHandoffToPortfolio,
  onOpenWatchlist,
  onOpenPortfolio,
  onOpenDecisionBrief,
  onRemove,
}: {
  token: string;
  canExecuteSensitiveActions: boolean;
  canResolveDecisions: boolean;
  items: ComparisonItemResponse[];
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
  onRetry: () => void;
  onUpdate: (comparisonItemId: string, input: { decision?: ComparisonDecision; note?: string | null }) => Promise<void>;
  onHandoffToWatchlist: (comparisonItemId: string) => Promise<ComparisonHandoffToWatchlistResponse>;
  onHandoffToPortfolio: (comparisonItemId: string) => Promise<ComparisonHandoffToPortfolioResponse>;
  onOpenWatchlist: () => void;
  onOpenPortfolio: () => void;
  onOpenDecisionBrief: (comparisonItemId: string) => void;
  onRemove: (comparisonItemId: string) => void;
}) {
  const sortedItems = useMemo(() => sortComparisonItemsForReview(items), [items]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = sortedItems.find((item) => item.id === selectedItemId) ?? sortedItems[0] ?? null;
  const moveForwardCount = sortedItems.filter((item) => item.decision === "move_forward").length;
  const rejectedCount = sortedItems.filter((item) => item.decision === "rejected").length;
  const notedCount = sortedItems.filter((item) => Boolean(item.note)).length;

  useEffect(() => {
    if (selectedItemId && sortedItems.some((item) => item.id === selectedItemId)) {
      return;
    }

    setSelectedItemId(sortedItems[0]?.id ?? null);
  }, [selectedItemId, sortedItems]);

  if (isLoading && sortedItems.length === 0) {
    return <PanelMessage label="Loading comparison workspace..." />;
  }

  return (
    <section className="min-w-0 space-y-5">
      <div className="border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Decision Workspace</p>
            <h2 className="mt-1 text-2xl font-semibold">Comparison</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/70">
              Compare candidates side by side, capture lightweight notes, and mark what should move forward or be rejected.
            </p>
          </div>
          <button type="button" onClick={onRetry} className="border border-line px-3 py-2 text-sm font-semibold">
            Refresh
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Metric label="Compared" value={String(sortedItems.length)} />
          <Metric label="Move Forward" value={String(moveForwardCount)} />
          <Metric label="Rejected" value={String(rejectedCount)} />
          <Metric label="Notes" value={String(notedCount)} />
        </div>
        {error ? <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      </div>

      {sortedItems.length === 0 && !isLoading ? (
        <div className="border border-line bg-white p-5">
          <h3 className="text-lg font-semibold">No comparison records yet</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Add records from scored review, watchlist, or portfolio to compare candidates before making a decision.
          </p>
          {error ? <PanelError message={error} onRetry={onRetry} /> : null}
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <ComparisonMatrix
            items={sortedItems}
            selectedItemId={selectedItem?.id ?? null}
            actionId={actionId}
            onSelect={setSelectedItemId}
            onRemove={onRemove}
          />
          <ComparisonDetail
            token={token}
            canExecuteSensitiveActions={canExecuteSensitiveActions}
            canResolveDecisions={canResolveDecisions}
            item={selectedItem}
            actionId={actionId}
            onUpdate={onUpdate}
            onHandoffToWatchlist={onHandoffToWatchlist}
            onHandoffToPortfolio={onHandoffToPortfolio}
            onOpenWatchlist={onOpenWatchlist}
            onOpenPortfolio={onOpenPortfolio}
            onOpenDecisionBrief={onOpenDecisionBrief}
            onRemove={onRemove}
          />
        </div>
      )}
    </section>
  );
}

function ComparisonMatrix({
  items,
  selectedItemId,
  actionId,
  onSelect,
  onRemove,
}: {
  items: ComparisonItemResponse[];
  selectedItemId: string | null;
  actionId: string | null;
  onSelect: (comparisonItemId: string) => void;
  onRemove: (comparisonItemId: string) => void;
}) {
  return (
    <div className="min-w-0 border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">
          Side-by-side Review ({items.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full border-collapse text-sm">
          <thead className="bg-field text-left text-xs uppercase tracking-[0.08em] text-ink/60">
            <tr>
              <th className="sticky left-0 z-10 w-40 border-b border-line bg-field px-3 py-2">Signal</th>
              {items.map((item) => (
                <th key={item.id} className="min-w-[230px] border-b border-line px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={`w-full border px-3 py-2 text-left normal-case tracking-normal ${
                      selectedItemId === item.id ? "border-pine bg-white" : "border-line bg-white"
                    }`}
                  >
                    <span className="block font-semibold text-ink">{primaryRecordLabel(item)}</span>
                    <span className="mt-1 block text-xs text-ink/60">
                      {comparisonSourceLabel(item.sourceType)} · Dataset {shortId(item.datasetId)}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <ComparisonMatrixRow
              label="Decision"
              items={items}
              render={(item) => (
                <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${comparisonDecisionClassName(item.decision)}`}>
                  {comparisonDecisionLabel(item.decision)}
                </span>
              )}
            />
            <ComparisonMatrixRow
              label="Investment"
              items={items}
              render={(item) => {
                const band = scoreBand(item.investmentScore);
                return (
                  <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${band.className}`}>
                    {item.investmentScore} {band.label}
                  </span>
                );
              }}
            />
            <ComparisonMatrixRow label="Risk" items={items} render={(item) => String(item.riskScore)} />
            <ComparisonMatrixRow label="Confidence" items={items} render={(item) => String(item.confidenceScore)} />
            <ComparisonMatrixRow label="Liquidity" items={items} render={(item) => String(item.liquidityScore)} />
            <ComparisonMatrixRow label="Redemption" items={items} render={(item) => formatPercent(item.redemptionProbability)} />
            <ComparisonMatrixRow label="Coverage" items={items} render={(item) => formatRatio(item.valueCoverageRatio)} />
            <ComparisonMatrixRow label="Lien" items={items} render={(item) => formatMoney(item.normalizedFields.lienAmount)} />
            <ComparisonMatrixRow label="Value" items={items} render={(item) => formatMoney(item.normalizedFields.estimatedValue)} />
            <ComparisonMatrixRow
              label="Type"
              items={items}
              render={(item) => item.normalizedFields.propertyTypeCategory}
            />
            <ComparisonMatrixRow label="Flags" items={items} render={(item) => flagPreview(item)} />
            <ComparisonMatrixRow label="Reason" items={items} render={(item) => reasoningPreview(item)} />
            <ComparisonMatrixRow
              label="Note"
              items={items}
              render={(item) => item.note ?? "No note"}
            />
            <ComparisonMatrixRow
              label="Remove"
              items={items}
              render={(item) => (
                <button
                  type="button"
                  disabled={actionId === item.id}
                  onClick={() => onRemove(item.id)}
                  className="border border-line bg-white px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionId === item.id ? "Removing" : "Remove"}
                </button>
              )}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComparisonMatrixRow({
  label,
  items,
  render,
}: {
  label: string;
  items: ComparisonItemResponse[];
  render: (item: ComparisonItemResponse) => React.ReactNode;
}) {
  return (
    <tr className="align-top">
      <th className="sticky left-0 z-10 border-b border-line bg-white px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-ink/55">
        {label}
      </th>
      {items.map((item) => (
        <td key={`${label}-${item.id}`} className="max-w-[260px] border-b border-line px-3 py-3 text-sm leading-6 text-ink/80">
          {render(item)}
        </td>
      ))}
    </tr>
  );
}

function ComparisonDetail({
  token,
  canExecuteSensitiveActions,
  canResolveDecisions,
  item,
  actionId,
  onUpdate,
  onHandoffToWatchlist,
  onHandoffToPortfolio,
  onOpenWatchlist,
  onOpenPortfolio,
  onOpenDecisionBrief,
  onRemove,
}: {
  token: string;
  canExecuteSensitiveActions: boolean;
  canResolveDecisions: boolean;
  item: ComparisonItemResponse | null;
  actionId: string | null;
  onUpdate: (comparisonItemId: string, input: { decision?: ComparisonDecision; note?: string | null }) => Promise<void>;
  onHandoffToWatchlist: (comparisonItemId: string) => Promise<ComparisonHandoffToWatchlistResponse>;
  onHandoffToPortfolio: (comparisonItemId: string) => Promise<ComparisonHandoffToPortfolioResponse>;
  onOpenWatchlist: () => void;
  onOpenPortfolio: () => void;
  onOpenDecisionBrief: (comparisonItemId: string) => void;
  onRemove: (comparisonItemId: string) => void;
}) {
  const [draftDecision, setDraftDecision] = useState<ComparisonDecision>("undecided");
  const [draftNote, setDraftNote] = useState("");
  const [historyEvents, setHistoryEvents] = useState<DecisionHistoryEventResponse[]>([]);
  const [historyIsLoading, setHistoryIsLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [handoffResult, setHandoffResult] = useState<
    ComparisonHandoffToWatchlistResponse | ComparisonHandoffToPortfolioResponse | null
  >(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [hasPendingPortfolioApproval, setHasPendingPortfolioApproval] = useState(false);
  const [checklistProgress, setChecklistProgress] =
    useState<ReviewChecklistProgress | null>(null);

  useEffect(() => {
    setDraftDecision(item?.decision ?? "undecided");
    setDraftNote(item?.note ?? "");
    setHandoffResult(null);
    setHandoffError(null);
    setChecklistProgress(null);
  }, [item?.id, item?.decision, item?.note]);

  useEffect(() => {
    setHasPendingPortfolioApproval(false);
  }, [item?.id]);

  useEffect(() => {
    if (!item) {
      setHistoryEvents([]);
      setHistoryError(null);
      setHistoryIsLoading(false);
      return;
    }

    let cancelled = false;
    setHistoryIsLoading(true);
    setHistoryError(null);
    void listComparisonHistory(token, item.id)
      .then((result) => {
        if (!cancelled) {
          setHistoryEvents(sortDecisionHistoryForReview(result.events));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setHistoryError(errorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [item, token]);

  if (!item) {
    return (
      <aside className="border border-line bg-white p-4">
        <p className="text-sm text-ink/70">No comparison item selected.</p>
      </aside>
    );
  }

  const isSaving = actionId === item.id;
  const sortedHistoryEvents = sortDecisionHistoryForReview(historyEvents);
  const selectedItem = item;

  async function saveDecision(): Promise<void> {
    try {
      await onUpdate(selectedItem.id, { decision: draftDecision, note: draftNote.trim() ? draftNote : null });
      const result = await listComparisonHistory(token, selectedItem.id);
      setHistoryEvents(sortDecisionHistoryForReview(result.events));
      setHistoryError(null);
    } catch (error: unknown) {
      setHistoryError(errorMessage(error));
    }
  }

  async function refreshHistoryForSelectedItem(): Promise<void> {
    const result = await listComparisonHistory(token, selectedItem.id);
    setHistoryEvents(sortDecisionHistoryForReview(result.events));
    setHistoryError(null);
  }

  async function handoffToWatchlist(): Promise<void> {
    try {
      const result = await onHandoffToWatchlist(selectedItem.id);
      setHandoffResult(result);
      setHandoffError(null);
      await refreshHistoryForSelectedItem();
    } catch (error: unknown) {
      setHandoffError(errorMessage(error));
    }
  }

  async function handoffToPortfolio(): Promise<void> {
    try {
      const result = await onHandoffToPortfolio(selectedItem.id);
      setHandoffResult(result);
      setHandoffError(null);
      await refreshHistoryForSelectedItem();
    } catch (error: unknown) {
      setHandoffError(errorMessage(error));
    }
  }

  return (
    <aside className="border border-line bg-white p-4 xl:sticky xl:top-4 xl:self-start">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">Decision Notes</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold">{primaryRecordLabel(item)}</h3>
          <p className="mt-1 text-xs text-ink/60">
            {comparisonSourceLabel(item.sourceType)} · Dataset {shortId(item.datasetId)}
          </p>
        </div>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onRemove(item.id)}
          className="shrink-0 border border-line px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Working" : "Remove"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => onOpenDecisionBrief(item.id)}
        className="mt-4 w-full border border-line bg-white px-3 py-2 text-sm font-semibold"
      >
        Open decision brief
      </button>
      <label className="mt-4 block text-sm font-semibold" htmlFor="comparison-decision">
        Decision
      </label>
      <select
        id="comparison-decision"
        value={draftDecision}
        disabled={isSaving}
        onChange={(event) => setDraftDecision(event.target.value as ComparisonDecision)}
        className="mt-2 w-full border border-line bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {comparisonDecisionOptions.map((decision) => (
          <option key={decision} value={decision}>
            {comparisonDecisionLabel(decision)}
          </option>
        ))}
      </select>
      <label className="mt-4 block text-sm font-semibold" htmlFor="comparison-note">
        Note
      </label>
      <textarea
        id="comparison-note"
        value={draftNote}
        maxLength={500}
        disabled={isSaving}
        onChange={(event) => setDraftNote(event.target.value)}
        rows={5}
        className="mt-2 w-full resize-y border border-line bg-white px-3 py-2 text-sm leading-6 disabled:cursor-not-allowed disabled:opacity-60"
        placeholder="Short decision note"
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-ink/60">
        <span>{draftNote.length}/500</span>
        {item.noteUpdatedAt ? <span>Updated {formatDateTime(item.noteUpdatedAt)}</span> : null}
      </div>
      <button
        type="button"
        disabled={isSaving}
        onClick={() => void saveDecision()}
        className="mt-4 w-full bg-pine px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Save decision"}
      </button>
      <ReviewChecklist
        token={token}
        entityType="comparison_item"
        entityId={item.id}
        onProgressChange={setChecklistProgress}
      />
      <section className="mt-5 border border-line bg-field p-3">
        <h4 className="text-sm font-semibold">Decision Handoff</h4>
        {checklistProgress && checklistProgress.status !== "ready" ? (
          <p className="mt-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            {reviewChecklistReadinessMessage(checklistProgress)} This is a readiness warning,
            not an automatic block.
          </p>
        ) : checklistProgress?.status === "ready" ? (
          <p className="mt-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">
            {reviewChecklistReadinessMessage(checklistProgress)}
          </p>
        ) : null}
        <div className="mt-3 grid gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handoffToWatchlist()}
            className="border border-line bg-white px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Working..." : "Send to watchlist"}
          </button>
          {canExecuteSensitiveActions && !hasPendingPortfolioApproval ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handoffToPortfolio()}
              className="border border-line bg-white px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Working..." : "Track in portfolio"}
            </button>
          ) : null}
        </div>
        {handoffError ? (
          <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{handoffError}</p>
        ) : null}
        {handoffResult ? (
          <div className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <p className="font-semibold">
              {handoffResult.destination === "watchlist" ? "Watchlist" : "Portfolio"}{" "}
              {handoffResult.alreadyExists ? "already had this record" : "received this record"}.
            </p>
            <p className="mt-1 text-xs">
              Linked as {shortId(handoffResult.item.id)} with saved decision context in history.
            </p>
            <button
              type="button"
              onClick={handoffResult.destination === "watchlist" ? onOpenWatchlist : onOpenPortfolio}
              className="mt-2 border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900"
            >
              Open {handoffResult.destination === "watchlist" ? "watchlist" : "portfolio"}
            </button>
          </div>
        ) : null}
        <ComparisonApprovalPanel
          token={token}
          comparisonItemId={item.id}
          canExecuteSensitiveActions={canExecuteSensitiveActions}
          onPendingChange={setHasPendingPortfolioApproval}
          onOpenPortfolio={onOpenPortfolio}
        />
      </section>
      <DecisionOutcomePanel
        token={token}
        entityType="comparison_item"
        entityId={item.id}
        canResolve={canResolveDecisions}
      />
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <DetailTerm label="Lien" value={formatMoney(item.normalizedFields.lienAmount)} />
        <DetailTerm label="Value" value={formatMoney(item.normalizedFields.estimatedValue)} />
        <DetailTerm label="Coverage" value={formatRatio(item.valueCoverageRatio)} />
        <DetailTerm label="Decision" value={comparisonDecisionLabel(item.decision)} />
      </dl>
      <section className="mt-5">
        <h4 className="text-sm font-semibold">Reasoning</h4>
        <ol className="mt-2 space-y-2">
          {item.reasoning.map((reason) => (
            <li key={reason} className="border border-line bg-field px-3 py-2 text-sm leading-6 text-ink/80">
              {reason}
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-5">
        <h4 className="text-sm font-semibold">Flags</h4>
        {item.flags.length === 0 ? (
          <p className="mt-2 text-sm text-ink/65">No flags returned.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {item.flags.map((flag) => (
              <li key={flag} className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {flag}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold">History</h4>
          {historyIsLoading ? <span className="text-xs text-ink/55">Loading</span> : null}
        </div>
        {historyError ? <p className="mt-2 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{historyError}</p> : null}
        {!historyIsLoading && !historyError && sortedHistoryEvents.length === 0 ? (
          <p className="mt-2 text-sm text-ink/65">No decision history yet.</p>
        ) : null}
        {sortedHistoryEvents.length > 0 ? (
          <ol className="mt-2 space-y-2">
            {sortedHistoryEvents.map((event) => (
              <li key={event.id} className="border border-line bg-white px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold">{decisionHistoryEventLabel(event.eventType)}</span>
                  <span className="shrink-0 text-xs text-ink/55">{formatDateTime(event.createdAt)}</span>
                </div>
                {event.previousDecision && event.newDecision ? (
                  <p className="mt-1 text-xs text-ink/65">
                    {comparisonDecisionLabel(event.previousDecision)} → {comparisonDecisionLabel(event.newDecision)}
                  </p>
                ) : null}
                {event.noteSnapshot ? <p className="mt-2 text-sm leading-6 text-ink/75">{event.noteSnapshot}</p> : null}
                {!event.noteSnapshot && event.previousNoteSnapshot ? (
                  <p className="mt-2 text-sm leading-6 text-ink/60">Note cleared.</p>
                ) : null}
                {event.metadata?.targetEntityId ? (
                  <p className="mt-2 text-xs text-ink/60">
                    Target {shortId(event.metadata.targetEntityId)}
                    {event.metadata.handoffResult ? ` · ${handoffResultLabel(event.metadata.handoffResult)}` : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </section>
      <WorkspaceCommentThread
        key={`comparison_item:${item.id}`}
        token={token}
        entityType="comparison_item"
        entityId={item.id}
      />
      <FollowControl token={token} entityType="comparison_item" entityId={item.id} />
      <FollowUpControl token={token} entityType="comparison_item" entityId={item.id} />
      <WorkspaceAssignmentControl token={token} entityType="comparison_item" entityId={item.id} />
    </aside>
  );
}

function DecisionBriefPage({
  token,
  entityType,
  entityId,
  canResolveDecisions,
  onBack,
}: {
  token: string;
  entityType: DecisionBriefTargetEntityType;
  entityId: string;
  canResolveDecisions: boolean;
  onBack: () => void;
}) {
  const [brief, setBrief] = useState<DecisionBriefResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBrief(null);
    setIsLoading(true);
    setError(null);
    setCopyStatus(null);
    void getDecisionBrief(token, entityType, entityId)
      .then((result) => {
        if (!cancelled) {
          setBrief(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, entityType, entityId]);

  async function copyBrief(): Promise<void> {
    if (!brief) {
      return;
    }
    try {
      await navigator.clipboard.writeText(brief.exportText);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy unavailable");
    }
  }

  if (isLoading) {
    return <PanelMessage label="Loading decision brief..." />;
  }

  if (error) {
    return (
      <section className="min-w-0 space-y-5">
        <button type="button" onClick={onBack} className="border border-line bg-white px-3 py-2 text-sm font-semibold">
          Back to comparison
        </button>
        <PanelError message={error} />
      </section>
    );
  }

  if (!brief) {
    return <PanelMessage label="Decision brief is unavailable." />;
  }

  return (
    <section className="min-w-0 space-y-5">
      <div className="border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Decision Brief</p>
            <h2 className="mt-1 text-2xl font-semibold">{brief.summary.title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-ink/70">{brief.summary.subtitle}</p>
            <p className="mt-2 text-xs text-ink/55">Generated {formatDateTime(brief.generatedAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onBack} className="border border-line px-3 py-2 text-sm font-semibold">
              Back
            </button>
            <button type="button" onClick={() => void copyBrief()} className="border border-line px-3 py-2 text-sm font-semibold">
              {copyStatus ?? "Copy"}
            </button>
            <button type="button" onClick={() => window.print()} className="border border-line px-3 py-2 text-sm font-semibold">
              Print
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Metric label="Readiness" value={decisionBriefReadinessLabel(brief.summary.readinessStatus)} />
          <Metric label="Decision" value={comparisonDecisionLabel(brief.target.decision)} />
          <Metric label="Pending approvals" value={String(brief.approvals.pendingCount)} />
          <Metric label="Unread discussion" value={String(brief.discussion.attention.unreadCount)} />
        </div>
        <div className={`mt-4 border px-3 py-2 text-sm ${decisionBriefReadinessClassName(brief.summary.readinessStatus)}`}>
          <p className="font-semibold">{brief.summary.nextAction}</p>
          {brief.summary.currentNote ? <p className="mt-1 leading-6">{brief.summary.currentNote}</p> : null}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="border border-line bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">Score and Risk Evidence</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <DetailTerm label="Investment" value={String(brief.target.investmentScore)} />
              <DetailTerm label="Risk" value={String(brief.target.riskScore)} />
              <DetailTerm label="Liquidity" value={String(brief.target.liquidityScore)} />
              <DetailTerm label="Redemption" value={formatPercent(brief.target.redemptionProbability)} />
              <DetailTerm label="Confidence" value={String(brief.target.confidenceScore)} />
              <DetailTerm label="Coverage" value={formatRatio(brief.target.valueCoverageRatio)} />
              <DetailTerm label="Lien" value={formatMoney(brief.target.normalizedFields.lienAmount)} />
              <DetailTerm label="Value" value={formatMoney(brief.target.normalizedFields.estimatedValue)} />
              <DetailTerm label="Scored" value={formatDateTime(brief.target.scoredAt)} />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <EvidenceList title="Reasoning" items={brief.target.reasoning} emptyLabel="No reasoning returned." />
              <EvidenceList title="Flags" items={brief.target.flags} emptyLabel="No flags returned." warning />
            </div>
          </section>

          <section className="border border-line bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">Dataset and Import Context</h3>
            {brief.dataset ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <DetailTerm label="Dataset" value={brief.dataset.sourceLabel ?? brief.dataset.originalFilename} />
                  <DetailTerm label="Rows" value={String(brief.dataset.rowCount)} />
                  <DetailTerm label="Readiness" value={brief.dataset.readinessSummary.status} />
                  <DetailTerm label="Adapter" value={brief.dataset.importSummary.adapterName} />
                  <DetailTerm label="Confidence" value={brief.dataset.importSummary.confidence} />
                  <DetailTerm label="Uploaded" value={formatDateTime(brief.dataset.uploadedAt)} />
                </div>
                <EvidenceList
                  title="Readiness guidance"
                  items={brief.dataset.readinessSummary.guidance}
                  emptyLabel="No dataset guidance returned."
                />
              </>
            ) : (
              <p className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                The source dataset is unavailable or no longer accessible, so this brief keeps the item snapshot only.
              </p>
            )}
          </section>

          <section className="border border-line bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">Recent Decision Context</h3>
            {brief.history.events.length === 0 ? (
              <p className="mt-3 text-sm text-ink/65">No decision history yet.</p>
            ) : (
              <ol className="mt-3 space-y-2">
                {brief.history.events.map((event) => (
                  <li key={event.id} className="border border-line bg-field px-3 py-2 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-semibold">{decisionHistoryEventLabel(event.eventType)}</span>
                      <span className="shrink-0 text-xs text-ink/55">{formatDateTime(event.createdAt)}</span>
                    </div>
                    {event.noteSnapshot ? <p className="mt-2 leading-6 text-ink/75">{event.noteSnapshot}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="border border-line bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">Latest Discussion</h3>
            {brief.discussion.comments.length === 0 ? (
              <p className="mt-3 text-sm text-ink/65">No discussion yet.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {brief.discussion.comments.map((comment) => (
                  <li key={comment.id} className="border border-line bg-field px-3 py-2">
                    <div className="flex items-start justify-between gap-3 text-xs text-ink/55">
                      <span className="font-semibold text-ink">{comment.author.email}</span>
                      <span>{formatDateTime(comment.createdAt)}</span>
                    </div>
                    <WorkspaceCommentBody body={comment.body} />
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
          <section className="border border-line bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">Readiness Gates</h3>
            <div className="mt-3 space-y-3">
              <div className="border border-line bg-field p-3">
                <p className="text-sm font-semibold">Final outcome</p>
                <p className="mt-1 text-sm text-ink/70">
                  {brief.outcome.outcome
                    ? `${decisionOutcomeStatusLabel(brief.outcome.outcome.status)} by ${brief.outcome.outcome.resolver.email}`
                    : "Active review"}
                </p>
              </div>
              <div className="border border-line bg-field p-3">
                <p className="text-sm font-semibold">Assignment</p>
                <p className="mt-1 text-sm text-ink/70">
                  {brief.assignment ? `Assigned to ${brief.assignment.assignee.email}` : "Unassigned"}
                </p>
              </div>
              <div className="border border-line bg-field p-3">
                <p className="text-sm font-semibold">Checklist</p>
                <p className="mt-1 text-sm text-ink/70">
                  {reviewChecklistStatusLabel(brief.checklist.progress.status)} ·{" "}
                  {brief.checklist.progress.completedRequiredItems}/{brief.checklist.progress.requiredItems} required complete
                </p>
              </div>
              <div className="border border-line bg-field p-3">
                <p className="text-sm font-semibold">Approval</p>
                <p className="mt-1 text-sm text-ink/70">
                  {brief.approvals.latest
                    ? `${approvalStatusLabel(brief.approvals.latest.status)} requested by ${brief.approvals.latest.requester.email}`
                    : "No approval request recorded."}
                </p>
              </div>
            </div>
          </section>

          <section className="border border-line bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">Policy Requirements</h3>
            {brief.policy.unmetRequirements.length === 0 ? (
              <p className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                No blocking workspace policy requirements are currently unmet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {brief.policy.unmetRequirements.map((requirement) => (
                  <li key={`${requirement.code}:${requirement.message}`} className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <p className="font-semibold">{requirement.message}</p>
                    <p className="mt-1 leading-6">{requirement.resolution}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border border-line bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">Portable Summary</h3>
            <textarea
              readOnly
              value={brief.exportText}
              rows={14}
              className="mt-3 w-full resize-y border border-line bg-field px-3 py-2 font-mono text-xs leading-5 text-ink/80"
            />
          </section>

          <DecisionOutcomePanel
            token={token}
            entityType={entityType}
            entityId={entityId}
            canResolve={canResolveDecisions}
          />
        </aside>
      </div>
    </section>
  );
}

function EvidenceList({
  title,
  items,
  emptyLabel,
  warning = false,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
  warning?: boolean;
}) {
  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink/65">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className={`border px-3 py-2 text-sm leading-6 ${
                warning ? "border-amber-200 bg-amber-50 text-amber-900" : "border-line bg-field text-ink/80"
              }`}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function decisionBriefReadinessLabel(status: DecisionBriefResponse["summary"]["readinessStatus"]): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "blocked":
      return "Blocked";
    case "needs_review":
      return "Needs review";
    case "not_configured":
      return "No checklist";
    case "resolved":
      return "Resolved";
  }
}

function decisionBriefReadinessClassName(status: DecisionBriefResponse["summary"]["readinessStatus"]): string {
  switch (status) {
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "blocked":
      return "border-red-200 bg-red-50 text-red-800";
    case "needs_review":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "not_configured":
      return "border-line bg-field text-ink/75";
    case "resolved":
      return "border-pine bg-field text-pine";
  }
}

const decisionOutcomeStatusOptions: DecisionOutcomeStatus[] = [
  "approved",
  "declined",
  "deferred",
  "archived",
];

function DecisionOutcomePanel({
  token,
  entityType,
  entityId,
  canResolve,
}: {
  token: string;
  entityType: DecisionOutcomeTargetEntityType;
  entityId: string;
  canResolve: boolean;
}) {
  const [state, setState] = useState<DecisionOutcomeStateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<DecisionOutcomeStatus>("approved");
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    setState(null);
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    void getDecisionOutcomeState(token, entityType, entityId)
      .then((result) => {
        if (!cancelled) {
          setState(result);
          if (result.outcome) {
            setStatus(result.outcome.status);
            setNote(result.outcome.note);
          } else {
            setStatus("approved");
            setNote("");
          }
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, entityType, entityId]);

  async function saveOutcome(): Promise<void> {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await resolveDecisionOutcome(token, entityType, entityId, status, note);
      setState(result.state);
      setSuccess(result.changed ? "Final outcome recorded." : "Final outcome unchanged.");
      if (result.state.outcome) {
        setStatus(result.state.outcome.status);
        setNote(result.state.outcome.note);
      }
    } catch (saveError: unknown) {
      setError(errorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-5 border border-line bg-field p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">Final outcome</h4>
          <p className="mt-1 text-xs leading-5 text-ink/60">
            Record the conclusive internal decision when review is complete.
          </p>
        </div>
        {state ? (
          <span
            className={`border px-2 py-1 text-xs font-semibold ${
              state.outcome
                ? decisionOutcomeStatusClassName(state.outcome.status)
                : "border-line bg-white text-ink/65"
            }`}
          >
            {state.outcome ? decisionOutcomeStatusLabel(state.outcome.status) : "Active review"}
          </span>
        ) : null}
      </div>
      {isLoading ? <p className="mt-3 text-sm text-ink/60">Loading final outcome...</p> : null}
      {error ? (
        <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {success ? (
        <p className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {success}
        </p>
      ) : null}
      {state?.outcome ? (
        <div className="mt-3 border border-line bg-white p-3">
          <p className="text-sm font-semibold">
            {decisionOutcomeStatusLabel(state.outcome.status)} by {state.outcome.resolver.email}
          </p>
          <p className="mt-1 text-xs text-ink/55">{formatDateTime(state.outcome.resolvedAt)}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/75">{state.outcome.note}</p>
        </div>
      ) : !isLoading ? (
        <p className="mt-3 border-y border-line py-3 text-sm text-ink/65">
          This item is still active and has no final outcome yet.
        </p>
      ) : null}
      {canResolve ? (
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void saveOutcome();
          }}
        >
          <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-ink/55" htmlFor={`${entityId}-outcome-status`}>
            Outcome
          </label>
          <select
            id={`${entityId}-outcome-status`}
            value={status}
            disabled={isSaving}
            onChange={(event) => setStatus(event.target.value as DecisionOutcomeStatus)}
            className="w-full border border-line bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {decisionOutcomeStatusOptions.map((option) => (
              <option key={option} value={option}>
                {decisionOutcomeStatusLabel(option)}
              </option>
            ))}
          </select>
          <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-ink/55" htmlFor={`${entityId}-outcome-note`}>
            Rationale
          </label>
          <textarea
            id={`${entityId}-outcome-note`}
            value={note}
            maxLength={1000}
            disabled={isSaving}
            rows={4}
            onChange={(event) => setNote(event.target.value)}
            className="w-full resize-y border border-line bg-white px-3 py-2 text-sm leading-6 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Why this final outcome was chosen"
          />
          <div className="flex items-center justify-between gap-3 text-xs text-ink/55">
            <span>{note.length}/1000</span>
            <span>{state?.outcome ? "Updates replace the current final outcome." : "Creates the final outcome."}</span>
          </div>
          <button
            type="submit"
            disabled={isSaving || note.trim().length === 0}
            className="w-full bg-pine px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : state?.outcome ? "Update final outcome" : "Record final outcome"}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-xs leading-5 text-ink/60">
          Owners and admins can record the final outcome.
        </p>
      )}
    </section>
  );
}

function decisionOutcomeStatusLabel(status: DecisionOutcomeStatus): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "declined":
      return "Declined";
    case "deferred":
      return "Deferred";
    case "archived":
      return "Archived";
  }
}

function decisionOutcomeStatusClassName(status: DecisionOutcomeStatus): string {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "declined":
      return "border-red-200 bg-red-50 text-red-800";
    case "deferred":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "archived":
      return "border-line bg-white text-ink/65";
  }
}

function WatchlistPage({
  token,
  items,
  isLoading,
  error,
  actionId,
  portfolioItems,
  portfolioActionId,
  portfolioError,
  comparisonItems,
  comparisonActionId,
  comparisonError,
  onRetry,
  onRemove,
  onTrack,
  onCompare,
  onRemoveFromComparison,
}: {
  token: string;
  items: WatchlistItemResponse[];
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
  portfolioItems: PortfolioItemResponse[];
  portfolioActionId: string | null;
  portfolioError: string | null;
  comparisonItems: ComparisonItemResponse[];
  comparisonActionId: string | null;
  comparisonError: string | null;
  onRetry: () => void;
  onRemove: (watchlistItemId: string) => void;
  onTrack: (watchlistItemId: string) => void;
  onCompare: (watchlistItemId: string) => void;
  onRemoveFromComparison: (comparisonItemId: string) => void;
}) {
  const sortedItems = useMemo(() => sortWatchlistItemsForReview(items), [items]);
  const portfolioByScoreId = useMemo(() => buildPortfolioByScoreId(portfolioItems), [portfolioItems]);
  const portfolioByWatchlistId = useMemo(() => buildPortfolioByWatchlistId(portfolioItems), [portfolioItems]);
  const comparisonByScoreId = useMemo(() => buildComparisonByScoreId(comparisonItems), [comparisonItems]);
  const comparisonByWatchlistId = useMemo(() => buildComparisonByWatchlistId(comparisonItems), [comparisonItems]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = sortedItems.find((item) => item.id === selectedItemId) ?? sortedItems[0] ?? null;
  const selectedPortfolioItem = selectedItem
    ? portfolioByWatchlistId.get(selectedItem.id) ?? portfolioByScoreId.get(selectedItem.scoredRecordId) ?? null
    : null;
  const selectedComparisonItem = selectedItem
    ? comparisonByWatchlistId.get(selectedItem.id) ?? comparisonByScoreId.get(selectedItem.scoredRecordId) ?? null
    : null;

  useEffect(() => {
    if (selectedItemId && sortedItems.some((item) => item.id === selectedItemId)) {
      return;
    }

    setSelectedItemId(sortedItems[0]?.id ?? null);
  }, [selectedItemId, sortedItems]);

  if (isLoading && sortedItems.length === 0) {
    return <PanelMessage label="Loading watchlist..." />;
  }

  return (
    <section className="min-w-0 space-y-5">
      <div className="border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Decision Layer</p>
            <h2 className="mt-1 text-2xl font-semibold">Watchlist</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/70">
              Compare scored records kept from dataset review without re-scanning every source row.
            </p>
          </div>
          <Metric label="Kept Records" value={String(sortedItems.length)} />
        </div>
        {error ? <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
        {portfolioError ? (
          <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{portfolioError}</div>
        ) : null}
        {comparisonError ? (
          <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{comparisonError}</div>
        ) : null}
      </div>

      {sortedItems.length === 0 && !isLoading ? (
        <div className="border border-line bg-white p-5">
          <h3 className="text-lg font-semibold">No records kept yet</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Keep records from a scored dataset to build a shortlist for later comparison.
          </p>
          {error ? <PanelError message={error} onRetry={onRetry} /> : null}
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 border border-line bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">
                Shortlist Comparison ({sortedItems.length})
              </h3>
              <button type="button" onClick={onRetry} className="border border-line px-3 py-2 text-sm font-semibold">
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1160px] w-full border-collapse text-sm">
                <thead className="bg-field text-left text-xs uppercase tracking-[0.08em] text-ink/60">
                  <tr>
                    <th className="border-b border-line px-3 py-2">Record</th>
                    <th className="border-b border-line px-3 py-2">Portfolio</th>
                    <th className="border-b border-line px-3 py-2">Compare</th>
                    <th className="border-b border-line px-3 py-2">Invest</th>
                    <th className="border-b border-line px-3 py-2">Risk</th>
                    <th className="border-b border-line px-3 py-2">Confidence</th>
                    <th className="border-b border-line px-3 py-2">Liquidity</th>
                    <th className="border-b border-line px-3 py-2">Redemption</th>
                    <th className="border-b border-line px-3 py-2">Coverage</th>
                    <th className="border-b border-line px-3 py-2">Flags</th>
                    <th className="border-b border-line px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => {
                    const band = scoreBand(item.investmentScore);
                    const portfolioItem =
                      portfolioByWatchlistId.get(item.id) ?? portfolioByScoreId.get(item.scoredRecordId) ?? null;
                    const comparisonItem =
                      comparisonByWatchlistId.get(item.id) ?? comparisonByScoreId.get(item.scoredRecordId) ?? null;
                    const isPortfolioActionPending =
                      portfolioActionId === item.id || (portfolioItem ? portfolioActionId === portfolioItem.id : false);
                    const isComparisonActionPending =
                      comparisonActionId === item.id || (comparisonItem ? comparisonActionId === comparisonItem.id : false);
                    return (
                      <tr
                        key={item.id}
                        tabIndex={0}
                        onClick={() => setSelectedItemId(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedItemId(item.id);
                          }
                        }}
                        className={`cursor-pointer align-top hover:bg-field ${
                          selectedItem?.id === item.id ? "bg-field" : "bg-white"
                        }`}
                      >
                        <td className="border-b border-line px-3 py-3">
                          <div className="font-semibold">{primaryRecordLabel(item)}</div>
                          <div className="mt-1 text-xs text-ink/60">Dataset {shortId(item.datasetId)}</div>
                        </td>
                        <td className="border-b border-line px-3 py-3">
                          <button
                            type="button"
                            disabled={isComparisonActionPending}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (comparisonItem) {
                                onRemoveFromComparison(comparisonItem.id);
                              } else {
                                onCompare(item.id);
                              }
                            }}
                            className={`border px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                              comparisonItem ? "border-pine bg-pine text-white" : "border-line bg-white text-ink"
                            }`}
                          >
                            {isComparisonActionPending ? "Working" : comparisonItem ? "Added" : "Compare"}
                          </button>
                        </td>
                        <td className="border-b border-line px-3 py-3">
                          {portfolioItem ? (
                            <span
                              className={`inline-flex border px-2 py-1 text-xs font-semibold ${portfolioStatusClassName(
                                portfolioItem.status,
                              )}`}
                            >
                              {portfolioStatusLabel(portfolioItem.status)}
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isPortfolioActionPending}
                              onClick={(event) => {
                                event.stopPropagation();
                                onTrack(item.id);
                              }}
                              className="border border-line bg-white px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isPortfolioActionPending ? "Tracking" : "Track"}
                            </button>
                          )}
                        </td>
                        <td className="border-b border-line px-3 py-3">
                          <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${band.className}`}>
                            {item.investmentScore} {band.label}
                          </span>
                        </td>
                        <td className="border-b border-line px-3 py-3">{item.riskScore}</td>
                        <td className="border-b border-line px-3 py-3">{item.confidenceScore}</td>
                        <td className="border-b border-line px-3 py-3">{item.liquidityScore}</td>
                        <td className="border-b border-line px-3 py-3">{formatPercent(item.redemptionProbability)}</td>
                        <td className="border-b border-line px-3 py-3">{formatRatio(item.valueCoverageRatio)}</td>
                        <td className="max-w-[220px] border-b border-line px-3 py-3 text-xs text-ink/75">
                          {flagPreview(item)}
                        </td>
                        <td className="border-b border-line px-3 py-3">
                          <button
                            type="button"
                            disabled={actionId === item.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              onRemove(item.id);
                            }}
                            className="border border-line bg-white px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionId === item.id ? "Removing" : "Remove"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <WatchlistDetail
            token={token}
            item={selectedItem}
            actionId={actionId}
            portfolioItem={selectedPortfolioItem}
            portfolioActionId={portfolioActionId}
            comparisonItem={selectedComparisonItem}
            comparisonActionId={comparisonActionId}
            onRemove={onRemove}
            onTrack={onTrack}
            onCompare={onCompare}
            onRemoveFromComparison={onRemoveFromComparison}
          />
        </div>
      )}
    </section>
  );
}

function PortfolioPage({
  token,
  items,
  summary,
  savedViews,
  isLoading,
  error,
  actionId,
  comparisonItems,
  comparisonActionId,
  comparisonError,
  onRetry,
  onStatusChange,
  onRemove,
  onCompare,
  onRemoveFromComparison,
  onSaveView,
  onApplyView,
  onDeleteView,
}: {
  token: string;
  items: PortfolioItemResponse[];
  summary: PortfolioSummaryResponse | null;
  savedViews: SavedViewsState;
  isLoading: boolean;
  error: string | null;
  actionId: string | null;
  comparisonItems: ComparisonItemResponse[];
  comparisonActionId: string | null;
  comparisonError: string | null;
  onRetry: () => void;
  onStatusChange: (portfolioItemId: string, status: PortfolioStatus) => void;
  onRemove: (portfolioItemId: string) => void;
  onCompare: (portfolioItemId: string) => void;
  onRemoveFromComparison: (comparisonItemId: string) => void;
  onSaveView: (name: string, filter: PortfolioReviewFilter) => void;
  onApplyView: (savedViewId: string | null) => void;
  onDeleteView: (savedViewId: string) => void;
}) {
  const dashboardSummary = useMemo(() => summary ?? summarizePortfolioForReview(items), [items, summary]);
  const [statusFilter, setStatusFilter] = useState<PortfolioReviewFilter>("all");
  const [saveViewName, setSaveViewName] = useState("");
  const portfolioViewItems = useMemo(
    () => applyPortfolioSavedViewForReview(items, savedViews.activeView),
    [items, savedViews.activeView],
  );
  const filteredItems = useMemo(
    () => filterPortfolioItemsForReview(portfolioViewItems, statusFilter),
    [portfolioViewItems, statusFilter],
  );
  const comparisonByScoreId = useMemo(() => buildComparisonByScoreId(comparisonItems), [comparisonItems]);
  const comparisonByPortfolioId = useMemo(() => buildComparisonByPortfolioId(comparisonItems), [comparisonItems]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0] ?? null;
  const selectedComparisonItem = selectedItem
    ? comparisonByPortfolioId.get(selectedItem.id) ?? comparisonByScoreId.get(selectedItem.scoredRecordId) ?? null
    : null;

  useEffect(() => {
    if (selectedItemId && filteredItems.some((item) => item.id === selectedItemId)) {
      return;
    }

    setSelectedItemId(filteredItems[0]?.id ?? null);
  }, [filteredItems, selectedItemId]);

  if (isLoading && dashboardSummary.totalTrackedItems === 0) {
    return <PanelMessage label="Loading portfolio..." />;
  }

  return (
    <section className="min-w-0 space-y-5">
      <div className="border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Operating Layer</p>
            <h2 className="mt-1 text-2xl font-semibold">Portfolio Tracking</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/70">
              Track records promoted from scoring or the watchlist with practical status, original reasoning, and risk context.
            </p>
          </div>
          <button type="button" onClick={onRetry} className="border border-line px-3 py-2 text-sm font-semibold">
            Refresh
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Metric label="Tracked Items" value={String(dashboardSummary.totalTrackedItems)} />
          <Metric label="Active" value={String(dashboardSummary.activeItems)} />
          <Metric label="Ready" value={String(dashboardSummary.readyItems)} />
          <Metric label="Acquired" value={String(dashboardSummary.acquiredItems)} />
        </div>
        {error ? <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
        {comparisonError ? (
          <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{comparisonError}</div>
        ) : null}
        {savedViews.error ? (
          <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{savedViews.error}</div>
        ) : null}
      </div>

      {dashboardSummary.totalTrackedItems === 0 && !isLoading ? (
        <div className="border border-line bg-white p-5">
          <h3 className="text-lg font-semibold">No tracked portfolio items yet</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Track scored records from dataset review or promote watchlist items when they move from shortlist to active decision.
          </p>
          {error ? <PanelError message={error} onRetry={onRetry} /> : null}
        </div>
      ) : (
        <div className="space-y-5">
          <section className="border border-line bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/60">Saved Views</p>
                <h3 className="mt-1 text-lg font-semibold">
                  {savedViews.activeView ? savedViews.activeView.name : "Default portfolio review"}
                </h3>
                <p className="mt-1 text-sm text-ink/65">
                  {savedViews.activeView ? savedViewCriteriaLabel(savedViews.activeView) : "All tracked portfolio items."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  onApplyView(null);
                }}
                className="border border-line px-3 py-2 text-sm font-semibold"
              >
                Default View
              </button>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/55">Attention Queues</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {savedViews.queues
                      .filter((view) => view.surface === "portfolio")
                      .map((view) => (
                        <button
                          key={view.id}
                          type="button"
                          disabled={savedViews.actionId === view.id}
                          onClick={() => {
                            setStatusFilter("all");
                            onApplyView(view.id);
                          }}
                          className={`border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                            savedViews.activeView?.id === view.id ? "border-pine bg-pine text-white" : "border-line bg-white"
                          }`}
                        >
                          {savedViews.actionId === view.id ? "Applying" : view.name}
                        </button>
                      ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/55">Saved Portfolio Views</p>
                  {savedViews.views.filter((view) => view.surface === "portfolio").length === 0 ? (
                    <p className="mt-2 text-sm text-ink/65">No saved portfolio views yet.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-line border border-line">
                      {savedViews.views
                        .filter((view) => view.surface === "portfolio")
                        .map((view) => (
                          <li key={view.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                            <button
                              type="button"
                              disabled={savedViews.actionId === view.id}
                              onClick={() => {
                                setStatusFilter("all");
                                onApplyView(view.id);
                              }}
                              className="text-left"
                            >
                              <span className="block text-sm font-semibold">{view.name}</span>
                              <span className="mt-1 block text-xs text-ink/60">{savedViewCriteriaLabel(view)}</span>
                            </button>
                            <button
                              type="button"
                              disabled={savedViews.actionId === view.id}
                              onClick={() => onDeleteView(view.id)}
                              className="border border-line px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
              <form
                className="border border-line bg-field p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  onSaveView(saveViewName, statusFilter);
                  setSaveViewName("");
                }}
              >
                <label htmlFor="portfolio-save-view-name" className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/60">
                  Save Current Filter
                </label>
                <input
                  id="portfolio-save-view-name"
                  value={saveViewName}
                  onChange={(event) => setSaveViewName(event.target.value)}
                  placeholder="Review-ready deals"
                  className="mt-2 w-full border border-line bg-white px-3 py-2 text-sm"
                />
                <p className="mt-2 text-xs text-ink/60">
                  Current filter: {statusFilter === "all" ? "All statuses" : statusFilter === "active" ? "Active only" : portfolioStatusLabel(statusFilter)}
                </p>
                <button
                  type="submit"
                  disabled={savedViews.actionId === "save-portfolio-view" || saveViewName.trim().length === 0}
                  className="mt-3 w-full bg-pine px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savedViews.actionId === "save-portfolio-view" ? "Saving" : "Save View"}
                </button>
              </form>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="border border-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/60">Status Distribution</p>
                  <h3 className="mt-1 text-lg font-semibold">Portfolio at a glance</h3>
                </div>
                <p className="text-xs text-ink/55">Updated {formatDateTime(dashboardSummary.generatedAt)}</p>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {dashboardSummary.statusCounts.map((count) => (
                  <button
                    key={count.status}
                    type="button"
                    onClick={() => setStatusFilter(count.status)}
                    className={`border px-3 py-3 text-left ${
                      statusFilter === count.status ? "border-pine bg-field" : "border-line bg-white"
                    }`}
                  >
                    <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-ink/55">
                      {portfolioStatusLabel(count.status)}
                    </span>
                    <span className="mt-1 block text-2xl font-semibold">{count.count}</span>
                    <span className="mt-1 block text-xs text-ink/60">{count.isActive ? "Active review state" : "Closed state"}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="border border-line bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/60">Needs Attention</p>
              <h3 className="mt-1 text-lg font-semibold">{dashboardSummary.needsAttention.length} items to review</h3>
              {dashboardSummary.needsAttention.length === 0 ? (
                <p className="mt-3 text-sm leading-6 text-ink/70">No tracked items are currently flagged by the summary rules.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {dashboardSummary.needsAttention.slice(0, 4).map((attention) => (
                    <li key={attention.item.id} className="border border-line bg-field p-3">
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("all");
                          setSelectedItemId(attention.item.id);
                        }}
                        className="text-left text-sm font-semibold"
                      >
                        {summaryRecordLabel(attention.item)}
                      </button>
                      <p className="mt-1 text-xs text-ink/60">Status {portfolioStatusLabel(attention.item.status)}</p>
                      <ul className="mt-2 space-y-1">
                        {attention.reasons.slice(0, 2).map((reason) => (
                          <li
                            key={reason.code}
                            className={`text-xs ${
                              reason.severity === "warning" ? "text-amber-900" : "text-ink/70"
                            }`}
                          >
                            {reason.message}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <PortfolioActivityPanel
              title="Recent Additions"
              emptyLabel="No recent portfolio additions."
              activities={dashboardSummary.recentAdditions}
              onSelect={(portfolioItemId) => {
                setStatusFilter("all");
                setSelectedItemId(portfolioItemId);
              }}
            />
            <PortfolioActivityPanel
              title="Recent Status Changes"
              emptyLabel="No status changes recorded yet."
              activities={dashboardSummary.recentStatusChanges}
              onSelect={(portfolioItemId) => {
                setStatusFilter("all");
                setSelectedItemId(portfolioItemId);
              }}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 border border-line bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">
                Tracked Decisions ({filteredItems.length}/{dashboardSummary.totalTrackedItems})
              </h3>
              <div className="flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as PortfolioReviewFilter)}
                  className="border border-line bg-white px-3 py-2 text-sm"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active only</option>
                  {portfolioStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {portfolioStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {filteredItems.length === 0 ? (
              <PanelMessage label="No portfolio items match the current status filter." />
            ) : (
              <div className="overflow-x-auto">
              <table className="min-w-[1080px] w-full border-collapse text-sm">
                <thead className="bg-field text-left text-xs uppercase tracking-[0.08em] text-ink/60">
                  <tr>
                    <th className="border-b border-line px-3 py-2">Record</th>
                    <th className="border-b border-line px-3 py-2">Status</th>
                    <th className="border-b border-line px-3 py-2">Compare</th>
                    <th className="border-b border-line px-3 py-2">Invest</th>
                    <th className="border-b border-line px-3 py-2">Risk</th>
                    <th className="border-b border-line px-3 py-2">Confidence</th>
                    <th className="border-b border-line px-3 py-2">Liquidity</th>
                    <th className="border-b border-line px-3 py-2">Coverage</th>
                    <th className="border-b border-line px-3 py-2">Flags</th>
                    <th className="border-b border-line px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const band = scoreBand(item.investmentScore);
                    const comparisonItem =
                      comparisonByPortfolioId.get(item.id) ?? comparisonByScoreId.get(item.scoredRecordId) ?? null;
                    const isComparisonActionPending =
                      comparisonActionId === item.id || (comparisonItem ? comparisonActionId === comparisonItem.id : false);
                    return (
                      <tr
                        key={item.id}
                        tabIndex={0}
                        onClick={() => setSelectedItemId(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedItemId(item.id);
                          }
                        }}
                        className={`cursor-pointer align-top hover:bg-field ${
                          selectedItem?.id === item.id ? "bg-field" : "bg-white"
                        }`}
                      >
                        <td className="border-b border-line px-3 py-3">
                          <div className="font-semibold">{primaryRecordLabel(item)}</div>
                          <div className="mt-1 text-xs text-ink/60">Dataset {shortId(item.datasetId)}</div>
                          {item.sourceWatchlistItemId ? (
                            <div className="mt-1 text-xs text-ink/60">Promoted from watchlist</div>
                          ) : (
                            <div className="mt-1 text-xs text-ink/60">Tracked from score review</div>
                          )}
                        </td>
                        <td className="border-b border-line px-3 py-3">
                          <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${portfolioStatusClassName(item.status)}`}>
                            {portfolioStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="border-b border-line px-3 py-3">
                          <button
                            type="button"
                            disabled={isComparisonActionPending}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (comparisonItem) {
                                onRemoveFromComparison(comparisonItem.id);
                              } else {
                                onCompare(item.id);
                              }
                            }}
                            className={`border px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                              comparisonItem ? "border-pine bg-pine text-white" : "border-line bg-white text-ink"
                            }`}
                          >
                            {isComparisonActionPending ? "Working" : comparisonItem ? "Added" : "Compare"}
                          </button>
                        </td>
                        <td className="border-b border-line px-3 py-3">
                          <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${band.className}`}>
                            {item.investmentScore} {band.label}
                          </span>
                        </td>
                        <td className="border-b border-line px-3 py-3">{item.riskScore}</td>
                        <td className="border-b border-line px-3 py-3">{item.confidenceScore}</td>
                        <td className="border-b border-line px-3 py-3">{item.liquidityScore}</td>
                        <td className="border-b border-line px-3 py-3">{formatRatio(item.valueCoverageRatio)}</td>
                        <td className="max-w-[220px] border-b border-line px-3 py-3 text-xs text-ink/75">
                          {flagPreview(item)}
                        </td>
                        <td className="border-b border-line px-3 py-3">
                          <button
                            type="button"
                            disabled={actionId === item.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              onRemove(item.id);
                            }}
                            className="border border-line bg-white px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionId === item.id ? "Removing" : "Remove"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
          <PortfolioDetail
            token={token}
            item={selectedItem}
            actionId={actionId}
            comparisonItem={selectedComparisonItem}
            comparisonActionId={comparisonActionId}
            onStatusChange={onStatusChange}
            onRemove={onRemove}
            onCompare={onCompare}
            onRemoveFromComparison={onRemoveFromComparison}
          />
          </div>
        </div>
      )}
    </section>
  );
}

function PortfolioActivityPanel({
  title,
  emptyLabel,
  activities,
  onSelect,
}: {
  title: string;
  emptyLabel: string;
  activities: PortfolioSummaryResponse["recentAdditions"];
  onSelect: (portfolioItemId: string) => void;
}) {
  return (
    <section className="border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/60">Activity</p>
      <h3 className="mt-1 text-lg font-semibold">{title}</h3>
      {activities.length === 0 ? (
        <p className="mt-3 text-sm text-ink/70">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line border border-line">
          {activities.map((activity) => (
            <li key={`${activity.activityType}:${activity.item.id}:${activity.occurredAt}`} className="p-3">
              <button type="button" onClick={() => onSelect(activity.item.id)} className="text-left text-sm font-semibold">
                {summaryRecordLabel(activity.item)}
              </button>
              <p className="mt-1 text-xs text-ink/60">
                {activity.message} {formatDateTime(activity.occurredAt)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className={`border px-2 py-1 font-semibold ${portfolioStatusClassName(activity.item.status)}`}>
                  {portfolioStatusLabel(activity.item.status)}
                </span>
                <span className="border border-line bg-field px-2 py-1 text-ink/70">
                  Invest {activity.item.investmentScore}
                </span>
                <span className="border border-line bg-field px-2 py-1 text-ink/70">
                  Risk {activity.item.riskScore}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PortfolioDetail({
  token,
  item,
  actionId,
  comparisonItem,
  comparisonActionId,
  onStatusChange,
  onRemove,
  onCompare,
  onRemoveFromComparison,
}: {
  token: string;
  item: PortfolioItemResponse | null;
  actionId: string | null;
  comparisonItem: ComparisonItemResponse | null;
  comparisonActionId: string | null;
  onStatusChange: (portfolioItemId: string, status: PortfolioStatus) => void;
  onRemove: (portfolioItemId: string) => void;
  onCompare: (portfolioItemId: string) => void;
  onRemoveFromComparison: (comparisonItemId: string) => void;
}) {
  if (!item) {
    return (
      <aside className="border border-line bg-white p-4">
        <p className="text-sm text-ink/70">No portfolio item selected.</p>
      </aside>
    );
  }

  return (
    <aside className="border border-line bg-white p-4 xl:sticky xl:top-4 xl:self-start">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">Portfolio Detail</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-xl font-semibold">{primaryRecordLabel(item)}</h3>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={comparisonActionId === item.id || (comparisonItem ? comparisonActionId === comparisonItem.id : false)}
            onClick={() => {
              if (comparisonItem) {
                onRemoveFromComparison(comparisonItem.id);
              } else {
                onCompare(item.id);
              }
            }}
            className={`border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              comparisonItem ? "border-pine bg-pine text-white" : "border-line bg-white text-ink"
            }`}
          >
            {comparisonItem ? "In compare" : "Compare"}
          </button>
          <button
            type="button"
            disabled={actionId === item.id}
            onClick={() => onRemove(item.id)}
            className="border border-line px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionId === item.id ? "Removing" : "Remove"}
          </button>
        </div>
      </div>
      <label className="mt-4 block text-sm font-semibold" htmlFor="portfolio-status">
        Status
      </label>
      <select
        id="portfolio-status"
        value={item.status}
        disabled={actionId === item.id}
        onChange={(event) => onStatusChange(item.id, event.target.value as PortfolioStatus)}
        className="mt-2 w-full border border-line bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {portfolioStatusOptions.map((status) => (
          <option key={status} value={status}>
            {portfolioStatusLabel(status)}
          </option>
        ))}
      </select>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <DetailTerm label="Lien" value={formatMoney(item.normalizedFields.lienAmount)} />
        <DetailTerm label="Value" value={formatMoney(item.normalizedFields.estimatedValue)} />
        <DetailTerm label="Coverage" value={formatRatio(item.valueCoverageRatio)} />
        <DetailTerm label="Dataset" value={shortId(item.datasetId)} />
        <DetailTerm label="Tracked" value={formatDateTime(item.trackedAt)} />
        <DetailTerm label="Status Updated" value={formatDateTime(item.statusUpdatedAt)} />
      </dl>
      <section className="mt-5">
        <h4 className="text-sm font-semibold">Original Reasoning</h4>
        <ol className="mt-2 space-y-2">
          {item.reasoning.map((reason) => (
            <li key={reason} className="border border-line bg-field px-3 py-2 text-sm leading-6 text-ink/80">
              {reason}
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-5">
        <h4 className="text-sm font-semibold">Flags</h4>
        {item.flags.length === 0 ? (
          <p className="mt-2 text-sm text-ink/65">No flags returned.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {item.flags.map((flag) => (
              <li key={flag} className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {flag}
              </li>
            ))}
          </ul>
        )}
      </section>
      <WorkspaceCommentThread
        key={`portfolio_item:${item.id}`}
        token={token}
        entityType="portfolio_item"
        entityId={item.id}
      />
      <ReviewChecklist
        token={token}
        entityType="portfolio_item"
        entityId={item.id}
      />
      <FollowControl token={token} entityType="portfolio_item" entityId={item.id} />
      <FollowUpControl token={token} entityType="portfolio_item" entityId={item.id} />
      <WorkspaceAssignmentControl token={token} entityType="portfolio_item" entityId={item.id} />
    </aside>
  );
}

function NotificationDeliveryHistoryPage({
  state,
  onRetry,
  onOpenDataset,
}: {
  state: NotificationDeliveryHistoryState;
  onRetry: () => void;
  onOpenDataset: (datasetId: string) => void;
}) {
  const deliveries = useMemo(
    () => sortNotificationDeliveriesForReview(state.deliveries),
    [state.deliveries],
  );
  const digestBatches = useMemo(
    () => sortNotificationDigestBatchesForReview(state.digestBatches),
    [state.digestBatches],
  );
  const sentCount = deliveries.filter((delivery) => delivery.status === "sent").length;
  const attentionCount = deliveries.filter(
    (delivery) => delivery.status === "failed" || delivery.status === "provider_disabled",
  ).length;

  if (state.isLoading && deliveries.length === 0 && digestBatches.length === 0) {
    return <PanelMessage label="Loading delivery history..." />;
  }

  return (
    <section className="min-w-0 space-y-5">
      <div className="border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Delivery Operations</p>
            <h2 className="mt-1 text-2xl font-semibold">Delivery History</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/70">
              Review immediate emails, scheduled digest batches, suppressions, and delivery failures for product alerts.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Metric label="Sent" value={String(sentCount)} />
            <Metric label="Needs attention" value={String(attentionCount)} />
            <Metric label="Digest batches" value={String(digestBatches.length)} />
          </div>
        </div>
        <button type="button" onClick={onRetry} className="mt-4 border border-line px-3 py-2 text-sm font-semibold">
          Refresh
        </button>
        {state.error ? <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</div> : null}
      </div>

      {deliveries.length === 0 && digestBatches.length === 0 && !state.isLoading ? (
        <div className="border border-line bg-white p-5">
          <h3 className="text-lg font-semibold">No delivery history yet</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Immediate email attempts, digest processing, and preference suppressions will appear here as product alerts are generated.
          </p>
        </div>
      ) : null}

      {digestBatches.length > 0 ? (
        <section className="border border-line bg-white">
          <div className="border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">Digest Batches</h3>
          </div>
          <div className="divide-y divide-line">
            {digestBatches.map((batch) => (
              <article key={batch.id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_160px_180px]">
                <div className="min-w-0">
                  <h4 className="font-semibold">{batch.subject ?? "Scheduled product-alert digest"}</h4>
                  <p className="mt-1 text-sm text-ink/65">
                    {batch.itemCount} {batch.itemCount === 1 ? "included event" : "included events"}
                  </p>
                  {batch.failureMessage ? (
                    <p className="mt-2 text-sm text-amber-900">{batch.failureMessage}</p>
                  ) : null}
                </div>
                <div>
                  <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${notificationDeliveryStatusClassName(batch.status)}`}>
                    {notificationDigestBatchStatusLabel(batch.status)}
                  </span>
                  <p className="mt-2 text-xs text-ink/55">{batch.attempts} send attempt{batch.attempts === 1 ? "" : "s"}</p>
                </div>
                <p className="text-sm text-ink/60 md:text-right">{formatDateTime(batch.sentAt ?? batch.updatedAt)}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {deliveries.length > 0 ? (
        <section className="border border-line bg-white">
          <div className="border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">
              Notification Deliveries ({deliveries.length})
            </h3>
          </div>
          <div className="divide-y divide-line">
            {deliveries.map((delivery) => (
              <article key={delivery.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[150px_minmax(0,1fr)_210px]">
                <div>
                  <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${notificationDeliveryStatusClassName(delivery.status)}`}>
                    {notificationDeliveryStatusLabel(delivery.status)}
                  </span>
                  <p className="mt-2 text-xs text-ink/55">
                    {delivery.cadence === "digest" ? "Digest email" : "Immediate email"}
                  </p>
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold">{delivery.subject ?? alertTypeLabel(delivery.alertType)}</h4>
                  {delivery.summary ? <p className="mt-1 text-sm leading-6 text-ink/70">{delivery.summary}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/60">
                    <span className="border border-line bg-field px-2 py-1">{notificationCadenceLabel(delivery.cadence)}</span>
                    <span className="border border-line bg-field px-2 py-1">
                      {delivery.attempts} attempt{delivery.attempts === 1 ? "" : "s"}
                    </span>
                    {delivery.digestBatchId ? <span className="border border-line bg-field px-2 py-1">Digest batch</span> : null}
                  </div>
                  {delivery.failureMessage ? (
                    <p className="mt-3 text-sm text-amber-900">{delivery.failureMessage}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-start justify-between gap-2 lg:justify-end">
                  <p className="text-xs text-ink/55">{formatDateTime(delivery.sentAt ?? delivery.updatedAt)}</p>
                  {delivery.relatedEntityType === "dataset" && delivery.relatedEntityId ? (
                    <button
                      type="button"
                      onClick={() => onOpenDataset(delivery.relatedEntityId as string)}
                      className="border border-line px-3 py-2 text-xs font-semibold"
                    >
                      Open dataset
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function NotificationPreferencesPage({
  state,
  onRetry,
  onSave,
}: {
  state: NotificationPreferencesState;
  onRetry: () => void;
  onSave: (rules: NotificationPreferenceRule[]) => void;
}) {
  const [draftRules, setDraftRules] = useState<NotificationPreferenceRule[]>([]);

  useEffect(() => {
    setDraftRules(state.preferences?.rules ?? state.categories.map((category) => category.defaultRule));
  }, [state.preferences, state.categories]);

  const rulesByType = useMemo(() => new Map(draftRules.map((rule) => [rule.alertType, rule])), [draftRules]);

  function updateRule(alertType: NotificationPreferenceRule["alertType"], update: Partial<NotificationPreferenceRule>): void {
    setDraftRules((current) =>
      current.map((rule) => (rule.alertType === alertType ? { ...rule, ...update } : rule)),
    );
  }

  if (state.isLoading && !state.preferences) {
    return <PanelMessage label="Loading notification preferences..." />;
  }

  return (
    <section className="min-w-0 space-y-5">
      <div className="border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Notification Control</p>
            <h2 className="mt-1 text-2xl font-semibold">Notification Preferences</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/70">
              Choose which product alerts stay active in-app, can send immediate email when SMTP is configured, or wait for digest batching.
            </p>
          </div>
          <button type="button" onClick={onRetry} className="border border-line px-3 py-2 text-sm font-semibold">
            Refresh
          </button>
        </div>
        {state.error ? <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</div> : null}
        {state.success ? (
          <div className="mt-4 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {state.success}
          </div>
        ) : null}
      </div>

      <form
        className="border border-line bg-white"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draftRules);
        }}
      >
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">Alert Rules</h3>
        </div>
        <div className="divide-y divide-line">
          {state.categories.map((category) => {
            const rule = rulesByType.get(category.alertType) ?? category.defaultRule;
            const deliveryState = !rule.enabled
              ? "suppressed"
              : rule.deliveryMode === "in_app_only"
                ? "in_app_only"
                : rule.cadence === "immediate"
                  ? "delivery_immediate"
                  : "delivery_digest";

            return (
              <section key={category.alertType} className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div>
                  <h4 className="font-semibold">{category.label}</h4>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/70">{category.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="border border-line bg-field px-2 py-1">
                      {notificationDeliveryStateLabel(deliveryState)}
                    </span>
                    <span className="border border-line bg-field px-2 py-1">
                      {category.supportsDelivery ? "Email-capable" : "In-app only"}
                    </span>
                    <span className="border border-line bg-field px-2 py-1">
                      {category.supportsDigest ? "Digest-ready supported" : "Immediate only"}
                    </span>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(event) => updateRule(rule.alertType, { enabled: event.target.checked })}
                    />
                    Enabled
                  </label>
                  <label className="text-sm font-semibold">
                    Delivery
                    <select
                      value={rule.deliveryMode}
                      disabled={!rule.enabled}
                      onChange={(event) =>
                        updateRule(rule.alertType, {
                          deliveryMode: event.target.value as NotificationPreferenceRule["deliveryMode"],
                        })
                      }
                      className="mt-1 w-full border border-line bg-white px-3 py-2 text-sm disabled:opacity-60"
                    >
                      <option value="in_app_only">{notificationDeliveryModeLabel("in_app_only")}</option>
                      <option value="delivery_eligible">{notificationDeliveryModeLabel("delivery_eligible")}</option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold">
                    Timing
                    <select
                      value={rule.cadence}
                      disabled={!rule.enabled}
                      onChange={(event) =>
                        updateRule(rule.alertType, {
                          cadence: event.target.value as NotificationPreferenceRule["cadence"],
                        })
                      }
                      className="mt-1 w-full border border-line bg-white px-3 py-2 text-sm disabled:opacity-60"
                    >
                      <option value="immediate">{notificationCadenceLabel("immediate")}</option>
                      <option value="digest">{notificationCadenceLabel("digest")}</option>
                    </select>
                  </label>
                </div>
              </section>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-field px-4 py-3">
          <p className="text-xs text-ink/60">
            Email sends only when provider env config is complete; otherwise delivery-ready alerts are tracked safely in the outbox.
          </p>
          <button
            type="submit"
            disabled={state.isSaving || draftRules.length === 0}
            className="bg-pine px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.isSaving ? "Saving" : "Save Preferences"}
          </button>
        </div>
      </form>
    </section>
  );
}

function WorkspaceActivityPage({
  workspaceName,
  state,
  onCategoryChange,
  onRetry,
  onOpen,
}: {
  workspaceName: string;
  state: WorkspaceActivityState;
  onCategoryChange: (category: WorkspaceActivityCategory | "all") => void;
  onRetry: () => void;
  onOpen: (activity: WorkspaceActivityResponse) => void;
}) {
  const categories: Array<WorkspaceActivityCategory | "all"> = [
    "all",
    "data",
    "decisions",
    "portfolio",
    "responsibility",
    "approvals",
    "members",
  ];

  return (
    <section className="min-w-0">
      <div className="border-b border-line pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">Workspace Activity</p>
        <h2 className="mt-1 text-2xl font-semibold">{workspaceName}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
          Meaningful shared actions across datasets, decisions, responsibility, portfolio tracking, and membership.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Activity category">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={state.category === category}
            disabled={state.isLoading && state.category === category}
            onClick={() => onCategoryChange(category)}
            className={`border px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
              state.category === category ? "border-pine bg-pine text-white" : "border-line bg-white text-ink"
            }`}
          >
            {workspaceActivityCategoryLabel(category)}
          </button>
        ))}
      </div>

      {state.error ? (
        <div className="mt-5">
          <PanelError message={state.error} onRetry={onRetry} />
        </div>
      ) : state.isLoading && state.activities.length === 0 ? (
        <div className="mt-5">
          <PanelMessage label="Loading recent workspace activity..." />
        </div>
      ) : state.activities.length === 0 ? (
        <div className="mt-5 border-y border-line bg-white px-4 py-6">
          <p className="font-semibold">No activity in this category yet.</p>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Important workspace actions will appear here after they occur.
          </p>
        </div>
      ) : (
        <ol className="mt-5 border-t border-line">
          {state.activities.map((activity) => {
            const destination = workspaceActivityDestination(activity);
            return (
              <li
                key={activity.id}
                className="grid gap-3 border-b border-line bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold">{activity.actor.email}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-pine">
                      {workspaceActivityCategoryLabel(activity.category)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-ink/80">{activity.summary}</p>
                  <p className="mt-1 text-xs text-ink/55">{formatDateTime(activity.occurredAt)}</p>
                </div>
                {destination ? (
                  <button
                    type="button"
                    onClick={() => onOpen(activity)}
                    className="justify-self-start border border-line bg-white px-3 py-2 text-sm font-semibold sm:justify-self-end"
                  >
                    {workspaceActivityDestinationLabel(destination)}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

const outcomeReviewWindowOptions = [7, 30, 90] as const;

function OutcomeReviewPage({
  token,
  workspaceId,
  onOpenResolution,
}: {
  token: string;
  workspaceId: string;
  onOpenResolution: (resolution: OutcomeReviewResolution) => void;
}) {
  const [review, setReview] = useState<OutcomeReviewResponse | null>(null);
  const [windowDays, setWindowDays] = useState<(typeof outcomeReviewWindowOptions)[number]>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setReview(null);
    setIsLoading(true);
    setError(null);
    void getOutcomeReview(token, windowDays)
      .then((result) => {
        if (!cancelled) {
          setReview(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, workspaceId, windowDays, reloadVersion]);

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">Outcome Review</p>
          <h2 className="mt-1 text-2xl font-semibold">Retrospective outcomes</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Review final comparison outcomes, recent resolution movement, and practical signals for follow-up.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-semibold">
            Window
            <select
              value={windowDays}
              disabled={isLoading}
              onChange={(event) => setWindowDays(Number(event.target.value) as (typeof outcomeReviewWindowOptions)[number])}
              className="ml-2 border border-line bg-white px-3 py-2 text-sm disabled:opacity-60"
            >
              {outcomeReviewWindowOptions.map((option) => (
                <option key={option} value={option}>
                  {option} days
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setReloadVersion((version) => version + 1)}
            disabled={isLoading}
            className="border border-line bg-white px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-5">
          <PanelError message={error} onRetry={() => setReloadVersion((version) => version + 1)} />
        </div>
      ) : null}

      {!error && !review ? (
        <div className="mt-5">
          <PanelMessage label="Loading outcome review..." />
        </div>
      ) : null}

      {review ? (
        <>
          <div className="mt-5 grid border border-line bg-white sm:grid-cols-2 xl:grid-cols-5">
            <OutcomeMetric label="Comparison items" value={String(review.summary.totalComparisonItems)} />
            <OutcomeMetric label="Resolved" value={String(review.summary.resolvedItems)} />
            <OutcomeMetric label="Unresolved" value={String(review.summary.unresolvedItems)} />
            <OutcomeMetric label="Resolution rate" value={`${review.summary.resolutionRate}%`} />
            <OutcomeMetric label={`Recent ${review.windowDays}d`} value={String(review.summary.recentResolvedItems)} />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section>
              <div className="border-b border-line pb-3">
                <h3 className="text-lg font-semibold">Recent resolutions</h3>
                <p className="mt-1 text-sm text-ink/65">
                  Current final outcomes recorded inside the selected review window.
                </p>
              </div>
              {review.recentResolutions.length === 0 ? (
                <div className="border-b border-line bg-white px-4 py-5">
                  <p className="font-semibold">No recent final outcomes.</p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">
                    Resolved comparison items will appear here when their final outcome falls inside this window.
                  </p>
                </div>
              ) : (
                <ol>
                  {review.recentResolutions.map((resolution) => (
                    <li
                      key={resolution.outcome.id}
                      className="grid gap-3 border-b border-line bg-white px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{resolution.target.label}</p>
                          <span className={`border px-2 py-1 text-xs font-semibold ${decisionOutcomeStatusClassName(resolution.outcome.status)}`}>
                            {decisionOutcomeStatusLabel(resolution.outcome.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-ink/70">
                          {resolution.target.decision ? `${comparisonDecisionLabel(resolution.target.decision)} · ` : ""}
                          {resolution.target.investmentScore !== undefined
                            ? `Investment ${resolution.target.investmentScore}`
                            : "Comparison item"}{" "}
                          {resolution.target.riskScore !== undefined ? `· Risk ${resolution.target.riskScore}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-ink/55">
                          Resolved by {resolution.outcome.resolver.email} · {formatDateTime(resolution.outcome.resolvedAt)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-ink/75">{resolution.outcome.note}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenResolution(resolution)}
                        className="justify-self-start border border-line bg-white px-3 py-2 text-sm font-semibold lg:justify-self-end"
                      >
                        Open brief
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <aside className="space-y-5">
              <section className="border border-line bg-white p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">Outcome Mix</h3>
                <div className="mt-4 space-y-2">
                  {review.summary.countsByStatus.map((count) => (
                    <div key={count.status} className="flex items-center justify-between gap-3 border border-line bg-field px-3 py-2">
                      <span className="text-sm font-semibold">{decisionOutcomeStatusLabel(count.status)}</span>
                      <span className="text-sm text-ink/70">{count.count}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border border-line bg-white p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">Review Signals</h3>
                {review.signals.length === 0 ? (
                  <p className="mt-3 text-sm leading-6 text-ink/65">
                    No retrospective signals need attention for this window.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {review.signals.map((signal) => (
                      <li
                        key={signal.code}
                        className={`border px-3 py-2 text-sm leading-6 ${outcomeReviewSignalClassName(signal.severity)}`}
                      >
                        <p className="font-semibold">
                          {signal.label}
                          {signal.count !== undefined ? ` (${signal.count})` : ""}
                        </p>
                        <p className="mt-1">{signal.detail}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="border border-line bg-field p-4">
                <h3 className="text-sm font-semibold">Retrospective boundary</h3>
                <p className="mt-2 text-sm leading-6 text-ink/70">
                  This view summarizes recorded final outcomes and current comparison records only. It does not predict results or model financial performance.
                </p>
                <p className="mt-3 text-xs text-ink/55">Updated {formatDateTime(review.generatedAt)}</p>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </section>
  );
}

function OutcomeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-line px-4 py-4 sm:border-r xl:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/55">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function outcomeReviewSignalClassName(severity: "info" | "warning"): string {
  switch (severity) {
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
  }
}

function WorkspacePage({
  token,
  state,
  currentUserId,
  onRetry,
  onAddMember,
  onRoleChange,
  onRemoveMember,
}: {
  token: string;
  state: WorkspaceState;
  currentUserId: string;
  onRetry: () => void;
  onAddMember: (email: string, role: Exclude<WorkspaceRole, "owner">) => void;
  onRoleChange: (membershipId: string, role: Exclude<WorkspaceRole, "owner">) => void;
  onRemoveMember: (membershipId: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<WorkspaceRole, "owner">>("member");

  if (state.isLoading && !state.current) {
    return <PanelMessage label="Resolving workspace membership and access context..." />;
  }

  if (!state.current) {
    return <PanelError message={state.error ?? "The current workspace could not be resolved."} onRetry={onRetry} />;
  }

  const canAddMembers = state.current.permissions.canManageMembers;
  const canRemoveMembers = state.current.permissions.canRemoveMembers;
  const canManageRoles = state.current.permissions.canManageRoles;
  const currentRole = state.current.role;

  return (
    <section className="min-w-0">
      <div className="border-b border-line pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">Account Management</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{state.current.name}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
              Shared datasets, scoring, watchlist, portfolio, comparison, and decision history use this
              workspace. Personal alerts, delivery history, notification preferences, and saved views remain
              private to each user.
            </p>
          </div>
          <span className="border border-line bg-white px-3 py-2 text-sm font-semibold">
            {workspaceRoleLabel(state.current.role)}
            {!state.current.permissions.canManageSharedData ? " · Read only" : ""}
          </span>
        </div>
      </div>

      {state.error ? (
        <div className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</div>
      ) : null}
      {state.success ? (
        <div className="mt-4 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {state.success}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Metric label="Members" value={String(state.current.memberCount)} />
        <Metric label="Your role" value={workspaceRoleLabel(state.current.role)} />
        <Metric
          label="Shared data"
          value={state.current.permissions.canManageSharedData ? "Read and write" : "Read only"}
        />
      </div>

      {canAddMembers ? (
        <form
          className="mt-6 flex flex-wrap items-end gap-3 border-y border-line bg-white py-4"
          onSubmit={(event) => {
            event.preventDefault();
            const normalizedEmail = email.trim();
            if (!normalizedEmail) {
              return;
            }
            onAddMember(normalizedEmail, role);
            setEmail("");
          }}
        >
          <label className="min-w-[240px] flex-1 text-sm font-semibold">
            Registered user email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full border border-line px-3 py-2 font-normal"
              placeholder="colleague@example.com"
            />
          </label>
          {state.current.role === "owner" ? (
            <label className="text-sm font-semibold">
              Role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as Exclude<WorkspaceRole, "owner">)}
                className="mt-2 block border border-line bg-white px-3 py-2 font-normal"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          ) : null}
          <button
            type="submit"
            disabled={state.actionId === "add"}
            className="bg-pine px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.actionId === "add" ? "Adding" : "Add member"}
          </button>
        </form>
      ) : (
        <div className="mt-6 border-y border-line py-4 text-sm text-ink/70">
          Member management is limited to workspace owners and administrators.
        </div>
      )}

      <div className="mt-6 overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="bg-field text-xs uppercase tracking-[0.08em] text-ink/65">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Administration</th>
            </tr>
          </thead>
          <tbody>
            {state.members.map((member) => (
              <tr key={member.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <p className="font-medium">{member.email}</p>
                  <p className="mt-1 text-xs text-ink/60">
                    {member.userId === currentUserId ? "You" : "Active member"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {canManageRoles && canChangeWorkspaceMemberRole(currentRole, member.role) ? (
                    <select
                      value={member.role}
                      disabled={state.actionId === member.id}
                      onChange={(event) =>
                        onRoleChange(
                          member.id,
                          event.target.value as Exclude<WorkspaceRole, "owner">,
                        )
                      }
                      className="border border-line bg-white px-3 py-2 disabled:opacity-60"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="font-semibold">{workspaceRoleLabel(member.role)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink/70">
                  {member.role === "owner"
                    ? "Full workspace administration"
                    : member.role === "admin"
                      ? "Shared data and regular member administration"
                      : "Shared data: read only"}
                </td>
                <td className="px-4 py-3 text-ink/70">{formatDateTime(member.joinedAt)}</td>
                <td className="px-4 py-3">
                  {member.role === "owner" ? (
                    <span className="text-xs font-semibold text-ink/55">Protected owner</span>
                  ) : canRemoveMembers && canRemoveWorkspaceMember(currentRole, member.role) ? (
                    <button
                      type="button"
                      disabled={state.actionId === member.id}
                      onClick={() => {
                        if (window.confirm(`Remove ${member.email} from this workspace?`)) {
                          onRemoveMember(member.id);
                        }
                      }}
                      className="border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {state.actionId === member.id ? "Removing" : "Remove access"}
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-ink/55">
                      {currentRole === "admin" && member.role === "admin"
                        ? "Owner only"
                        : "Restricted"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ReviewChecklistTemplateManager
        token={token}
        canManage={state.current.permissions.canManageSharedData}
      />
      <WorkspacePolicyManager
        token={token}
        canManage={state.current.permissions.canManageSharedData}
      />
    </section>
  );
}

const workspacePolicyRuleContent: Array<{
  key: keyof WorkspacePolicyRules;
  label: string;
  description: string;
}> = [
  {
    key: "requireAssignmentBeforeComparisonHandoff",
    label: "Require assignment before comparison handoff",
    description:
      "Blocks comparison-to-watchlist and comparison-to-portfolio handoffs until responsibility is assigned.",
  },
  {
    key: "requireChecklistBeforeComparisonHandoff",
    label: "Require completed review checklist",
    description:
      "Requires an active comparison checklist with every required item complete before handoff or approval.",
  },
  {
    key: "requireApprovalForComparisonPortfolio",
    label: "Require approval before portfolio handoff",
    description:
      "Blocks direct portfolio handoff. A different owner or administrator must approve the request.",
  },
];

function WorkspacePolicyManager({
  token,
  canManage,
}: {
  token: string;
  canManage: boolean;
}) {
  const [policy, setPolicy] = useState<WorkspacePolicyResponse | null>(null);
  const [rules, setRules] = useState<WorkspacePolicyRules | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void getWorkspacePolicy(token)
      .then((result) => {
        if (!cancelled) {
          setPolicy(result);
          setRules(result.rules);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function savePolicy(): Promise<void> {
    if (!rules) {
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await updateWorkspacePolicy(token, { rules });
      setPolicy(result);
      setRules(result.rules);
      setSuccess("Workspace policy saved.");
    } catch (saveError: unknown) {
      setError(errorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-8 border-t border-line pt-6" aria-labelledby="workspace-policy-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">
            Governance
          </p>
          <h3 id="workspace-policy-heading" className="mt-1 text-lg font-semibold">
            Workspace policy
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            These rules gate selected comparison transitions. Blocked actions explain what is
            missing and how to resolve it.
          </p>
        </div>
        <span className="text-sm font-semibold text-ink/60">
          {canManage ? "Owner and admin controls" : "View only"}
        </span>
      </div>

      {isLoading ? (
        <PanelMessage label="Loading workspace policy..." />
      ) : error && !rules ? (
        <div className="mt-4">
          <PanelError message={error} />
        </div>
      ) : rules ? (
        <div className="mt-4 border-y border-line bg-white py-2">
          {error ? (
            <p className="mx-3 mt-2 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mx-3 mt-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {success}
            </p>
          ) : null}
          {workspacePolicyRuleContent.map((rule) => (
            <label
              key={rule.key}
              className="flex items-start gap-3 border-b border-line px-3 py-4 last:border-b-0"
            >
              <input
                type="checkbox"
                checked={rules[rule.key]}
                disabled={!canManage || isSaving}
                onChange={(event) => {
                  setRules((current) =>
                    current
                      ? { ...current, [rule.key]: event.target.checked }
                      : current,
                  );
                  setSuccess(null);
                }}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold">{rule.label}</span>
                <span className="mt-1 block text-sm leading-6 text-ink/65">
                  {rule.description}
                </span>
              </span>
            </label>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-3 py-4">
            <p className="text-xs text-ink/55">
              {policy?.updatedAt
                ? `Last updated ${formatDateTime(policy.updatedAt)}`
                : "Rules are disabled until an owner or administrator enables them."}
            </p>
            {canManage ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void savePolicy()}
                className="bg-pine px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving" : "Save policy"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

const reviewChecklistTargetTypes: ReviewChecklistTargetEntityType[] = [
  "comparison_item",
  "watchlist_item",
  "portfolio_item",
];

interface ReviewChecklistTemplateDraftItem {
  id?: string;
  label: string;
  required: boolean;
}

function ReviewChecklistTemplateManager({
  token,
  canManage,
}: {
  token: string;
  canManage: boolean;
}) {
  const [templates, setTemplates] = useState<ReviewChecklistTemplateResponse[]>([]);
  const [selectedType, setSelectedType] =
    useState<ReviewChecklistTargetEntityType>("comparison_item");
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [items, setItems] = useState<ReviewChecklistTemplateDraftItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void listReviewChecklistTemplates(token)
      .then((result) => {
        if (!cancelled) {
          setTemplates(result.templates);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const template = templates.find(
      (candidate) => candidate.targetEntityType === selectedType,
    );
    setName(template?.name ?? `${reviewChecklistTargetLabel(selectedType)} review`);
    setActive(template?.active ?? true);
    setItems(
      template?.items.map((item) => ({
        id: item.id,
        label: item.label,
        required: item.required,
      })) ?? [],
    );
  }, [selectedType, templates]);

  async function saveTemplate(): Promise<void> {
    const normalizedItems = items
      .map((item) => ({ ...item, label: item.label.trim() }))
      .filter((item) => item.label);
    if (!name.trim() || normalizedItems.length === 0) {
      setError("Add a template name and at least one checklist item.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await upsertReviewChecklistTemplate(token, selectedType, {
        name: name.trim(),
        active,
        items: normalizedItems.map((item) => ({
          ...(item.id ? { id: item.id } : {}),
          label: item.label,
          required: item.required,
        })),
      });
      setTemplates((current) => [
        ...current.filter(
          (template) => template.targetEntityType !== selectedType,
        ),
        result.template,
      ]);
      setSuccess("Review checklist template saved.");
    } catch (saveError: unknown) {
      setError(errorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-8 border-t border-line pt-6" aria-labelledby="review-checklist-templates">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">
            Decision discipline
          </p>
          <h3 id="review-checklist-templates" className="mt-1 text-lg font-semibold">
            Review checklist templates
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Required items determine review readiness. They provide a visible signal and do not
            automatically block handoff or approval.
          </p>
        </div>
        <span className="text-sm font-semibold text-ink/60">
          {canManage ? "Owner and admin controls" : "View only"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Checklist record type">
        {reviewChecklistTargetTypes.map((targetType) => {
          const template = templates.find(
            (candidate) => candidate.targetEntityType === targetType,
          );
          return (
            <button
              key={targetType}
              type="button"
              role="tab"
              aria-selected={selectedType === targetType}
              onClick={() => {
                setSelectedType(targetType);
                setError(null);
                setSuccess(null);
              }}
              className={`border px-3 py-2 text-sm font-semibold ${
                selectedType === targetType
                  ? "border-pine bg-pine text-white"
                  : "border-line bg-white text-ink"
              }`}
            >
              {reviewChecklistTargetLabel(targetType)}
              {template ? (template.active ? " · Active" : " · Inactive") : " · None"}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <PanelMessage label="Loading review checklist templates..." />
      ) : canManage ? (
        <div className="mt-4 border-y border-line bg-white py-4">
          {error ? (
            <p className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mb-4 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {success}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="text-sm font-semibold">
              Template name
              <input
                type="text"
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full border border-line px-3 py-2 font-normal"
              />
            </label>
            <label className="flex items-center gap-2 border border-line bg-field px-3 py-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              Active
            </label>
          </div>
          <div className="mt-4 space-y-2">
            {items.length === 0 ? (
              <p className="border-y border-line py-4 text-sm text-ink/65">
                No checklist items yet.
              </p>
            ) : null}
            {items.map((item, index) => (
              <div
                key={item.id ?? `new-${index}`}
                className="grid gap-2 border border-line p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
              >
                <input
                  type="text"
                  value={item.label}
                  maxLength={120}
                  aria-label={`Checklist item ${index + 1}`}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((candidate, candidateIndex) =>
                        candidateIndex === index
                          ? { ...candidate, label: event.target.value }
                          : candidate,
                      ),
                    )
                  }
                  className="w-full border border-line px-3 py-2 text-sm"
                  placeholder="Review item"
                />
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={item.required}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((candidate, candidateIndex) =>
                          candidateIndex === index
                            ? { ...candidate, required: event.target.checked }
                            : candidate,
                        ),
                      )
                    }
                  />
                  Required
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setItems((current) =>
                      current.filter((_, candidateIndex) => candidateIndex !== index),
                    )
                  }
                  className="border border-line bg-white px-3 py-2 text-xs font-semibold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={items.length >= 20}
              onClick={() =>
                setItems((current) => [
                  ...current,
                  { label: "", required: true },
                ])
              }
              className="border border-line bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Add item
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void saveTemplate()}
              className="bg-pine px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "Saving" : "Save template"}
            </button>
          </div>
        </div>
      ) : error ? (
        <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : (
        <div className="mt-4 border-y border-line bg-white py-4">
          {items.length === 0 ? (
            <p className="text-sm text-ink/65">
              No checklist template is configured for this record type.
            </p>
          ) : (
            <ol className="space-y-2">
              {items.map((item, index) => (
                <li key={item.id ?? index} className="flex items-center justify-between gap-3 text-sm">
                  <span>{item.label}</span>
                  <span className="text-xs font-semibold text-ink/60">
                    {item.required ? "Required" : "Optional"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}

function ScoreTable({
  scores,
  totalCount,
  selectedScoreId,
  filter,
  query,
  onFilterChange,
  onQueryChange,
  onSelect,
  watchlistByScoreId,
  watchlistActionId,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  portfolioByScoreId,
  portfolioActionId,
  onAddToPortfolio,
  onRemoveFromPortfolio,
  comparisonByScoreId,
  comparisonActionId,
  onAddToComparison,
  onRemoveFromComparison,
}: {
  scores: ScoredRecordResponse[];
  totalCount: number;
  selectedScoreId: string | null;
  filter: ScoreFilter;
  query: string;
  onFilterChange: (filter: ScoreFilter) => void;
  onQueryChange: (query: string) => void;
  onSelect: (scoreId: string) => void;
  watchlistByScoreId: Map<string, WatchlistItemResponse>;
  watchlistActionId: string | null;
  onAddToWatchlist: (scoredRecordId: string) => void;
  onRemoveFromWatchlist: (watchlistItemId: string) => void;
  portfolioByScoreId: Map<string, PortfolioItemResponse>;
  portfolioActionId: string | null;
  onAddToPortfolio: (scoredRecordId: string) => void;
  onRemoveFromPortfolio: (portfolioItemId: string) => void;
  comparisonByScoreId: Map<string, ComparisonItemResponse>;
  comparisonActionId: string | null;
  onAddToComparison: (scoredRecordId: string) => void;
  onRemoveFromComparison: (comparisonItemId: string) => void;
}) {
  return (
    <div className="min-w-0 border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink/70">
          Scored Records {scores.length !== totalCount ? `(${scores.length}/${totalCount})` : `(${totalCount})`}
        </h3>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Filter records"
            className="w-44 border border-line px-3 py-2 text-sm"
          />
          <select
            value={filter}
            onChange={(event) => onFilterChange(event.target.value as ScoreFilter)}
            className="border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="flagged">Flagged</option>
            <option value="strong">Strong</option>
            <option value="weak">Weak</option>
          </select>
        </div>
      </div>
      {scores.length === 0 ? (
        <PanelMessage label="No records match the current filter." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1220px] w-full border-collapse text-sm">
            <thead className="bg-field text-left text-xs uppercase tracking-[0.08em] text-ink/60">
              <tr>
                <th className="border-b border-line px-3 py-2">Record</th>
                <th className="border-b border-line px-3 py-2">Keep</th>
                <th className="border-b border-line px-3 py-2">Track</th>
                <th className="border-b border-line px-3 py-2">Compare</th>
                <th className="border-b border-line px-3 py-2">Invest</th>
                <th className="border-b border-line px-3 py-2">Risk</th>
                <th className="border-b border-line px-3 py-2">Confidence</th>
                <th className="border-b border-line px-3 py-2">Liquidity</th>
                <th className="border-b border-line px-3 py-2">Redemption</th>
                <th className="border-b border-line px-3 py-2">Coverage</th>
                <th className="border-b border-line px-3 py-2">Flags</th>
                <th className="border-b border-line px-3 py-2">Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => {
                const band = scoreBand(score.investmentScore);
                const watchlistItem = watchlistByScoreId.get(score.id) ?? null;
                const portfolioItem = portfolioByScoreId.get(score.id) ?? null;
                const comparisonItem = comparisonByScoreId.get(score.id) ?? null;
                const isWatchlistActionPending =
                  watchlistActionId === score.id || (watchlistItem ? watchlistActionId === watchlistItem.id : false);
                const isPortfolioActionPending =
                  portfolioActionId === score.id || (portfolioItem ? portfolioActionId === portfolioItem.id : false);
                const isComparisonActionPending =
                  comparisonActionId === score.id || (comparisonItem ? comparisonActionId === comparisonItem.id : false);
                return (
                  <tr
                    key={score.id}
                    tabIndex={0}
                    onClick={() => onSelect(score.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(score.id);
                      }
                    }}
                    className={`cursor-pointer align-top hover:bg-field ${
                      selectedScoreId === score.id ? "bg-field" : "bg-white"
                    }`}
                  >
                    <td className="border-b border-line px-3 py-3">
                      <div className="font-semibold">{primaryRecordLabel(score)}</div>
                      <div className="mt-1 text-xs text-ink/60">Source row {score.sourceRowNumber}</div>
                      {score.normalizedFields.address ? (
                        <div className="mt-1 max-w-[180px] truncate text-xs text-ink/60">
                          {score.normalizedFields.address}
                        </div>
                      ) : null}
                    </td>
                    <td className="border-b border-line px-3 py-3">
                      <button
                        type="button"
                        disabled={isWatchlistActionPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (watchlistItem) {
                            onRemoveFromWatchlist(watchlistItem.id);
                          } else {
                            onAddToWatchlist(score.id);
                          }
                        }}
                        className={`border px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                          watchlistItem
                            ? "border-pine bg-pine text-white"
                            : "border-line bg-white text-ink"
                        }`}
                      >
                        {isWatchlistActionPending ? "Working" : watchlistItem ? "Kept" : "Keep"}
                      </button>
                    </td>
                    <td className="border-b border-line px-3 py-3">
                      <button
                        type="button"
                        disabled={isComparisonActionPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (comparisonItem) {
                            onRemoveFromComparison(comparisonItem.id);
                          } else {
                            onAddToComparison(score.id);
                          }
                        }}
                        className={`border px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                          comparisonItem ? "border-pine bg-pine text-white" : "border-line bg-white text-ink"
                        }`}
                      >
                        {isComparisonActionPending ? "Working" : comparisonItem ? "Added" : "Compare"}
                      </button>
                    </td>
                    <td className="border-b border-line px-3 py-3">
                      <button
                        type="button"
                        disabled={isPortfolioActionPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (portfolioItem) {
                            onRemoveFromPortfolio(portfolioItem.id);
                          } else {
                            onAddToPortfolio(score.id);
                          }
                        }}
                        className={`border px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                          portfolioItem
                            ? `${portfolioStatusClassName(portfolioItem.status)}`
                            : "border-line bg-white text-ink"
                        }`}
                      >
                        {isPortfolioActionPending ? "Working" : portfolioItem ? "Tracked" : "Track"}
                      </button>
                    </td>
                    <td className="border-b border-line px-3 py-3">
                      <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${band.className}`}>
                        {score.investmentScore} {band.label}
                      </span>
                    </td>
                    <td className="border-b border-line px-3 py-3">{score.riskScore}</td>
                    <td className="border-b border-line px-3 py-3">{score.confidenceScore}</td>
                    <td className="border-b border-line px-3 py-3">{score.liquidityScore}</td>
                    <td className="border-b border-line px-3 py-3">{formatPercent(score.redemptionProbability)}</td>
                    <td className="border-b border-line px-3 py-3">{formatRatio(score.valueCoverageRatio)}</td>
                    <td className="max-w-[180px] border-b border-line px-3 py-3 text-xs text-ink/75">
                      {flagPreview(score)}
                    </td>
                    <td className="max-w-[240px] border-b border-line px-3 py-3 text-xs leading-5 text-ink/75">
                      {reasoningPreview(score)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ScoreDetail({
  score,
  watchlistItem,
  watchlistActionId,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  portfolioItem,
  portfolioActionId,
  onAddToPortfolio,
  onRemoveFromPortfolio,
  comparisonItem,
  comparisonActionId,
  onAddToComparison,
  onRemoveFromComparison,
}: {
  score: ScoredRecordResponse | null;
  watchlistItem: WatchlistItemResponse | null;
  watchlistActionId: string | null;
  onAddToWatchlist: (scoredRecordId: string) => void;
  onRemoveFromWatchlist: (watchlistItemId: string) => void;
  portfolioItem: PortfolioItemResponse | null;
  portfolioActionId: string | null;
  onAddToPortfolio: (scoredRecordId: string) => void;
  onRemoveFromPortfolio: (portfolioItemId: string) => void;
  comparisonItem: ComparisonItemResponse | null;
  comparisonActionId: string | null;
  onAddToComparison: (scoredRecordId: string) => void;
  onRemoveFromComparison: (comparisonItemId: string) => void;
}) {
  if (!score) {
    return (
      <aside className="border border-line bg-white p-4">
        <p className="text-sm text-ink/70">No record selected.</p>
      </aside>
    );
  }

  return (
    <aside className="border border-line bg-white p-4 xl:sticky xl:top-4 xl:self-start">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">Record Detail</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-xl font-semibold">{primaryRecordLabel(score)}</h3>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={watchlistActionId === score.id || (watchlistItem ? watchlistActionId === watchlistItem.id : false)}
            onClick={() => {
              if (watchlistItem) {
                onRemoveFromWatchlist(watchlistItem.id);
              } else {
                onAddToWatchlist(score.id);
              }
            }}
            className={`border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              watchlistItem ? "border-pine bg-pine text-white" : "border-line bg-white text-ink"
            }`}
          >
            {watchlistItem ? "Remove" : "Keep"}
          </button>
          <button
            type="button"
            disabled={portfolioActionId === score.id || (portfolioItem ? portfolioActionId === portfolioItem.id : false)}
            onClick={() => {
              if (portfolioItem) {
                onRemoveFromPortfolio(portfolioItem.id);
              } else {
                onAddToPortfolio(score.id);
              }
            }}
            className={`border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              portfolioItem ? portfolioStatusClassName(portfolioItem.status) : "border-line bg-white text-ink"
            }`}
          >
            {portfolioItem ? portfolioStatusLabel(portfolioItem.status) : "Track"}
          </button>
          <button
            type="button"
            disabled={comparisonActionId === score.id || (comparisonItem ? comparisonActionId === comparisonItem.id : false)}
            onClick={() => {
              if (comparisonItem) {
                onRemoveFromComparison(comparisonItem.id);
              } else {
                onAddToComparison(score.id);
              }
            }}
            className={`border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              comparisonItem ? "border-pine bg-pine text-white" : "border-line bg-white text-ink"
            }`}
          >
            {comparisonItem ? "In compare" : "Compare"}
          </button>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <DetailTerm label="Lien" value={formatMoney(score.normalizedFields.lienAmount)} />
        <DetailTerm label="Value" value={formatMoney(score.normalizedFields.estimatedValue)} />
        <DetailTerm label="Coverage" value={formatRatio(score.valueCoverageRatio)} />
        <DetailTerm label="Type" value={score.normalizedFields.propertyTypeCategory} />
        {score.enrichment ? <DetailTerm label="Data quality" value={`${score.enrichment.dataQualityScore}/100`} /> : null}
        {score.enrichment ? <DetailTerm label="Freshness" value={score.enrichment.freshness.status} /> : null}
      </dl>
      {score.enrichment && (score.enrichment.signals.length > 0 || score.enrichment.reasoning.length > 0) ? (
        <section className="mt-5">
          <h4 className="text-sm font-semibold">Enrichment</h4>
          <div className="mt-2 border border-line bg-white px-3 py-2 text-sm leading-6 text-ink/75">
            <p>
              Last enriched: {formatDateTime(score.enrichment.enrichedAt)} · Reprocess after:{" "}
              {formatDateTime(score.enrichment.freshness.reprocessAfter)}
            </p>
            <p>Source version: {score.enrichment.freshness.sourceVersion}</p>
          </div>
          {score.enrichment.adapterOutcomes.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {score.enrichment.adapterOutcomes.map((outcome) => (
                <li
                  key={`${outcome.adapterId}-${outcome.status}-${outcome.startedAt}`}
                  className="border border-line bg-field px-3 py-2 text-sm leading-6 text-ink/80"
                >
                  <span className="font-semibold">
                    {outcome.adapterId} · {outcome.stage} · {outcome.status}
                  </span>
                  : {outcome.message}
                </li>
              ))}
            </ul>
          ) : null}
          {score.enrichment.signals.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {score.enrichment.signals.map((signal) => (
                <li
                  key={`${signal.field}-${signal.message}`}
                  className="border border-line bg-field px-3 py-2 text-sm leading-6 text-ink/80"
                >
                  <span className="font-semibold">{signal.field}</span>: {signal.message}
                </li>
              ))}
            </ul>
          ) : null}
          {score.enrichment.externalResults && score.enrichment.externalResults.length > 0 ? (
            <div className="mt-3 space-y-2">
              {score.enrichment.externalResults.map((result) => (
                <div
                  key={`${result.provider}-${result.status}-${result.enrichedAt}`}
                  className="border border-line bg-white px-3 py-2 text-sm leading-6 text-ink/75"
                >
                  <p className="font-semibold">
                    {result.provider} · {result.status} · {result.confidence}
                  </p>
                  <p>{result.message}</p>
                  {result.normalizedAddress ? <p>Matched address: {result.normalizedAddress}</p> : null}
                  {result.latitude !== undefined && result.longitude !== undefined ? (
                    <p>
                      Location: {result.latitude.toFixed(5)}, {result.longitude.toFixed(5)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {score.enrichment.reasoning.length > 0 ? (
            <ol className="mt-2 space-y-2">
              {score.enrichment.reasoning.map((reason) => (
                <li key={reason} className="border border-line bg-white px-3 py-2 text-sm leading-6 text-ink/75">
                  {reason}
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ) : null}
      <section className="mt-5">
        <h4 className="text-sm font-semibold">Flags</h4>
        {score.flags.length === 0 ? (
          <p className="mt-2 text-sm text-ink/65">No flags returned.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {score.flags.map((flag) => (
              <li key={flag} className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {flag}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-5">
        <h4 className="text-sm font-semibold">Reasoning</h4>
        <ol className="mt-2 space-y-2">
          {score.reasoning.map((reason) => (
            <li key={reason} className="border border-line bg-field px-3 py-2 text-sm leading-6 text-ink/80">
              {reason}
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

function WatchlistDetail({
  token,
  item,
  actionId,
  portfolioItem,
  portfolioActionId,
  comparisonItem,
  comparisonActionId,
  onRemove,
  onTrack,
  onCompare,
  onRemoveFromComparison,
}: {
  token: string;
  item: WatchlistItemResponse | null;
  actionId: string | null;
  portfolioItem: PortfolioItemResponse | null;
  portfolioActionId: string | null;
  comparisonItem: ComparisonItemResponse | null;
  comparisonActionId: string | null;
  onRemove: (watchlistItemId: string) => void;
  onTrack: (watchlistItemId: string) => void;
  onCompare: (watchlistItemId: string) => void;
  onRemoveFromComparison: (comparisonItemId: string) => void;
}) {
  if (!item) {
    return (
      <aside className="border border-line bg-white p-4">
        <p className="text-sm text-ink/70">No watchlist item selected.</p>
      </aside>
    );
  }

  return (
    <aside className="border border-line bg-white p-4 xl:sticky xl:top-4 xl:self-start">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">Watchlist Detail</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-xl font-semibold">{primaryRecordLabel(item)}</h3>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {portfolioItem ? (
            <span
              className={`inline-flex border px-3 py-2 text-xs font-semibold ${portfolioStatusClassName(
                portfolioItem.status,
              )}`}
            >
              {portfolioStatusLabel(portfolioItem.status)}
            </span>
          ) : (
            <button
              type="button"
              disabled={portfolioActionId === item.id}
              onClick={() => onTrack(item.id)}
              className="border border-line px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {portfolioActionId === item.id ? "Tracking" : "Track"}
            </button>
          )}
          <button
            type="button"
            disabled={comparisonActionId === item.id || (comparisonItem ? comparisonActionId === comparisonItem.id : false)}
            onClick={() => {
              if (comparisonItem) {
                onRemoveFromComparison(comparisonItem.id);
              } else {
                onCompare(item.id);
              }
            }}
            className={`border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              comparisonItem ? "border-pine bg-pine text-white" : "border-line bg-white text-ink"
            }`}
          >
            {comparisonItem ? "In compare" : "Compare"}
          </button>
          <button
            type="button"
            disabled={actionId === item.id}
            onClick={() => onRemove(item.id)}
            className="border border-line px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionId === item.id ? "Removing" : "Remove"}
          </button>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <DetailTerm label="Lien" value={formatMoney(item.normalizedFields.lienAmount)} />
        <DetailTerm label="Value" value={formatMoney(item.normalizedFields.estimatedValue)} />
        <DetailTerm label="Coverage" value={formatRatio(item.valueCoverageRatio)} />
        <DetailTerm label="Dataset" value={shortId(item.datasetId)} />
      </dl>
      <section className="mt-5">
        <h4 className="text-sm font-semibold">Why it is kept</h4>
        <ol className="mt-2 space-y-2">
          {item.reasoning.map((reason) => (
            <li key={reason} className="border border-line bg-field px-3 py-2 text-sm leading-6 text-ink/80">
              {reason}
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-5">
        <h4 className="text-sm font-semibold">Flags</h4>
        {item.flags.length === 0 ? (
          <p className="mt-2 text-sm text-ink/65">No flags returned.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {item.flags.map((flag) => (
              <li key={flag} className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {flag}
              </li>
            ))}
          </ul>
        )}
      </section>
      <WorkspaceCommentThread
        key={`watchlist_item:${item.id}`}
        token={token}
        entityType="watchlist_item"
        entityId={item.id}
      />
      <ReviewChecklist
        token={token}
        entityType="watchlist_item"
        entityId={item.id}
      />
      <FollowControl token={token} entityType="watchlist_item" entityId={item.id} />
      <FollowUpControl token={token} entityType="watchlist_item" entityId={item.id} />
      <WorkspaceAssignmentControl token={token} entityType="watchlist_item" entityId={item.id} />
    </aside>
  );
}

function ComparisonApprovalPanel({
  token,
  comparisonItemId,
  canExecuteSensitiveActions,
  onPendingChange,
  onOpenPortfolio,
}: {
  token: string;
  comparisonItemId: string;
  canExecuteSensitiveActions: boolean;
  onPendingChange: (hasPending: boolean) => void;
  onOpenPortfolio: () => void;
}) {
  const [approvals, setApprovals] = useState<ApprovalRequestResponse[]>([]);
  const [requestNote, setRequestNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void listApprovalRequests(token, {
      targetEntityType: "comparison_item",
      targetEntityId: comparisonItemId,
    })
      .then((result) => {
        if (!cancelled) {
          setApprovals(result.approvals);
          onPendingChange(result.approvals.some((approval) => approval.status === "pending"));
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, comparisonItemId, onPendingChange, reloadVersion]);

  async function submitRequest(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const note = requestNote.trim();
    if (!note) {
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await createApprovalRequest(token, comparisonItemId, note);
      setRequestNote("");
      setSuccess(
        result.alreadyPending
          ? "A pending approval already exists for this handoff."
          : "Approval request submitted.",
      );
      setReloadVersion((version) => version + 1);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  const latest = approvals[0] ?? null;
  const pending = approvals.find((approval) => approval.status === "pending") ?? null;

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex items-center justify-between gap-3">
        <h5 className="text-sm font-semibold">Portfolio approval</h5>
        {isLoading ? <span className="text-xs text-ink/55">Loading</span> : null}
      </div>
      {latest ? (
        <div className="mt-2 border border-line bg-white p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`border px-2 py-1 text-xs font-semibold ${approvalStatusClassName(latest.status)}`}>
              {approvalStatusLabel(latest.status)}
            </span>
            <span className="text-xs text-ink/55">{formatDateTime(latest.updatedAt)}</span>
          </div>
          <p className="mt-2 leading-6 text-ink/75">{latest.requestNote}</p>
          <p className="mt-2 text-xs text-ink/55">Requested by {latest.requester.email}</p>
          {latest.reviewer ? (
            <p className="mt-1 text-xs text-ink/55">
              Reviewed by {latest.reviewer.email}
              {latest.reviewerResponseNote ? `: ${latest.reviewerResponseNote}` : ""}
            </p>
          ) : null}
          {latest.status === "approved" && latest.outcome ? (
            <button
              type="button"
              onClick={onOpenPortfolio}
              className="mt-3 border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900"
            >
              Open portfolio
            </button>
          ) : null}
        </div>
      ) : !isLoading ? (
        <p className="mt-2 text-sm text-ink/65">No approval has been requested for this handoff.</p>
      ) : null}

      {!canExecuteSensitiveActions && !pending ? (
        <form onSubmit={(event) => void submitRequest(event)} className="mt-3">
          <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-ink/60">
            Review context
            <textarea
              value={requestNote}
              onChange={(event) => setRequestNote(event.target.value)}
              maxLength={500}
              rows={3}
              required
              className="mt-2 w-full resize-y border border-line bg-white px-3 py-2 text-sm font-normal normal-case leading-6 tracking-normal text-ink"
              placeholder="Why should this candidate move into portfolio tracking?"
            />
          </label>
          <button
            type="submit"
            disabled={isSaving || requestNote.trim().length === 0}
            className="mt-2 bg-pine px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Submitting" : "Request approval"}
          </button>
        </form>
      ) : null}
      {canExecuteSensitiveActions && pending ? (
        <p className="mt-3 text-xs text-ink/55">
          Resolve or cancel the pending request before using the direct owner handoff.
        </p>
      ) : canExecuteSensitiveActions ? (
        <p className="mt-3 text-xs text-ink/55">
          Owners may execute this handoff directly and may review requests from other members.
        </p>
      ) : pending ? (
        <p className="mt-3 text-xs text-ink/55">
          This handoff is waiting for an owner or a different administrator to review it.
        </p>
      ) : null}
      {error ? <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {success ? (
        <p className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {success}
        </p>
      ) : null}
    </div>
  );
}

function MyWorkPage({
  token,
  workspaceId,
  onOpenAssignment,
  onOpenApproval,
  onOpenDiscussion,
  onOpenFollow,
}: {
  token: string;
  workspaceId: string;
  onOpenAssignment: (assignment: WorkspaceAssignmentResponse) => void;
  onOpenApproval: () => void;
  onOpenDiscussion: (attention: DiscussionAttentionResponse) => void;
  onOpenFollow: (subscription: FollowSubscriptionResponse) => void;
}) {
  const [myWork, setMyWork] = useState<MyWorkResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setMyWork(null);
    setIsLoading(true);
    setError(null);
    void getMyWork(token)
      .then((result) => {
        if (!cancelled) {
          setMyWork(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, workspaceId, reloadVersion]);

  if (error) {
    return (
      <section className="min-w-0">
        <MyWorkHeader
          isLoading={isLoading}
          onRefresh={() => setReloadVersion((version) => version + 1)}
        />
        <div className="mt-5">
          <PanelError message={error} onRetry={() => setReloadVersion((version) => version + 1)} />
        </div>
      </section>
    );
  }

  if (!myWork) {
    return (
      <section className="min-w-0">
        <MyWorkHeader
          isLoading={isLoading}
          onRefresh={() => setReloadVersion((version) => version + 1)}
        />
        <div className="mt-5">
          <PanelMessage label="Loading your work queues..." />
        </div>
      </section>
    );
  }

  const hasWork = myWork.counts.totalActionable > 0;
  const summaries = [
    { label: "Needs attention", count: myWork.counts.totalActionable },
    { label: "Assigned", count: myWork.counts.assigned },
    { label: "Approvals", count: myWork.counts.approvals },
    { label: "Follow-ups", count: myWork.counts.followUps },
    { label: "Unread discussion", count: myWork.counts.unreadMessages },
    { label: "Following", count: myWork.counts.following },
  ];
  const summaryBorderClasses = [
    "",
    "border-t border-line sm:border-l sm:border-t-0",
    "border-t border-line lg:border-l lg:border-t-0",
    "border-t border-line sm:border-l lg:border-t-0",
    "border-t border-line lg:border-l lg:border-t-0",
  ];

  return (
    <section className="min-w-0">
      <MyWorkHeader
        isLoading={isLoading}
        onRefresh={() => setReloadVersion((version) => version + 1)}
      />

      <div className="mt-5 grid border border-line bg-white sm:grid-cols-2 lg:grid-cols-6">
        {summaries.map((summary, index) => (
          <div
            key={summary.label}
            className={`px-4 py-4 ${summaryBorderClasses[index] ?? ""}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/55">
              {summary.label}
            </p>
            <p className="mt-1 text-2xl font-semibold">{summary.count}</p>
          </div>
        ))}
      </div>

      {!hasWork ? (
        <div className="mt-5 border-y border-line bg-white px-4 py-6">
          <p className="font-semibold">You are caught up in this workspace.</p>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            New assignments, review requests, follow-ups, and unread discussions will appear here.
          </p>
        </div>
      ) : null}

      <div className="mt-7 space-y-8">
        <section aria-labelledby="my-work-assignments">
          <div className="flex items-end justify-between gap-3 border-b border-line pb-3">
            <div>
              <h3 id="my-work-assignments" className="text-lg font-semibold">Assigned to me</h3>
              <p className="mt-1 text-sm text-ink/65">Records where you are the responsible workspace member.</p>
            </div>
            <span className="text-sm font-semibold text-ink/60">{myWork.queues.assignments.count}</span>
          </div>
          {myWork.queues.assignments.items.length === 0 ? (
            <p className="border-b border-line bg-white px-4 py-4 text-sm text-ink/60">No assigned records.</p>
          ) : (
            <ol>
              {myWork.queues.assignments.items.map((assignment) => (
                <li
                  key={assignment.id}
                  className="grid gap-3 border-b border-line bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{assignmentEntityLabel(assignment.relatedEntityType)}</p>
                    <p className="mt-1 break-all text-sm text-ink/70">{assignment.relatedEntityId}</p>
                    <p className="mt-1 text-xs text-ink/55">
                      Assigned by {assignment.assignedBy.email} · {formatDateTime(assignment.assignedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenAssignment(assignment)}
                    className="justify-self-start border border-line bg-white px-3 py-2 text-sm font-semibold sm:justify-self-end"
                  >
                    Open
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="my-work-approvals">
          <div className="flex items-end justify-between gap-3 border-b border-line pb-3">
            <div>
              <h3 id="my-work-approvals" className="text-lg font-semibold">Awaiting my decision</h3>
              <p className="mt-1 text-sm text-ink/65">Pending requests that you are allowed to review.</p>
            </div>
            <span className="text-sm font-semibold text-ink/60">{myWork.queues.approvals.count}</span>
          </div>
          {myWork.queues.approvals.items.length === 0 ? (
            <p className="border-b border-line bg-white px-4 py-4 text-sm text-ink/60">
              No approvals are waiting on you.
            </p>
          ) : (
            <ol>
              {myWork.queues.approvals.items.map((approval) => (
                <li
                  key={approval.id}
                  className="grid gap-3 border-b border-line bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{approvalActionLabel(approval.requestedAction)}</p>
                    <p className="mt-1 text-sm leading-6 text-ink/70">{approval.requestNote}</p>
                    <p className="mt-1 text-xs text-ink/55">
                      Requested by {approval.requester.email} · {formatDateTime(approval.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenApproval}
                    className="justify-self-start bg-pine px-3 py-2 text-sm font-semibold text-white sm:justify-self-end"
                  >
                    Review
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="my-work-follow-ups">
          <div className="flex items-end justify-between gap-3 border-b border-line pb-3">
            <div>
              <h3 id="my-work-follow-ups" className="text-lg font-semibold">Follow-ups</h3>
              <p className="mt-1 text-sm text-ink/65">Upcoming, due, or overdue records assigned to you or created by you.</p>
            </div>
            <span className="text-sm font-semibold text-ink/60">{myWork.queues.followUps.count}</span>
          </div>
          {myWork.queues.followUps.items.length === 0 ? (
            <p className="border-b border-line bg-white px-4 py-4 text-sm text-ink/60">
              No follow-ups are due in the current window.
            </p>
          ) : (
            <ol>
              {myWork.queues.followUps.items.map((followUp) => (
                <li
                  key={followUp.id}
                  className="grid gap-3 border-b border-line bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{followTargetLabel(followUp.targetEntityType)}</p>
                    <p className="mt-1 break-all text-sm text-ink/70">{followUp.targetEntityId}</p>
                    <p className="mt-1 text-xs font-semibold text-ink/55">
                      {followUpDueStateLabel(followUp.dueState)} · {formatDateTime(followUp.dueAt)}
                    </p>
                    {followUp.note ? <p className="mt-1 text-sm text-ink/70">{followUp.note}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenFollow({
                        id: followUp.id,
                        workspaceId: followUp.workspaceId,
                        targetEntityType: followUp.targetEntityType,
                        targetEntityId: followUp.targetEntityId,
                        followedAt: followUp.createdAt,
                      })
                    }
                    className="justify-self-start border border-line bg-white px-3 py-2 text-sm font-semibold sm:justify-self-end"
                  >
                    Open
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="my-work-discussions">
          <div className="flex items-end justify-between gap-3 border-b border-line pb-3">
            <div>
              <h3 id="my-work-discussions" className="text-lg font-semibold">Unread discussion</h3>
              <p className="mt-1 text-sm text-ink/65">Accessible records with workspace comments you have not read.</p>
            </div>
            <span className="text-sm font-semibold text-ink/60">
              {myWork.queues.discussions.count} threads · {myWork.queues.discussions.unreadCount} messages
            </span>
          </div>
          {myWork.queues.discussions.items.length === 0 ? (
            <p className="border-b border-line bg-white px-4 py-4 text-sm text-ink/60">
              No unread discussions.
            </p>
          ) : (
            <ol>
              {myWork.queues.discussions.items.map((attention) => (
                <li
                  key={`${attention.relatedEntityType}:${attention.relatedEntityId}`}
                  className="grid gap-3 border-b border-line bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{assignmentEntityLabel(attention.relatedEntityType)}</p>
                    <p className="mt-1 break-all text-sm text-ink/70">{attention.relatedEntityId}</p>
                    <p className="mt-1 text-xs text-ink/55">
                      {attention.unreadCount} unread
                      {attention.latestCommentAt ? ` · Updated ${formatDateTime(attention.latestCommentAt)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenDiscussion(attention)}
                    className="justify-self-start border border-line bg-white px-3 py-2 text-sm font-semibold sm:justify-self-end"
                  >
                    Open discussion
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="my-work-following">
          <div className="flex items-end justify-between gap-3 border-b border-line pb-3">
            <div>
              <h3 id="my-work-following" className="text-lg font-semibold">Following</h3>
              <p className="mt-1 text-sm text-ink/65">
                Records you are watching for bounded assignment, approval, or status updates.
              </p>
            </div>
            <span className="text-sm font-semibold text-ink/60">{myWork.queues.following.count}</span>
          </div>
          {myWork.queues.following.items.length === 0 ? (
            <p className="border-b border-line bg-white px-4 py-4 text-sm text-ink/60">
              You are not following any records in this workspace.
            </p>
          ) : (
            <ol>
              {myWork.queues.following.items.map((subscription) => (
                <li
                  key={subscription.id}
                  className="grid gap-3 border-b border-line bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{followTargetLabel(subscription.targetEntityType)}</p>
                    <p className="mt-1 break-all text-sm text-ink/70">{subscription.targetEntityId}</p>
                    <p className="mt-1 text-xs text-ink/55">
                      Followed {formatDateTime(subscription.followedAt)} · Informational
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenFollow(subscription)}
                    className="justify-self-start border border-line bg-white px-3 py-2 text-sm font-semibold sm:justify-self-end"
                  >
                    Open
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <p className="mt-5 text-xs text-ink/50">Updated {formatDateTime(myWork.generatedAt)}</p>
    </section>
  );
}

function MyWorkHeader({
  isLoading,
  onRefresh,
}: {
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">Personal queue</p>
        <h2 className="mt-1 text-2xl font-semibold">My work</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
          Your assigned records, review decisions, unread discussions, and watched records in one place.
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        className="border border-line bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
      >
        Refresh
      </button>
    </div>
  );
}

function ApprovalQueuePage({
  token,
  onOpenComparison,
  onApproved,
}: {
  token: string;
  onOpenComparison: () => void;
  onApproved: () => void;
}) {
  const [status, setStatus] = useState<ApprovalRequestStatus | "all">("pending");
  const [approvals, setApprovals] = useState<ApprovalRequestResponse[]>([]);
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void listApprovalRequests(token, status === "all" ? {} : { status })
      .then((result) => {
        if (!cancelled) {
          setApprovals(result.approvals);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, status, reloadVersion]);

  async function resolveApproval(
    approval: ApprovalRequestResponse,
    decision: "approve" | "reject" | "cancel",
  ): Promise<void> {
    const note = responseNotes[approval.id]?.trim() ?? "";
    if (decision === "reject" && !note) {
      setError("A rejection note is required.");
      return;
    }
    setActionId(approval.id);
    setError(null);
    setSuccess(null);
    try {
      if (decision === "approve") {
        await approveApprovalRequest(token, approval.id, note || undefined);
        setSuccess("Approval accepted and the comparison item was handed to portfolio.");
        onApproved();
      } else if (decision === "reject") {
        await rejectApprovalRequest(token, approval.id, note);
        setSuccess("Approval request rejected.");
      } else {
        await cancelApprovalRequest(token, approval.id);
        setSuccess("Approval request cancelled.");
      }
      setReloadVersion((version) => version + 1);
    } catch (resolveError) {
      setError(errorMessage(resolveError));
    } finally {
      setActionId(null);
    }
  }

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">Review Checkpoints</p>
          <h2 className="mt-1 text-2xl font-semibold">Approvals</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Review requests to move comparison candidates into portfolio tracking. Requesters cannot approve
            their own requests.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReloadVersion((version) => version + 1)}
          disabled={isLoading}
          className="border border-line bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "cancelled", "all"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatus(option)}
            className={`border px-3 py-2 text-sm font-semibold ${
              status === option ? "border-pine bg-pine text-white" : "border-line bg-white"
            }`}
          >
            {option === "all" ? "All" : approvalStatusLabel(option)}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {success ? (
        <p className="mt-4 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{success}</p>
      ) : null}

      {isLoading && approvals.length === 0 ? (
        <div className="mt-5"><PanelMessage label="Loading approval requests..." /></div>
      ) : approvals.length === 0 ? (
        <div className="mt-5 border-y border-line bg-white px-4 py-6">
          <p className="font-semibold">No approval requests in this view.</p>
          <p className="mt-2 text-sm text-ink/70">
            Requests are created from a comparison item before a non-owner handoff to portfolio.
          </p>
        </div>
      ) : (
        <ol className="mt-5 space-y-4">
          {approvals.map((approval) => (
            <li key={approval.id} className="border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{approvalActionLabel(approval.requestedAction)}</p>
                  <p className="mt-1 text-xs text-ink/55">
                    Requested by {approval.requester.email} · {formatDateTime(approval.createdAt)}
                  </p>
                </div>
                <span className={`border px-2 py-1 text-xs font-semibold ${approvalStatusClassName(approval.status)}`}>
                  {approvalStatusLabel(approval.status)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/75">{approval.requestNote}</p>
              <button
                type="button"
                onClick={onOpenComparison}
                className="mt-3 border border-line bg-white px-3 py-2 text-xs font-semibold"
              >
                Open comparison
              </button>

              {approval.status === "pending" && (approval.canReview || approval.canCancel) ? (
                <div className="mt-4 border-t border-line pt-4">
                  {approval.canReview ? (
                    <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-ink/60">
                      Reviewer response
                      <textarea
                        value={responseNotes[approval.id] ?? ""}
                        onChange={(event) =>
                          setResponseNotes((current) => ({
                            ...current,
                            [approval.id]: event.target.value,
                          }))
                        }
                        maxLength={500}
                        rows={3}
                        className="mt-2 w-full resize-y border border-line px-3 py-2 text-sm font-normal normal-case leading-6 tracking-normal text-ink"
                        placeholder="Optional for approval; required for rejection"
                      />
                    </label>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {approval.canReview ? (
                      <>
                        <button
                          type="button"
                          disabled={actionId === approval.id}
                          onClick={() => void resolveApproval(approval, "approve")}
                          className="bg-pine px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={actionId === approval.id}
                          onClick={() => void resolveApproval(approval, "reject")}
                          className="border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    {approval.canCancel ? (
                      <button
                        type="button"
                        disabled={actionId === approval.id}
                        onClick={() => void resolveApproval(approval, "cancel")}
                        className="border border-line bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
                      >
                        Cancel request
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {approval.reviewer ? (
                <div className="mt-4 border-t border-line pt-3 text-sm text-ink/70">
                  <p>Reviewed by {approval.reviewer.email}</p>
                  {approval.reviewerResponseNote ? (
                    <p className="mt-1 leading-6">{approval.reviewerResponseNote}</p>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function AssignedToMePage({
  token,
  onOpen,
}: {
  token: string;
  onOpen: (assignment: WorkspaceAssignmentResponse) => void;
}) {
  const [assignments, setAssignments] = useState<WorkspaceAssignmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listAssignedToMe(token)
      .then((result) => {
        if (!cancelled) {
          setAssignments(result.assignments);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadVersion]);

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">Responsibility</p>
          <h2 className="mt-1 text-2xl font-semibold">Assigned to me</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Shared records where your workspace has made you the current responsible member.
          </p>
        </div>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => setReloadVersion((version) => version + 1)}
          className="border border-line bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mt-5">
          <PanelError message={error} onRetry={() => setReloadVersion((version) => version + 1)} />
        </div>
      ) : isLoading && assignments.length === 0 ? (
        <div className="mt-5">
          <PanelMessage label="Loading assigned records..." />
        </div>
      ) : assignments.length === 0 ? (
        <div className="mt-5 border-y border-line bg-white px-4 py-6">
          <p className="font-semibold">Nothing is assigned to you.</p>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Assignments appear here after a workspace member makes you responsible for a supported record.
          </p>
        </div>
      ) : (
        <ol className="mt-5 border-t border-line">
          {assignments.map((assignment) => (
            <li
              key={assignment.id}
              className="grid gap-3 border-b border-line bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="font-semibold">{assignmentEntityLabel(assignment.relatedEntityType)}</p>
                <p className="mt-1 break-all text-sm text-ink/70">{assignment.relatedEntityId}</p>
                <p className="mt-1 text-xs text-ink/55">
                  Assigned by {assignment.assignedBy.email} · {formatDateTime(assignment.assignedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpen(assignment)}
                className="justify-self-start border border-line bg-white px-3 py-2 text-sm font-semibold sm:justify-self-end"
              >
                Open
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ReviewChecklist({
  token,
  entityType,
  entityId,
  onProgressChange,
}: {
  token: string;
  entityType: ReviewChecklistTargetEntityType;
  entityId: string;
  onProgressChange?: (progress: ReviewChecklistProgress) => void;
}) {
  const [state, setState] = useState<ReviewChecklistStateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState(null);
    setIsLoading(true);
    setError(null);
    void getReviewChecklistState(token, entityType, entityId)
      .then((result) => {
        if (!cancelled) {
          setState(result);
          onProgressChange?.(result.progress);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, entityType, entityId, onProgressChange]);

  async function toggleItem(itemId: string, completed: boolean): Promise<void> {
    setActionId(itemId);
    setError(null);
    try {
      const result = await updateReviewChecklistItem(
        token,
        entityType,
        entityId,
        itemId,
        completed,
      );
      setState(result.state);
      onProgressChange?.(result.state.progress);
    } catch (saveError: unknown) {
      setError(errorMessage(saveError));
    } finally {
      setActionId(null);
    }
  }

  return (
    <section className="mt-5 border-t border-line pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">Review checklist</h4>
          <p className="mt-1 text-xs leading-5 text-ink/60">
            Required items indicate whether this record is review ready.
          </p>
        </div>
        {state ? (
          <span
            className={`border px-2 py-1 text-xs font-semibold ${reviewChecklistStatusClassName(
              state.progress.status,
            )}`}
          >
            {reviewChecklistStatusLabel(state.progress.status)}
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {isLoading ? (
        <p className="mt-3 text-sm text-ink/60">Loading review checklist...</p>
      ) : state?.progress.status === "not_configured" ? (
        <p className="mt-3 border-y border-line py-3 text-sm text-ink/65">
          No active checklist is configured for this record type.
        </p>
      ) : state?.checklist ? (
        <>
          <p className="mt-3 text-sm font-semibold">{state.checklist.templateName}</p>
          <p className="mt-1 text-xs text-ink/60">
            {state.progress.completedItems} of {state.progress.totalItems} complete
            {" · "}
            {state.progress.incompleteRequiredItems} required remaining
          </p>
          <ol className="mt-3 divide-y divide-line border-y border-line">
            {state.checklist.items.map((item) => (
              <li key={item.id} className="py-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    disabled={actionId === item.id}
                    onChange={(event) =>
                      void toggleItem(item.id, event.target.checked)
                    }
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm ${
                        item.completed ? "text-ink/60 line-through" : "text-ink"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-ink/55">
                      {item.required ? "Required" : "Optional"}
                      {item.completedBy
                        ? ` · Checked by ${item.completedBy.email}`
                        : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  );
}

function FollowControl({
  token,
  entityType,
  entityId,
}: {
  token: string;
  entityType: FollowTargetEntityType;
  entityId: string;
}) {
  const [state, setState] = useState<FollowStateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState(null);
    setIsLoading(true);
    setError(null);
    void getFollowState(token, entityType, entityId)
      .then((result) => {
        if (!cancelled) {
          setState(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, entityType, entityId]);

  async function toggleFollow(): Promise<void> {
    setIsSaving(true);
    setError(null);
    try {
      if (state?.following) {
        const result = await unfollowEntity(token, entityType, entityId);
        setState({
          targetEntityType: entityType,
          targetEntityId: entityId,
          following: false,
          followerCount: result.followerCount,
        });
      } else {
        const result = await followEntity(token, entityType, entityId);
        setState(result);
      }
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-5 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {state?.following ? "Following this record" : "Follow this record"}
          </p>
          <p className="mt-1 text-xs leading-5 text-ink/60">
            Following keeps this record in My Work and enables bounded alerts for meaningful changes.
          </p>
        </div>
        <button
          type="button"
          disabled={isLoading || isSaving}
          onClick={() => void toggleFollow()}
          className={`border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
            state?.following ? "border-pine bg-pine text-white" : "border-line bg-white"
          }`}
        >
          {isLoading ? "Loading" : isSaving ? "Saving" : state?.following ? "Unfollow" : "Follow"}
        </button>
      </div>
      {state ? (
        <p className="mt-2 text-xs text-ink/55">
          {state.followerCount} active workspace {state.followerCount === 1 ? "follower" : "followers"}.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-800">{error}</p> : null}
    </section>
  );
}

function FollowUpControl({
  token,
  entityType,
  entityId,
}: {
  token: string;
  entityType: FollowUpTargetEntityType;
  entityId: string;
}) {
  const [state, setState] = useState<FollowUpStateResponse | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState(null);
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    void getFollowUpState(token, entityType, entityId)
      .then((result) => {
        if (!cancelled) {
          setState(result);
          setDueDate(result.followUp?.dueAt.slice(0, 10) ?? "");
          setNote(result.followUp?.note ?? "");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, entityType, entityId, reloadVersion]);

  async function saveFollowUp(): Promise<void> {
    if (!dueDate) {
      setError("Choose a follow-up date.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await upsertFollowUp(token, entityType, entityId, {
        dueAt: `${dueDate}T12:00:00.000Z`,
        note: note.trim() || null,
      });
      setState({
        targetEntityType: entityType,
        targetEntityId: entityId,
        dueState: result.followUp.dueState,
        followUp: result.followUp,
      });
      setSuccess(result.changed ? "Follow-up saved." : "Follow-up already matched this date.");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeFollowUp(): Promise<void> {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await clearFollowUp(token, entityType, entityId);
      setState({
        targetEntityType: entityType,
        targetEntityId: entityId,
        dueState: "none",
        followUp: null,
      });
      setDueDate("");
      setNote("");
      setSuccess(result.cleared ? "Follow-up cleared." : "No follow-up was set.");
    } catch (clearError) {
      setError(errorMessage(clearError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-5 border-t border-line pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">Follow-up</h4>
          <p className="mt-1 text-sm text-ink/65">
            {state?.followUp
              ? `${followUpDueStateLabel(state.followUp.dueState)} · ${formatDateTime(state.followUp.dueAt)}`
              : "No follow-up date is set."}
          </p>
          <p className="mt-1 text-xs leading-5 text-ink/55">
            Follow-up reminders appear in My Work and generate one bounded alert when due or overdue.
          </p>
        </div>
        {isLoading ? <span className="text-xs text-ink/55">Loading...</span> : null}
      </div>
      {error ? <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {success ? <p className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{success}</p> : null}
      <div className="mt-3 grid gap-2 md:grid-cols-[180px_minmax(0,1fr)_auto_auto] md:items-end">
        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/60">
          Date
          <input
            type="date"
            value={dueDate}
            disabled={isLoading || isSaving}
            onChange={(event) => {
              setDueDate(event.target.value);
              setSuccess(null);
            }}
            className="mt-1 block w-full border border-line bg-white px-3 py-2 text-sm font-normal text-ink disabled:opacity-60"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/60">
          Note
          <input
            type="text"
            maxLength={500}
            value={note}
            disabled={isLoading || isSaving}
            onChange={(event) => {
              setNote(event.target.value);
              setSuccess(null);
            }}
            placeholder="Why this needs a follow-up"
            className="mt-1 block w-full border border-line bg-white px-3 py-2 text-sm font-normal text-ink disabled:opacity-60"
          />
        </label>
        <button
          type="button"
          disabled={isLoading || isSaving || !dueDate}
          onClick={() => void saveFollowUp()}
          className="bg-pine px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving" : state?.followUp ? "Update" : "Set"}
        </button>
        {state?.followUp ? (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void removeFollowUp()}
            className="border border-line bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Clear
          </button>
        ) : null}
      </div>
      {error && !isLoading ? (
        <button
          type="button"
          onClick={() => setReloadVersion((version) => version + 1)}
          className="mt-2 text-xs font-semibold text-pine underline"
        >
          Retry follow-up state
        </button>
      ) : null}
    </section>
  );
}

function WorkspaceAssignmentControl({
  token,
  entityType,
  entityId,
}: {
  token: string;
  entityType: WorkspaceAssignmentEntityType;
  entityId: string;
}) {
  const [assignment, setAssignment] = useState<WorkspaceAssignmentResponse | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberResponse[]>([]);
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setCanManage(false);
    setError(null);
    setSuccess(null);
    Promise.all([
      getWorkspaceAssignment(token, entityType, entityId),
      listWorkspaceMembers(token),
      listWorkspaces(token),
    ])
      .then(([assignmentResult, memberResult, workspaceResult]) => {
        if (!cancelled) {
          setAssignment(assignmentResult.assignment);
          setMembers(memberResult.members);
          setCanManage(
            workspaceResult.workspaces.find(
              (candidate) => candidate.id === workspaceResult.currentWorkspaceId,
            )?.permissions.canManageSharedData ?? false,
          );
          setAssigneeUserId(assignmentResult.assignment?.assignee.userId ?? "");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, entityType, entityId, reloadVersion]);

  async function saveAssignment(): Promise<void> {
    if (!assigneeUserId) {
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await updateWorkspaceAssignment(token, entityType, entityId, assigneeUserId);
      setAssignment(result.assignment);
      setSuccess(result.changed ? "Responsibility updated." : "This member is already assigned.");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeAssignment(): Promise<void> {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await clearWorkspaceAssignment(token, entityType, entityId);
      setAssignment(null);
      setAssigneeUserId("");
      setSuccess(result.cleared ? "Responsibility cleared." : "No assignment was present.");
    } catch (clearError) {
      setError(errorMessage(clearError));
    } finally {
      setIsSaving(false);
    }
  }

  const assigneeIsActive = assignment
    ? members.some((member) => member.userId === assignment.assignee.userId)
    : true;

  return (
    <section className="mt-5 border-t border-line pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">Responsibility</h4>
          <p className="mt-1 text-sm text-ink/65">
            {assignment
              ? `Assigned to ${assignment.assignee.email}${assigneeIsActive ? "" : " (inactive member)"}`
              : "No workspace member is assigned."}
          </p>
          {assignment ? (
            <p className="mt-1 text-xs text-ink/55">
              Set by {assignment.assignedBy.email} · {formatDateTime(assignment.assignedAt)}
            </p>
          ) : null}
          {!canManage && !isLoading ? (
            <p className="mt-1 text-xs text-ink/55">
              Owners and administrators can change responsibility.
            </p>
          ) : null}
          {!assigneeIsActive ? (
            <p className="mt-1 text-xs font-semibold text-amber-800">
              This responsibility marker is historical. Reassign or clear it before relying on the assignee.
            </p>
          ) : null}
        </div>
        {isLoading ? <span className="text-xs text-ink/55">Loading...</span> : null}
      </div>

      {error ? (
        <div className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setReloadVersion((version) => version + 1)}
            className="mt-2 border border-red-300 px-2 py-1 font-semibold"
          >
            Retry
          </button>
        </div>
      ) : null}
      {success ? (
        <p className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {success}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-[220px] flex-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink/60">
          Responsible member
          <select
            value={assigneeUserId}
            disabled={!canManage || isLoading || isSaving}
            onChange={(event) => {
              setAssigneeUserId(event.target.value);
              setSuccess(null);
            }}
            className="mt-1 block w-full border border-line bg-white px-3 py-2 text-sm font-normal text-ink disabled:opacity-60"
          >
            <option value="">Select a member</option>
            {members.map((member) => (
              <option key={member.id} value={member.userId}>
                {member.email} · {workspaceRoleLabel(member.role)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!canManage || !assigneeUserId || isLoading || isSaving}
          onClick={() => void saveAssignment()}
          className="bg-pine px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving" : assignment ? "Reassign" : "Assign"}
        </button>
        {assignment ? (
          <button
            type="button"
            disabled={!canManage || isSaving}
            onClick={() => void removeAssignment()}
            className="border border-line bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Clear
          </button>
        ) : null}
      </div>
    </section>
  );
}

function WorkspaceCommentThread({
  token,
  entityType,
  entityId,
}: {
  token: string;
  entityType: WorkspaceCommentEntityType;
  entityId: string;
}) {
  const [comments, setComments] = useState<WorkspaceCommentResponse[]>([]);
  const [attention, setAttention] = useState<DiscussionAttentionResponse | null>(null);
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setComments([]);
    setAttention(null);
    setBody("");
    setIsLoading(true);
    setError(null);

    void listWorkspaceComments(token, entityType, entityId)
      .then((result) => {
        if (!cancelled) {
          setComments(result.comments);
          setAttention(result.attention);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, entityType, reloadVersion, token]);

  async function submitComment(): Promise<void> {
    const normalizedBody = body.trim();
    if (!normalizedBody) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createWorkspaceComment(token, entityType, entityId, normalizedBody);
      setComments((current) => [...current, result.comment]);
      setAttention(result.attention);
      setBody("");
    } catch (submitError: unknown) {
      setError(errorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function markDiscussionRead(): Promise<void> {
    setIsMarkingRead(true);
    setError(null);
    try {
      const result = await markWorkspaceDiscussionRead(token, entityType, entityId);
      setAttention(result.attention);
    } catch (markError: unknown) {
      setError(errorMessage(markError));
    } finally {
      setIsMarkingRead(false);
    }
  }

  async function removeComment(commentId: string): Promise<void> {
    setDeleteId(commentId);
    setError(null);
    try {
      await deleteWorkspaceComment(token, commentId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
    } catch (deleteError: unknown) {
      setError(errorMessage(deleteError));
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <section className="mt-5 border-t border-line pt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">Discussion</h4>
          <p className="mt-1 text-xs text-ink/60">Workspace comments for this record.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <span
            className={`border px-2 py-1 text-xs font-semibold ${
              attention?.hasUnread
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-line bg-field text-ink/65"
            }`}
          >
            {isLoading ? "Loading" : discussionAttentionLabel(attention)}
          </span>
          <span className="text-xs text-ink/55">
            {isLoading ? "" : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
          </span>
        </div>
      </div>

      {attention?.hasUnread ? (
        <button
          type="button"
          disabled={isMarkingRead}
          onClick={() => void markDiscussionRead()}
          className="mt-3 border border-line bg-white px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isMarkingRead ? "Marking..." : "Mark discussion read"}
        </button>
      ) : null}

      {error ? (
        <div className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setReloadVersion((current) => current + 1)}
            className="mt-2 border border-red-300 bg-white px-2 py-1 text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      ) : null}
      {!isLoading && !error && comments.length === 0 ? (
        <p className="mt-3 text-sm text-ink/65">No discussion yet.</p>
      ) : null}
      {comments.length > 0 ? (
        <ol className="mt-3 divide-y divide-line border border-line bg-white">
          {comments.map((comment) => (
            <li key={comment.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-ink/75">{comment.author.email}</p>
                  <p className="mt-1 text-xs text-ink/55">{formatDateTime(comment.createdAt)}</p>
                </div>
                {comment.canDelete ? (
                  <button
                    type="button"
                    disabled={deleteId === comment.id}
                    onClick={() => void removeComment(comment.id)}
                    className="shrink-0 border border-line px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleteId === comment.id ? "Deleting" : "Delete"}
                  </button>
                ) : null}
              </div>
              <WorkspaceCommentBody body={comment.body} />
            </li>
          ))}
        </ol>
      ) : null}

      <form
        className="mt-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submitComment();
        }}
      >
        <label className="text-xs font-semibold uppercase text-ink/60" htmlFor={`comment-${entityType}-${entityId}`}>
          Add comment
        </label>
        <textarea
          id={`comment-${entityType}-${entityId}`}
          value={body}
          maxLength={1000}
          rows={4}
          disabled={isLoading || isSubmitting}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add context for your workspace"
          className="mt-2 w-full resize-y border border-line bg-white px-3 py-2 text-sm leading-6 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-ink/55">{body.length}/1000</span>
          <button
            type="submit"
            disabled={isLoading || isSubmitting || body.trim().length === 0}
            className="bg-pine px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Posting..." : "Post comment"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink/55">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function DetailTerm({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/55">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}

function PanelMessage({ label }: { label: string }) {
  return <div className="border border-line bg-white p-5 text-sm text-ink/70">{label}</div>;
}

function PanelError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-800">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-3 border border-red-300 px-3 py-2 font-semibold">
          Retry
        </button>
      ) : null}
    </div>
  );
}

function navigate(page: PageState, setPage: (page: PageState) => void): void {
  const hash =
    page.name === "dataset"
      ? `#/datasets/${page.datasetId}`
      : page.name === "decision-brief"
        ? `#/decision-briefs/${page.entityType}/${encodeURIComponent(page.entityId)}`
        : `#/${page.name}`;
  window.history.pushState(null, "", hash);
  setPage(page);
}

function readRoute(): PageState {
  if (window.location.hash === "#/my-work") {
    return { name: "my-work" };
  }

  if (window.location.hash === "#/watchlist") {
    return { name: "watchlist" };
  }

  if (window.location.hash === "#/portfolio") {
    return { name: "portfolio" };
  }

  if (window.location.hash === "#/comparison") {
    return { name: "comparison" };
  }

  if (window.location.hash === "#/alerts") {
    return { name: "alerts" };
  }

  if (window.location.hash === "#/notifications") {
    return { name: "notifications" };
  }

  if (window.location.hash === "#/delivery-history") {
    return { name: "delivery-history" };
  }

  if (window.location.hash === "#/activity") {
    return { name: "activity" };
  }

  if (window.location.hash === "#/outcome-review") {
    return { name: "outcome-review" };
  }

  if (window.location.hash === "#/assignments") {
    return { name: "assignments" };
  }

  if (window.location.hash === "#/approvals") {
    return { name: "approvals" };
  }

  if (window.location.hash === "#/workspace") {
    return { name: "workspace" };
  }

  const match = window.location.hash.match(/^#\/datasets\/([^/]+)$/);
  if (match?.[1]) {
    return { name: "dataset", datasetId: decodeURIComponent(match[1]) };
  }

  const decisionBriefMatch = window.location.hash.match(/^#\/decision-briefs\/([^/]+)\/([^/]+)$/);
  if (decisionBriefMatch?.[1] === "comparison_item" && decisionBriefMatch[2]) {
    return {
      name: "decision-brief",
      entityType: "comparison_item",
      entityId: decodeURIComponent(decisionBriefMatch[2]),
    };
  }

  return { name: "my-work" };
}

function loadStoredSession(): StoredSession | null {
  const raw = sessionStorage.getItem(authStorageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed.token === "string" && parsed.user && typeof parsed.user.id === "string") {
      return parsed as StoredSession;
    }
  } catch {
    sessionStorage.removeItem(authStorageKey);
  }

  sessionStorage.removeItem(authStorageKey);
  return null;
}

async function refreshSession(
  token: string,
  setSession: (session: StoredSession | null) => void,
): Promise<void> {
  try {
    const result = await getCurrentUser(token);
    const nextSession = { token, user: result.user };
    sessionStorage.setItem(authStorageKey, JSON.stringify(nextSession));
    setSession(nextSession);
  } catch (error: unknown) {
    if (isAuthError(error)) {
      clearSession(setSession);
    }
  }
}

function clearSession(setSession: (session: StoredSession | null) => void): void {
  sessionStorage.removeItem(authStorageKey);
  setSession(null);
}

function isAuthError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 401;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function isActiveJobStatus(status: InternalJobResponse["status"]): boolean {
  return status === "queued" || status === "running";
}

function withoutActiveJob(status: DatasetScoringStatusResponse): DatasetScoringStatusResponse {
  const { activeJob: _activeJob, ...rest } = status;
  return rest;
}

function defaultMaintenanceStatus(): DatasetScoringStatusResponse["maintenance"] {
  return {
    mode: "manual_refresh_only",
    autoRefreshEnabled: false,
    eligibleForPolicyRefresh: false,
    message: "Dataset refresh is manual-only until maintenance policy is loaded.",
  };
}

function jobRequestKindLabel(requestKind: InternalJobResponse["requestKind"]): string {
  switch (requestKind) {
    case "policy_refresh":
      return "Scheduled refresh";
    case "refresh":
      return "Refresh";
    case "maintenance_scan":
      return "Maintenance";
    case "score":
      return "Scoring";
  }
}

function handoffResultLabel(result: "created" | "already_exists"): string {
  return result === "already_exists" ? "Already existed" : "Created";
}

function followTargetLabel(entityType: FollowTargetEntityType): string {
  switch (entityType) {
    case "dataset":
      return "Dataset";
    case "comparison_item":
      return "Comparison item";
    case "watchlist_item":
      return "Watchlist item";
    case "portfolio_item":
      return "Portfolio item";
  }
}

function followUpDueStateLabel(state: NonNullable<FollowUpStateResponse["followUp"]>["dueState"]): string {
  switch (state) {
    case "upcoming":
      return "Upcoming";
    case "due":
      return "Due today";
    case "overdue":
      return "Overdue";
    case "cleared":
      return "Cleared";
    case "none":
      return "No follow-up";
  }
}

function jobStatusClassName(status: InternalJobResponse["status"]): string {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "failed":
      return "border-red-200 bg-red-50 text-red-800";
    case "queued":
    case "running":
      return "border-amber-200 bg-amber-50 text-amber-900";
  }
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(-8) : id;
}

function summaryRecordLabel(record: PortfolioSummaryRecord): string {
  return record.normalizedFields.parcelId ?? `Row ${record.sourceRowNumber}`;
}

function upsertWatchlistItem(current: WatchlistState, item: WatchlistItemResponse): WatchlistState {
  const withoutDuplicate = current.items.filter(
    (existing) => existing.id !== item.id && existing.scoredRecordId !== item.scoredRecordId,
  );

  return {
    ...current,
    items: sortWatchlistItemsForReview([item, ...withoutDuplicate]),
    actionId: null,
    error: null,
  };
}

function upsertPortfolioItem(current: PortfolioState, item: PortfolioItemResponse): PortfolioState {
  const withoutDuplicate = current.items.filter(
    (existing) => existing.id !== item.id && existing.scoredRecordId !== item.scoredRecordId,
  );
  const items = sortPortfolioItemsForReview([item, ...withoutDuplicate]);

  return {
    ...current,
    items,
    summary: summarizePortfolioForReview(items),
    actionId: null,
    error: null,
  };
}

function upsertComparisonItem(current: ComparisonState, item: ComparisonItemResponse): ComparisonState {
  const withoutDuplicate = current.items.filter(
    (existing) => existing.id !== item.id && existing.scoredRecordId !== item.scoredRecordId,
  );

  return {
    ...current,
    items: sortComparisonItemsForReview([item, ...withoutDuplicate]),
    actionId: null,
    error: null,
  };
}

function comparisonSourceLabel(sourceType: ComparisonItemResponse["sourceType"]): string {
  switch (sourceType) {
    case "score":
      return "Score review";
    case "watchlist":
      return "Watchlist";
    case "portfolio":
      return "Portfolio";
  }
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default App;
