import type {
  ApiErrorResponse,
  AuthMeResponse,
  AuthSuccessResponse,
  AlertDetailResponse,
  AlertListResponse,
  AddComparisonItemResponse,
  AddWatchlistItemResponse,
  DatasetDetailResponse,
  DatasetListResponse,
  DatasetScoreJobResponse,
  DatasetScoresResponse,
  DeleteWatchlistItemResponse,
  ComparisonDecision,
  ComparisonHandoffToPortfolioResponse,
  ComparisonHandoffToWatchlistResponse,
  DecisionHistoryListResponse,
  ComparisonListResponse,
  AddPortfolioItemResponse,
  ApplySavedViewResponse,
  ApplyImportProfileToDatasetRequest,
  ApplyImportProfileToDatasetResponse,
  CreateSavedViewRequest,
  CreateSavedViewResponse,
  DeletePortfolioItemResponse,
  DeleteSavedViewResponse,
  DatasetRefreshJobResponse,
  DatasetScoringStatusResponse,
  DatasetManualMappingContextResponse,
  DeleteComparisonItemResponse,
  ImportProfileListResponse,
  JobDetailResponse,
  MarkAllAlertsReadResponse,
  PortfolioDetailResponse,
  PortfolioListResponse,
  PortfolioStatus,
  PortfolioSummaryResponse,
  SaveDatasetManualMappingRequest,
  SaveDatasetManualMappingResponse,
  SaveImportProfileFromDatasetRequest,
  SaveImportProfileFromDatasetResponse,
  SavedViewListResponse,
  UpdateComparisonItemResponse,
  UpdatePortfolioItemResponse,
  WatchlistListResponse,
} from "@tax-lien/types";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface CreateDatasetInput {
  file: File;
  sourceLabel?: string;
}

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;

  public constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

