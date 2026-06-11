import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AlertService } from "../../apps/api/src/alerts/alert-service.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import { createApp } from "../../apps/api/src/app.js";
import { createInMemoryWorkspaceService } from "../support/in-memory-workspace-store.js";
import { createInMemoryWorkspaceActivityService } from "../support/in-memory-workspace-activity-store.js";
import { DatasetService } from "../../apps/api/src/datasets/dataset-service.js";
import type {
  CreateDatasetInput,
  DatasetStore,
  StoredDataset,
} from "../../apps/api/src/datasets/dataset-store.js";
import { CensusGeocoderAddressAdapter } from "../../apps/api/src/enrichment/census-geocoder-adapter.js";
import type { CensusGeocoderClient } from "../../apps/api/src/enrichment/census-geocoder-client.js";
import { EnrichmentService } from "../../apps/api/src/enrichment/enrichment-service.js";
import { SourceFieldInferenceAdapter } from "../../apps/api/src/enrichment/source-field-inference-adapter.js";
import { InternalJobService } from "../../apps/api/src/jobs/internal-job-service.js";
import { createMaintenancePolicy, type MaintenancePolicy } from "../../apps/api/src/maintenance/maintenance-policy.js";
import { MaintenanceService } from "../../apps/api/src/maintenance/maintenance-service.js";
import { ScoringService } from "../../apps/api/src/scoring/scoring-service.js";
import { WorkerJobProcessor } from "../../apps/api/src/worker/worker-job-processor.js";
import type {
  CreateScoredRecordInput,
  ScoredRecordStore,
  StaleDatasetSummary,
  StoredScoredRecord,
} from "../../apps/api/src/scoring/scored-record-store.js";
import { InMemoryAlertStore } from "../support/in-memory-alert-store.js";
import { InMemoryInternalJobStore } from "../support/in-memory-internal-job-store.js";

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
    const storedRecords = records.map<StoredScoredRecord>((record) => ({
      id: new mongoose.Types.ObjectId().toString(),
      userId,
      datasetId,
      sourceRowNumber: record.sourceRowNumber,
      normalizedFields: record.normalizedFields,
      enrichment: record.enrichment,
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

  public async listStaleDatasetSummaries(now: Date, limit: number): Promise<StaleDatasetSummary[]> {
    const summaries = new Map<string, StaleDatasetSummary>();

    for (const record of [...this.recordsByKey.values()].flat()) {
      const reprocessAfter = record.enrichment?.freshness.reprocessAfter;
      const reprocessTime = reprocessAfter ? Date.parse(reprocessAfter) : Number.NaN;
      const isStale =
        record.enrichment?.freshness.reprocessEligible ||
        (Number.isFinite(reprocessTime) && reprocessTime <= now.getTime());

      if (!isStale) {
        continue;
      }

      const summaryKey = this.key(record.userId, record.datasetId);
      const current = summaries.get(summaryKey);
      summaries.set(summaryKey, {
        userId: record.userId,
        datasetId: record.datasetId,
        staleRecordCount: (current?.staleRecordCount ?? 0) + 1,
        earliestReprocessAfter:
          current?.earliestReprocessAfter && reprocessAfter
            ? current.earliestReprocessAfter < reprocessAfter
              ? current.earliestReprocessAfter
              : reprocessAfter
            : (current?.earliestReprocessAfter ?? reprocessAfter),
        latestScoredAt:
          current?.latestScoredAt && current.latestScoredAt > record.scoredAt ? current.latestScoredAt : record.scoredAt,
      });
    }

    return [...summaries.values()].slice(0, Math.max(0, limit));
  }

  private key(userId: string, datasetId: string): string {
    return `${userId}:${datasetId}`;
  }
}

function createTestContext(options: { enrichmentService?: EnrichmentService; maintenancePolicy?: MaintenancePolicy } = {}): {
  app: ReturnType<typeof createApp>;
  datasetStore: InMemoryDatasetStore;
  scoredRecordStore: InMemoryScoredRecordStore;
  internalJobStore: InMemoryInternalJobStore;
  internalJobService: InternalJobService;
  maintenanceService: MaintenanceService;
  alertStore: InMemoryAlertStore;
  workerProcessor: WorkerJobProcessor;
} {
  const userStore = new InMemoryUserStore();
  const datasetStore = new InMemoryDatasetStore();
  const scoredRecordStore = new InMemoryScoredRecordStore();
  const internalJobStore = new InMemoryInternalJobStore();
  const alertStore = new InMemoryAlertStore();
  const authService = new AuthService(userStore, {
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });
  const datasetService = new DatasetService(datasetStore);
  const alertService = new AlertService(alertStore);
  const internalJobService = new InternalJobService(internalJobStore, alertService);
  const maintenancePolicy =
    options.maintenancePolicy ??
    createMaintenancePolicy({
      autoRefreshEnabled: false,
      maxDatasetsPerRun: 25,
      minRefreshIntervalHours: 24,
      failureSuppressionHours: 24,
    });
  const scoringService = new ScoringService(
    datasetStore,
    scoredRecordStore,
    internalJobService,
    options.enrichmentService,
    maintenancePolicy,
  );
  const maintenanceService = new MaintenanceService(datasetStore, scoredRecordStore, internalJobService, maintenancePolicy);
  const workerProcessor = new WorkerJobProcessor(internalJobService, scoringService, maintenanceService);

  return {
    app: createApp({
      authService,
      datasetService,
      internalJobService,
      scoringService,
      alertService,
      workspaceService: createInMemoryWorkspaceService(userStore),
      workspaceActivityService: createInMemoryWorkspaceActivityService(userStore),
    }),
    datasetStore,
    scoredRecordStore,
    internalJobStore,
    internalJobService,
    maintenanceService,
    alertStore,
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
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value,property_type\nA-100,1000,12000,Single-family residential\nL-200,750,9000,Vacant land\n",
    );

    const response = await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);

    expect(response.body).toMatchObject({
      datasetId,
      job: {
        id: expect.any(String),
        type: "dataset_scoring",
        targetEntityType: "dataset",
        targetEntityId: datasetId,
        status: "queued",
      },
    });

    const workerResult = await workerProcessor.processNextJob();
    expect(workerResult).toMatchObject({
      status: "completed",
      job: {
        id: response.body.job.id,
        status: "completed",
        summary: {
          scoredRecordCount: 2,
        },
      },
    });

    const scoresResponse = await request(app)
      .get(`/datasets/${datasetId}/scores`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(scoresResponse.body.scores[0]).toMatchObject({
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
    expect(scoresResponse.body.scores[0].reasoning.length).toBeGreaterThan(0);

    const jobResponse = await request(app)
      .get(`/jobs/${response.body.job.id as string}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(jobResponse.body.job).toMatchObject({
      id: response.body.job.id,
      status: "completed",
      summary: {
        scoredRecordCount: 2,
      },
    });

    const alertsResponse = await request(app).get("/alerts").set("Authorization", `Bearer ${owner.token}`).expect(200);
    expect(alertsResponse.body).toMatchObject({
      unreadCount: 1,
      alerts: [
        {
          type: "scoring_job_completed",
          severity: "info",
          status: "unread",
          relatedEntityType: "dataset",
          relatedEntityId: datasetId,
          metadata: {
            jobId: response.body.job.id,
            datasetId,
            scoredRecordCount: 2,
          },
        },
      ],
    });
  });

  it("retrieves scored results for the dataset owner", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value,property_type\nA-100,1000,12000,Single-family residential\n",
    );

    await request(app).post(`/datasets/${datasetId}/score`).set("Authorization", `Bearer ${owner.token}`).expect(202);
    await workerProcessor.processNextJob();

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

  it("uses saved manual mappings when worker scoring runs", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "Property Number,Tax Balance,County Value,Use Description\nA-100,1000,12000,Single-family residential\n",
    );

    await request(app)
      .patch(`/datasets/${datasetId}/mapping`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        mappings: {
          parcel_id: "Property Number",
          lien_amount: "Tax Balance",
          estimated_value: "County Value",
          property_type: "Use Description",
        },
      })
      .expect(200);

    await request(app).post(`/datasets/${datasetId}/score`).set("Authorization", `Bearer ${owner.token}`).expect(202);
    await workerProcessor.processNextJob();

    const response = await request(app)
      .get(`/datasets/${datasetId}/scores`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(response.body.scores).toHaveLength(1);
    expect(response.body.scores[0].normalizedFields).toMatchObject({
      parcelId: "A-100",
      lienAmount: 1000,
      estimatedValue: 12000,
      propertyType: "Single-family residential",
      propertyTypeCategory: "residential",
    });
    expect(response.body.scores[0].confidenceScore).toBeGreaterThan(70);
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

  it("blocks cross-user job detail access", async () => {
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
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    const crossJob = await request(app)
      .get(`/jobs/${scoreResponse.body.job.id as string}`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);

    expect(crossJob.body.error.code).toBe("job_not_found");
  });

  it("handles malformed or partial records conservatively", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(app, owner.token, "parcel_id,property_type\nA-100,Unknown county code\n");

    await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    await workerProcessor.processNextJob();

    const scoresResponse = await request(app)
      .get(`/datasets/${datasetId}/scores`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    const score = scoresResponse.body.scores[0];
    expect(score.investmentScore).toBeLessThanOrEqual(35);
    expect(score.confidenceScore).toBeLessThan(70);
    expect(score.flags).toContain("Missing or invalid lien amount");
    expect(score.flags).toContain("Missing or invalid property value");
    expect(score.reasoning.join(" ")).toContain("Normalization warning");
  });

  it("uses enrichment to improve scoring from alternate source fields", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      [
        "parcel_id,tax_due,total_assessed_value,use_description,situs_street,situs_city,situs_state,situs_zip",
        "A-900,1000,12000,Single family residence,10 Main St,Austin,TX,78701",
      ].join("\n"),
    );

    await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    await workerProcessor.processNextJob();

    const scoresResponse = await request(app)
      .get(`/datasets/${datasetId}/scores`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    const score = scoresResponse.body.scores[0];
    expect(score.normalizedFields).toMatchObject({
      parcelId: "A-900",
      lienAmount: 1000,
      estimatedValue: 12000,
      propertyType: "Single family residence",
      propertyTypeCategory: "residential",
      address: "10 Main St Austin, TX 78701",
    });
    expect(score.enrichment).toMatchObject({
      adapters: ["source_field_inference"],
      dataQualityScore: 100,
      inferredFields: {
        lienAmount: 1000,
        estimatedValue: 12000,
        propertyType: "Single family residence",
        propertyTypeCategory: "residential",
      },
    });
    expect(score.enrichment.signals.map((signal: { field: string }) => signal.field)).toEqual(
      expect.arrayContaining(["lienAmount", "estimatedValue", "propertyType", "address", "dataQuality"]),
    );
    expect(score.investmentScore).toBeGreaterThanOrEqual(70);
    expect(score.flags).not.toContain("Missing or invalid lien amount");
    expect(score.flags).not.toContain("Missing or invalid property value");
    expect(score.reasoning.join(" ")).toContain("Enrichment note");
  });

  it("uses county-specific import mapping to make Maricopa-style rows scoreable", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "maricopa-owner@example.com");
    const datasetResponse = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${owner.token}`)
      .attach(
        "file",
        Buffer.from(
          [
            "APN,Total Due,Full Cash Value,Property Use Description,Situs Street,Situs City,Situs State,Situs Zip",
            "123-45-678,$1250,$85000,Single Family Residence,100 Main St,Phoenix,AZ,85001",
          ].join("\n"),
          "utf8",
        ),
        { filename: "maricopa-tax-liens.csv", contentType: "text/csv" },
      )
      .expect(201);
    const datasetId = datasetResponse.body.dataset.id as string;

    expect(datasetResponse.body.dataset.importSummary).toMatchObject({
      adapterMatched: true,
      adapterId: "maricopa_tax_lien_v1",
      mappedFields: ["parcel_id", "lien_amount", "estimated_value", "property_type", "address"],
    });

    await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    await workerProcessor.processNextJob();

    const scoresResponse = await request(app)
      .get(`/datasets/${datasetId}/scores`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(scoresResponse.body.scores[0]).toMatchObject({
      normalizedFields: {
        parcelId: "123-45-678",
        lienAmount: 1250,
        estimatedValue: 85000,
        propertyType: "Single Family Residence",
        propertyTypeCategory: "residential",
        address: "100 Main St Phoenix AZ 85001",
      },
      confidenceScore: expect.any(Number),
    });
    expect(scoresResponse.body.scores[0].confidenceScore).toBeGreaterThanOrEqual(70);
    expect(scoresResponse.body.scores[0].flags).not.toContain("Missing or invalid lien amount");
    expect(scoresResponse.body.scores[0].flags).not.toContain("Missing or invalid property value");
  });

  it("persists safe external enrichment results through the worker scoring path", async () => {
    const geocoderClient: CensusGeocoderClient = {
      geocodeAddress: async () => ({
        status: "matched",
        match: {
          matchedAddress: "10 MAIN ST, AUSTIN, TX, 78701",
          latitude: 30.2672,
          longitude: -97.7431,
          benchmark: "Public_AR_Current",
        },
      }),
    };
    const enrichmentService = new EnrichmentService(
      [
        new SourceFieldInferenceAdapter(),
        new CensusGeocoderAddressAdapter(geocoderClient, {
          maxRowsPerJob: 25,
          now: () => new Date("2026-01-01T00:00:00.000Z"),
        }),
      ],
      {
        freshnessWindowDays: 30,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
        sourceVersion: "source_field_inference@1+census_geocoder@Public_AR_Current",
      },
    );
    const { app, workerProcessor } = createTestContext({ enrichmentService });
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      [
        "parcel_id,lien_amount,estimated_value,property_type,address",
        "A-901,1000,12000,Single family residence,10 Main St Austin TX 78701",
      ].join("\n"),
    );

    await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    const workerResult = await workerProcessor.processNextJob();
    expect(workerResult).toMatchObject({
      status: "completed",
      job: {
        summary: {
          scoredRecordCount: 1,
          enrichedRecordCount: 1,
          enrichmentFallbackCount: 0,
          earliestReprocessAfter: "2026-01-31T00:00:00.000Z",
        },
      },
    });

    const scoresResponse = await request(app)
      .get(`/datasets/${datasetId}/scores`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    const score = scoresResponse.body.scores[0];
    expect(score.enrichment.externalResults).toEqual([
      {
        adapterId: "census_geocoder",
        provider: "us_census_geocoder",
        status: "matched",
        confidence: "medium",
        message: "Census Geocoder matched and normalized the address.",
        normalizedAddress: "10 MAIN ST, AUSTIN, TX, 78701",
        latitude: 30.2672,
        longitude: -97.7431,
        benchmark: "Public_AR_Current",
        enrichedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(score.enrichment.signals.map((signal: { adapterId: string }) => signal.adapterId)).toContain(
      "census_geocoder",
    );
    expect(score.enrichment.adapterOutcomes.map((outcome: { status: string }) => outcome.status)).toEqual([
      "success",
      "success",
    ]);
    expect(score.enrichment.freshness).toMatchObject({
      status: "fresh",
      reprocessAfter: "2026-01-31T00:00:00.000Z",
      reprocessEligible: false,
      sourceVersion: "source_field_inference@1+census_geocoder@Public_AR_Current",
    });
    expect(JSON.stringify(score.enrichment)).not.toContain("addressMatches");
  });

  it("keeps scoring coherent when external enrichment times out", async () => {
    const geocoderClient: CensusGeocoderClient = {
      geocodeAddress: async () => ({
        status: "timeout",
        message: "Timeout",
      }),
    };
    const enrichmentService = new EnrichmentService(
      [
        new SourceFieldInferenceAdapter(),
        new CensusGeocoderAddressAdapter(geocoderClient, {
          maxRowsPerJob: 25,
          now: () => new Date("2026-01-01T00:00:00.000Z"),
        }),
      ],
      {
        freshnessWindowDays: 30,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
        sourceVersion: "source_field_inference@1+census_geocoder@Public_AR_Current",
      },
    );
    const { app, workerProcessor } = createTestContext({ enrichmentService });
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      [
        "parcel_id,lien_amount,estimated_value,property_type,address",
        "A-902,1000,12000,Single family residence,10 Main St Austin TX 78701",
      ].join("\n"),
    );

    await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    const workerResult = await workerProcessor.processNextJob();

    expect(workerResult).toMatchObject({
      status: "completed",
      job: {
        summary: {
          scoredRecordCount: 1,
          enrichedRecordCount: 1,
          enrichmentFallbackCount: 1,
        },
      },
    });

    const scoresResponse = await request(app)
      .get(`/datasets/${datasetId}/scores`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    const score = scoresResponse.body.scores[0];
    expect(score.investmentScore).toBeGreaterThan(0);
    expect(score.enrichment.externalResults[0]).toMatchObject({
      adapterId: "census_geocoder",
      status: "timeout",
      message: "External geocoder timed out before returning usable location context.",
    });
    expect(score.enrichment.adapterOutcomes[1]).toMatchObject({
      adapterId: "census_geocoder",
      status: "failed",
      message: "Adapter failed safely and scoring continued.",
    });
    expect(score.flags).toContain("External geocoder unavailable");
  });

  it("supports reprocessing readiness by rerunning dataset scoring through jobs", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value,property_type\nA-903,1000,12000,Single family residence\n",
    );

    const firstResponse = await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    const firstWorkerResult = await workerProcessor.processNextJob();
    expect(firstWorkerResult).toMatchObject({
      status: "completed",
      job: {
        id: firstResponse.body.job.id,
        summary: {
          scoredRecordCount: 1,
          enrichedRecordCount: 1,
        },
      },
    });

    const secondResponse = await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    const secondWorkerResult = await workerProcessor.processNextJob();
    expect(secondWorkerResult).toMatchObject({
      status: "completed",
      job: {
        id: secondResponse.body.job.id,
        summary: {
          scoredRecordCount: 1,
          enrichedRecordCount: 1,
        },
      },
    });

    const scoresResponse = await request(app)
      .get(`/datasets/${datasetId}/scores`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(scoresResponse.body.scores).toHaveLength(1);
    expect(scoresResponse.body.scores[0].enrichment.freshness.reprocessAfter).toEqual(expect.any(String));
  });

  it("queues a controlled refresh job and exposes refresh status", async () => {
    const { app, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value,property_type\nA-904,1000,12000,Single family residence\n",
    );

    await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    await workerProcessor.processNextJob();

    const refreshResponse = await request(app)
      .post(`/datasets/${datasetId}/refresh`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);

    expect(refreshResponse.body).toMatchObject({
      datasetId,
      requestStatus: "queued",
      job: {
        type: "dataset_scoring",
        requestKind: "refresh",
        status: "queued",
        targetEntityId: datasetId,
      },
    });

    const queuedStatus = await request(app)
      .get(`/datasets/${datasetId}/scoring-status`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(queuedStatus.body).toMatchObject({
      datasetId,
      status: "refresh_requested",
      scoredRecordCount: 1,
      staleRecordCount: 0,
      activeJob: {
        id: refreshResponse.body.job.id,
        requestKind: "refresh",
        status: "queued",
      },
    });

    const workerResult = await workerProcessor.processNextJob();
    expect(workerResult).toMatchObject({
      status: "completed",
      job: {
        id: refreshResponse.body.job.id,
        requestKind: "refresh",
        status: "completed",
        summary: {
          scoredRecordCount: 1,
          enrichedRecordCount: 1,
        },
      },
    });

    const completedStatus = await request(app)
      .get(`/datasets/${datasetId}/scoring-status`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(completedStatus.body).toMatchObject({
      datasetId,
      status: "refresh_completed",
      scoredRecordCount: 1,
      staleRecordCount: 0,
      latestJob: {
        id: refreshResponse.body.job.id,
        requestKind: "refresh",
        status: "completed",
      },
    });
    expect(completedStatus.body.activeJob).toBeUndefined();

    const alertsResponse = await request(app).get("/alerts").set("Authorization", `Bearer ${owner.token}`).expect(200);
    expect(alertsResponse.body.alerts[0]).toMatchObject({
      type: "scoring_job_completed",
      message: "Refresh completed. 1 records are ready for review.",
      metadata: {
        datasetId,
        requestKind: "refresh",
        scoredRecordCount: 1,
      },
    });
  });

  it("reports stale scoring status when enrichment reprocess timing has passed", async () => {
    const enrichmentService = new EnrichmentService(
      [new SourceFieldInferenceAdapter()],
      {
        freshnessWindowDays: 1,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
        sourceVersion: "source_field_inference@1",
      },
    );
    const { app, workerProcessor } = createTestContext({ enrichmentService });
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value,property_type\nA-904B,1000,12000,Single family residence\n",
    );

    await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    await workerProcessor.processNextJob();

    const statusResponse = await request(app)
      .get(`/datasets/${datasetId}/scoring-status`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(statusResponse.body).toMatchObject({
      datasetId,
      status: "stale",
      scoredRecordCount: 1,
      staleRecordCount: 1,
      earliestReprocessAfter: "2026-01-02T00:00:00.000Z",
      maintenance: {
        mode: "manual_refresh_only",
        autoRefreshEnabled: false,
        eligibleForPolicyRefresh: false,
        message: "Dataset is stale, but policy allows manual refresh only.",
      },
    });
  });

  it("queues maintenance scan jobs for stale datasets without duplicating active maintenance work", async () => {
    const enrichmentService = new EnrichmentService([new SourceFieldInferenceAdapter()], {
      freshnessWindowDays: 1,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      sourceVersion: "source_field_inference@1",
    });
    const { app, internalJobStore, maintenanceService, workerProcessor } = createTestContext({ enrichmentService });
    const owner = await registerUser(app, "maintenance-owner@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value,property_type\nA-M1,1000,12000,Single family residence\n",
    );

    await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    await workerProcessor.processNextJob();

    const firstScan = await maintenanceService.runScheduledMaintenance(new Date("2026-01-03T00:00:00.000Z"));
    const duplicateScan = await maintenanceService.runScheduledMaintenance(new Date("2026-01-03T00:01:00.000Z"));

    expect(firstScan).toEqual({
      scannedAt: "2026-01-03T00:00:00.000Z",
      staleDatasetCount: 1,
      maintenanceJobsQueued: 1,
      skippedDatasetCount: 0,
    });
    expect(duplicateScan).toEqual({
      scannedAt: "2026-01-03T00:01:00.000Z",
      staleDatasetCount: 1,
      maintenanceJobsQueued: 0,
      skippedDatasetCount: 1,
    });
    expect(internalJobStore.listJobsForUser(owner.userId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "dataset_maintenance",
          requestKind: "maintenance_scan",
          targetEntityId: datasetId,
          status: "queued",
        }),
      ]),
    );
  });

  it("keeps stale maintenance manual-only when policy auto-refresh is disabled", async () => {
    const enrichmentService = new EnrichmentService([new SourceFieldInferenceAdapter()], {
      freshnessWindowDays: 1,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      sourceVersion: "source_field_inference@1",
    });
    const { app, internalJobStore, maintenanceService, workerProcessor } = createTestContext({ enrichmentService });
    const owner = await registerUser(app, "manual-maintenance@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value,property_type\nA-M2,1000,12000,Single family residence\n",
    );

    await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    await workerProcessor.processNextJob();
    await maintenanceService.runScheduledMaintenance(new Date("2026-01-03T00:00:00.000Z"));

    const maintenanceResult = await workerProcessor.processNextJob();
    expect(maintenanceResult).toMatchObject({
      status: "completed",
      job: {
        type: "dataset_maintenance",
        requestKind: "maintenance_scan",
        status: "completed",
        summary: {
          maintenanceDecision: "manual_refresh_only",
          maintenanceScannedDatasetCount: 1,
          maintenanceStaleDatasetCount: 1,
          maintenanceRefreshJobCount: 0,
          maintenanceSkippedDatasetCount: 1,
          staleRecordCount: 1,
          policyAutoRefreshEnabled: false,
        },
      },
    });
    expect(
      internalJobStore
        .listJobsForUser(owner.userId)
        .filter((job) => job.type === "dataset_scoring" && job.requestKind === "policy_refresh"),
    ).toHaveLength(0);
  });

  it("creates distinguishable policy refresh jobs when maintenance policy allows auto-refresh", async () => {
    const enrichmentService = new EnrichmentService([new SourceFieldInferenceAdapter()], {
      freshnessWindowDays: 1,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      sourceVersion: "source_field_inference@1",
    });
    const maintenancePolicy = createMaintenancePolicy({
      autoRefreshEnabled: true,
      maxDatasetsPerRun: 25,
      minRefreshIntervalHours: 24,
      failureSuppressionHours: 24,
    });
    const { app, internalJobStore, maintenanceService, workerProcessor } = createTestContext({
      enrichmentService,
      maintenancePolicy,
    });
    const owner = await registerUser(app, "policy-maintenance@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value,property_type\nA-M3,1000,12000,Single family residence\n",
    );

    await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    await workerProcessor.processNextJob();

    const statusResponse = await request(app)
      .get(`/datasets/${datasetId}/scoring-status`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);
    expect(statusResponse.body.maintenance).toMatchObject({
      mode: "policy_auto_refresh",
      autoRefreshEnabled: true,
      eligibleForPolicyRefresh: true,
      message: "Dataset is stale and eligible for policy-driven refresh.",
    });

    await maintenanceService.runScheduledMaintenance(new Date("2026-01-03T00:00:00.000Z"));
    const maintenanceResult = await workerProcessor.processNextJob();
    expect(maintenanceResult).toMatchObject({
      status: "completed",
      job: {
        type: "dataset_maintenance",
        requestKind: "maintenance_scan",
        summary: {
          maintenanceDecision: "policy_refresh_queued",
          maintenanceRefreshJobCount: 1,
          policyAutoRefreshEnabled: true,
          refreshJobId: expect.any(String),
        },
      },
    });

    const policyRefresh = internalJobStore
      .listJobsForUser(owner.userId)
      .find((job) => job.type === "dataset_scoring" && job.requestKind === "policy_refresh");
    expect(policyRefresh).toMatchObject({
      targetEntityId: datasetId,
      status: "queued",
    });

    const refreshResult = await workerProcessor.processNextJob();
    expect(refreshResult).toMatchObject({
      status: "completed",
      job: {
        id: policyRefresh?.id,
        type: "dataset_scoring",
        requestKind: "policy_refresh",
        status: "completed",
        summary: {
          scoredRecordCount: 1,
        },
      },
    });

    const alertsResponse = await request(app).get("/alerts").set("Authorization", `Bearer ${owner.token}`).expect(200);
    expect(alertsResponse.body.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "scoring_job_completed",
          message: "Scheduled refresh completed. 1 records are ready for review.",
          metadata: expect.objectContaining({
            requestKind: "policy_refresh",
            datasetId,
          }),
        }),
      ]),
    );
  });

  it("suppresses scheduled refresh creation after a recent failed policy refresh", async () => {
    const enrichmentService = new EnrichmentService([new SourceFieldInferenceAdapter()], {
      freshnessWindowDays: 1,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      sourceVersion: "source_field_inference@1",
    });
    const maintenancePolicy = createMaintenancePolicy({
      autoRefreshEnabled: true,
      maxDatasetsPerRun: 25,
      minRefreshIntervalHours: 24,
      failureSuppressionHours: 24,
    });
    const { app, internalJobService, internalJobStore, maintenanceService, workerProcessor } = createTestContext({
      enrichmentService,
      maintenancePolicy,
    });
    const owner = await registerUser(app, "failed-policy-refresh@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value,property_type\nA-M4,1000,12000,Single family residence\n",
    );

    await request(app)
      .post(`/datasets/${datasetId}/score`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    await workerProcessor.processNextJob();

    await internalJobService.enqueue({
      userId: owner.userId,
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: datasetId,
      requestKind: "policy_refresh",
    });
    const claimedPolicyRefresh = await internalJobService.claimNextJob();
    expect(claimedPolicyRefresh).toMatchObject({
      requestKind: "policy_refresh",
      status: "running",
    });
    await internalJobService.failJob(claimedPolicyRefresh!, new Error("provider timeout internals"));

    await maintenanceService.runScheduledMaintenance(new Date("2026-01-03T00:00:00.000Z"));
    const maintenanceResult = await workerProcessor.processNextJob();

    expect(maintenanceResult).toMatchObject({
      status: "completed",
      job: {
        type: "dataset_maintenance",
        requestKind: "maintenance_scan",
        summary: {
          maintenanceDecision: "recent_failure_suppressed",
          maintenanceRefreshJobCount: 0,
          maintenanceSkippedDatasetCount: 1,
        },
      },
    });
    expect(
      internalJobStore
        .listJobsForUser(owner.userId)
        .filter((job) => job.type === "dataset_scoring" && job.requestKind === "policy_refresh"),
    ).toHaveLength(1);
  });

  it("returns an active refresh job instead of duplicating queued refresh requests", async () => {
    const { app, internalJobStore } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value,property_type\nA-905,1000,12000,Single family residence\n",
    );

    const firstRefresh = await request(app)
      .post(`/datasets/${datasetId}/refresh`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    const duplicateRefresh = await request(app)
      .post(`/datasets/${datasetId}/refresh`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);

    expect(duplicateRefresh.body).toMatchObject({
      datasetId,
      requestStatus: "already_running",
      job: {
        id: firstRefresh.body.job.id,
        requestKind: "refresh",
        status: "queued",
      },
    });
    expect(internalJobStore.listJobsForUser(owner.userId)).toHaveLength(1);
  });

  it("returns an already-running refresh job when processing is in progress", async () => {
    const { app, internalJobService } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value,property_type\nA-906,1000,12000,Single family residence\n",
    );

    const refresh = await request(app)
      .post(`/datasets/${datasetId}/refresh`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    const claimed = await internalJobService.claimNextJob();
    expect(claimed).toMatchObject({
      id: refresh.body.job.id,
      status: "running",
    });

    const duplicateRefresh = await request(app)
      .post(`/datasets/${datasetId}/refresh`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);

    expect(duplicateRefresh.body).toMatchObject({
      requestStatus: "already_running",
      job: {
        id: refresh.body.job.id,
        status: "running",
      },
    });
  });

  it("rejects refresh without auth and across users", async () => {
    const { app } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const other = await registerUser(app, "other@example.com");
    const datasetId = await uploadDataset(
      app,
      owner.token,
      "parcel_id,lien_amount,estimated_value\nA-907,1000,12000\n",
    );

    const missingAuth = await request(app).post(`/datasets/${datasetId}/refresh`).expect(401);
    const crossUser = await request(app)
      .post(`/datasets/${datasetId}/refresh`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);
    const crossStatus = await request(app)
      .get(`/datasets/${datasetId}/scoring-status`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);

    expect(missingAuth.body.error.code).toBe("auth_missing_token");
    expect(crossUser.body.error.code).toBe("dataset_not_found");
    expect(crossStatus.body.error.code).toBe("dataset_not_found");
  });

  it("records a safe failed refresh job when refresh cannot score the dataset", async () => {
    const { app, datasetStore, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const dataset = await datasetStore.createDataset({
      userId: owner.userId,
      originalFilename: "empty-refresh.csv",
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

    const refreshResponse = await request(app)
      .post(`/datasets/${dataset.id}/refresh`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(202);
    const workerResult = await workerProcessor.processNextJob();

    expect(workerResult).toMatchObject({
      status: "failed",
      job: {
        id: refreshResponse.body.job.id,
        requestKind: "refresh",
        status: "failed",
        error: {
          code: "score_no_source_rows",
        },
      },
    });

    const statusResponse = await request(app)
      .get(`/datasets/${dataset.id}/scoring-status`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);
    expect(statusResponse.body).toMatchObject({
      status: "refresh_failed",
      scoredRecordCount: 0,
      latestJob: {
        id: refreshResponse.body.job.id,
        requestKind: "refresh",
        status: "failed",
      },
    });
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

  it("fails safely and records a failed job when a stored dataset has no scoreable source rows", async () => {
    const { app, datasetStore, internalJobStore, workerProcessor } = createTestContext();
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
      .expect(202);

    expect(response.body.job).toMatchObject({
      status: "queued",
      targetEntityId: dataset.id,
    });

    const workerResult = await workerProcessor.processNextJob();
    expect(workerResult).toMatchObject({
      status: "failed",
      job: {
        id: response.body.job.id,
        status: "failed",
        error: {
          code: "score_no_source_rows",
          message: "Dataset does not contain scoreable source rows.",
        },
      },
    });
    expect(internalJobStore.listJobsForUser(owner.userId)).toHaveLength(1);
    expect(internalJobStore.listJobsForUser(owner.userId)[0]).toMatchObject({
      type: "dataset_scoring",
      targetEntityId: dataset.id,
      status: "failed",
      error: {
        code: "score_no_source_rows",
        message: "Dataset does not contain scoreable source rows.",
      },
    });

    const alertsResponse = await request(app).get("/alerts").set("Authorization", `Bearer ${owner.token}`).expect(200);
    expect(alertsResponse.body).toMatchObject({
      unreadCount: 1,
      alerts: [
        {
          type: "scoring_job_failed",
          severity: "error",
          status: "unread",
          relatedEntityType: "dataset",
          relatedEntityId: dataset.id,
          metadata: {
            datasetId: dataset.id,
            errorCode: "score_no_source_rows",
          },
        },
      ],
    });
  });

  it("fails stale worker job targets without crossing ownership boundaries", async () => {
    const { app, internalJobService, workerProcessor } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const staleDatasetId = new mongoose.Types.ObjectId().toString();
    const job = await internalJobService.enqueue({
      userId: owner.userId,
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: staleDatasetId,
    });

    const workerResult = await workerProcessor.processNextJob();
    expect(workerResult).toMatchObject({
      status: "failed",
      job: {
        id: job.id,
        status: "failed",
        error: {
          code: "dataset_not_found",
          message: "Dataset was not found.",
        },
      },
    });

    const jobResponse = await request(app).get(`/jobs/${job.id}`).set("Authorization", `Bearer ${owner.token}`).expect(200);
    expect(jobResponse.body.job.error.code).toBe("dataset_not_found");
  });
});
