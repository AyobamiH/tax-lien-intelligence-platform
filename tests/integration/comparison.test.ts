import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
import { createInMemoryWorkspaceService } from "../support/in-memory-workspace-store.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import { ComparisonService } from "../../apps/api/src/comparison/comparison-service.js";
import type {
  ComparisonStore,
  CreateComparisonItemInput,
  CreateComparisonItemResult,
  StoredComparisonItem,
  UpdateComparisonItemInput,
} from "../../apps/api/src/comparison/comparison-store.js";
import type {
  CreateDecisionHistoryEventInput,
  DecisionHistoryStore,
  StoredDecisionHistoryEvent,
} from "../../apps/api/src/decision-history/decision-history-store.js";
import type {
  CreatePortfolioItemInput,
  CreatePortfolioItemResult,
  PortfolioStore,
  StoredPortfolioItem,
} from "../../apps/api/src/portfolio/portfolio-store.js";
import type {
  CreateScoredRecordInput,
  ScoredRecordStore,
  StaleDatasetSummary,
  StoredScoredRecord,
} from "../../apps/api/src/scoring/scored-record-store.js";
import type {
  CreateWatchlistItemInput,
  CreateWatchlistItemResult,
  StoredWatchlistItem,
  WatchlistStore,
} from "../../apps/api/src/watchlist/watchlist-store.js";
import type { PortfolioStatus } from "@tax-lien/types";

const testJwtSecret = "test-comparison-secret-that-is-long-enough-for-jwt";

class InMemoryUserStore implements UserStore {
  private readonly usersById = new Map<string, StoredUser>();
  private readonly idsByEmail = new Map<string, string>();

  public async createUser(input: CreateUserInput): Promise<StoredUser> {
    const now = new Date();
    const user: StoredUser = {
      id: new mongoose.Types.ObjectId().toString(),
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    this.usersById.set(user.id, user);
    this.idsByEmail.set(user.email, user.id);
    return user;
  }

  public async findByEmail(email: string): Promise<StoredUser | null> {
    const id = this.idsByEmail.get(email);
    return id ? (this.usersById.get(id) ?? null) : null;
  }

  public async findById(id: string): Promise<StoredUser | null> {
    return this.usersById.get(id) ?? null;
  }
}

class InMemoryScoredRecordStore implements ScoredRecordStore {
  private readonly recordsById = new Map<string, StoredScoredRecord>();

  public seed(userId: string, overrides: Partial<StoredScoredRecord> = {}): StoredScoredRecord {
    const now = new Date();
    const record: StoredScoredRecord = {
      id: new mongoose.Types.ObjectId().toString(),
      userId,
      datasetId: new mongoose.Types.ObjectId().toString(),
      sourceRowNumber: 2,
      normalizedFields: {
        parcelId: "A-100",
        lienAmount: 1000,
        estimatedValue: 14000,
        propertyType: "Single-family residential",
        propertyTypeCategory: "residential",
        address: "100 Main Street",
      },
      score: {
        investmentScore: 84,
        riskScore: 18,
        liquidityScore: 76,
        redemptionProbability: 0.82,
        confidenceScore: 88,
        valueCoverageRatio: 14,
        flags: ["Verify county source date"],
        reasoning: ["Strong value coverage ratio."],
      },
      scoredAt: now,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
    this.recordsById.set(record.id, record);
    return record;
  }

  public async replaceScoresForDataset(
    userId: string,
    datasetId: string,
    records: CreateScoredRecordInput[],
  ): Promise<StoredScoredRecord[]> {
    return records.map((record) => this.seed(userId, { datasetId, ...record }));
  }

  public async listScoresForDataset(userId: string, datasetId: string): Promise<StoredScoredRecord[]> {
    return [...this.recordsById.values()].filter((record) => record.userId === userId && record.datasetId === datasetId);
  }

  public async findScoreByIdForUser(scoredRecordId: string, userId: string): Promise<StoredScoredRecord | null> {
    const record = this.recordsById.get(scoredRecordId);
    return record && record.userId === userId ? record : null;
  }

  public async listStaleDatasetSummaries(): Promise<StaleDatasetSummary[]> {
    return [];
  }
}

class InMemoryWatchlistStore implements WatchlistStore {
  private readonly itemsById = new Map<string, StoredWatchlistItem>();

