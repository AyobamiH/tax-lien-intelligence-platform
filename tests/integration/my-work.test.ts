import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type {
  ComparisonHandoffToPortfolioResponse,
  ComparisonItemResponse,
} from "@tax-lien/types";
import { AlertService } from "../../apps/api/src/alerts/alert-service.js";
import {
  ApprovalService,
  type ApprovalActionExecutor,
} from "../../apps/api/src/approvals/approval-service.js";
import { createApp } from "../../apps/api/src/app.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import { DiscussionAttentionService } from "../../apps/api/src/discussion-attention/discussion-attention-service.js";
import { ApiError } from "../../apps/api/src/errors/api-error.js";
import { FollowService } from "../../apps/api/src/follows/follow-service.js";
import { MyWorkService } from "../../apps/api/src/my-work/my-work-service.js";
import { WorkspaceAssignmentService } from "../../apps/api/src/workspace-assignments/workspace-assignment-service.js";
import { WorkspaceActivityService } from "../../apps/api/src/workspace-activity/workspace-activity-service.js";
import { WorkspaceCommentNotificationService } from "../../apps/api/src/workspace-comments/workspace-comment-notification-service.js";
import { WorkspaceCommentService } from "../../apps/api/src/workspace-comments/workspace-comment-service.js";
import { WorkspaceService } from "../../apps/api/src/workspaces/workspace-service.js";
import { InMemoryAlertStore } from "../support/in-memory-alert-store.js";
import { InMemoryApprovalRequestStore } from "../support/in-memory-approval-store.js";
import { InMemoryDiscussionAttentionStore } from "../support/in-memory-discussion-attention-store.js";
import { InMemoryFollowStore } from "../support/in-memory-follow-store.js";
import { InMemoryWorkspaceAssignmentStore } from "../support/in-memory-workspace-assignment-store.js";
import { InMemoryWorkspaceActivityStore } from "../support/in-memory-workspace-activity-store.js";
import {
  InMemoryWorkspaceCommentStore,
  InMemoryWorkspaceCommentTargetAccess,
} from "../support/in-memory-workspace-comment-store.js";
import {
  InMemoryWorkspaceMembershipStore,
  InMemoryWorkspaceStore,
} from "../support/in-memory-workspace-store.js";

