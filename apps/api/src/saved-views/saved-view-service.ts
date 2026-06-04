import mongoose from "mongoose";
import type {
  ApplySavedViewResponse,
  ComparisonDecision,
  ComparisonSourceType,
  CreateSavedViewRequest,
  CreateSavedViewResponse,
  DeleteSavedViewResponse,
  PortfolioStatus,
  SavedViewComparisonFilters,
  SavedViewFilters,
  SavedViewListResponse,
  SavedViewPortfolioFilters,
  SavedViewResponse,
  SavedViewSort,
  SavedViewSurface,
  UpdateSavedViewRequest,
  UpdateSavedViewResponse,
} from "@tax-lien/types";
import { comparisonDecisions, toComparisonItemResponse } from "../comparison/comparison-service.js";
import type { ComparisonStore, StoredComparisonItem } from "../comparison/comparison-store.js";
import { ApiError } from "../errors/api-error.js";
import { buildPortfolioSummary, portfolioStatuses, toPortfolioItemResponse } from "../portfolio/portfolio-service.js";
import type { PortfolioStore, StoredPortfolioItem } from "../portfolio/portfolio-store.js";
import type { SavedViewStore, StoredSavedView } from "./saved-view-store.js";

export const savedViewSurfaces = ["portfolio", "comparison"] as const;
export const savedViewSortKeys = [
  "tracked_at",
  "status_updated_at",
  "added_at",
  "decision_updated_at",
  "investment_score",
  "risk_score",
  "confidence_score",
] as const;
export const savedViewSortDirections = ["asc", "desc"] as const;
export const portfolioQueues = ["needs_attention", "recently_changed"] as const;
export const comparisonQueues = ["needs_decision", "recent_decisions"] as const;

const comparisonSourceTypes = ["score", "watchlist", "portfolio"] as const;
const maxSavedViewNameLength = 80;
const maxSavedViewDescriptionLength = 240;