  public async createItem(input: CreateWatchlistItemInput): Promise<CreateWatchlistItemResult> {
    const existing = [...this.itemsById.values()].find(
      (item) => item.userId === input.userId && item.scoredRecordId === input.scoredRecordId,
    );
    if (existing) {
      return { item: existing, alreadyExists: true };
    }

    const now = new Date();
    const item: StoredWatchlistItem = {
      id: new mongoose.Types.ObjectId().toString(),
      userId: input.userId,
      datasetId: input.datasetId,
      scoredRecordId: input.scoredRecordId,
      sourceRowNumber: input.sourceRowNumber,
      normalizedFields: input.normalizedFields,
      score: input.score,
      scoredAt: input.scoredAt,
      addedAt: input.addedAt,
      createdAt: now,
      updatedAt: now,
    };
    this.itemsById.set(item.id, item);
    return { item, alreadyExists: false };
  }

  public async listItemsForUser(userId: string): Promise<StoredWatchlistItem[]> {
    return [...this.itemsById.values()].filter((item) => item.userId === userId);
  }

  public async findItemByIdForUser(watchlistItemId: string, userId: string): Promise<StoredWatchlistItem | null> {
    const item = this.itemsById.get(watchlistItemId);
    return item && item.userId === userId ? item : null;
  }

  public async deleteItemForUser(watchlistItemId: string, userId: string): Promise<boolean> {
    const item = this.itemsById.get(watchlistItemId);
    if (!item || item.userId !== userId) {
      return false;
    }
    return this.itemsById.delete(watchlistItemId);
  }
}

class InMemoryPortfolioStore implements PortfolioStore {
  private readonly itemsById = new Map<string, StoredPortfolioItem>();

  public async createItem(input: CreatePortfolioItemInput): Promise<CreatePortfolioItemResult> {
    const existing = [...this.itemsById.values()].find(
      (item) => item.userId === input.userId && item.scoredRecordId === input.scoredRecordId,
    );
    if (existing) {
      return { item: existing, alreadyExists: true };
    }

    const now = new Date();
    const item: StoredPortfolioItem = {
      id: new mongoose.Types.ObjectId().toString(),
      userId: input.userId,
      datasetId: input.datasetId,
      scoredRecordId: input.scoredRecordId,
      ...(input.sourceWatchlistItemId ? { sourceWatchlistItemId: input.sourceWatchlistItemId } : {}),
      status: input.status,
      statusUpdatedAt: input.statusUpdatedAt,
      sourceRowNumber: input.sourceRowNumber,
      normalizedFields: input.normalizedFields,
      score: input.score,
      scoredAt: input.scoredAt,
      trackedAt: input.trackedAt,
      createdAt: now,
      updatedAt: now,
    };
    this.itemsById.set(item.id, item);
    return { item, alreadyExists: false };
  }

  public async listItemsForUser(userId: string): Promise<StoredPortfolioItem[]> {
    return [...this.itemsById.values()].filter((item) => item.userId === userId);
  }

  public async findItemByIdForUser(portfolioItemId: string, userId: string): Promise<StoredPortfolioItem | null> {
    const item = this.itemsById.get(portfolioItemId);
    return item && item.userId === userId ? item : null;
  }

  public async updateStatusForUser(
    portfolioItemId: string,
    userId: string,
    status: PortfolioStatus,
    statusUpdatedAt: Date,
  ): Promise<StoredPortfolioItem | null> {
    const item = await this.findItemByIdForUser(portfolioItemId, userId);
    if (!item) {
      return null;
    }

    const updatedItem: StoredPortfolioItem = {
      ...item,
      status,
      statusUpdatedAt,
      updatedAt: statusUpdatedAt,
    };
    this.itemsById.set(portfolioItemId, updatedItem);
    return updatedItem;
  }

