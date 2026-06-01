import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import { DatasetService } from "../../apps/api/src/datasets/dataset-service.js";
import type {
  CreateDatasetInput,
  DatasetStore,
  StoredDataset,
} from "../../apps/api/src/datasets/dataset-store.js";
import { maxDatasetUploadBytes } from "../../apps/api/src/datasets/csv-parser.js";
import { createApp } from "../../apps/api/src/app.js";

const testJwtSecret = "test-dataset-secret-that-is-long-enough-for-jwt";

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
    return [...this.datasetsById.values()]
      .filter((dataset) => dataset.userId === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  public async findDatasetByIdForUser(datasetId: string, userId: string): Promise<StoredDataset | null> {
    const dataset = this.datasetsById.get(datasetId);
    if (!dataset || dataset.userId !== userId) {
      return null;
    }

    return dataset;
  }
}

function createTestContext(): { app: ReturnType<typeof createApp>; datasetStore: InMemoryDatasetStore } {
  const userStore = new InMemoryUserStore();
  const datasetStore = new InMemoryDatasetStore();
  const authService = new AuthService(userStore, {
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });
  const datasetService = new DatasetService(datasetStore);

  return {
    app: createApp({ authService, datasetService }),
    datasetStore,
  };
}

async function registerUser(app: ReturnType<typeof createApp>, email: string): Promise<string> {
  const response = await request(app).post("/auth/register").send({
    email,
    password: "StrongPass123",
  });

  return response.body.token as string;
}

function validCsv(): Buffer {
  return Buffer.from("parcel_id,lien_amount,estimated_value\nA-100,1000,10000\nA-101,500,9000\n", "utf8");
}

function maricopaCsv(): Buffer {
  return Buffer.from(
    [
      "APN,Total Due,Full Cash Value,Property Use Description,Situs Street,Situs City,Situs State,Situs Zip",
      "123-45-678,$1250,$85000,Single Family Residence,100 Main St,Phoenix,AZ,85001",
    ].join("\n"),
    "utf8",
  );
}

