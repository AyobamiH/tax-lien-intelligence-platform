import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
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
import { WorkspaceService } from "../../apps/api/src/workspaces/workspace-service.js";
import {
  InMemoryWorkspaceMembershipStore,
  InMemoryWorkspaceStore,
} from "../support/in-memory-workspace-store.js";
import {
  createInMemoryWorkspaceActivityService,
  InMemoryWorkspaceActivityStore,
} from "../support/in-memory-workspace-activity-store.js";

const testJwtSecret = "test-workspace-secret-that-is-long-enough-for-jwt";

class InMemoryUserStore implements UserStore {
  private readonly users = new Map<string, StoredUser>();

  public async createUser(input: CreateUserInput): Promise<StoredUser> {
    const now = new Date();
    const user: StoredUser = {
      id: new mongoose.Types.ObjectId().toString(),
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  public async findByEmail(email: string): Promise<StoredUser | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  public async findById(id: string): Promise<StoredUser | null> {
    return this.users.get(id) ?? null;
  }
}

class InMemoryDatasetStore implements DatasetStore {
  private readonly datasets = new Map<string, StoredDataset>();

  public async createDataset(input: CreateDatasetInput): Promise<StoredDataset> {
    const now = new Date();
    const dataset: StoredDataset = {
      id: new mongoose.Types.ObjectId().toString(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.datasets.set(dataset.id, dataset);
    return dataset;
  }

  public async listDatasets(userId: string): Promise<StoredDataset[]> {
    return [...this.datasets.values()].filter((dataset) => dataset.userId === userId);
  }

  public async findDatasetByIdForUser(datasetId: string, userId: string): Promise<StoredDataset | null> {
    const dataset = this.datasets.get(datasetId);
    return dataset?.userId === userId ? dataset : null;
  }

  public async updateManualMappingForUser(): Promise<StoredDataset | null> {
    return null;
  }
}

class EmptyImportProfileStore implements ImportProfileStore {
  public async createProfile(_input: CreateImportProfileInput): Promise<StoredImportProfile> {
    throw new Error("not used");
  }

  public async listProfiles(): Promise<StoredImportProfile[]> {
    return [];
  }

  public async findProfileByIdForUser(): Promise<StoredImportProfile | null> {
    return null;
  }
}

function createTestContext() {
  const userStore = new InMemoryUserStore();
  const workspaceStore = new InMemoryWorkspaceStore();
  const membershipStore = new InMemoryWorkspaceMembershipStore();
  const workspaceService = new WorkspaceService(workspaceStore, membershipStore, userStore);
  const authService = new AuthService(userStore, {
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });
  const datasetStore = new InMemoryDatasetStore();
  const activityStore = new InMemoryWorkspaceActivityStore();
  const workspaceActivityService = createInMemoryWorkspaceActivityService(userStore, activityStore);

  return {
    app: createApp({
      authService,
      workspaceService,
      workspaceActivityService,
      datasetService: new DatasetService(datasetStore, new EmptyImportProfileStore()),
    }),
    workspaceService,
    workspaceActivityService,
  };
}

async function register(app: ReturnType<typeof createApp>, email: string) {
  const response = await request(app)
    .post("/auth/register")
    .send({ email, password: "StrongPass123" })
    .expect(201);
  return {
    token: response.body.token as string,
    userId: response.body.user.id as string,
  };
}

describe("workspace and team access", () => {
  it("bootstraps an owner workspace whose tenant key preserves existing user-owned data", async () => {
    const { app, workspaceService } = createTestContext();
    const owner = await register(app, "owner@example.com");

    const response = await request(app)
      .get("/workspaces/current")
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(response.body.workspace).toMatchObject({
      name: "Owner Workspace",
      role: "owner",
      isDefault: true,
      memberCount: 1,
      permissions: {
        canReadSharedData: true,
        canManageSharedData: true,
        canManageMembers: true,
        canManageRoles: true,
      },
    });

    const context = await workspaceService.resolveContext(owner.userId);
    expect(context.tenantUserId).toBe(owner.userId);
  });

  it("shares core data with members while rejecting cross-workspace access and member writes", async () => {
    const { app } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const member = await register(app, "member@example.com");
    const outsider = await register(app, "outsider@example.com");

    const workspaceResponse = await request(app)
      .get("/workspaces/current")
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);
    const workspaceId = workspaceResponse.body.workspace.id as string;

    await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .attach("file", Buffer.from("parcel_id,lien_amount,estimated_value\nA-100,1000,12000\n"), "owner.csv")
      .expect(201);

    await request(app)
      .post("/workspaces/current/members")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ email: "member@example.com", role: "member" })
      .expect(201);

    const memberWorkspaces = await request(app)
      .get("/workspaces")
      .set("Authorization", `Bearer ${member.token}`)
      .expect(200);
    expect(memberWorkspaces.body.workspaces).toHaveLength(2);
    expect(memberWorkspaces.body.currentWorkspaceId).not.toBe(workspaceId);

    const sharedData = await request(app)
      .get("/datasets")
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(sharedData.body.datasets).toHaveLength(1);
    expect(sharedData.body.datasets[0].originalFilename).toBe("owner.csv");

    const memberWrite = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .attach("file", Buffer.from("parcel_id,lien_amount\nB-200,500\n"), "member.csv")
      .expect(403);
    expect(memberWrite.body.error.code).toBe("workspace_role_forbidden");

    const outsiderRead = await request(app)
      .get("/datasets")
      .set("Authorization", `Bearer ${outsider.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(403);
    expect(outsiderRead.body.error.code).toBe("workspace_access_denied");
  });

  it("allows owner role assignment without allowing admin or member escalation", async () => {
    const { app } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const member = await register(app, "member@example.com");
    const candidate = await register(app, "candidate@example.com");

    const current = await request(app)
      .get("/workspaces/current")
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);
    const workspaceId = current.body.workspace.id as string;

    const added = await request(app)
      .post("/workspaces/current/members")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ email: "member@example.com", role: "member" })
      .expect(201);
    const membershipId = added.body.member.id as string;

    const promoted = await request(app)
      .patch(`/workspaces/current/members/${membershipId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ role: "admin" })
      .expect(200);
    expect(promoted.body.member.role).toBe("admin");

    const adminEscalation = await request(app)
      .post("/workspaces/current/members")
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ email: "candidate@example.com", role: "admin" })
      .expect(403);
    expect(adminEscalation.body.error.code).toBe("workspace_role_forbidden");

    const adminRoleChange = await request(app)
      .patch(`/workspaces/current/members/${membershipId}`)
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ role: "member" })
      .expect(403);
    expect(adminRoleChange.body.error.code).toBe("workspace_role_forbidden");