  public async deleteItemForUser(portfolioItemId: string, userId: string): Promise<boolean> {
    const item = this.itemsById.get(portfolioItemId);
    if (!item || item.userId !== userId) {
      return false;
    }
    return this.itemsById.delete(portfolioItemId);
  }
}

class InMemoryComparisonStore implements ComparisonStore {
  private readonly itemsById = new Map<string, StoredComparisonItem>();

  public async createItem(input: CreateComparisonItemInput): Promise<CreateComparisonItemResult> {
    const existing = [...this.itemsById.values()].find(
      (item) =>
        item.userId === input.userId &&
        item.workspaceId === input.workspaceId &&
        item.scoredRecordId === input.scoredRecordId,
    );
    if (existing) {
      return { item: existing, alreadyExists: true };
    }

    const now = new Date();
    const item: StoredComparisonItem = {
      id: new mongoose.Types.ObjectId().toString(),
      userId: input.userId,
      workspaceId: input.workspaceId,
      datasetId: input.datasetId,
      scoredRecordId: input.scoredRecordId,
      sourceType: input.sourceType,
      ...(input.sourceWatchlistItemId ? { sourceWatchlistItemId: input.sourceWatchlistItemId } : {}),
      ...(input.sourcePortfolioItemId ? { sourcePortfolioItemId: input.sourcePortfolioItemId } : {}),
      decision: input.decision,
      decisionUpdatedAt: input.decisionUpdatedAt,
      sourceRowNumber: input.sourceRowNumber,
      normalizedFields: input.normalizedFields,
      score: input.score,
      scoredAt: input.scoredAt,
      addedAt: input.addedAt,
      createdAt: now,
      updatedAt: now,
    };
    this.itemsById.set(item.id, item);
    return { item, alreadyExists: false };
  }

  public async listItemsForUser(userId: string): Promise<StoredComparisonItem[]> {
    return [...this.itemsById.values()].filter((item) => item.userId === userId);
  }

  public async findItemByIdForUser(comparisonItemId: string, userId: string): Promise<StoredComparisonItem | null> {
    const item = this.itemsById.get(comparisonItemId);
    return item && item.userId === userId ? item : null;
  }

  public async updateItemForUser(
    comparisonItemId: string,
    userId: string,
    input: UpdateComparisonItemInput,
  ): Promise<StoredComparisonItem | null> {
    const item = await this.findItemByIdForUser(comparisonItemId, userId);
    if (!item) {
      return null;
    }

    const updatedItem: StoredComparisonItem = {
      ...item,
      ...(input.decision ? { decision: input.decision, decisionUpdatedAt: input.decisionUpdatedAt ?? new Date() } : {}),
      ...(input.clearNote ? {} : input.note !== undefined ? { note: input.note } : {}),
      ...(input.noteUpdatedAt ? { noteUpdatedAt: input.noteUpdatedAt } : {}),
      updatedAt: new Date(),
    };
    if (input.clearNote) {
      delete updatedItem.note;
    }
    this.itemsById.set(comparisonItemId, updatedItem);
    return updatedItem;
  }

  public async deleteItemForUser(comparisonItemId: string, userId: string): Promise<boolean> {
    const item = this.itemsById.get(comparisonItemId);
    if (!item || item.userId !== userId) {
      return false;
    }
    return this.itemsById.delete(comparisonItemId);
  }
}

class InMemoryDecisionHistoryStore implements DecisionHistoryStore {
  private readonly eventsById = new Map<string, StoredDecisionHistoryEvent>();