const builtInQueues: StoredSavedView[] = [
  {
    id: "portfolio-needs-attention",
    userId: "system",
    surface: "portfolio",
    name: "Needs attention",
    description: "Tracked portfolio items with review status, flags, low confidence, or no next status.",
    filters: { queue: "needs_attention" },
    sort: { key: "status_updated_at", direction: "desc" },
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "comparison-needs-decision",
    userId: "system",
    surface: "comparison",
    name: "Needs decision",
    description: "Comparison items that are still undecided.",
    filters: { queue: "needs_decision" },
    sort: { key: "decision_updated_at", direction: "desc" },
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
];

export class SavedViewService {
  private readonly savedViewStore: SavedViewStore;
  private readonly portfolioStore: PortfolioStore;
  private readonly comparisonStore: ComparisonStore;

  public constructor(
    savedViewStore: SavedViewStore,
    portfolioStore: PortfolioStore,
    comparisonStore: ComparisonStore,
  ) {
    this.savedViewStore = savedViewStore;
    this.portfolioStore = portfolioStore;
    this.comparisonStore = comparisonStore;
  }

  public async createView(userId: string, input: CreateSavedViewRequest): Promise<CreateSavedViewResponse> {
    const normalized = normalizeSavedViewInput(input);
    const view = await this.savedViewStore.createView({ userId, ...normalized });
    return {
      view: toSavedViewResponse(view),
    };
  }

  public async listViews(userId: string): Promise<SavedViewListResponse> {
    const views = await this.savedViewStore.listViewsForUser(userId);
    return {
      views: views.map(toSavedViewResponse),
      queues: builtInQueues.map(toSavedViewResponse),
    };
  }

  public async updateView(
    userId: string,
    savedViewId: string,
    input: UpdateSavedViewRequest,
  ): Promise<UpdateSavedViewResponse> {
    assertObjectId(savedViewId, "saved_view_invalid_id", "Saved view id is invalid.");
    const current = await this.savedViewStore.findViewByIdForUser(savedViewId, userId);
    if (!current) {
      throw new ApiError(404, "saved_view_not_found", "Saved view was not found.");
    }

    const update = normalizeSavedViewUpdate(current.surface, input);
    const updated = await this.savedViewStore.updateViewForUser(savedViewId, userId, update);
    if (!updated) {
      throw new ApiError(404, "saved_view_not_found", "Saved view was not found.");
    }

    return {
      view: toSavedViewResponse(updated),
    };
  }

  public async deleteView(userId: string, savedViewId: string): Promise<DeleteSavedViewResponse> {
    assertObjectId(savedViewId, "saved_view_invalid_id", "Saved view id is invalid.");
    const deleted = await this.savedViewStore.deleteViewForUser(savedViewId, userId);
    if (!deleted) {
      throw new ApiError(404, "saved_view_not_found", "Saved view was not found.");
    }

    return {
      deleted: true,
      id: savedViewId,
    };
  }

  public async applyView(userId: string, savedViewId: string): Promise<ApplySavedViewResponse> {
    const view = await this.resolveSavedView(userId, savedViewId);

    if (view.surface === "portfolio") {
      const items = applyPortfolioSavedView(await this.portfolioStore.listItemsForUser(userId), view);
      return {
        view: toSavedViewResponse(view),
        surface: "portfolio",
        items: items.map(toPortfolioItemResponse),
        summary: buildPortfolioSummary(items),
      };
    }

    const items = applyComparisonSavedView(await this.comparisonStore.listItemsForUser(userId), view);
    return {
      view: toSavedViewResponse(view),
      surface: "comparison",
      items: items.map(toComparisonItemResponse),
    };
  }

  private async resolveSavedView(userId: string, savedViewId: string): Promise<StoredSavedView> {
    const builtIn = builtInQueues.find((queue) => queue.id === savedViewId);
    if (builtIn) {
      return builtIn;
    }

    assertObjectId(savedViewId, "saved_view_invalid_id", "Saved view id is invalid.");
    const view = await this.savedViewStore.findViewByIdForUser(savedViewId, userId);
    if (!view) {
      throw new ApiError(404, "saved_view_not_found", "Saved view was not found.");
    }

    return view;
  }
}

export function toSavedViewResponse(view: StoredSavedView): SavedViewResponse {
  return {
    id: view.id,
    surface: view.surface,
    name: view.name,
    ...(view.description ? { description: view.description } : {}),
    filters: view.filters,
    ...(view.sort ? { sort: view.sort } : {}),
    createdAt: view.createdAt.toISOString(),
    updatedAt: view.updatedAt.toISOString(),
  };
}

export function applyPortfolioSavedView(items: StoredPortfolioItem[], view: StoredSavedView): StoredPortfolioItem[] {
  const filters = view.filters as SavedViewPortfolioFilters;
  return sortPortfolioItems(
    items.filter((item) => {
      if (filters.statuses && !filters.statuses.includes(item.status)) {
        return false;
      }
      if (filters.hasFlags !== undefined && (item.score.flags.length > 0) !== filters.hasFlags) {
        return false;
      }
      if (filters.maxRiskScore !== undefined && item.score.riskScore > filters.maxRiskScore) {
        return false;
      }
      if (filters.minConfidenceScore !== undefined && item.score.confidenceScore < filters.minConfidenceScore) {
        return false;
      }
      if (filters.queue === "needs_attention" && !portfolioItemNeedsAttention(item)) {
        return false;
      }
      if (filters.queue === "recently_changed" && item.statusUpdatedAt.getTime() === item.trackedAt.getTime()) {
        return false;
      }

      return true;
    }),
    view.sort,
  );
}

export function applyComparisonSavedView(items: StoredComparisonItem[], view: StoredSavedView): StoredComparisonItem[] {
  const filters = view.filters as SavedViewComparisonFilters;
  return sortComparisonItems(
    items.filter((item) => {
      if (filters.decisions && !filters.decisions.includes(item.decision)) {
        return false;
      }
      if (filters.sourceTypes && !filters.sourceTypes.includes(item.sourceType)) {
        return false;
      }
      if (filters.hasNote !== undefined && (typeof item.note === "string" && item.note.length > 0) !== filters.hasNote) {
        return false;
      }
      if (filters.queue === "needs_decision" && item.decision !== "undecided") {
        return false;
      }
      if (filters.queue === "recent_decisions" && item.decisionUpdatedAt.getTime() === item.addedAt.getTime()) {
        return false;
      }

      return true;
    }),
    view.sort,
  );
}

function normalizeSavedViewInput(input: CreateSavedViewRequest): Omit<StoredSavedView, "id" | "userId" | "createdAt" | "updatedAt"> {
  const surface = assertSurface(input.surface);
  const filters = normalizeFilters(surface, input.filters);
  const sort = input.sort ? normalizeSort(surface, input.sort) : undefined;

  return {
    surface,
    name: normalizeName(input.name),
    ...(normalizeDescription(input.description) ? { description: normalizeDescription(input.description) as string } : {}),
    filters,
    ...(sort ? { sort } : {}),
  };
}

function normalizeSavedViewUpdate(surface: SavedViewSurface, input: UpdateSavedViewRequest) {
  if (
    input.name === undefined &&
    input.description === undefined &&
    input.filters === undefined &&
    input.sort === undefined
  ) {
    throw new ApiError(400, "saved_view_empty_update", "Provide at least one saved view field to update.");
  }

  const update: {
    name?: string;
    description?: string | null;
    filters?: SavedViewFilters;
    sort?: SavedViewSort | null;
  } = {};

  if (input.name !== undefined) {
    update.name = normalizeName(input.name);
  }
  if (input.description !== undefined) {
    const description = normalizeDescription(input.description);
    if (description !== undefined) {
      update.description = description;
    }
  }
  if (input.filters !== undefined) {
    update.filters = normalizeFilters(surface, input.filters);
  }
  if (input.sort !== undefined) {
    update.sort = input.sort === null ? null : normalizeSort(surface, input.sort);
  }

  return update;
}

function normalizeFilters(surface: SavedViewSurface, filters: SavedViewFilters): SavedViewFilters {
  if (surface === "portfolio") {
    const portfolioFilters = filters as SavedViewPortfolioFilters;
    const allowedKeys = ["statuses", "queue", "hasFlags", "maxRiskScore", "minConfidenceScore"];
    assertAllowedFilterKeys(portfolioFilters as Record<string, unknown>, allowedKeys);
    const normalized: SavedViewPortfolioFilters = {};

    if (portfolioFilters.statuses !== undefined) {
      normalized.statuses = uniqueValues(portfolioFilters.statuses).map(assertPortfolioStatus);
    }
    if (portfolioFilters.queue !== undefined) {
      const queue = assertPortfolioQueue(portfolioFilters.queue);
      if (queue) {
        normalized.queue = queue;
      }
    }
    if (portfolioFilters.hasFlags !== undefined) {
      normalized.hasFlags = assertBoolean(portfolioFilters.hasFlags, "hasFlags");
    }
    if (portfolioFilters.maxRiskScore !== undefined) {
      normalized.maxRiskScore = assertScoreThreshold(portfolioFilters.maxRiskScore, "maxRiskScore");
    }
    if (portfolioFilters.minConfidenceScore !== undefined) {
      normalized.minConfidenceScore = assertScoreThreshold(portfolioFilters.minConfidenceScore, "minConfidenceScore");
    }

    return normalized;
  }

  const comparisonFilters = filters as SavedViewComparisonFilters;
  const allowedKeys = ["decisions", "sourceTypes", "queue", "hasNote"];
  assertAllowedFilterKeys(comparisonFilters as Record<string, unknown>, allowedKeys);
  const normalized: SavedViewComparisonFilters = {};

  if (comparisonFilters.decisions !== undefined) {
    normalized.decisions = uniqueValues(comparisonFilters.decisions).map(assertComparisonDecision);
  }
  if (comparisonFilters.sourceTypes !== undefined) {
    normalized.sourceTypes = uniqueValues(comparisonFilters.sourceTypes).map(assertComparisonSourceType);
  }
  if (comparisonFilters.queue !== undefined) {
    const queue = assertComparisonQueue(comparisonFilters.queue);
    if (queue) {
      normalized.queue = queue;
    }
  }
  if (comparisonFilters.hasNote !== undefined) {
    normalized.hasNote = assertBoolean(comparisonFilters.hasNote, "hasNote");
  }

  return normalized;
}

function normalizeSort(surface: SavedViewSurface, sort: SavedViewSort): SavedViewSort {
  if (!savedViewSortKeys.includes(sort.key)) {
    throw new ApiError(400, "saved_view_invalid_sort", "Saved view sort key is invalid.");
  }
  if (!savedViewSortDirections.includes(sort.direction)) {
    throw new ApiError(400, "saved_view_invalid_sort", "Saved view sort direction is invalid.");
  }
  if (surface === "portfolio" && (sort.key === "added_at" || sort.key === "decision_updated_at")) {
    throw new ApiError(400, "saved_view_invalid_sort", "Saved view sort is not valid for portfolio.");
  }
  if (surface === "comparison" && (sort.key === "tracked_at" || sort.key === "status_updated_at")) {
    throw new ApiError(400, "saved_view_invalid_sort", "Saved view sort is not valid for comparison.");
  }

  return sort;
}

function sortPortfolioItems(items: StoredPortfolioItem[], sort?: SavedViewSort): StoredPortfolioItem[] {
  const effectiveSort = sort ?? { key: "tracked_at", direction: "desc" };
  return [...items].sort((left, right) => compareSavedViewValues(portfolioSortValue(left, effectiveSort.key), portfolioSortValue(right, effectiveSort.key), effectiveSort.direction));
}

function sortComparisonItems(items: StoredComparisonItem[], sort?: SavedViewSort): StoredComparisonItem[] {
  const effectiveSort = sort ?? { key: "added_at", direction: "desc" };
  return [...items].sort((left, right) => compareSavedViewValues(comparisonSortValue(left, effectiveSort.key), comparisonSortValue(right, effectiveSort.key), effectiveSort.direction));
}

function portfolioSortValue(item: StoredPortfolioItem, key: SavedViewSort["key"]): number {
  switch (key) {
    case "status_updated_at":
      return item.statusUpdatedAt.getTime();
    case "investment_score":
      return item.score.investmentScore;
    case "risk_score":
      return item.score.riskScore;
    case "confidence_score":
      return item.score.confidenceScore;
    case "tracked_at":
    case "added_at":
    case "decision_updated_at":
      return item.trackedAt.getTime();
  }
}

function comparisonSortValue(item: StoredComparisonItem, key: SavedViewSort["key"]): number {
  switch (key) {
    case "decision_updated_at":
      return item.decisionUpdatedAt.getTime();
    case "investment_score":
      return item.score.investmentScore;
    case "risk_score":
      return item.score.riskScore;
    case "confidence_score":
      return item.score.confidenceScore;
    case "added_at":
    case "tracked_at":
    case "status_updated_at":
      return item.addedAt.getTime();
  }
}

function compareSavedViewValues(left: number, right: number, direction: "asc" | "desc"): number {
  return direction === "asc" ? left - right : right - left;
}

function portfolioItemNeedsAttention(item: StoredPortfolioItem): boolean {
  const active = item.status !== "closed" && item.status !== "discarded";
  return active && (item.status === "reviewing" || item.status === "tracked" || item.score.flags.length > 0 || item.score.confidenceScore < 60);
}

function assertSurface(surface: string): SavedViewSurface {
  if (!savedViewSurfaces.includes(surface as SavedViewSurface)) {
    throw new ApiError(400, "saved_view_invalid_surface", "Saved view surface is invalid.");
  }

  return surface as SavedViewSurface;
}

function assertPortfolioStatus(status: string): PortfolioStatus {
  if (!portfolioStatuses.includes(status as PortfolioStatus)) {
    throw new ApiError(400, "saved_view_invalid_filter", "Saved view portfolio status is invalid.");
  }

  return status as PortfolioStatus;
}

function assertComparisonDecision(decision: string): ComparisonDecision {
  if (!comparisonDecisions.includes(decision as ComparisonDecision)) {
    throw new ApiError(400, "saved_view_invalid_filter", "Saved view comparison decision is invalid.");
  }

  return decision as ComparisonDecision;
}

function assertComparisonSourceType(sourceType: string): ComparisonSourceType {
  if (!comparisonSourceTypes.includes(sourceType as ComparisonSourceType)) {
    throw new ApiError(400, "saved_view_invalid_filter", "Saved view comparison source type is invalid.");
  }

  return sourceType as ComparisonSourceType;
}

function assertPortfolioQueue(queue: string): SavedViewPortfolioFilters["queue"] {
  if (!portfolioQueues.includes(queue as NonNullable<SavedViewPortfolioFilters["queue"]>)) {
    throw new ApiError(400, "saved_view_invalid_filter", "Saved view portfolio queue is invalid.");
  }

  return queue as SavedViewPortfolioFilters["queue"];
}

function assertComparisonQueue(queue: string): SavedViewComparisonFilters["queue"] {
  if (!comparisonQueues.includes(queue as NonNullable<SavedViewComparisonFilters["queue"]>)) {
    throw new ApiError(400, "saved_view_invalid_filter", "Saved view comparison queue is invalid.");
  }

  return queue as SavedViewComparisonFilters["queue"];
}

function assertBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new ApiError(400, "saved_view_invalid_filter", `Saved view ${field} filter is invalid.`);
  }

  return value;
}

