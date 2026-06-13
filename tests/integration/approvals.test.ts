import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type {
  ComparisonHandoffToPortfolioResponse,
  ComparisonItemResponse,
} from "@tax-lien/types";
import {
  ApprovalService,
  type ApprovalActionExecutor,
} from "../../apps/api/src/approvals/approval-service.js";
import { createApp } from "../../apps/api/src/app.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import { ApiError } from "../../apps/api/src/errors/api-error.js";
import { WorkspaceService } from "../../apps/api/src/workspaces/workspace-service.js";
import { InMemoryApprovalRequestStore } from "../support/in-memory-approval-store.js";
import {
  createInMemoryWorkspaceActivityService,
  InMemoryWorkspaceActivityStore,
} from "../support/in-memory-workspace-activity-store.js";
import {
  InMemoryWorkspaceMembershipStore,
  InMemoryWorkspaceStore,
} from "../support/in-memory-workspace-store.js";

const testJwtSecret = "test-approval-secret-that-is-long-enough-for-jwt";

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

class InMemoryApprovalActionExecutor implements ApprovalActionExecutor {
  private readonly targets = new Map<string, { tenantUserId: string; item: ComparisonItemResponse }>();
  private handoffBlocker: Promise<void> | null = null;
  private notifyHandoffStarted: (() => void) | null = null;
  public readonly handoffs: Array<{ tenantUserId: string; comparisonItemId: string }> = [];