  public async createEvent(input: CreateDecisionHistoryEventInput): Promise<StoredDecisionHistoryEvent> {
    const now = new Date();
    const event: StoredDecisionHistoryEvent = {
      id: new mongoose.Types.ObjectId().toString(),
      userId: input.userId,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      eventType: input.eventType,
      ...(input.previousDecision ? { previousDecision: input.previousDecision } : {}),
      ...(input.newDecision ? { newDecision: input.newDecision } : {}),
      ...(input.previousNoteSnapshot ? { previousNoteSnapshot: input.previousNoteSnapshot } : {}),
      ...(input.noteSnapshot ? { noteSnapshot: input.noteSnapshot } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
      createdAt: now,
      updatedAt: now,
    };
    this.eventsById.set(event.id, event);
    return event;
  }

  public async listEventsForEntity(
    userId: string,
    relatedEntityType: StoredDecisionHistoryEvent["relatedEntityType"],
    relatedEntityId: string,
  ): Promise<StoredDecisionHistoryEvent[]> {
    return [...this.eventsById.values()]
      .filter(
        (event) =>
          event.userId === userId &&
          event.relatedEntityType === relatedEntityType &&
          event.relatedEntityId === relatedEntityId,
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

function createTestContext(): {
  app: ReturnType<typeof createApp>;
  scoredRecordStore: InMemoryScoredRecordStore;
  watchlistStore: InMemoryWatchlistStore;
  portfolioStore: InMemoryPortfolioStore;
} {
  const userStore = new InMemoryUserStore();
  const scoredRecordStore = new InMemoryScoredRecordStore();
  const watchlistStore = new InMemoryWatchlistStore();
  const portfolioStore = new InMemoryPortfolioStore();
  const comparisonStore = new InMemoryComparisonStore();
  const decisionHistoryStore = new InMemoryDecisionHistoryStore();
  const authService = new AuthService(userStore, {
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });
  const comparisonService = new ComparisonService(
    comparisonStore,
    scoredRecordStore,
    watchlistStore,
    portfolioStore,
    decisionHistoryStore,
  );

  return {
    app: createApp({
      authService,
      comparisonService,
      workspaceService: createInMemoryWorkspaceService(userStore),
    }),
    scoredRecordStore,
    watchlistStore,
    portfolioStore,
  };
}

async function registerUser(app: ReturnType<typeof createApp>, email: string): Promise<{ token: string; userId: string }> {
  const response = await request(app).post("/auth/register").send({
    email,
    password: "StrongPass123",
  });

  return {
    token: response.body.token as string,
    userId: response.body.user.id as string,
  };
}

async function seedWatchlistItem(
  watchlistStore: InMemoryWatchlistStore,
  record: StoredScoredRecord,
): Promise<StoredWatchlistItem> {
  const result = await watchlistStore.createItem({
    userId: record.userId,
    datasetId: record.datasetId,
    scoredRecordId: record.id,
    sourceRowNumber: record.sourceRowNumber,
    normalizedFields: record.normalizedFields,
    score: record.score,
    scoredAt: record.scoredAt,
    addedAt: new Date(),
  });
  return result.item;
}

async function seedPortfolioItem(
  portfolioStore: InMemoryPortfolioStore,
  record: StoredScoredRecord,
  sourceWatchlistItemId?: string,
): Promise<StoredPortfolioItem> {
  const now = new Date();
  const result = await portfolioStore.createItem({
    userId: record.userId,
    datasetId: record.datasetId,
    scoredRecordId: record.id,
    ...(sourceWatchlistItemId ? { sourceWatchlistItemId } : {}),
    status: "reviewing",
    statusUpdatedAt: now,
    sourceRowNumber: record.sourceRowNumber,
    normalizedFields: record.normalizedFields,
    score: record.score,
    scoredAt: record.scoredAt,
    trackedAt: now,
  });
  return result.item;
}

describe("comparison API", () => {
  it("adds scored records to the authenticated user's comparison workspace idempotently", async () => {
    const { app, scoredRecordStore } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const record = scoredRecordStore.seed(owner.userId);

    const firstAdd = await request(app)
      .post("/comparison")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: record.id })
      .expect(201);
    const duplicateAdd = await request(app)
      .post("/comparison")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: record.id })
      .expect(200);
    const list = await request(app).get("/comparison").set("Authorization", `Bearer ${owner.token}`).expect(200);

    expect(firstAdd.body).toMatchObject({
      alreadyExists: false,
      item: {
        workspaceId: "default",
        sourceType: "score",
        scoredRecordId: record.id,
        decision: "undecided",
        investmentScore: 84,
        reasoning: ["Strong value coverage ratio."],
      },
    });
    expect(duplicateAdd.body).toMatchObject({ alreadyExists: true, item: { id: firstAdd.body.item.id } });
    expect(list.body.items).toHaveLength(1);
  });

  it("adds watchlist and portfolio sources and updates decision notes", async () => {
    const { app, scoredRecordStore, watchlistStore, portfolioStore } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const watchlistRecord = scoredRecordStore.seed(owner.userId);
    const portfolioRecord = scoredRecordStore.seed(owner.userId, { sourceRowNumber: 3 });
    const watchlistItem = await seedWatchlistItem(watchlistStore, watchlistRecord);
    const portfolioItem = await seedPortfolioItem(portfolioStore, portfolioRecord);

    const watchlistAdd = await request(app)
      .post("/comparison")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ watchlistItemId: watchlistItem.id })
      .expect(201);
    const portfolioAdd = await request(app)
      .post("/comparison")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ portfolioItemId: portfolioItem.id })
      .expect(201);

