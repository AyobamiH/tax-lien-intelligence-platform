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
import type {
  CreateImportProfileInput,
  ImportProfileStore,
  StoredImportProfile,
} from "../../apps/api/src/datasets/import-profile-store.js";
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

class InMemoryImportProfileStore implements ImportProfileStore {
  private readonly profilesById = new Map<string, StoredImportProfile>();

  public async createProfile(input: CreateImportProfileInput): Promise<StoredImportProfile> {
    const now = new Date();
    const profile: StoredImportProfile = {
      id: new mongoose.Types.ObjectId().toString(),
      userId: input.userId,
      name: input.name,
      ...(input.sourceLabel ? { sourceLabel: input.sourceLabel } : {}),
      adapterId: input.adapterId,
      adapterName: input.adapterName,
      mappings: input.mappings,
      applicability: input.applicability,
      ...(input.createdFromDatasetId ? { createdFromDatasetId: input.createdFromDatasetId } : {}),
      createdAt: now,
      updatedAt: now,
    };

    this.profilesById.set(profile.id, profile);
    return profile;
  }

  public async listProfiles(userId: string): Promise<StoredImportProfile[]> {
    return [...this.profilesById.values()]
      .filter((profile) => profile.userId === userId)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  }

  public async findProfileByIdForUser(profileId: string, userId: string): Promise<StoredImportProfile | null> {
    const profile = this.profilesById.get(profileId);
    if (!profile || profile.userId !== userId) {
      return null;
    }

    return profile;
  }
}