const testJwtSecret = "test-my-work-secret-that-is-long-enough-for-jwt";

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
  const membershipStore = new InMemoryWorkspaceMembershipStore();
  const workspaceService = new WorkspaceService(
    new InMemoryWorkspaceStore(),
    membershipStore,
    userStore,
  );
  const authService = new AuthService(userStore, {
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });
  const targetAccess = new InMemoryWorkspaceCommentTargetAccess();
  const alertService = new AlertService(new InMemoryAlertStore());
  const activityService = new WorkspaceActivityService(
    new InMemoryWorkspaceActivityStore(),
    userStore,
  );
  const attentionService = new DiscussionAttentionService(
    new InMemoryDiscussionAttentionStore(),
  );
  const workspaceCommentService = new WorkspaceCommentService(
    new InMemoryWorkspaceCommentStore(),
    userStore,
    targetAccess,
    attentionService,
    new WorkspaceCommentNotificationService(
      membershipStore,
      attentionService,
      alertService,
    ),
  );
  const followService = new FollowService(
    new InMemoryFollowStore(),
    targetAccess,
    membershipStore,
    userStore,
    alertService,
  );
  const workspaceAssignmentService = new WorkspaceAssignmentService(
    new InMemoryWorkspaceAssignmentStore(),
    membershipStore,
    userStore,
    targetAccess,
    alertService,
    activityService,
    followService,
  );
  const actionExecutor = new InMemoryApprovalActionExecutor();
  const approvalService = new ApprovalService(
    new InMemoryApprovalRequestStore(),
    actionExecutor,
  );
  const myWorkService = new MyWorkService(
    workspaceAssignmentService,
    approvalService,
    attentionService,
    targetAccess,
    followService,
  );

  return {
    app: createApp({
      authService,
      alertService,
      workspaceService,
      workspaceActivityService: activityService,
      workspaceCommentService,
      workspaceAssignmentService,
      approvalService,
      myWorkService,
      followService,
    }),
    targetAccess,
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

async function currentWorkspaceId(app: ReturnType<typeof createApp>, token: string): Promise<string> {
  const response = await request(app)
    .get("/workspaces/current")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  return response.body.workspace.id as string;
}

async function addMember(
  app: ReturnType<typeof createApp>,
  ownerToken: string,
  workspaceId: string,
  email: string,
  role: "admin" | "member",
): Promise<void> {
  await request(app)
    .post("/workspaces/current/members")
    .set("Authorization", `Bearer ${ownerToken}`)
    .set("X-Workspace-Id", workspaceId)
    .send({ email, role })
    .expect(201);
}

function getMyWork(
  app: ReturnType<typeof createApp>,
  token: string,
  workspaceId: string,
) {
  return request(app)
    .get("/my-work")
    .set("Authorization", `Bearer ${token}`)
    .set("X-Workspace-Id", workspaceId);
}

describe("my-work dashboard aggregation", () => {
  it("aggregates assignments, reviewable approvals, and unread discussion without exposing comment bodies", async () => {
    const { app, targetAccess, actionExecutor } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const admin = await register(app, "admin@example.com");
    const member = await register(app, "member@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    await addMember(app, owner.token, workspaceId, "admin@example.com", "admin");
    await addMember(app, owner.token, workspaceId, "member@example.com", "member");

    const assignmentTargetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("dataset", assignmentTargetId, owner.userId);
    await request(app)
      .patch(`/assignments/dataset/${assignmentTargetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ assigneeUserId: admin.userId })
      .expect(200);

    const approvalTarget = actionExecutor.seed(owner.userId);
    targetAccess.allow("comparison_item", approvalTarget.id, owner.userId);
    await request(app)
      .post("/approvals")
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({
        targetEntityType: "comparison_item",
        targetEntityId: approvalTarget.id,
        requestedAction: "comparison_handoff_to_portfolio",
        requestNote: "Ready for a second set of eyes before portfolio tracking.",
      })
      .expect(201);

    const discussionTargetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("portfolio_item", discussionTargetId, owner.userId);
    await request(app)
      .post(`/comments/portfolio_item/${discussionTargetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ body: "Private diligence detail must stay on the thread." })
      .expect(201);

    const followedTargetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("watchlist_item", followedTargetId, owner.userId);
    await request(app)
      .put(`/follows/watchlist_item/${followedTargetId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(201);

    const response = await getMyWork(app, admin.token, workspaceId).expect(200);
    expect(response.body).toMatchObject({
      workspaceId,
      counts: {
        assigned: 1,
        approvals: 1,
        unreadDiscussions: 1,
        unreadMessages: 1,
        following: 1,
        totalActionable: 3,
      },
      queues: {
        assignments: {
          count: 1,
          items: [
            {
              relatedEntityType: "dataset",
              relatedEntityId: assignmentTargetId,
              assignee: { userId: admin.userId, email: "admin@example.com" },
            },
          ],
        },
        approvals: {
          count: 1,
          items: [
            {
              targetEntityId: approvalTarget.id,
              status: "pending",
              canReview: true,
              canCancel: false,
            },
          ],
        },
        discussions: {
          count: 1,
          unreadCount: 1,
          items: [
            {
              relatedEntityType: "portfolio_item",
              relatedEntityId: discussionTargetId,
              unreadCount: 1,
              hasUnread: true,
            },
          ],
        },
        following: {
          count: 1,
          items: [
            {
              targetEntityType: "watchlist_item",
              targetEntityId: followedTargetId,
            },
          ],
        },
      },
    });
    expect(response.body.generatedAt).toEqual(expect.any(String));
    expect(JSON.stringify(response.body)).not.toContain("Private diligence detail");

    const requesterView = await getMyWork(app, member.token, workspaceId).expect(200);
    expect(requesterView.body.counts.approvals).toBe(0);
    expect(requesterView.body.queues.approvals.items).toEqual([]);
  });

  it("returns an explicit empty state and filters targets that are no longer accessible", async () => {
    const { app, targetAccess, actionExecutor } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const admin = await register(app, "admin@example.com");
    const member = await register(app, "member@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    await addMember(app, owner.token, workspaceId, "admin@example.com", "admin");
    await addMember(app, owner.token, workspaceId, "member@example.com", "member");

    const initiallyEmpty = await getMyWork(app, admin.token, workspaceId).expect(200);
    expect(initiallyEmpty.body.counts).toEqual({
      assigned: 0,
      approvals: 0,
      unreadDiscussions: 0,
      unreadMessages: 0,
      following: 0,
      totalActionable: 0,
    });
    expect(initiallyEmpty.body.queues).toMatchObject({
      assignments: { count: 0, items: [] },
      approvals: { count: 0, items: [] },
      discussions: { count: 0, unreadCount: 0, items: [] },
      following: { count: 0, items: [] },
    });

    const assignmentTargetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("dataset", assignmentTargetId, owner.userId);
    await request(app)
      .patch(`/assignments/dataset/${assignmentTargetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ assigneeUserId: admin.userId })
      .expect(200);

    const approvalTarget = actionExecutor.seed(owner.userId);
    targetAccess.allow("comparison_item", approvalTarget.id, owner.userId);
    await request(app)
      .post("/approvals")
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({
        targetEntityType: "comparison_item",
        targetEntityId: approvalTarget.id,
        requestedAction: "comparison_handoff_to_portfolio",
        requestNote: "Request review before handoff.",
      })
      .expect(201);

    const discussionTargetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("watchlist_item", discussionTargetId, owner.userId);
    await request(app)
      .post(`/comments/watchlist_item/${discussionTargetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ body: "Review this candidate." })
      .expect(201);

    targetAccess.deny("dataset", assignmentTargetId, owner.userId);
    targetAccess.deny("comparison_item", approvalTarget.id, owner.userId);
    targetAccess.deny("watchlist_item", discussionTargetId, owner.userId);

    const staleFiltered = await getMyWork(app, admin.token, workspaceId).expect(200);
    expect(staleFiltered.body.counts.totalActionable).toBe(0);
    expect(staleFiltered.body.queues.assignments.items).toEqual([]);
    expect(staleFiltered.body.queues.approvals.items).toEqual([]);
    expect(staleFiltered.body.queues.discussions.items).toEqual([]);
  });

  it("requires authentication and active membership in the selected workspace", async () => {
    const { app } = createTestContext();
    await request(app).get("/my-work").expect(401);

    const owner = await register(app, "owner@example.com");
    const outsider = await register(app, "outsider@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);

    const rejected = await getMyWork(app, outsider.token, workspaceId).expect(403);
    expect(rejected.body.error.code).toBe("workspace_access_denied");

    const outsiderWorkspaceId = await currentWorkspaceId(app, outsider.token);
    const ownWorkspace = await getMyWork(app, outsider.token, outsiderWorkspaceId).expect(200);
    expect(ownWorkspace.body.workspaceId).toBe(outsiderWorkspaceId);
    expect(ownWorkspace.body.counts.totalActionable).toBe(0);
  });
});
