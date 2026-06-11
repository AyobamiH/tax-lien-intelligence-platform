import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import { createApp } from "../../apps/api/src/app.js";
import { createInMemoryWorkspaceService } from "../support/in-memory-workspace-store.js";
import { DatasetService } from "../../apps/api/src/datasets/dataset-service.js";
import type {
  CreateDatasetInput,
  DatasetStore,
  StoredDataset,
} from "../../apps/api/src/datasets/dataset-store.js";
import { InternalJobService } from "../../apps/api/src/jobs/internal-job-service.js";
import { PortfolioService } from "../../apps/api/src/portfolio/portfolio-service.js";
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
import { ScoringService } from "../../apps/api/src/scoring/scoring-service.js";
import { WatchlistService } from "../../apps/api/src/watchlist/watchlist-service.js";
import type {
  CreateWatchlistItemInput,
  CreateWatchlistItemResult,
  StoredWatchlistItem,
  WatchlistStore,
} from "../../apps/api/src/watchlist/watchlist-store.js";
import { WorkerJobProcessor } from "../../apps/api/src/worker/worker-job-processor.js";
import type { PortfolioStatus } from "@tax-lien/types";
import { InMemoryInternalJobStore } from "../support/in-memory-internal-job-store.js";

const testJwtSecret = "test-portfolio-secret-that-is-long-enough-for-jwt";

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

class InMemoryDatasetStore implements DatasetStore {
  private readonly datasetsById = new Map<string, StoredDataset>();

  public async createDataset(input: CreateDatasetInput): Promise<StoredDataset> {
    const now = new Date();
    const dataset: StoredDataset = {
      id: new mongoose.Types.ObjectId().toString(),
      userId: input.userId,
      originalFilename: input.originalFilename,
      sourceType: input.sourceType,
      status: input.status,
      rowCount: input.rowCount,
      columnCount: input.columnCount,
      headers: input.headers,
      sourceRows: input.sourceRows,
      validationSummary: input.validationSummary,
      ...(input.importSummary ? { importSummary: input.importSummary } : {}),
      ...(input.readinessSummary ? { readinessSummary: input.readinessSummary } : {}),
      ...(input.manualMapping ? { manualMapping: input.manualMapping } : {}),
      ...(input.importProfile ? { importProfile: input.importProfile } : {}),
      uploadedAt: input.uploadedAt,
      createdAt: now,
      updatedAt: now,
    };

    if (input.sourceLabel) {
      dataset.sourceLabel = input.sourceLabel;
    }

    this.datasetsById.set(dataset.id, dataset);
    return dataset;
  }

  public async updateManualMappingForUser(input: {
    datasetId: string;
    userId: string;
    manualMapping: NonNullable<StoredDataset["manualMapping"]>;
    readinessSummary: NonNullable<StoredDataset["readinessSummary"]>;
    importProfile?: NonNullable<StoredDataset["importProfile"]>;
  }): Promise<StoredDataset | null> {
    const dataset = this.datasetsById.get(input.datasetId);
    if (!dataset || dataset.userId !== input.userId) {
      return null;
    }

    const updatedDataset: StoredDataset = {
      ...dataset,
      manualMapping: input.manualMapping,
      readinessSummary: input.readinessSummary,
      ...(input.importProfile ? { importProfile: input.importProfile } : {}),
      updatedAt: new Date(),
    };

    this.datasetsById.set(updatedDataset.id, updatedDataset);
    return updatedDataset;
  }

  public async listDatasets(userId: string): Promise<StoredDataset[]> {
    return [...this.datasetsById.values()].filter((dataset) => dataset.userId === userId);
  }

  public async findDatasetByIdForUser(datasetId: string, userId: string): Promise<StoredDataset | null> {
    const dataset = this.datasetsById.get(datasetId);
    if (!dataset || dataset.userId !== userId) {
      return null;
    }

    return dataset;
  }
}

