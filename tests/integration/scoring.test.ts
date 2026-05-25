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
import { ScoringService } from "../../apps/api/src/scoring/scoring-service.js";
import type {
  CreateScoredRecordInput,
  ScoredRecordStore,
  StoredScoredRecord,
} from "../../apps/api/src/scoring/scored-record-store.js";

const testJwtSecret = "test-scoring-secret-that-is-long-enough-for-jwt";

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
    const storedRecords = records.map<StoredScoredRecord>((record) => ({
      id: new mongoose.Types.ObjectId().toString(),
      userId,
      datasetId,
      sourceRowNumber: record.sourceRowNumber,
      normalizedFields: record.normalizedFields,
      score: record.score,
      scoredAt: record.scoredAt,
      createdAt: now,
      updatedAt: now,
    }));

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

function createTestContext(): {
  app: ReturnType<typeof createApp>;
  datasetStore: InMemoryDatasetStore;
  scoredRecordStore: InMemoryScoredRecordStore;
} {
  const userStore = new InMemoryUserStore();
  const datasetStore = new InMemoryDatasetStore();
  const scoredRecordStore = new InMemoryScoredRecordStore();
  const authService = new AuthService(userStore, {
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });
  const datasetService = new DatasetService(datasetStore);
  const scoringService = new ScoringService(datasetStore, scoredRecordStore);

  return {
    app: createApp({ authService, datasetService, scoringService }),
    datasetStore,
    scoredRecordStore,
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

async function uploadDataset(app: ReturnType<typeof createApp>, token: string, csv: string): Promise<string> {
  const response = await request(app)
    .post("/datasets")
    .set("Authorization", `Bearer ${token}`)
    .attach("file", Buffer.from(csv, "utf8"), { filename: "county.csv", contentType: "text/csv" })
    .expect(201);

  return response.body.dataset.id as string;
}

describe("dataset scoring API", () => {
  it("scores an authenticated user's dataset and returns explainable results", async () => {
    const { app } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value,property_type\nA-100,1000,12000,Single-family residential\nL-200,750,9000,Vacant land\n",
    );

    const response = await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      datasetId,
      scoredRecordCount: 2,
      scores: expect.any(Array),
    });
    expect(response.body.scores[0]).toMatchObject({
      id: expect.any(String),
      datasetId,
      sourceRowNumber: expect.any(Number),
      investmentScore: expect.any(Number),
      riskScore: expect.any(Number),
      liquidityScore: expect.any(Number),
      redemptionProbability: expect.any(Number),
      confidenceScore: expect.any(Number),
      flags: expect.any(Array),
      reasoning: expect.any(Array),
    });
    expect(response.body.scores[0].reasoning.length).toBeGreaterThan(0);
  });

  it("retrieves scored results for the dataset owner", async () => {
    const { app } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value,property_type\nA-100,1000,12000,Single-family residential\n",
    );

    await request(app).post(`/datasets/${datasetId}/score`).set("Authorization", `Bearer ${owner.token}`).expect(200);

    const response = await request(app)
      .get(`/datasets/${datasetId}/scores`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(response.body.datasetId).toBe(datasetId);
    expect(response.body.scores).toHaveLength(1);
    expect(response.body.scores[0].normalizedFields).toMatchObject({
      parcelId: "A-100",
      lienAmount: 1000,
      estimatedValue: 12000,
      propertyTypeCategory: "residential",
    });
  });

  it("rejects scoring without authentication", async () => {
    const { app } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value\nA-100,1000,12000\n",
    );

    const response = await request(app).post(`/datasets/${datasetId}/score`).expect(401);

    expect(response.body.error.code).toBe("auth_missing_token");
  });

  it("blocks cross-user scoring and score retrieval", async () => {
    const { app } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const other = await registerUser(app, "other@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value\nA-100,1000,12000\n",
    );

    const scoreResponse = await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);
    const readResponse = await request(app)
      .get(`/datasets/${datasetId}/scores`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);

    expect(scoreResponse.body.error.code).toBe("dataset_not_found");
    expect(readResponse.body.error.code).toBe("dataset_not_found");
  });

  it("handles malformed or partial records conservatively", async () => {
    const { app } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(app, owner.token, "parcel_id,property_type\nA-100,Unknown county code\n");

    const response = await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    const score = response.body.scores[0];
    expect(score.investmentScore).toBeLessThanOrEqual(35);
    expect(score.confidenceScore).toBeLessThan(70);
    expect(score.flags).toContain("Missing or invalid lien amount");
    expect(score.flags).toContain("Missing or invalid property value");
    expect(score.reasoning.join(" ")).toContain("Normalization warning");
  });

  it("rejects invalid dataset ids safely", async () => {
    const { app } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");

    const response = await request(app)
      .post("/datasets/not-a-valid-id/score")
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(400);

    expect(response.body.error.code).toBe("dataset_invalid_id");
  });

  it("fails safely when a stored dataset has no scoreable source rows", async () => {
    const { app, datasetStore } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const dataset = await datasetStore.createDataset({
      userId: owner.userId,
      originalFilename: "empty-derived.csv",
      sourceType: "manual_csv",
      status: "validated",
      rowCount: 0,
      columnCount: 0,
      headers: [],
      sourceRows: [],
      validationSummary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        warnings: [],
        errors: [],
      },
      uploadedAt: new Date(),
    });

    const response = await request(app)
      .post(`/datasets/${dataset.id}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(400);

    expect(response.body.error.code).toBe("score_no_source_rows");
  });
});
