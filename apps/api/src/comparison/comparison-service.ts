import mongoose from "mongoose";
import type {
  AddComparisonItemResponse,
  ComparisonDecision,
  ComparisonItemResponse,
  ComparisonListResponse,
  ComparisonSourceType,
  DeleteComparisonItemResponse,
  NormalizedScoredRecordFields,
  UpdateComparisonItemResponse,
} from "@tax-lien/types";
import type { ScoringResult } from "@tax-lien/scoring";
import { ApiError } from "../errors/api-error.js";
import type { StoredPortfolioItem, PortfolioStore } from "../portfolio/portfolio-store.js";
import type { ScoredRecordStore, StoredScoredRecord } from "../scoring/scored-record-store.js";
import type { StoredWatchlistItem, WatchlistStore } from "../watchlist/watchlist-store.js";
import type { ComparisonStore, StoredComparisonItem } from "./comparison-store.js";

export const comparisonDecisions = ["undecided", "keep_reviewing", "move_forward", "rejected"] as const;

const defaultWorkspaceId = "default";
const maxDecisionNoteLength = 500;
const unsafeNoteControlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

export interface AddComparisonItemInput {
  scoredRecordId?: string;
  watchlistItemId?: string;
  portfolioItemId?: string;
}

export interface UpdateComparisonItemInput {
  decision?: ComparisonDecision;
  note?: string | null;
}

interface ComparisonSourceSnapshot {
  datasetId: string;
  scoredRecordId: string;
  sourceType: ComparisonSourceType;
  sourceWatchlistItemId?: string;
  sourcePortfolioItemId?: string;
  sourceRowNumber: number;
  normalizedFields: NormalizedScoredRecordFields;
  score: ScoringResult;
  scoredAt: Date;
}

export class ComparisonService {
  private readonly comparisonStore: ComparisonStore;
  private readonly scoredRecordStore: ScoredRecordStore;
  private readonly watchlistStore: WatchlistStore;
  private readonly portfolioStore: PortfolioStore;

  public constructor(
    comparisonStore: ComparisonStore,
    scoredRecordStore: ScoredRecordStore,
    watchlistStore: WatchlistStore,
    portfolioStore: PortfolioStore,
  ) {
    this.comparisonStore = comparisonStore;
    this.scoredRecordStore = scoredRecordStore;
    this.watchlistStore = watchlistStore;
    this.portfolioStore = portfolioStore;
  }

  public async addItem(userId: string, input: AddComparisonItemInput): Promise<AddComparisonItemResponse> {
    const source = await this.resolveSource(userId, input);
    const now = new Date();

    const result = await this.comparisonStore.createItem({
      userId,
      workspaceId: defaultWorkspaceId,
      datasetId: source.datasetId,
      scoredRecordId: source.scoredRecordId,
      sourceType: source.sourceType,
      ...(source.sourceWatchlistItemId ? { sourceWatchlistItemId: source.sourceWatchlistItemId } : {}),
      ...(source.sourcePortfolioItemId ? { sourcePortfolioItemId: source.sourcePortfolioItemId } : {}),
      decision: "undecided",
      decisionUpdatedAt: now,
      sourceRowNumber: source.sourceRowNumber,
      normalizedFields: source.normalizedFields,
      score: source.score,
      scoredAt: source.scoredAt,
      addedAt: now,
    });

    return {
      item: toComparisonItemResponse(result.item),
      alreadyExists: result.alreadyExists,
    };
  }

  public async listItems(userId: string): Promise<ComparisonListResponse> {
    const items = await this.comparisonStore.listItemsForUser(userId);
    return {
      items: items.map(toComparisonItemResponse),
    };
  }