class InMemoryScoredRecordStore implements ScoredRecordStore {
  private readonly recordsByKey = new Map<string, StoredScoredRecord[]>();

  public async replaceScoresForDataset(
    userId: string,
    datasetId: string,
    records: CreateScoredRecordInput[],
  ): Promise<StoredScoredRecord[]> {
    const now = new Date();
    const currentRecords = this.recordsByKey.get(this.key(userId, datasetId)) ?? [];
    const storedRecords = records.map<StoredScoredRecord>((record) => {
      const existing = currentRecords.find((current) => current.sourceRowNumber === record.sourceRowNumber);
      return {
        id: existing?.id ?? new mongoose.Types.ObjectId().toString(),
        userId,
        datasetId,
        sourceRowNumber: record.sourceRowNumber,
        normalizedFields: record.normalizedFields,
        enrichment: record.enrichment,
        score: record.score,
        scoredAt: record.scoredAt,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
    });

    this.recordsByKey.set(this.key(userId, datasetId), storedRecords);
    return storedRecords;
  }

  public async listScoresForDataset(userId: string, datasetId: string): Promise<StoredScoredRecord[]> {
    return [...(this.recordsByKey.get(this.key(userId, datasetId)) ?? [])].sort(
      (left, right) => right.score.investmentScore - left.score.investmentScore,
    );
  }

  public async findScoreByIdForUser(scoredRecordId: string, userId: string): Promise<StoredScoredRecord | null> {
    return (
      [...this.recordsByKey.values()]
        .flat()
        .find((record) => record.id === scoredRecordId && record.userId === userId) ?? null
    );
  }

  public async listStaleDatasetSummaries(): Promise<StaleDatasetSummary[]> {
    return [];
  }

  private key(userId: string, datasetId: string): string {
    return `${userId}:${datasetId}`;
  }
}

class InMemoryWatchlistStore implements WatchlistStore {
  private readonly itemsById = new Map<string, StoredWatchlistItem>();