  public seed(tenantUserId: string): ComparisonItemResponse {
    const now = new Date().toISOString();
    const item: ComparisonItemResponse = {
      id: new mongoose.Types.ObjectId().toString(),
      workspaceId: "default",
      datasetId: new mongoose.Types.ObjectId().toString(),
      scoredRecordId: new mongoose.Types.ObjectId().toString(),
      sourceType: "score",
      decision: "move_forward",
      decisionUpdatedAt: now,
      sourceRowNumber: 2,
      normalizedFields: {
        parcelId: "A-100",
        lienAmount: 1000,
        estimatedValue: 12000,
        propertyTypeCategory: "residential",
      },
      investmentScore: 82,
      riskScore: 20,
      liquidityScore: 75,
      redemptionProbability: 0.8,
      confidenceScore: 88,
      valueCoverageRatio: 12,
      flags: [],
      reasoning: ["Strong value coverage."],
      scoredAt: now,
      addedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.targets.set(item.id, { tenantUserId, item });
    return item;
  }

  public remove(comparisonItemId: string): void {
    this.targets.delete(comparisonItemId);
  }

  public blockNextHandoff(): { started: Promise<void>; release: () => void } {
    let releaseBlocker: (() => void) | null = null;
    let notifyStarted: (() => void) | null = null;
    this.handoffBlocker = new Promise<void>((resolve) => {
      releaseBlocker = resolve;
    });
    const started = new Promise<void>((resolve) => {
      notifyStarted = resolve;
    });
    this.notifyHandoffStarted = notifyStarted;
    return {
      started,
      release: () => {
        releaseBlocker?.();
        this.handoffBlocker = null;
      },
    };
  }

  public async getItem(tenantUserId: string, comparisonItemId: string): Promise<ComparisonItemResponse> {
    const target = this.targets.get(comparisonItemId);
    if (!target || target.tenantUserId !== tenantUserId) {
      throw new ApiError(404, "comparison_item_not_found", "Comparison item was not found.");
    }
    return target.item;
  }

  public async handoffToPortfolio(
    tenantUserId: string,
    comparisonItemId: string,
  ): Promise<ComparisonHandoffToPortfolioResponse> {
    const item = await this.getItem(tenantUserId, comparisonItemId);
    this.notifyHandoffStarted?.();
    this.notifyHandoffStarted = null;
    await this.handoffBlocker;
    this.handoffs.push({ tenantUserId, comparisonItemId });
    const now = new Date().toISOString();
    const portfolioItemId = new mongoose.Types.ObjectId().toString();
    return {
      destination: "portfolio",
      alreadyExists: false,
      item: {
        id: portfolioItemId,
        datasetId: item.datasetId,
        scoredRecordId: item.scoredRecordId,
        status: "tracked",
        statusUpdatedAt: now,
        sourceRowNumber: item.sourceRowNumber,
        normalizedFields: item.normalizedFields,
        investmentScore: item.investmentScore,
        riskScore: item.riskScore,
        liquidityScore: item.liquidityScore,
        redemptionProbability: item.redemptionProbability,
        confidenceScore: item.confidenceScore,
        ...(item.valueCoverageRatio !== undefined
          ? { valueCoverageRatio: item.valueCoverageRatio }
          : {}),
        flags: item.flags,
        reasoning: item.reasoning,
        scoredAt: item.scoredAt,
        trackedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      historyEvent: {
        id: new mongoose.Types.ObjectId().toString(),
        relatedEntityType: "comparison_item",
        relatedEntityId: item.id,
        eventType: "comparison_handoff_to_portfolio",
        metadata: {
          targetEntityType: "portfolio_item",
          targetEntityId: portfolioItemId,
          handoffResult: "created",
          portfolioStatus: "tracked",
        },
        createdAt: now,
        updatedAt: now,
      },
    };
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
  const actionExecutor = new InMemoryApprovalActionExecutor();
  const activityStore = new InMemoryWorkspaceActivityStore();
  const workspaceActivityService = createInMemoryWorkspaceActivityService(userStore, activityStore);
  const approvalService = new ApprovalService(
    new InMemoryApprovalRequestStore(),
    actionExecutor,
  );

  return {
    app: createApp({
      authService,
      workspaceService,
      workspaceActivityService,
      approvalService,
    }),
    actionExecutor,
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

async function workspaceId(app: ReturnType<typeof createApp>, token: string): Promise<string> {
  const response = await request(app)
    .get("/workspaces/current")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  return response.body.workspace.id as string;
}

async function addMember(
  app: ReturnType<typeof createApp>,
  ownerToken: string,
  selectedWorkspaceId: string,
  email: string,
  role: "admin" | "member",
) {
  return request(app)
    .post("/workspaces/current/members")
    .set("Authorization", `Bearer ${ownerToken}`)
    .set("X-Workspace-Id", selectedWorkspaceId)
    .send({ email, role })
    .expect(201);
}

function createApproval(
  app: ReturnType<typeof createApp>,
  token: string,
  selectedWorkspaceId: string,
  targetEntityId: string,
) {
  return request(app)
    .post("/approvals")
    .set("Authorization", `Bearer ${token}`)
    .set("X-Workspace-Id", selectedWorkspaceId)
    .send({
      targetEntityType: "comparison_item",
      targetEntityId,
      requestedAction: "comparison_handoff_to_portfolio",
      requestNote: "The candidate passed review and should enter tracked portfolio diligence.",
    });
}

describe("approval requests and review checkpoints", () => {
  it("creates, exposes, approves, and records a comparison-to-portfolio checkpoint", async () => {
    const { app, actionExecutor } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const member = await register(app, "member@example.com");
    const selectedWorkspaceId = await workspaceId(app, owner.token);
    await addMember(app, owner.token, selectedWorkspaceId, "member@example.com", "member");
    const target = actionExecutor.seed(owner.userId);

    const created = await createApproval(app, member.token, selectedWorkspaceId, target.id).expect(201);
    expect(created.body).toMatchObject({
      alreadyPending: false,
      approval: {
        workspaceId: selectedWorkspaceId,
        targetEntityType: "comparison_item",
        targetEntityId: target.id,
        requestedAction: "comparison_handoff_to_portfolio",
        status: "pending",
        requester: { userId: member.userId, email: "member@example.com", role: "member" },
        canReview: false,
        canCancel: true,
      },
    });
    const approvalId = created.body.approval.id as string;

    const ownerQueue = await request(app)
      .get("/approvals?status=pending")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", selectedWorkspaceId)
      .expect(200);
    expect(ownerQueue.body.approvals[0]).toMatchObject({
      id: approvalId,
      canReview: true,
      canCancel: false,
    });

    const approved = await request(app)
      .post(`/approvals/${approvalId}/approve`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", selectedWorkspaceId)
      .send({ responseNote: "Approved for tracked diligence only." })
      .expect(200);
    expect(approved.body.approval).toMatchObject({
      status: "approved",
      reviewer: { userId: owner.userId, email: "owner@example.com", role: "owner" },
      reviewerResponseNote: "Approved for tracked diligence only.",
      outcome: { targetEntityType: "portfolio_item", alreadyExists: false },
      canReview: false,
      canCancel: false,
    });
    expect(actionExecutor.handoffs).toEqual([
      { tenantUserId: owner.userId, comparisonItemId: target.id },
    ]);

    const activity = await request(app)
      .get("/workspaces/current/activity?category=approvals")
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", selectedWorkspaceId)
      .expect(200);
    expect(activity.body.activities.map((entry: { eventType: string }) => entry.eventType)).toEqual([
      "approval_approved",
      "approval_requested",
    ]);
    expect(JSON.stringify(activity.body.activities)).not.toContain("Approved for tracked diligence only.");
  });

  it("supports rejection and cancellation without executing the sensitive action", async () => {
    const { app, actionExecutor } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const admin = await register(app, "admin@example.com");
    const member = await register(app, "member@example.com");
    const selectedWorkspaceId = await workspaceId(app, owner.token);
    await addMember(app, owner.token, selectedWorkspaceId, "admin@example.com", "admin");
    await addMember(app, owner.token, selectedWorkspaceId, "member@example.com", "member");

    const rejectedTarget = actionExecutor.seed(owner.userId);
    const rejectedRequest = await createApproval(
      app,
      member.token,
      selectedWorkspaceId,
      rejectedTarget.id,
    ).expect(201);
    const rejected = await request(app)
      .post(`/approvals/${rejectedRequest.body.approval.id as string}/reject`)
      .set("Authorization", `Bearer ${admin.token}`)
      .set("X-Workspace-Id", selectedWorkspaceId)
      .send({ responseNote: "County source date needs verification first." })
      .expect(200);
    expect(rejected.body.approval.status).toBe("rejected");

    const cancelledTarget = actionExecutor.seed(owner.userId);
    const cancelledRequest = await createApproval(
      app,
      member.token,
      selectedWorkspaceId,
      cancelledTarget.id,
    ).expect(201);
    const cancelled = await request(app)
      .post(`/approvals/${cancelledRequest.body.approval.id as string}/cancel`)
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", selectedWorkspaceId)
      .expect(200);
    expect(cancelled.body.approval.status).toBe("cancelled");
    expect(actionExecutor.handoffs).toEqual([]);
  });

  it("blocks self-review, unauthorized review, repeated resolution, and admin direct handoff", async () => {
    const { app, actionExecutor } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const admin = await register(app, "admin@example.com");
    const member = await register(app, "member@example.com");
    const selectedWorkspaceId = await workspaceId(app, owner.token);
    await addMember(app, owner.token, selectedWorkspaceId, "admin@example.com", "admin");
    await addMember(app, owner.token, selectedWorkspaceId, "member@example.com", "member");

    const adminTarget = actionExecutor.seed(owner.userId);
    const adminRequest = await createApproval(
      app,
      admin.token,
      selectedWorkspaceId,
      adminTarget.id,
    ).expect(201);
    const selfReview = await request(app)
      .post(`/approvals/${adminRequest.body.approval.id as string}/approve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .set("X-Workspace-Id", selectedWorkspaceId)
      .send({})
      .expect(403);
    expect(selfReview.body.error.code).toBe("approval_self_review_forbidden");

    const memberReview = await request(app)
      .post(`/approvals/${adminRequest.body.approval.id as string}/approve`)
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", selectedWorkspaceId)
      .send({})
      .expect(403);
    expect(memberReview.body.error.code).toBe("workspace_role_forbidden");

    const ownerBypass = await request(app)
      .post(`/comparison/${adminTarget.id}/handoff/portfolio`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", selectedWorkspaceId)
      .send({})
      .expect(409);
    expect(ownerBypass.body.error.code).toBe("approval_pending_review");

    await request(app)
      .post(`/approvals/${adminRequest.body.approval.id as string}/approve`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", selectedWorkspaceId)
      .send({})
      .expect(200);
    const repeated = await request(app)
      .post(`/approvals/${adminRequest.body.approval.id as string}/reject`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", selectedWorkspaceId)
      .send({ responseNote: "Too late." })
      .expect(409);
    expect(repeated.body.error.code).toBe("approval_already_resolved");

    const direct = await request(app)
      .post(`/comparison/${adminTarget.id}/handoff/portfolio`)
      .set("Authorization", `Bearer ${admin.token}`)
      .set("X-Workspace-Id", selectedWorkspaceId)
      .send({})
      .expect(403);
    expect(direct.body.error.code).toBe("workspace_role_forbidden");
  });

  it("rejects stale targets and does not disclose approvals across workspaces", async () => {
    const { app, actionExecutor } = createTestContext();
    const firstOwner = await register(app, "first@example.com");
    const firstMember = await register(app, "member@example.com");
    const secondOwner = await register(app, "second@example.com");
    const firstWorkspaceId = await workspaceId(app, firstOwner.token);
    const secondWorkspaceId = await workspaceId(app, secondOwner.token);
    await addMember(app, firstOwner.token, firstWorkspaceId, "member@example.com", "member");

    const target = actionExecutor.seed(firstOwner.userId);
    const created = await createApproval(app, firstMember.token, firstWorkspaceId, target.id).expect(201);
    const approvalId = created.body.approval.id as string;
    actionExecutor.remove(target.id);

    const stale = await request(app)
      .post(`/approvals/${approvalId}/approve`)
      .set("Authorization", `Bearer ${firstOwner.token}`)
      .set("X-Workspace-Id", firstWorkspaceId)
      .send({})
      .expect(409);
    expect(stale.body.error.code).toBe("approval_target_stale");

    const outsider = await request(app)
      .get(`/approvals/${approvalId}`)
      .set("Authorization", `Bearer ${secondOwner.token}`)
      .set("X-Workspace-Id", firstWorkspaceId)
      .expect(403);
    expect(outsider.body.error.code).toBe("workspace_access_denied");

    const nonDisclosing = await request(app)
      .get(`/approvals/${approvalId}`)
      .set("Authorization", `Bearer ${secondOwner.token}`)
      .set("X-Workspace-Id", secondWorkspaceId)
      .expect(404);
    expect(nonDisclosing.body.error.code).toBe("approval_not_found");
  });

  it("atomically claims a pending review before executing the sensitive action", async () => {
    const { app, actionExecutor } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const admin = await register(app, "admin@example.com");
    const member = await register(app, "member@example.com");
    const selectedWorkspaceId = await workspaceId(app, owner.token);
    await addMember(app, owner.token, selectedWorkspaceId, "admin@example.com", "admin");
    await addMember(app, owner.token, selectedWorkspaceId, "member@example.com", "member");
    const target = actionExecutor.seed(owner.userId);
    const created = await createApproval(app, member.token, selectedWorkspaceId, target.id).expect(201);
    const approvalId = created.body.approval.id as string;
    const blocker = actionExecutor.blockNextHandoff();

    const ownerReview = request(app)
      .post(`/approvals/${approvalId}/approve`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", selectedWorkspaceId)
      .send({});
    const ownerReviewResult = ownerReview.then((response) => response);
    await blocker.started;

    const concurrentReview = await request(app)
      .post(`/approvals/${approvalId}/approve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .set("X-Workspace-Id", selectedWorkspaceId)
      .send({})
      .expect(409);
    expect(concurrentReview.body.error.code).toBe("approval_review_in_progress");

    blocker.release();
    expect((await ownerReviewResult).status).toBe(200);
    expect(actionExecutor.handoffs).toEqual([
      { tenantUserId: owner.userId, comparisonItemId: target.id },
    ]);
  });
});