  public async updateItem(
    userId: string,
    comparisonItemId: string,
    input: UpdateComparisonItemInput,
  ): Promise<UpdateComparisonItemResponse> {
    assertObjectId(comparisonItemId, "comparison_invalid_item_id", "Comparison item id is invalid.");

    const update = buildComparisonUpdate(input);
    const item = await this.comparisonStore.updateItemForUser(comparisonItemId, userId, update);
    if (!item) {
      throw new ApiError(404, "comparison_item_not_found", "Comparison item was not found.");
    }

    return {
      item: toComparisonItemResponse(item),
    };
  }

  public async deleteItem(userId: string, comparisonItemId: string): Promise<DeleteComparisonItemResponse> {
    assertObjectId(comparisonItemId, "comparison_invalid_item_id", "Comparison item id is invalid.");
    const deleted = await this.comparisonStore.deleteItemForUser(comparisonItemId, userId);
    if (!deleted) {
      throw new ApiError(404, "comparison_item_not_found", "Comparison item was not found.");
    }

    return {
      deleted: true,
      id: comparisonItemId,
    };
  }

  private async resolveSource(userId: string, input: AddComparisonItemInput): Promise<ComparisonSourceSnapshot> {
    const requestedSources = [
      typeof input.scoredRecordId === "string" && input.scoredRecordId.trim().length > 0,
      typeof input.watchlistItemId === "string" && input.watchlistItemId.trim().length > 0,
      typeof input.portfolioItemId === "string" && input.portfolioItemId.trim().length > 0,
    ].filter(Boolean).length;

    if (requestedSources !== 1) {
      throw new ApiError(
        400,
        "comparison_invalid_source",
        "Provide exactly one scoredRecordId, watchlistItemId, or portfolioItemId.",
      );
    }

    if (input.portfolioItemId) {
      const portfolioItemId = input.portfolioItemId;
      assertObjectId(portfolioItemId, "comparison_invalid_portfolio_item_id", "Portfolio item id is invalid.");
      const portfolioItem = await this.portfolioStore.findItemByIdForUser(portfolioItemId, userId);
      if (!portfolioItem) {
        throw new ApiError(404, "comparison_portfolio_item_not_found", "Portfolio item was not found.");
      }

      return snapshotFromPortfolioItem(portfolioItem);
    }

    if (input.watchlistItemId) {
      const watchlistItemId = input.watchlistItemId;
      assertObjectId(watchlistItemId, "comparison_invalid_watchlist_item_id", "Watchlist item id is invalid.");
      const watchlistItem = await this.watchlistStore.findItemByIdForUser(watchlistItemId, userId);
      if (!watchlistItem) {
        throw new ApiError(404, "comparison_watchlist_item_not_found", "Watchlist item was not found.");
      }

      return snapshotFromWatchlistItem(watchlistItem);
    }

    const scoredRecordId = input.scoredRecordId as string;
    assertObjectId(scoredRecordId, "comparison_invalid_scored_record_id", "Scored record id is invalid.");
    const scoredRecord = await this.scoredRecordStore.findScoreByIdForUser(scoredRecordId, userId);
    if (!scoredRecord) {
      throw new ApiError(404, "comparison_scored_record_not_found", "Scored record was not found.");
    }

    return snapshotFromScoredRecord(scoredRecord);
  }
}