  public async createItem(input: CreateWatchlistItemInput): Promise<CreateWatchlistItemResult> {
    const existing = [...this.itemsById.values()].find(
      (item) => item.userId === input.userId && item.scoredRecordId === input.scoredRecordId,
    );

    if (existing) {
      return {
        item: existing,
        alreadyExists: true,
      };
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
    return {
      item,
      alreadyExists: false,
    };
  }

  public async listItemsForUser(userId: string): Promise<StoredWatchlistItem[]> {
    return [...this.itemsById.values()].filter((item) => item.userId === userId);
  }

  public async findItemByIdForUser(watchlistItemId: string, userId: string): Promise<StoredWatchlistItem | null> {
    const item = this.itemsById.get(watchlistItemId);
    if (!item || item.userId !== userId) {
      return null;
    }

    return item;
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
      return {
        item: existing,
        alreadyExists: true,
      };
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
    return {
      item,
      alreadyExists: false,
    };
  }

  public async listItemsForUser(userId: string): Promise<StoredPortfolioItem[]> {
    return [...this.itemsById.values()].filter((item) => item.userId === userId);
  }

  public async findItemByIdForUser(portfolioItemId: string, userId: string): Promise<StoredPortfolioItem | null> {
    const item = this.itemsById.get(portfolioItemId);
    if (!item || item.userId !== userId) {
      return null;
    }

    return item;
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

function createTestContext(): { app: ReturnType<typeof createApp>; workerProcessor: WorkerJobProcessor } {
  const userStore = new InMemoryUserStore();
  const datasetStore = new InMemoryDatasetStore();
  const scoredRecordStore = new InMemoryScoredRecordStore();
  const watchlistStore = new InMemoryWatchlistStore();
  const portfolioStore = new InMemoryPortfolioStore();
  const internalJobStore = new InMemoryInternalJobStore();
  const authService = new AuthService(userStore, {
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });
  const datasetService = new DatasetService(datasetStore);
  const internalJobService = new InternalJobService(internalJobStore);
  const scoringService = new ScoringService(datasetStore, scoredRecordStore, internalJobService);
  const watchlistService = new WatchlistService(watchlistStore, scoredRecordStore);
  const portfolioService = new PortfolioService(portfolioStore, scoredRecordStore, watchlistStore);
  const workerProcessor = new WorkerJobProcessor(internalJobService, scoringService);

  return {
    app: createApp({
      authService,
      datasetService,
      internalJobService,
      scoringService,
      watchlistService,
      portfolioService,
      workspaceService: createInMemoryWorkspaceService(userStore),
    }),
    workerProcessor,
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

async function createScoredRecord(
  app: ReturnType<typeof createApp>,
  workerProcessor: WorkerJobProcessor,
  token: string,
): Promise<string> {
  const uploadResponse = await request(app)
    .post("/datasets")
    .set("Authorization", `Bearer ${token}`)
    .attach(
      "file",
      Buffer.from("parcel_id,lien_amount,estimated_value,property_type\nA-100,1000,12000,Single-family residential\n", "utf8"),
      { filename: "county.csv", contentType: "text/csv" },
    )
    .expect(201);

  const datasetId = uploadResponse.body.dataset.id as string;
  await request(app)
    .post(`/datasets/${datasetId}/score`)
    .set("Authorization", `Bearer ${token}`)
    .expect(202);
  await workerProcessor.processNextJob();

  const scoresResponse = await request(app)
    .get(`/datasets/${datasetId}/scores`)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  return scoresResponse.body.scores[0].id as string;
}

async function addWatchlistItem(app: ReturnType<typeof createApp>, token: string, scoredRecordId: string): Promise<string> {
  const response = await request(app)
    .post("/watchlist")
    .set("Authorization", `Bearer ${token}`)
    .send({ scoredRecordId })
    .expect(201);

  return response.body.item.id as string;
}

describe("portfolio API", () => {
  it("adds a watchlist item to portfolio tracking", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const scoredRecordId = await createScoredRecord(app, workerProcessor, owner.token);
    const watchlistItemId = await addWatchlistItem(app, owner.token, scoredRecordId);

    const response = await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ watchlistItemId, status: "reviewing" })
      .expect(201);

    expect(response.body).toMatchObject({
      alreadyExists: false,
      item: {
        id: expect.any(String),
        scoredRecordId,
        sourceWatchlistItemId: watchlistItemId,
        status: "reviewing",
        statusUpdatedAt: expect.any(String),
        investmentScore: expect.any(Number),
        flags: expect.any(Array),
        reasoning: expect.any(Array),
      },
    });
    expect(JSON.stringify(response.body)).not.toContain(owner.userId);
  });

  it("adds a scored record directly and handles duplicates idempotently", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const scoredRecordId = await createScoredRecord(app, workerProcessor, owner.token);

    await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId })
      .expect(201);
    const duplicate = await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId, status: "ready" })
      .expect(200);
    const list = await request(app).get("/portfolio").set("Authorization", `Bearer ${owner.token}`).expect(200);