function assertScoreThreshold(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new ApiError(400, "saved_view_invalid_filter", `Saved view ${field} filter is invalid.`);
  }

  return value;
}

function assertAllowedFilterKeys(filters: Record<string, unknown>, allowedKeys: string[]): void {
  for (const key of Object.keys(filters)) {
    if (!allowedKeys.includes(key)) {
      throw new ApiError(400, "saved_view_invalid_filter", "Saved view filter field is not supported.");
    }
  }
}

function normalizeName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > maxSavedViewNameLength) {
    throw new ApiError(400, "saved_view_invalid_name", "Saved view name is invalid.");
  }

  return trimmed;
}

function normalizeDescription(description: string | null | undefined): string | null | undefined {
  if (description === null || description === undefined) {
    return description;
  }

  const trimmed = description.trim();
  if (trimmed.length > maxSavedViewDescriptionLength) {
    throw new ApiError(400, "saved_view_invalid_description", "Saved view description is invalid.");
  }

  return trimmed.length > 0 ? trimmed : undefined;
}

function uniqueValues<T>(values: T[]): T[] {
  if (!Array.isArray(values) || values.length === 0 || values.length > 12) {
    throw new ApiError(400, "saved_view_invalid_filter", "Saved view filter list is invalid.");
  }

  return [...new Set(values)];
}

function assertObjectId(id: string, code: string, message: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, code, message);
  }
}