export function toComparisonItemResponse(item: StoredComparisonItem): ComparisonItemResponse {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    datasetId: item.datasetId,
    scoredRecordId: item.scoredRecordId,
    sourceType: item.sourceType,
    ...(item.sourceWatchlistItemId ? { sourceWatchlistItemId: item.sourceWatchlistItemId } : {}),
    ...(item.sourcePortfolioItemId ? { sourcePortfolioItemId: item.sourcePortfolioItemId } : {}),
    decision: item.decision,
    decisionUpdatedAt: item.decisionUpdatedAt.toISOString(),
    ...(item.note ? { note: item.note } : {}),
    ...(item.noteUpdatedAt ? { noteUpdatedAt: item.noteUpdatedAt.toISOString() } : {}),
    sourceRowNumber: item.sourceRowNumber,
    normalizedFields: item.normalizedFields,
    investmentScore: item.score.investmentScore,
    riskScore: item.score.riskScore,
    liquidityScore: item.score.liquidityScore,
    redemptionProbability: item.score.redemptionProbability,
    confidenceScore: item.score.confidenceScore,
    ...(item.score.valueCoverageRatio !== undefined ? { valueCoverageRatio: item.score.valueCoverageRatio } : {}),
    flags: item.score.flags,
    reasoning: item.score.reasoning,
    scoredAt: item.scoredAt.toISOString(),
    addedAt: item.addedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function snapshotFromPortfolioItem(item: StoredPortfolioItem): ComparisonSourceSnapshot {
  return {
    datasetId: item.datasetId,
    scoredRecordId: item.scoredRecordId,
    sourceType: "portfolio",
    ...(item.sourceWatchlistItemId ? { sourceWatchlistItemId: item.sourceWatchlistItemId } : {}),
    sourcePortfolioItemId: item.id,
    sourceRowNumber: item.sourceRowNumber,
    normalizedFields: item.normalizedFields,
    score: item.score,
    scoredAt: item.scoredAt,
  };
}

function snapshotFromWatchlistItem(item: StoredWatchlistItem): ComparisonSourceSnapshot {
  return {
    datasetId: item.datasetId,
    scoredRecordId: item.scoredRecordId,
    sourceType: "watchlist",
    sourceWatchlistItemId: item.id,
    sourceRowNumber: item.sourceRowNumber,
    normalizedFields: item.normalizedFields,
    score: item.score,
    scoredAt: item.scoredAt,
  };
}

function snapshotFromScoredRecord(record: StoredScoredRecord): ComparisonSourceSnapshot {
  return {
    datasetId: record.datasetId,
    scoredRecordId: record.id,
    sourceType: "score",
    sourceRowNumber: record.sourceRowNumber,
    normalizedFields: record.normalizedFields,
    score: record.score,
    scoredAt: record.scoredAt,
  };
}

function buildComparisonUpdate(input: UpdateComparisonItemInput) {
  const hasDecision = input.decision !== undefined;
  const hasNote = Object.prototype.hasOwnProperty.call(input, "note");

  if (!hasDecision && !hasNote) {
    throw new ApiError(400, "comparison_invalid_update", "Provide a decision or note update.");
  }

  const now = new Date();
  const result: {
    decision?: ComparisonDecision;
    decisionUpdatedAt?: Date;
    note?: string;
    clearNote?: boolean;
    noteUpdatedAt?: Date;
  } = {};

  if (hasDecision) {
    const decision = input.decision;
    if (decision === undefined) {
      throw new ApiError(400, "comparison_invalid_decision", "Comparison decision is invalid.");
    }
    assertComparisonDecision(decision);
    result.decision = decision;
    result.decisionUpdatedAt = now;
  }

  if (hasNote) {
    const normalizedNote = normalizeDecisionNote(input.note);
    if (normalizedNote) {
      result.note = normalizedNote;
    } else {
      result.clearNote = true;
    }
    result.noteUpdatedAt = now;
  }

  return result;
}

function normalizeDecisionNote(note: string | null | undefined): string | null {
  if (note === null || note === undefined) {
    return null;
  }

  const normalized = note.trim();
  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length > maxDecisionNoteLength) {
    throw new ApiError(400, "comparison_note_too_long", "Decision note cannot exceed 500 characters.");
  }

  if (unsafeNoteControlCharacters.test(normalized)) {
    throw new ApiError(400, "comparison_invalid_note", "Decision note contains unsupported control characters.");
  }

  return normalized;
}

function assertComparisonDecision(decision: string): asserts decision is ComparisonDecision {
  if (!(comparisonDecisions as readonly string[]).includes(decision)) {
    throw new ApiError(400, "comparison_invalid_decision", "Comparison decision is invalid.");
  }
}

function assertObjectId(id: string, code: string, message: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, code, message);
  }
}