    expect(watchlistAdd.body.item).toMatchObject({
      sourceType: "watchlist",
      sourceWatchlistItemId: watchlistItem.id,
      scoredRecordId: watchlistRecord.id,
    });
    expect(portfolioAdd.body.item).toMatchObject({
      sourceType: "portfolio",
      sourcePortfolioItemId: portfolioItem.id,
      scoredRecordId: portfolioRecord.id,
    });

    const update = await request(app)
      .patch(`/comparison/${watchlistAdd.body.item.id as string}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ decision: "move_forward", note: "Confirm county sale terms before bid." })
      .expect(200);

    expect(update.body.item).toMatchObject({
      decision: "move_forward",
      note: "Confirm county sale terms before bid.",
    });
  });

  it("records owner-scoped decision history for comparison decision and note changes", async () => {
    const { app, scoredRecordStore } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const record = scoredRecordStore.seed(owner.userId);

    const add = await request(app)
      .post("/comparison")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: record.id })
      .expect(201);
    const comparisonItemId = add.body.item.id as string;

    await request(app)
      .patch(`/comparison/${comparisonItemId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ decision: "move_forward", note: "Confirm county sale terms before bid." })
      .expect(200);
    await request(app)
      .patch(`/comparison/${comparisonItemId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ note: "Reviewed county sale terms." })
      .expect(200);

    const history = await request(app)
      .get(`/comparison/${comparisonItemId}/history`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(history.body.events).toHaveLength(2);
    expect(history.body.events[0]).toMatchObject({
      relatedEntityType: "comparison_item",
      relatedEntityId: comparisonItemId,
      eventType: "comparison_note_changed",
      previousDecision: "move_forward",
      newDecision: "move_forward",
      previousNoteSnapshot: "Confirm county sale terms before bid.",
      noteSnapshot: "Reviewed county sale terms.",
      metadata: {
        workspaceId: "default",
        datasetId: record.datasetId,
        scoredRecordId: record.id,
        sourceType: "score",
      },
    });
    expect(history.body.events[1]).toMatchObject({
      relatedEntityType: "comparison_item",
      relatedEntityId: comparisonItemId,
      eventType: "comparison_decision_changed",
      previousDecision: "undecided",
      newDecision: "move_forward",
      noteSnapshot: "Confirm county sale terms before bid.",
    });

    await request(app)
      .delete(`/comparison/${comparisonItemId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);
    const staleHistory = await request(app)
      .get(`/comparison/${comparisonItemId}/history`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(404);

    expect(staleHistory.body.error.code).toBe("comparison_item_not_found");
  });