    await request(app)
      .post("/workspaces/current/members")
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ email: "candidate@example.com", role: "member" })
      .expect(201);

    const invalidMembership = await request(app)
      .patch("/workspaces/current/members/not-an-object-id")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ role: "member" })
      .expect(400);
    expect(invalidMembership.body.error.code).toBe("workspace_invalid_membership_id");
  });

  it("returns a member-visible workspace activity feed with actor attribution and safe filtering", async () => {
    const { app } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const member = await register(app, "member@example.com");
    const outsider = await register(app, "outsider@example.com");

    const current = await request(app)
      .get("/workspaces/current")
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);
    const workspaceId = current.body.workspace.id as string;

    const empty = await request(app)
      .get("/workspaces/current/activity")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(empty.body).toEqual({ activities: [] });

    const dataset = await request(app)
      .post("/datasets")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .field("sourceLabel", "County June sale")
      .attach("file", Buffer.from("parcel_id,lien_amount\nA-100,1000\n"), "county.csv")
      .expect(201);

    const added = await request(app)
      .post("/workspaces/current/members")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ email: "member@example.com", role: "member" })
      .expect(201);

    await request(app)
      .patch(`/workspaces/current/members/${added.body.member.id as string}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ role: "admin" })
      .expect(200);

    const memberFeed = await request(app)
      .get("/workspaces/current/activity")
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);

    expect(memberFeed.body.activities).toHaveLength(3);
    expect(memberFeed.body.activities.map((activity: { eventType: string }) => activity.eventType)).toEqual([
      "workspace_member_role_changed",
      "workspace_member_added",
      "dataset_uploaded",
    ]);
    expect(memberFeed.body.activities[0]).toMatchObject({
      workspaceId,
      actor: {
        userId: owner.userId,
        email: "owner@example.com",
      },
      category: "members",
      summary: "Changed member@example.com from member to admin.",
    });
    expect(memberFeed.body.activities[2]).toMatchObject({
      relatedEntityType: "dataset",
      relatedEntityId: dataset.body.dataset.id,
      summary: "Uploaded dataset County June sale.",
      metadata: {
        datasetId: dataset.body.dataset.id,
        datasetName: "County June sale",
      },
    });

    const dataOnly = await request(app)
      .get("/workspaces/current/activity?category=data&limit=1")
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(dataOnly.body.activities).toHaveLength(1);
    expect(dataOnly.body.activities[0].eventType).toBe("dataset_uploaded");

    const outsiderRead = await request(app)
      .get("/workspaces/current/activity")
      .set("Authorization", `Bearer ${outsider.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(403);
    expect(outsiderRead.body.error.code).toBe("workspace_access_denied");
  });

  it("rejects malformed workspace activity filters", async () => {
    const { app } = createTestContext();
    const owner = await register(app, "owner@example.com");

    const response = await request(app)
      .get("/workspaces/current/activity?category=everything")
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(400);

    expect(response.body.error.code).toBe("workspace_activity_invalid_query");
  });
});