function createTestContext(): {
  app: ReturnType<typeof createApp>;
  datasetStore: InMemoryDatasetStore;
  importProfileStore: InMemoryImportProfileStore;
} {
  const userStore = new InMemoryUserStore();
  const datasetStore = new InMemoryDatasetStore();
  const importProfileStore = new InMemoryImportProfileStore();
  const authService = new AuthService(userStore, {
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });
  const datasetService = new DatasetService(datasetStore, importProfileStore);

  return {
    app: createApp({ authService, datasetService }),
    datasetStore,
    importProfileStore,
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

function repairableCsv(): Buffer {
  return Buffer.from(
    "Property Number,Tax Balance,County Value,Use Description,Site Address\nA-100,1000,12000,Single Family,100 Main St\n",
    "utf8",
  );
}

function repairableWideCsv(): Buffer {
  return Buffer.from(
    [
      "Property Number,Tax Balance,County Value,Use Description,Site Address,Auction Batch",
      "A-100,1000,12000,Single Family,100 Main St,June",
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
        readinessSummary: {
          status: "partial",
          score: 65,
          scoringRecommended: true,
          issues: expect.arrayContaining([
            expect.objectContaining({ code: "generic_fallback_used", severity: "info" }),
            expect.objectContaining({ code: "missing_property_type", severity: "warning" }),
            expect.objectContaining({ code: "weak_address_context", severity: "info" }),
          ]),
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
      readinessSummary: {
        status: "ready",
        score: 100,
        scoringRecommended: true,
        issues: [],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("100 Main St");
  });

  it("returns blocked readiness when upload lacks required value fields", async () => {
    const { app } = createTestContext();
    const token = await registerUser(app, "owner@example.com");

    const response = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("parcel_id,lien_amount\nA-100,1000\n", "utf8"), {
        filename: "missing-value.csv",
        contentType: "text/csv",
      })
      .expect(201);

    expect(response.body.dataset.readinessSummary).toMatchObject({
      status: "blocked",
      scoringRecommended: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "missing_estimated_value",
          severity: "error",
          field: "estimated_value",
        }),
      ]),
    });
  });

  it("saves manual mappings and re-evaluates readiness without exposing source row values", async () => {
    const { app } = createTestContext();
    const token = await registerUser(app, "owner@example.com");

    const uploadResponse = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", repairableCsv(), {
        filename: "repairable.csv",
        contentType: "text/csv",
      })
      .expect(201);

    const datasetId = uploadResponse.body.dataset.id as string;
    expect(uploadResponse.body.dataset.readinessSummary.status).toBe("blocked");

    const contextResponse = await request(app)
      .get(`/datasets/${datasetId}/mapping`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(contextResponse.body.availableColumns).toEqual([
      "Property Number",
      "Tax Balance",
      "County Value",
      "Use Description",
      "Site Address",
    ]);
    expect(contextResponse.body.manualMapping).toEqual({ mappings: [] });

    const saveResponse = await request(app)
      .patch(`/datasets/${datasetId}/mapping`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        mappings: {
          parcel_id: "Property Number",
          lien_amount: "Tax Balance",
          estimated_value: "County Value",
          property_type: "Use Description",
          address: "Site Address",
        },
      })
      .expect(200);

    expect(saveResponse.body.dataset.readinessSummary).toMatchObject({
      status: "ready",
      scoringRecommended: true,
    });
    expect(saveResponse.body.manualMapping.mappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetField: "lien_amount",
          sourceColumn: "Tax Balance",
          source: "manual",
          updatedAt: expect.any(String),
        }),
        expect.objectContaining({
          targetField: "estimated_value",
          sourceColumn: "County Value",
          source: "manual",
          updatedAt: expect.any(String),
        }),
      ]),
    );
    expect(JSON.stringify(saveResponse.body)).not.toContain("100 Main St");
    expect(JSON.stringify(saveResponse.body)).not.toContain("Single Family");
  });

  it("rejects unsafe manual mapping payloads", async () => {
    const { app } = createTestContext();
    const token = await registerUser(app, "owner@example.com");

    const uploadResponse = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", repairableCsv(), {
        filename: "repairable.csv",
        contentType: "text/csv",
      })
      .expect(201);

    const datasetId = uploadResponse.body.dataset.id as string;

    const invalidTargetResponse = await request(app)
      .patch(`/datasets/${datasetId}/mapping`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mappings: { fake_field: "Tax Balance" } })
      .expect(400);
    expect(invalidTargetResponse.body.error.code).toBe("manual_mapping_invalid_target");

    const invalidColumnResponse = await request(app)
      .patch(`/datasets/${datasetId}/mapping`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mappings: { lien_amount: "Missing Column" } })
      .expect(400);
    expect(invalidColumnResponse.body.error.code).toBe("manual_mapping_invalid_source_column");

    const duplicateColumnResponse = await request(app)
      .patch(`/datasets/${datasetId}/mapping`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mappings: { lien_amount: "Tax Balance", estimated_value: "Tax Balance" } })
      .expect(400);
    expect(duplicateColumnResponse.body.error.code).toBe("manual_mapping_duplicate_source_column");
  });

  it("keeps manual mappings scoped to the dataset owner", async () => {
    const { app } = createTestContext();
    const ownerToken = await registerUser(app, "owner@example.com");
    const otherToken = await registerUser(app, "other@example.com");

    const uploadResponse = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${ownerToken}`)
      .attach("file", repairableCsv(), {
        filename: "repairable.csv",
        contentType: "text/csv",
      })
      .expect(201);

    const datasetId = uploadResponse.body.dataset.id as string;

    const getResponse = await request(app)
      .get(`/datasets/${datasetId}/mapping`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(404);
    expect(getResponse.body.error.code).toBe("dataset_not_found");

    const patchResponse = await request(app)
      .patch(`/datasets/${datasetId}/mapping`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ mappings: { lien_amount: "Tax Balance" } })
      .expect(404);
    expect(patchResponse.body.error.code).toBe("dataset_not_found");
  });

  it("saves reusable import profiles and auto-applies exact matching future uploads", async () => {
    const { app } = createTestContext();
    const token = await registerUser(app, "owner@example.com");

    const firstUpload = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${token}`)
      .field("sourceLabel", "County repeat sale")
      .attach("file", repairableCsv(), {
        filename: "repairable.csv",
        contentType: "text/csv",
      })
      .expect(201);

    const firstDatasetId = firstUpload.body.dataset.id as string;
    await request(app)
      .patch(`/datasets/${firstDatasetId}/mapping`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        mappings: {
          parcel_id: "Property Number",
          lien_amount: "Tax Balance",
          estimated_value: "County Value",
          property_type: "Use Description",
          address: "Site Address",
        },
      })
      .expect(200);

    const profileResponse = await request(app)
      .post(`/datasets/${firstDatasetId}/import-profile`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "County repeat import" })
      .expect(201);

    expect(profileResponse.body.profile).toMatchObject({
      name: "County repeat import",
      sourceLabel: "County repeat sale",
      mappings: expect.arrayContaining([
        { targetField: "lien_amount", sourceColumn: "Tax Balance" },
        { targetField: "estimated_value", sourceColumn: "County Value" },
      ]),
      applicability: {
        sourceColumns: ["county value", "property number", "site address", "tax balance", "use description"],
      },
    });

    const listResponse = await request(app).get("/datasets/import-profiles").set("Authorization", `Bearer ${token}`).expect(200);
    expect(listResponse.body.profiles).toHaveLength(1);

    const secondUpload = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", repairableCsv(), {
        filename: "repeat.csv",
        contentType: "text/csv",
      })
      .expect(201);

    expect(secondUpload.body.dataset.importProfile).toMatchObject({
      status: "auto_applied",
      profileId: profileResponse.body.profile.id,
      profileName: "County repeat import",
      confidence: "high",
      matchedMappings: 5,
      totalMappings: 5,
      appliedAt: expect.any(String),
    });
    expect(secondUpload.body.dataset.manualMapping.mappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetField: "lien_amount",
          sourceColumn: "Tax Balance",
          source: "import_profile",
        }),
      ]),
    );
    expect(secondUpload.body.dataset.readinessSummary).toMatchObject({
      status: "ready",
      scoringRecommended: true,
    });
  });

  it("suggests compatible profiles for changed header shapes and applies only after confirmation", async () => {
    const { app } = createTestContext();
    const token = await registerUser(app, "owner@example.com");

    const firstUpload = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", repairableWideCsv(), {
        filename: "wide.csv",
        contentType: "text/csv",
      })
      .expect(201);

    const firstDatasetId = firstUpload.body.dataset.id as string;
    await request(app)
      .patch(`/datasets/${firstDatasetId}/mapping`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        mappings: {
          parcel_id: "Property Number",
          lien_amount: "Tax Balance",
          estimated_value: "County Value",
          property_type: "Use Description",
          address: "Site Address",
        },
      })
      .expect(200);

    const profileResponse = await request(app)
      .post(`/datasets/${firstDatasetId}/import-profile`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Wide county import" })
      .expect(201);

    const secondUpload = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", repairableCsv(), {
        filename: "narrow.csv",
        contentType: "text/csv",
      })
      .expect(201);

    const secondDatasetId = secondUpload.body.dataset.id as string;
    expect(secondUpload.body.dataset.importProfile).toMatchObject({
      status: "suggested",
      profileId: profileResponse.body.profile.id,
      confidence: "medium",
      matchedMappings: 5,
      totalMappings: 5,
    });
    expect(secondUpload.body.dataset.manualMapping.mappings).toEqual([]);
    expect(secondUpload.body.dataset.readinessSummary.status).toBe("blocked");

    const applyResponse = await request(app)
      .post(`/datasets/${secondDatasetId}/import-profile/apply`)
      .set("Authorization", `Bearer ${token}`)
      .send({ profileId: profileResponse.body.profile.id })
      .expect(200);

    expect(applyResponse.body.dataset.importProfile).toMatchObject({
      status: "user_applied",
      profileId: profileResponse.body.profile.id,
      confidence: "medium",
      appliedAt: expect.any(String),
    });
    expect(applyResponse.body.dataset.readinessSummary.status).toBe("ready");
  });

  it("keeps import profiles tenant-owned and avoids false-positive reuse", async () => {
    const { app } = createTestContext();
    const ownerToken = await registerUser(app, "owner@example.com");
    const otherToken = await registerUser(app, "other@example.com");

    const uploadResponse = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${ownerToken}`)
      .attach("file", repairableCsv(), {
        filename: "repairable.csv",
        contentType: "text/csv",
      })
      .expect(201);

    const datasetId = uploadResponse.body.dataset.id as string;
    await request(app)
      .patch(`/datasets/${datasetId}/mapping`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        mappings: {
          parcel_id: "Property Number",
          lien_amount: "Tax Balance",
          estimated_value: "County Value",
        },
      })
      .expect(200);

    const profileResponse = await request(app)
      .post(`/datasets/${datasetId}/import-profile`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Owner-only profile" })
      .expect(201);

    const otherProfileList = await request(app)
      .get("/datasets/import-profiles")
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(200);
    expect(otherProfileList.body.profiles).toEqual([]);

    const otherUpload = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${otherToken}`)
      .attach("file", repairableCsv(), {
        filename: "other.csv",
        contentType: "text/csv",
      })
      .expect(201);

    expect(otherUpload.body.dataset.importProfile.status).toBe("none");

    const applyResponse = await request(app)
      .post(`/datasets/${otherUpload.body.dataset.id as string}/import-profile/apply`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ profileId: profileResponse.body.profile.id })
      .expect(404);
    expect(applyResponse.body.error.code).toBe("import_profile_not_found");

    const falsePositiveUpload = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${ownerToken}`)
      .attach("file", Buffer.from("Property Number,Tax Balance,Assessed Total\nA-100,1000,12000\n", "utf8"), {
        filename: "changed-value-header.csv",
        contentType: "text/csv",
      })
      .expect(201);
    expect(falsePositiveUpload.body.dataset.importProfile.status).toBe("none");
  });

  it("rejects import profile creation before a mapping is scoring-ready", async () => {
    const { app } = createTestContext();
    const token = await registerUser(app, "owner@example.com");

    const uploadResponse = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", repairableCsv(), {
        filename: "repairable.csv",
        contentType: "text/csv",
      })
      .expect(201);

    const datasetId = uploadResponse.body.dataset.id as string;

    const noMappingResponse = await request(app)
      .post(`/datasets/${datasetId}/import-profile`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Too early" })
      .expect(400);
    expect(noMappingResponse.body.error.code).toBe("import_profile_no_mapping");

    await request(app)
      .patch(`/datasets/${datasetId}/mapping`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mappings: { lien_amount: "Tax Balance" } })
      .expect(200);

    const notReadyResponse = await request(app)
      .post(`/datasets/${datasetId}/import-profile`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Still blocked" })
      .expect(400);
    expect(notReadyResponse.body.error.code).toBe("import_profile_not_ready");
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