  it("hands comparison decisions into watchlist duplicate-safely with rationale history", async () => {
    const { app, scoredRecordStore, watchlistStore } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const record = scoredRecordStore.seed(owner.userId);

    const add = await request(app)
      .post("/comparison")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: record.id })
      .expect(201);
    const comparisonItemId = add.body.item.id as string;

    await request(app)
      .patch(`/comparison/${comparisonItemId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ decision: "keep_reviewing", note: "Keep reviewing county file quality." })
      .expect(200);

    const firstHandoff = await request(app)
      .post(`/comparison/${comparisonItemId}/handoff/watchlist`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(201);
    const duplicateHandoff = await request(app)
      .post(`/comparison/${comparisonItemId}/handoff/watchlist`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);
    const watchlistItems = await watchlistStore.listItemsForUser(owner.userId);
    const history = await request(app)
      .get(`/comparison/${comparisonItemId}/history`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(firstHandoff.body).toMatchObject({
      destination: "watchlist",
      alreadyExists: false,
      item: {
        scoredRecordId: record.id,
        datasetId: record.datasetId,
      },
      historyEvent: {
        eventType: "comparison_handoff_to_watchlist",
        previousDecision: "keep_reviewing",
        newDecision: "keep_reviewing",
        noteSnapshot: "Keep reviewing county file quality.",
        metadata: {
          targetEntityType: "watchlist_item",
          handoffResult: "created",
        },
      },
    });
    expect(duplicateHandoff.body).toMatchObject({
      destination: "watchlist",
      alreadyExists: true,
      item: {
        id: firstHandoff.body.item.id,
      },
      historyEvent: {
        eventType: "comparison_handoff_to_watchlist",
        metadata: {
          targetEntityId: firstHandoff.body.item.id,
          handoffResult: "already_exists",
        },
      },
    });
    expect(watchlistItems).toHaveLength(1);
    expect(history.body.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "comparison_handoff_to_watchlist",
          metadata: expect.objectContaining({
            targetEntityId: firstHandoff.body.item.id,
            handoffResult: "created",
          }),
        }),
        expect.objectContaining({
          eventType: "comparison_handoff_to_watchlist",
          metadata: expect.objectContaining({
            targetEntityId: firstHandoff.body.item.id,
            handoffResult: "already_exists",
          }),
        }),
      ]),
    );
  });

  it("hands comparison decisions into portfolio with status and source linkage", async () => {
    const { app, scoredRecordStore, watchlistStore, portfolioStore } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const record = scoredRecordStore.seed(owner.userId);
    const watchlistItem = await seedWatchlistItem(watchlistStore, record);

    const add = await request(app)
      .post("/comparison")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ watchlistItemId: watchlistItem.id })
      .expect(201);
    const comparisonItemId = add.body.item.id as string;

    await request(app)
      .patch(`/comparison/${comparisonItemId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ decision: "move_forward", note: "Ready for tracked diligence." })
      .expect(200);

    const handoff = await request(app)
      .post(`/comparison/${comparisonItemId}/handoff/portfolio`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "reviewing" })
      .expect(201);
    const portfolioItems = await portfolioStore.listItemsForUser(owner.userId);

