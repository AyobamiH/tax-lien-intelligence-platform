import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type {
  ApprovalRequestResponse,
  ComparisonItemResponse,
  ComparisonListResponse,
  WorkspacePolicyEvaluation,
} from "@tax-lien/types";
import { createApp } from "../../apps/api/src/app.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type {
  CreateUserInput,
  StoredUser,
  UserStore,
} from "../../apps/api/src/auth/user-store.js";
import { DecisionOutcomeService } from "../../apps/api/src/decision-outcomes/decision-outcome-service.js";
import { ApiError } from "../../apps/api/src/errors/api-error.js";
import { OutcomeReviewService } from "../../apps/api/src/outcome-review/outcome-review-service.js";
import { WorkspaceService } from "../../apps/api/src/workspaces/workspace-service.js";
import { InMemoryDecisionOutcomeStore } from "../support/in-memory-decision-outcome-store.js";
import { createInMemoryWorkspaceActivityService } from "../support/in-memory-workspace-activity-store.js";
import {
  InMemoryWorkspaceMembershipStore,
  InMemoryWorkspaceStore,
} from "../support/in-memory-workspace-store.js";

const testJwtSecret = "test-outcome-review-secret-long-enough-for-jwt";

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

class FakeComparisonAccess {
  private readonly targets = new Map<string, { tenantUserId: string; item: ComparisonItemResponse }>();

  public seed(tenantUserId: string, parcelId: string): ComparisonItemResponse {
    const now = new Date().toISOString();
    const item: ComparisonItemResponse = {
      id: new mongoose.Types.ObjectId().toString(),
      workspaceId: "default",
      datasetId: new mongoose.Types.ObjectId().toString(),
      scoredRecordId: new mongoose.Types.ObjectId().toString(),
      sourceType: "score",
      decision: "move_forward",
      decisionUpdatedAt: now,
      sourceRowNumber: this.targets.size + 1,
      normalizedFields: {
        parcelId,
        lienAmount: 2100,
        estimatedValue: 30000,
        propertyTypeCategory: "residential",
      },
      investmentScore: 84,
      riskScore: 24,
      liquidityScore: 71,
      redemptionProbability: 0.7,
      confidenceScore: 88,
      valueCoverageRatio: 14.29,
      flags: [],
      reasoning: ["Strong coverage."],
      scoredAt: now,
      addedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.targets.set(item.id, { tenantUserId, item });
    return item;
  }

  public async listItems(tenantUserId: string): Promise<ComparisonListResponse> {
    return {
      items: [...this.targets.values()]
        .filter((target) => target.tenantUserId === tenantUserId)
        .map((target) => target.item),
    };
  }

  public async getItem(tenantUserId: string, comparisonItemId: string): Promise<ComparisonItemResponse> {
    const target = this.targets.get(comparisonItemId);
    if (!target || target.tenantUserId !== tenantUserId) {
      throw new ApiError(404, "comparison_item_not_found", "Comparison item was not found.");
    }
    return target.item;
  }
}

class AllowingGovernanceEvidence {
  public async evaluate(): Promise<WorkspacePolicyEvaluation> {
    return {
      action: "approval_request_comparison_portfolio",
      allowed: true,
      unmetRequirements: [],
    };
  }