    expect(duplicate.body.alreadyExists).toBe(true);
    expect(duplicate.body.item.status).toBe("tracked");
    expect(list.body.items).toHaveLength(1);
  });

  it("lists and returns portfolio detail only for the current user", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const other = await registerUser(app, "other@example.com");
    const ownerScoreId = await createScoredRecord(app, workerProcessor, owner.token);
    const otherScoreId = await createScoredRecord(app, workerProcessor, other.token);

    const addResponse = await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: ownerScoreId })
      .expect(201);
    await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ scoredRecordId: otherScoreId })
      .expect(201);

    const listResponse = await request(app).get("/portfolio").set("Authorization", `Bearer ${owner.token}`).expect(200);
    const detailResponse = await request(app)
      .get(`/portfolio/${addResponse.body.item.id as string}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(listResponse.body.items).toHaveLength(1);
    expect(listResponse.body.items[0].scoredRecordId).toBe(ownerScoreId);
    expect(detailResponse.body.item.scoredRecordId).toBe(ownerScoreId);
  });

  it("updates portfolio status for the owner", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const scoredRecordId = await createScoredRecord(app, workerProcessor, owner.token);
    const addResponse = await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId })
      .expect(201);

    const response = await request(app)
      .patch(`/portfolio/${addResponse.body.item.id as string}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "ready" })
      .expect(200);

    expect(response.body.item.status).toBe("ready");
    expect(response.body.item.statusUpdatedAt).toEqual(expect.any(String));
  });

  it("returns an empty portfolio summary for the authenticated user", async () => {
    const { app } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");

    const response = await request(app).get("/portfolio/summary").set("Authorization", `Bearer ${owner.token}`).expect(200);

    expect(response.body).toMatchObject({
      totalTrackedItems: 0,
      activeItems: 0,
      readyItems: 0,
      acquiredItems: 0,
      recentAdditions: [],
      recentStatusChanges: [],
      needsAttention: [],
      generatedAt: expect.any(String),
    });
    expect(response.body.statusCounts).toEqual([
      { status: "tracked", count: 0, isActive: true },
      { status: "reviewing", count: 0, isActive: true },
      { status: "ready", count: 0, isActive: true },
      { status: "acquired", count: 0, isActive: true },
      { status: "closed", count: 0, isActive: false },
      { status: "discarded", count: 0, isActive: false },
    ]);
  });

  it("summarizes only the current user's portfolio status, activity, and attention signals", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const other = await registerUser(app, "other@example.com");
    const ownerFirstScoreId = await createScoredRecord(app, workerProcessor, owner.token);
    const ownerSecondScoreId = await createScoredRecord(app, workerProcessor, owner.token);
    const otherScoreId = await createScoredRecord(app, workerProcessor, other.token);

    const firstAdd = await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: ownerFirstScoreId })
      .expect(201);
    await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: ownerSecondScoreId, status: "ready" })
      .expect(201);
    await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ scoredRecordId: otherScoreId, status: "acquired" })
      .expect(201);

    await request(app)
      .patch(`/portfolio/${firstAdd.body.item.id as string}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "reviewing" })
      .expect(200);

    const response = await request(app).get("/portfolio/summary").set("Authorization", `Bearer ${owner.token}`).expect(200);
    const reviewingCount = response.body.statusCounts.find((count: { status: string }) => count.status === "reviewing");
    const readyCount = response.body.statusCounts.find((count: { status: string }) => count.status === "ready");
    const acquiredCount = response.body.statusCounts.find((count: { status: string }) => count.status === "acquired");

    expect(response.body).toMatchObject({
      totalTrackedItems: 2,
      activeItems: 2,
      readyItems: 1,
      acquiredItems: 0,
    });
    expect(reviewingCount).toMatchObject({ count: 1, isActive: true });
    expect(readyCount).toMatchObject({ count: 1, isActive: true });
    expect(acquiredCount).toMatchObject({ count: 0, isActive: true });
    expect(response.body.recentAdditions).toHaveLength(2);
    expect(response.body.recentAdditions[0]).toMatchObject({
      activityType: "added",
      item: {
        id: expect.any(String),
        scoredRecordId: expect.any(String),
        flagCount: expect.any(Number),
      },
    });
    expect(response.body.recentStatusChanges).toHaveLength(1);
    expect(response.body.recentStatusChanges[0]).toMatchObject({
      activityType: "status_changed",
      item: {
        id: firstAdd.body.item.id,
        status: "reviewing",
      },
    });
    expect(response.body.needsAttention).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item: expect.objectContaining({
            id: firstAdd.body.item.id,
            status: "reviewing",
          }),
          reasons: expect.arrayContaining([
            expect.objectContaining({
              code: "review_status",
            }),
          ]),
        }),
      ]),
    );
    expect(JSON.stringify(response.body)).not.toContain(other.userId);
    expect(JSON.stringify(response.body)).not.toContain(otherScoreId);
  });

  it("removes a portfolio item for the owner", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const scoredRecordId = await createScoredRecord(app, workerProcessor, owner.token);
    const addResponse = await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId })
      .expect(201);

    await request(app)
      .delete(`/portfolio/${addResponse.body.item.id as string}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);
    const list = await request(app).get("/portfolio").set("Authorization", `Bearer ${owner.token}`).expect(200);

    expect(list.body.items).toHaveLength(0);
  });

  it("rejects unauthenticated portfolio access", async () => {
    const { app } = createTestContext();

    await request(app).get("/portfolio").expect(401);
    await request(app).get("/portfolio/summary").expect(401);
    await request(app).post("/portfolio").send({ scoredRecordId: new mongoose.Types.ObjectId().toString() }).expect(401);
    await request(app).get(`/portfolio/${new mongoose.Types.ObjectId().toString()}`).expect(401);
    await request(app).patch(`/portfolio/${new mongoose.Types.ObjectId().toString()}`).send({ status: "ready" }).expect(401);
    await request(app).delete(`/portfolio/${new mongoose.Types.ObjectId().toString()}`).expect(401);
  });

  it("rejects cross-user portfolio access and source references", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const other = await registerUser(app, "other@example.com");
    const ownerScoreId = await createScoredRecord(app, workerProcessor, owner.token);
    const ownerWatchlistItemId = await addWatchlistItem(app, owner.token, ownerScoreId);
    const addResponse = await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ watchlistItemId: ownerWatchlistItemId })
      .expect(201);

    const crossAddScore = await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ scoredRecordId: ownerScoreId })
      .expect(404);
    const crossAddWatchlist = await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ watchlistItemId: ownerWatchlistItemId })
      .expect(404);
    const crossRead = await request(app)
      .get(`/portfolio/${addResponse.body.item.id as string}`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);
    const crossUpdate = await request(app)
      .patch(`/portfolio/${addResponse.body.item.id as string}`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ status: "closed" })
      .expect(404);
    const crossDelete = await request(app)
      .delete(`/portfolio/${addResponse.body.item.id as string}`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);

    expect(crossAddScore.body.error.code).toBe("portfolio_scored_record_not_found");
    expect(crossAddWatchlist.body.error.code).toBe("portfolio_watchlist_item_not_found");
    expect(crossRead.body.error.code).toBe("portfolio_item_not_found");
    expect(crossUpdate.body.error.code).toBe("portfolio_item_not_found");
    expect(crossDelete.body.error.code).toBe("portfolio_item_not_found");
  });

  it("rejects invalid ids, invalid statuses, and stale source references safely", async () => {
    const { app } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const missingId = new mongoose.Types.ObjectId().toString();

    const invalidScoredId = await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: "not-a-valid-id" })
      .expect(400);
    const invalidWatchlistId = await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ watchlistItemId: "not-a-valid-id" })
      .expect(400);
    const invalidSource = await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: missingId, watchlistItemId: missingId })
      .expect(400);
    const staleSource = await request(app)
      .post("/portfolio")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: missingId })
      .expect(404);
    const invalidStatus = await request(app)
      .patch(`/portfolio/${missingId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "auction-wizard" })
      .expect(400);
    const invalidItemId = await request(app)
      .delete("/portfolio/not-a-valid-id")
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(400);

    expect(invalidScoredId.body.error.code).toBe("portfolio_invalid_scored_record_id");
    expect(invalidWatchlistId.body.error.code).toBe("portfolio_invalid_watchlist_item_id");
    expect(invalidSource.body.error.code).toBe("portfolio_invalid_source");
    expect(staleSource.body.error.code).toBe("portfolio_scored_record_not_found");
    expect(invalidStatus.body.error.code).toBe("validation_failed");
    expect(invalidItemId.body.error.code).toBe("portfolio_invalid_item_id");
  });
});