    expect(handoff.body).toMatchObject({
      destination: "portfolio",
      alreadyExists: false,
      item: {
        scoredRecordId: record.id,
        sourceWatchlistItemId: watchlistItem.id,
        status: "reviewing",
      },
      historyEvent: {
        eventType: "comparison_handoff_to_portfolio",
        previousDecision: "move_forward",
        newDecision: "move_forward",
        noteSnapshot: "Ready for tracked diligence.",
        metadata: {
          targetEntityType: "portfolio_item",
          targetEntityId: handoff.body.item.id,
          handoffResult: "created",
          portfolioStatus: "reviewing",
        },
      },
    });
    expect(portfolioItems).toHaveLength(1);
    expect(portfolioItems[0]).toMatchObject({
      id: handoff.body.item.id,
      sourceWatchlistItemId: watchlistItem.id,
      status: "reviewing",
    });
  });

  it("rejects unauthenticated comparison access", async () => {
    const { app } = createTestContext();
    const id = new mongoose.Types.ObjectId().toString();

    await request(app).get("/comparison").expect(401);
    await request(app).get(`/comparison/${id}/history`).expect(401);
    await request(app).post(`/comparison/${id}/handoff/watchlist`).expect(401);
    await request(app).post(`/comparison/${id}/handoff/portfolio`).expect(401);
    await request(app).post("/comparison").send({ scoredRecordId: id }).expect(401);
    await request(app).patch(`/comparison/${id}`).send({ decision: "rejected" }).expect(401);
    await request(app).delete(`/comparison/${id}`).expect(401);
  });

  it("rejects cross-user source references and item mutations", async () => {
    const { app, scoredRecordStore } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const other = await registerUser(app, "other@example.com");
    const ownerRecord = scoredRecordStore.seed(owner.userId);

    const add = await request(app)
      .post("/comparison")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: ownerRecord.id })
      .expect(201);
    const crossAdd = await request(app)
      .post("/comparison")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ scoredRecordId: ownerRecord.id })
      .expect(404);
    const crossUpdate = await request(app)
      .patch(`/comparison/${add.body.item.id as string}`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ decision: "rejected" })
      .expect(404);
    const crossHistory = await request(app)
      .get(`/comparison/${add.body.item.id as string}/history`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);
    const crossWatchlistHandoff = await request(app)
      .post(`/comparison/${add.body.item.id as string}/handoff/watchlist`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);
    const crossPortfolioHandoff = await request(app)
      .post(`/comparison/${add.body.item.id as string}/handoff/portfolio`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);
    const crossDelete = await request(app)
      .delete(`/comparison/${add.body.item.id as string}`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);
    const otherList = await request(app).get("/comparison").set("Authorization", `Bearer ${other.token}`).expect(200);

    expect(crossAdd.body.error.code).toBe("comparison_scored_record_not_found");
    expect(crossUpdate.body.error.code).toBe("comparison_item_not_found");
    expect(crossHistory.body.error.code).toBe("comparison_item_not_found");
    expect(crossWatchlistHandoff.body.error.code).toBe("comparison_item_not_found");
    expect(crossPortfolioHandoff.body.error.code).toBe("comparison_item_not_found");
    expect(crossDelete.body.error.code).toBe("comparison_item_not_found");
    expect(otherList.body.items).toEqual([]);
  });

  it("validates source ids, source shape, decisions, and notes", async () => {
    const { app, scoredRecordStore } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const record = scoredRecordStore.seed(owner.userId);

    const invalidSource = await request(app)
      .post("/comparison")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: record.id, watchlistItemId: record.id })
      .expect(400);
    const invalidId = await request(app)
      .post("/comparison")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: "not-a-valid-id" })
      .expect(400);
    const add = await request(app)
      .post("/comparison")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: record.id })
      .expect(201);
    const invalidDecision = await request(app)
      .patch(`/comparison/${add.body.item.id as string}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ decision: "auction_now" })
      .expect(400);
    const longNote = await request(app)
      .patch(`/comparison/${add.body.item.id as string}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ note: "x".repeat(501) })
      .expect(400);
    const invalidPortfolioStatus = await request(app)
      .post(`/comparison/${add.body.item.id as string}/handoff/portfolio`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "auction_now" })
      .expect(400);
    await request(app)
      .delete(`/comparison/${add.body.item.id as string}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);
    const staleHandoff = await request(app)
      .post(`/comparison/${add.body.item.id as string}/handoff/watchlist`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(404);

    expect(invalidSource.body.error.code).toBe("comparison_invalid_source");
    expect(invalidId.body.error.code).toBe("comparison_invalid_scored_record_id");
    expect(invalidDecision.body.error.code).toBe("validation_failed");
    expect(longNote.body.error.code).toBe("validation_failed");
    expect(invalidPortfolioStatus.body.error.code).toBe("validation_failed");
    expect(staleHandoff.body.error.code).toBe("comparison_item_not_found");
  });
});