export async function register(credentials: AuthCredentials): Promise<AuthSuccessResponse> {
  return requestJson<AuthSuccessResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function login(credentials: AuthCredentials): Promise<AuthSuccessResponse> {
  return requestJson<AuthSuccessResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function getCurrentUser(token: string): Promise<AuthMeResponse> {
  return requestJson<AuthMeResponse>("/auth/me", {
    token,
  });
}

export async function listDatasets(token: string): Promise<DatasetListResponse> {
  return requestJson<DatasetListResponse>("/datasets", {
    token,
  });
}

export async function createDataset(token: string, input: CreateDatasetInput): Promise<DatasetDetailResponse> {
  const formData = new FormData();
  formData.append("file", input.file);

  const sourceLabel = input.sourceLabel?.trim();
  if (sourceLabel) {
    formData.append("sourceLabel", sourceLabel);
  }

  return requestFormData<DatasetDetailResponse>("/datasets", {
    method: "POST",
    token,
    body: formData,
  });
}

export async function getDataset(token: string, datasetId: string): Promise<DatasetDetailResponse> {
  return requestJson<DatasetDetailResponse>(`/datasets/${encodeURIComponent(datasetId)}`, {
    token,
  });
}

export async function getDatasetManualMappingContext(
  token: string,
  datasetId: string,
): Promise<DatasetManualMappingContextResponse> {
  return requestJson<DatasetManualMappingContextResponse>(`/datasets/${encodeURIComponent(datasetId)}/mapping`, {
    token,
  });
}

export async function saveDatasetManualMapping(
  token: string,
  datasetId: string,
  input: SaveDatasetManualMappingRequest,
): Promise<SaveDatasetManualMappingResponse> {
  return requestJson<SaveDatasetManualMappingResponse>(`/datasets/${encodeURIComponent(datasetId)}/mapping`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });
}

export async function listImportProfiles(token: string): Promise<ImportProfileListResponse> {
  return requestJson<ImportProfileListResponse>("/datasets/import-profiles", {
    token,
  });
}

export async function saveDatasetImportProfile(
  token: string,
  datasetId: string,
  input: SaveImportProfileFromDatasetRequest,
): Promise<SaveImportProfileFromDatasetResponse> {
  return requestJson<SaveImportProfileFromDatasetResponse>(`/datasets/${encodeURIComponent(datasetId)}/import-profile`, {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export async function applyDatasetImportProfile(
  token: string,
  datasetId: string,
  input: ApplyImportProfileToDatasetRequest,
): Promise<ApplyImportProfileToDatasetResponse> {
  return requestJson<ApplyImportProfileToDatasetResponse>(
    `/datasets/${encodeURIComponent(datasetId)}/import-profile/apply`,
    {
      method: "POST",
      token,
      body: JSON.stringify(input),
    },
  );
}

export async function listDatasetScores(token: string, datasetId: string): Promise<DatasetScoresResponse> {
  return requestJson<DatasetScoresResponse>(`/datasets/${encodeURIComponent(datasetId)}/scores`, {
    token,
  });
}

export async function scoreDataset(token: string, datasetId: string): Promise<DatasetScoreJobResponse> {
  return requestJson<DatasetScoreJobResponse>(`/datasets/${encodeURIComponent(datasetId)}/score`, {
    method: "POST",
    token,
  });
}

export async function refreshDatasetScoring(token: string, datasetId: string): Promise<DatasetRefreshJobResponse> {
  return requestJson<DatasetRefreshJobResponse>(`/datasets/${encodeURIComponent(datasetId)}/refresh`, {
    method: "POST",
    token,
  });
}

export async function getDatasetScoringStatus(
  token: string,
  datasetId: string,
): Promise<DatasetScoringStatusResponse> {
  return requestJson<DatasetScoringStatusResponse>(`/datasets/${encodeURIComponent(datasetId)}/scoring-status`, {
    token,
  });
}

export async function getJob(token: string, jobId: string): Promise<JobDetailResponse> {
  return requestJson<JobDetailResponse>(`/jobs/${encodeURIComponent(jobId)}`, {
    token,
  });
}

export async function listAlerts(token: string): Promise<AlertListResponse> {
  return requestJson<AlertListResponse>("/alerts", {
    token,
  });
}

export async function markAlertRead(token: string, alertId: string): Promise<AlertDetailResponse> {
  return requestJson<AlertDetailResponse>(`/alerts/${encodeURIComponent(alertId)}/read`, {
    method: "PATCH",
    token,
  });
}

export async function markAllAlertsRead(token: string): Promise<MarkAllAlertsReadResponse> {
  return requestJson<MarkAllAlertsReadResponse>("/alerts/read-all", {
    method: "PATCH",
    token,
  });
}

export async function listWatchlist(token: string): Promise<WatchlistListResponse> {
  return requestJson<WatchlistListResponse>("/watchlist", {
    token,
  });
}

export async function addWatchlistItem(token: string, scoredRecordId: string): Promise<AddWatchlistItemResponse> {
  return requestJson<AddWatchlistItemResponse>("/watchlist", {
    method: "POST",
    token,
    body: JSON.stringify({ scoredRecordId }),
  });
}

export async function removeWatchlistItem(token: string, watchlistItemId: string): Promise<DeleteWatchlistItemResponse> {
  return requestJson<DeleteWatchlistItemResponse>(`/watchlist/${encodeURIComponent(watchlistItemId)}`, {
    method: "DELETE",
    token,
  });
}

export async function listPortfolio(token: string): Promise<PortfolioListResponse> {
  return requestJson<PortfolioListResponse>("/portfolio", {
    token,
  });
}

export async function getPortfolioSummary(token: string): Promise<PortfolioSummaryResponse> {
  return requestJson<PortfolioSummaryResponse>("/portfolio/summary", {
    token,
  });
}

export async function getPortfolioItem(token: string, portfolioItemId: string): Promise<PortfolioDetailResponse> {
  return requestJson<PortfolioDetailResponse>(`/portfolio/${encodeURIComponent(portfolioItemId)}`, {
    token,
  });
}

export async function addPortfolioItem(
  token: string,
  input: { scoredRecordId?: string; watchlistItemId?: string; status?: PortfolioStatus },
): Promise<AddPortfolioItemResponse> {
  return requestJson<AddPortfolioItemResponse>("/portfolio", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export async function updatePortfolioItemStatus(
  token: string,
  portfolioItemId: string,
  status: PortfolioStatus,
): Promise<UpdatePortfolioItemResponse> {
  return requestJson<UpdatePortfolioItemResponse>(`/portfolio/${encodeURIComponent(portfolioItemId)}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status }),
  });
}

export async function removePortfolioItem(token: string, portfolioItemId: string): Promise<DeletePortfolioItemResponse> {
  return requestJson<DeletePortfolioItemResponse>(`/portfolio/${encodeURIComponent(portfolioItemId)}`, {
    method: "DELETE",
    token,
  });
}

export async function listComparison(token: string): Promise<ComparisonListResponse> {
  return requestJson<ComparisonListResponse>("/comparison", {
    token,
  });
}

export async function addComparisonItem(
  token: string,
  input: { scoredRecordId?: string; watchlistItemId?: string; portfolioItemId?: string },
): Promise<AddComparisonItemResponse> {
  return requestJson<AddComparisonItemResponse>("/comparison", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export async function updateComparisonItem(
  token: string,
  comparisonItemId: string,
  input: { decision?: ComparisonDecision; note?: string | null },
): Promise<UpdateComparisonItemResponse> {
  return requestJson<UpdateComparisonItemResponse>(`/comparison/${encodeURIComponent(comparisonItemId)}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });
}

export async function listComparisonHistory(
  token: string,
  comparisonItemId: string,
): Promise<DecisionHistoryListResponse> {
  return requestJson<DecisionHistoryListResponse>(`/comparison/${encodeURIComponent(comparisonItemId)}/history`, {
    token,
  });
}

export async function handoffComparisonToWatchlist(
  token: string,
  comparisonItemId: string,
): Promise<ComparisonHandoffToWatchlistResponse> {
  return requestJson<ComparisonHandoffToWatchlistResponse>(
    `/comparison/${encodeURIComponent(comparisonItemId)}/handoff/watchlist`,
    {
      method: "POST",
      token,
    },
  );
}

export async function handoffComparisonToPortfolio(
  token: string,
  comparisonItemId: string,
  input: { status?: PortfolioStatus } = {},
): Promise<ComparisonHandoffToPortfolioResponse> {
  return requestJson<ComparisonHandoffToPortfolioResponse>(
    `/comparison/${encodeURIComponent(comparisonItemId)}/handoff/portfolio`,
    {
      method: "POST",
      token,
      body: JSON.stringify(input),
    },
  );
}

export async function removeComparisonItem(
  token: string,
  comparisonItemId: string,
): Promise<DeleteComparisonItemResponse> {
  return requestJson<DeleteComparisonItemResponse>(`/comparison/${encodeURIComponent(comparisonItemId)}`, {
    method: "DELETE",
    token,
  });
}

export async function listSavedViews(token: string): Promise<SavedViewListResponse> {
  return requestJson<SavedViewListResponse>("/saved-views", {
    token,
  });
}

export async function createSavedView(token: string, input: CreateSavedViewRequest): Promise<CreateSavedViewResponse> {
  return requestJson<CreateSavedViewResponse>("/saved-views", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export async function applySavedView(token: string, savedViewId: string): Promise<ApplySavedViewResponse> {
  return requestJson<ApplySavedViewResponse>(`/saved-views/${encodeURIComponent(savedViewId)}/apply`, {
    token,
  });
}

export async function deleteSavedView(token: string, savedViewId: string): Promise<DeleteSavedViewResponse> {
  return requestJson<DeleteSavedViewResponse>(`/saved-views/${encodeURIComponent(savedViewId)}`, {
    method: "DELETE",
    token,
  });
}

interface JsonRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string;
  body?: string;
}

interface FormDataRequestOptions {
  method: "POST";
  token: string;
  body: FormData;
}

async function requestJson<TResponse>(path: string, options: JsonRequestOptions = {}): Promise<TResponse> {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const requestInit: RequestInit = {
    method: options.method ?? "GET",
    headers,
  };

  if (options.body) {
    requestInit.body = options.body;
  }

  const response = await fetch(`${apiBaseUrl}${path}`, requestInit);

  const payload = await readJson(response);

  if (!response.ok) {
    const apiError = parseApiError(payload);
    throw new ApiClientError(response.status, apiError.code, apiError.message);
  }

  return payload as TResponse;
}

async function requestFormData<TResponse>(path: string, options: FormDataRequestOptions): Promise<TResponse> {
  const headers = new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${options.token}`,
  });

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method,
    headers,
    body: options.body,
  });

  const payload = await readJson(response);

  if (!response.ok) {
    const apiError = parseApiError(payload);
    throw new ApiClientError(response.status, apiError.code, apiError.message);
  }

  return payload as TResponse;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ApiClientError(response.status, "api_invalid_json", "The API returned an unreadable response.");
  }
}

function parseApiError(payload: unknown): ApiErrorResponse["error"] {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const errorValue = payload.error;
    if (
      typeof errorValue === "object" &&
      errorValue !== null &&
      "code" in errorValue &&
      "message" in errorValue
    ) {
      const code = errorValue.code;
      const message = errorValue.message;
      if (typeof code === "string" && typeof message === "string") {
        return { code, message };
      }
    }
  }

  return {
    code: "api_request_failed",
    message: "The request failed.",
  };
}