describe("dataset API", () => {
  it("uploads and validates a CSV dataset for an authenticated user", async () => {
    const { app } = createTestContext();
    const token = await registerUser(app, "owner@example.com");

    const response = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${token}`)
      .field("sourceLabel", "County May file")
      .attach("file", validCsv(), { filename: "county.csv", contentType: "text/csv" })
      .expect(201);

    expect(response.body).toMatchObject({
      dataset: {
        id: expect.any(String),
        originalFilename: "county.csv",
        sourceType: "manual_csv",
        sourceLabel: "County May file",
        status: "validated",
        rowCount: 2,
        columnCount: 3,
        headers: ["parcel_id", "lien_amount", "estimated_value"],
        validationSummary: {
          totalRows: 2,
          validRows: 2,
          invalidRows: 0,
          warnings: [],
          errors: [],
        },
        importSummary: {
          adapterMatched: false,
          adapterId: "generic_csv",
          adapterName: "Generic CSV normalization",
          source: "generic_csv",
          confidence: "low",
          fallbackUsed: true,
          mappedFields: [],
          warnings: [],
        },
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("A-100");
  });

  it("detects a Maricopa-style dataset and returns safe import summary metadata", async () => {
    const { app } = createTestContext();
    const token = await registerUser(app, "owner@example.com");

    const response = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", maricopaCsv(), { filename: "maricopa-tax-liens.csv", contentType: "text/csv" })
      .expect(201);

    expect(response.body.dataset).toMatchObject({
      originalFilename: "maricopa-tax-liens.csv",
      importSummary: {
        adapterMatched: true,
        adapterId: "maricopa_tax_lien_v1",
        adapterName: "Maricopa-style tax lien CSV",
        source: "county_adapter",
        confidence: "high",
        fallbackUsed: false,
        mappedFields: ["parcel_id", "lien_amount", "estimated_value", "property_type", "address"],
        warnings: [],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("100 Main St");
  });

  it("rejects dataset upload without authentication", async () => {
    const { app } = createTestContext();

    const response = await request(app)
      .post("/datasets")
      .attach("file", validCsv(), { filename: "county.csv", contentType: "text/csv" })
      .expect(401);

    expect(response.body.error.code).toBe("auth_missing_token");
  });

  it("rejects missing CSV files", async () => {
    const { app } = createTestContext();
    const token = await registerUser(app, "owner@example.com");

    const response = await request(app).post("/datasets").set("Authorization", `Bearer ${token}`).expect(400);

    expect(response.body).toEqual({
      error: {
        code: "dataset_file_required",
        message: "CSV file is required.",
      },
    });
  });

  it("handles malformed CSV safely", async () => {
    const { app } = createTestContext();
    const token = await registerUser(app, "owner@example.com");

    const response = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("parcel_id,lien_amount\nA-100\n", "utf8"), {
        filename: "bad.csv",
        contentType: "text/csv",
      })
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "dataset_malformed_csv",
        message: "Uploaded CSV could not be parsed safely.",
      },
    });
  });

  it("rejects empty CSV files", async () => {
    const { app } = createTestContext();
    const token = await registerUser(app, "owner@example.com");

    const response = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("", "utf8"), { filename: "empty.csv", contentType: "text/csv" })
      .expect(400);

    expect(response.body.error.code).toBe("dataset_empty_csv");
  });

  it("rejects oversized CSV files", async () => {
    const { app } = createTestContext();
    const token = await registerUser(app, "owner@example.com");
    const oversizedCsv = Buffer.concat([
      Buffer.from("parcel_id\n", "utf8"),
      Buffer.alloc(maxDatasetUploadBytes + 1, "a"),
    ]);

    const response = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", oversizedCsv, { filename: "too-large.csv", contentType: "text/csv" })
      .expect(413);

    expect(response.body.error.code).toBe("dataset_upload_too_large");
  });

  it("lists only datasets owned by the authenticated user", async () => {
    const { app } = createTestContext();
    const ownerToken = await registerUser(app, "owner@example.com");
    const otherToken = await registerUser(app, "other@example.com");

    await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${ownerToken}`)
      .attach("file", validCsv(), { filename: "owner.csv", contentType: "text/csv" })
      .expect(201);
    await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${otherToken}`)
      .attach("file", validCsv(), { filename: "other.csv", contentType: "text/csv" })
      .expect(201);

    const response = await request(app).get("/datasets").set("Authorization", `Bearer ${ownerToken}`).expect(200);

    expect(response.body.datasets).toHaveLength(1);
    expect(response.body.datasets[0].originalFilename).toBe("owner.csv");
  });

  it("returns dataset detail only for the owner", async () => {
    const { app } = createTestContext();
    const ownerToken = await registerUser(app, "owner@example.com");
    const otherToken = await registerUser(app, "other@example.com");

    const uploadResponse = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${ownerToken}`)
      .attach("file", validCsv(), { filename: "owner.csv", contentType: "text/csv" })
      .expect(201);

    const datasetId = uploadResponse.body.dataset.id as string;

    await request(app).get(`/datasets/${datasetId}`).set("Authorization", `Bearer ${ownerToken}`).expect(200);

    const crossUserResponse = await request(app)
      .get(`/datasets/${datasetId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(404);

    expect(crossUserResponse.body.error.code).toBe("dataset_not_found");
  });

  it("rejects invalid dataset ids safely", async () => {
    const { app } = createTestContext();
    const token = await registerUser(app, "owner@example.com");

    const response = await request(app).get("/datasets/not-a-valid-id").set("Authorization", `Bearer ${token}`).expect(400);

    expect(response.body).toEqual({
      error: {
        code: "dataset_invalid_id",
        message: "Dataset id is invalid.",
      },
    });
  });
});