  public async listApprovals(): Promise<{ approvals: ApprovalRequestResponse[] }> {
    return { approvals: [] };
  }
}

function createTestContext() {
  const userStore = new InMemoryUserStore();
  const workspaceService = new WorkspaceService(
    new InMemoryWorkspaceStore(),
    new InMemoryWorkspaceMembershipStore(),
    userStore,
  );
  const authService = new AuthService(userStore, {
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });
  const comparison = new FakeComparisonAccess();
  const governance = new AllowingGovernanceEvidence();
  const activityService = createInMemoryWorkspaceActivityService(userStore);
  const outcomeStore = new InMemoryDecisionOutcomeStore();
  const decisionOutcomeService = new DecisionOutcomeService(
    outcomeStore,
    comparison,
    { list: () => governance.listApprovals() },
    { evaluateComparisonAction: () => governance.evaluate() },
  );
  const outcomeReviewService = new OutcomeReviewService(outcomeStore, comparison);

  return {
    app: createApp({
      authService,
      workspaceService,
      workspaceActivityService: activityService,
      decisionOutcomeService,
      outcomeReviewService,
    }),
    comparison,
    outcomeStore,
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

async function currentWorkspaceId(app: ReturnType<typeof createApp>, token: string): Promise<string> {
  const response = await request(app)
    .get("/workspaces/current")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  return response.body.workspace.id as string;
}

function resolveOutcome(
  app: ReturnType<typeof createApp>,
  token: string,
  workspaceId: string,
  targetId: string,
  status: "approved" | "declined" | "deferred" | "archived",
) {
  return request(app)
    .put(`/decision-outcomes/comparison_item/${targetId}`)
    .set("Authorization", `Bearer ${token}`)
    .set("X-Workspace-Id", workspaceId)
    .send({ status, note: `Resolved as ${status} after review.` });
}

describe("outcome review", () => {
  it("returns workspace outcome counts, recent resolutions, and grounded signals", async () => {
    const { app, comparison } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const declined = comparison.seed(owner.userId, "PX-101");
    const deferred = comparison.seed(owner.userId, "PX-102");
    comparison.seed(owner.userId, "PX-103");

    await resolveOutcome(app, owner.token, workspaceId, declined.id, "declined").expect(201);
    await resolveOutcome(app, owner.token, workspaceId, deferred.id, "deferred").expect(201);

    const response = await request(app)
      .get("/outcome-review?windowDays=30")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);

    expect(response.body).toMatchObject({
      workspaceId,
      windowDays: 30,
      summary: {
        totalComparisonItems: 3,
        resolvedItems: 2,
        unresolvedItems: 1,
        resolutionRate: 66.7,
        recentResolvedItems: 2,
        recentDeferredOrDeclinedItems: 2,
        countsByEntityType: [{ targetEntityType: "comparison_item", count: 2 }],
      },
    });
    expect(response.body.summary.countsByStatus).toEqual([
      { status: "approved", count: 0 },
      { status: "declined", count: 1 },
      { status: "deferred", count: 1 },
      { status: "archived", count: 0 },
    ]);
    expect(response.body.recentResolutions).toHaveLength(2);
    expect(response.body.recentResolutions[0].target.label).toMatch(/^Parcel PX-10/);
    expect(response.body.signals.map((signal: { code: string }) => signal.code)).toEqual([
      "unresolved_comparison_items",
      "deferred_outcomes",
      "recent_declines",
    ]);
  });

  it("returns a safe empty outcome review state", async () => {
    const { app } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);

    const response = await request(app)
      .get("/outcome-review")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);

    expect(response.body.summary).toMatchObject({
      totalComparisonItems: 0,
      resolvedItems: 0,
      unresolvedItems: 0,
      resolutionRate: 0,
      recentResolvedItems: 0,
    });
    expect(response.body.recentResolutions).toEqual([]);
    expect(response.body.signals).toMatchObject([{ code: "no_resolved_items" }]);
  });

  it("keeps stale targets out of review results and honors the recent window", async () => {
    const { app, comparison, outcomeStore } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const oldTarget = comparison.seed(owner.userId, "PX-201");
    const oldResolvedAt = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    await outcomeStore.upsertForTarget({
      workspaceId,
      targetEntityType: "comparison_item",
      targetEntityId: oldTarget.id,
      status: "approved",
      resolverUserId: owner.userId,
      resolverEmail: "owner@example.com",
      resolverRole: "owner",
      note: "Approved in an earlier review cycle.",
      resolvedAt: oldResolvedAt,
    });
    await outcomeStore.upsertForTarget({
      workspaceId,
      targetEntityType: "comparison_item",
      targetEntityId: new mongoose.Types.ObjectId().toString(),
      status: "declined",
      resolverUserId: owner.userId,
      resolverEmail: "owner@example.com",
      resolverRole: "owner",
      note: "Stale target should not appear.",
      resolvedAt: new Date(),
    });

    const response = await request(app)
      .get("/outcome-review?windowDays=7")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);

    expect(response.body.summary).toMatchObject({
      totalComparisonItems: 1,
      resolvedItems: 1,
      unresolvedItems: 0,
      recentResolvedItems: 0,
    });
    expect(response.body.summary.countsByStatus).toEqual([
      { status: "approved", count: 1 },
      { status: "declined", count: 0 },
      { status: "deferred", count: 0 },
      { status: "archived", count: 0 },
    ]);
    expect(response.body.recentResolutions).toEqual([]);
    expect(response.body.signals).toMatchObject([{ code: "no_recent_resolutions" }]);
  });

  it("does not leak outcome review data across workspaces", async () => {
    const { app, comparison } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const outsider = await register(app, "outsider@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const outsiderWorkspaceId = await currentWorkspaceId(app, outsider.token);
    const target = comparison.seed(owner.userId, "PX-301");
    await resolveOutcome(app, owner.token, workspaceId, target.id, "declined").expect(201);

    await request(app)
      .get("/outcome-review")
      .set("Authorization", `Bearer ${outsider.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(403);

    const ownWorkspace = await request(app)
      .get("/outcome-review")
      .set("Authorization", `Bearer ${outsider.token}`)
      .set("X-Workspace-Id", outsiderWorkspaceId)
      .expect(200);
    expect(ownWorkspace.body.summary.resolvedItems).toBe(0);
    expect(ownWorkspace.body.recentResolutions).toEqual([]);
  });

  it("rejects invalid review window filters", async () => {
    const { app } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);

    const response = await request(app)
      .get("/outcome-review?windowDays=0")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(400);

    expect(response.body.error.code).toBe("validation_failed");
  });
});
