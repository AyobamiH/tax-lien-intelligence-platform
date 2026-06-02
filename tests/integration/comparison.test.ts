import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
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
  );

  return {
    app: createApp({ authService, comparisonService }),
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

  it("rejects unauthenticated comparison access", async () => {
    const { app } = createTestContext();
    const id = new mongoose.Types.ObjectId().toString();

    await request(app).get("/comparison").expect(401);
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
    const crossDelete = await request(app)
      .delete(`/comparison/${add.body.item.id as string}`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);
    const otherList = await request(app).get("/comparison").set("Authorization", `Bearer ${other.token}`).expect(200);

    expect(crossAdd.body.error.code).toBe("comparison_scored_record_not_found");
    expect(crossUpdate.body.error.code).toBe("comparison_item_not_found");
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

    expect(invalidSource.body.error.code).toBe("comparison_invalid_source");
    expect(invalidId.body.error.code).toBe("comparison_invalid_scored_record_id");
    expect(invalidDecision.body.error.code).toBe("validation_failed");
    expect(longNote.body.error.code).toBe("validation_failed");
  });
});
