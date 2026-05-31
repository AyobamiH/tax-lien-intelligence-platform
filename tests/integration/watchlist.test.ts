import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import { createApp } from "../../apps/api/src/app.js";
import { DatasetService } from "../../apps/api/src/datasets/dataset-service.js";
import type {
  CreateDatasetInput,
  DatasetStore,
  StoredDataset,
} from "../../apps/api/src/datasets/dataset-store.js";
import { InternalJobService } from "../../apps/api/src/jobs/internal-job-service.js";
import type {
  CreateScoredRecordInput,
  ScoredRecordStore,
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
import { InMemoryInternalJobStore } from "../support/in-memory-internal-job-store.js";

const testJwtSecret = "test-watchlist-secret-that-is-long-enough-for-jwt";

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
    return [...this.itemsById.values()]
      .filter((item) => item.userId === userId)
      .sort((left, right) => {
        if (right.score.investmentScore !== left.score.investmentScore) {
          return right.score.investmentScore - left.score.investmentScore;
        }

        return left.score.riskScore - right.score.riskScore;
      });
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

function createTestContext(): { app: ReturnType<typeof createApp>; workerProcessor: WorkerJobProcessor } {
  const userStore = new InMemoryUserStore();
  const datasetStore = new InMemoryDatasetStore();
  const scoredRecordStore = new InMemoryScoredRecordStore();
  const watchlistStore = new InMemoryWatchlistStore();
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
  const workerProcessor = new WorkerJobProcessor(internalJobService, scoringService);

  return {
    app: createApp({ authService, datasetService, internalJobService, scoringService, watchlistService }),
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

describe("watchlist API", () => {
  it("adds a scored record to the authenticated user's watchlist", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const scoredRecordId = await createScoredRecord(app, workerProcessor, owner.token);

    const response = await request(app)
      .post("/watchlist")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId })
      .expect(201);

    expect(response.body).toMatchObject({
      alreadyExists: false,
      item: {
        id: expect.any(String),
        scoredRecordId,
        datasetId: expect.any(String),
        investmentScore: expect.any(Number),
        flags: expect.any(Array),
        reasoning: expect.any(Array),
      },
    });
    expect(JSON.stringify(response.body)).not.toContain(owner.userId);
  });

  it("handles duplicate adds idempotently without cluttering the watchlist", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const scoredRecordId = await createScoredRecord(app, workerProcessor, owner.token);

    await request(app).post("/watchlist").set("Authorization", `Bearer ${owner.token}`).send({ scoredRecordId }).expect(201);
    const duplicate = await request(app)
      .post("/watchlist")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId })
      .expect(200);
    const list = await request(app).get("/watchlist").set("Authorization", `Bearer ${owner.token}`).expect(200);

    expect(duplicate.body.alreadyExists).toBe(true);
    expect(list.body.items).toHaveLength(1);
  });

  it("lists only the current user's watchlist items", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const other = await registerUser(app, "other@example.com");
    const ownerScoreId = await createScoredRecord(app, workerProcessor, owner.token);
    const otherScoreId = await createScoredRecord(app, workerProcessor, other.token);

    await request(app)
      .post("/watchlist")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: ownerScoreId })
      .expect(201);
    await request(app)
      .post("/watchlist")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ scoredRecordId: otherScoreId })
      .expect(201);

    const response = await request(app).get("/watchlist").set("Authorization", `Bearer ${owner.token}`).expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].scoredRecordId).toBe(ownerScoreId);
  });

  it("removes a watchlist item for the owner", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const scoredRecordId = await createScoredRecord(app, workerProcessor, owner.token);
    const addResponse = await request(app)
      .post("/watchlist")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId })
      .expect(201);

    const watchlistItemId = addResponse.body.item.id as string;
    await request(app).delete(`/watchlist/${watchlistItemId}`).set("Authorization", `Bearer ${owner.token}`).expect(200);

    const list = await request(app).get("/watchlist").set("Authorization", `Bearer ${owner.token}`).expect(200);
    expect(list.body.items).toHaveLength(0);
  });

  it("rejects unauthenticated watchlist access", async () => {
    const { app } = createTestContext();

    await request(app).get("/watchlist").expect(401);
    await request(app).post("/watchlist").send({ scoredRecordId: new mongoose.Types.ObjectId().toString() }).expect(401);
    await request(app).delete(`/watchlist/${new mongoose.Types.ObjectId().toString()}`).expect(401);
  });

  it("rejects cross-user add and delete attempts", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const other = await registerUser(app, "other@example.com");
    const ownerScoreId = await createScoredRecord(app, workerProcessor, owner.token);
    const addResponse = await request(app)
      .post("/watchlist")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: ownerScoreId })
      .expect(201);

    const crossAdd = await request(app)
      .post("/watchlist")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ scoredRecordId: ownerScoreId })
      .expect(404);
    const crossDelete = await request(app)
      .delete(`/watchlist/${addResponse.body.item.id as string}`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);

    expect(crossAdd.body.error.code).toBe("watchlist_scored_record_not_found");
    expect(crossDelete.body.error.code).toBe("watchlist_item_not_found");
  });

  it("rejects invalid ids safely", async () => {
    const { app } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");

    const addResponse = await request(app)
      .post("/watchlist")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ scoredRecordId: "not-a-valid-id" })
      .expect(400);
    const deleteResponse = await request(app)
      .delete("/watchlist/not-a-valid-id")
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(400);

    expect(addResponse.body.error.code).toBe("watchlist_invalid_scored_record_id");
    expect(deleteResponse.body.error.code).toBe("watchlist_invalid_item_id");
  });
});
