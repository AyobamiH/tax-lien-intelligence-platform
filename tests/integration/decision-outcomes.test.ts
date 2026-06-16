import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type {
  ApprovalRequestResponse,
  ComparisonItemResponse,
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
import { WorkspaceService } from "../../apps/api/src/workspaces/workspace-service.js";
import { InMemoryDecisionOutcomeStore } from "../support/in-memory-decision-outcome-store.js";
import {
  createInMemoryWorkspaceActivityService,
} from "../support/in-memory-workspace-activity-store.js";
import {
  InMemoryWorkspaceMembershipStore,
  InMemoryWorkspaceStore,
} from "../support/in-memory-workspace-store.js";

const testJwtSecret = "test-decision-outcome-secret-long-enough-for-jwt";

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
      sourceRowNumber: 7,
      normalizedFields: {
        parcelId: "PX-42",
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

  public async getItem(tenantUserId: string, comparisonItemId: string): Promise<ComparisonItemResponse> {
    const target = this.targets.get(comparisonItemId);
    if (!target || target.tenantUserId !== tenantUserId) {
      throw new ApiError(404, "comparison_item_not_found", "Comparison item was not found.");
    }
    return target.item;
  }
}

class MutableGovernanceEvidence {
  public policyAllowed = true;
  public hasPendingApproval = false;

  public async evaluate(): Promise<WorkspacePolicyEvaluation> {
    if (this.policyAllowed) {
      return {
        action: "approval_request_comparison_portfolio",
        allowed: true,
        unmetRequirements: [],
      };
    }
    return {
      action: "approval_request_comparison_portfolio",
      allowed: false,
      unmetRequirements: [
        {
          code: "checklist_required",
          message: "All required review checklist items must be complete before this action.",
          resolution: "Complete every required comparison checklist item.",
        },
      ],
    };
  }

  public async listApprovals(targetEntityId: string): Promise<{ approvals: ApprovalRequestResponse[] }> {
    if (!this.hasPendingApproval) {
      return { approvals: [] };
    }
    const now = new Date().toISOString();
    return {
      approvals: [
        {
          id: new mongoose.Types.ObjectId().toString(),
          workspaceId: "workspace",
          targetEntityType: "comparison_item",
          targetEntityId,
          requestedAction: "comparison_handoff_to_portfolio",
          status: "pending",
          requester: { userId: new mongoose.Types.ObjectId().toString(), email: "requester@example.com", role: "member" },
          requestNote: "Please review before final approval.",
          canReview: false,
          canCancel: false,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
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
  const governance = new MutableGovernanceEvidence();
  const activityService = createInMemoryWorkspaceActivityService(userStore);
  const decisionOutcomeService = new DecisionOutcomeService(
    new InMemoryDecisionOutcomeStore(),
    comparison,
    { list: async (_context, _actorUserId, options) => governance.listApprovals(options.targetEntityId ?? "") },
    { evaluateComparisonAction: () => governance.evaluate() },
  );
  return {
    app: createApp({
      authService,
      workspaceService,
      workspaceActivityService: activityService,
      decisionOutcomeService,
    }),
    comparison,
    governance,
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

function outcomeRequest(
  app: ReturnType<typeof createApp>,
  token: string,
  workspaceId: string,
  targetId: string,
) {
  return request(app)
    .put(`/decision-outcomes/comparison_item/${targetId}`)
    .set("Authorization", `Bearer ${token}`)
    .set("X-Workspace-Id", workspaceId);
}

describe("decision outcomes", () => {
  it("creates a final outcome with resolver attribution and activity", async () => {
    const { app, comparison } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const target = comparison.seed(owner.userId);

    const created = await outcomeRequest(app, owner.token, workspaceId, target.id)
      .send({ status: "declined", note: "Title risk is too high for this sale." })
      .expect(201);

    expect(created.body).toMatchObject({
      changed: true,
      state: {
        targetEntityType: "comparison_item",
        targetEntityId: target.id,
        resolved: true,
        outcome: {
          workspaceId,
          status: "declined",
          note: "Title risk is too high for this sale.",
          resolver: { userId: owner.userId, email: "owner@example.com", role: "owner" },
        },
      },
    });
    expect(created.body.state.outcome.resolvedAt).toEqual(expect.any(String));

    const fetched = await request(app)
      .get(`/decision-outcomes/comparison_item/${target.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(fetched.body.state).toBeUndefined();
    expect(fetched.body).toMatchObject({
      resolved: true,
      outcome: { id: created.body.state.outcome.id, status: "declined" },
    });

    const activity = await request(app)
      .get("/workspaces/current/activity?category=decisions")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(activity.body.activities[0]).toMatchObject({
      eventType: "decision_outcome_resolved",
      relatedEntityType: "comparison_item",
      relatedEntityId: target.id,
      metadata: {
        decisionOutcomeId: created.body.state.outcome.id,
        decisionOutcomeStatus: "declined",
      },
    });
  });

  it("updates supported outcome states without creating conflicting records", async () => {
    const { app, comparison } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const target = comparison.seed(owner.userId);

    const first = await outcomeRequest(app, owner.token, workspaceId, target.id)
      .send({ status: "declined", note: "Risk is too high." })
      .expect(201);
    const updated = await outcomeRequest(app, owner.token, workspaceId, target.id)
      .send({ status: "deferred", note: "Defer until county file is refreshed." })
      .expect(201);
    const repeated = await outcomeRequest(app, owner.token, workspaceId, target.id)
      .send({ status: "deferred", note: "Defer until county file is refreshed." })
      .expect(200);

    expect(updated.body.state.outcome.id).toBe(first.body.state.outcome.id);
    expect(updated.body.state.outcome.status).toBe("deferred");
    expect(repeated.body.changed).toBe(false);
    expect(repeated.body.state.outcome.id).toBe(first.body.state.outcome.id);
  });

  it("rejects invalid outcome payloads", async () => {
    const { app, comparison } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const target = comparison.seed(owner.userId);

    const invalidStatus = await outcomeRequest(app, owner.token, workspaceId, target.id)
      .send({ status: "won", note: "Looks good." })
      .expect(400);
    expect(invalidStatus.body.error.code).toBe("validation_failed");

    const invalidNote = await outcomeRequest(app, owner.token, workspaceId, target.id)
      .send({ status: "archived", note: "Bad\u0001note" })
      .expect(400);
    expect(invalidNote.body.error.code).toBe("validation_failed");
  });

  it("keeps approved outcomes coherent with policy and pending approvals", async () => {
    const { app, comparison, governance } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const target = comparison.seed(owner.userId);

    governance.policyAllowed = false;
    const policyBlocked = await outcomeRequest(app, owner.token, workspaceId, target.id)
      .send({ status: "approved", note: "Approved for final internal decision." })
      .expect(409);
    expect(policyBlocked.body.error.code).toBe("decision_outcome_prerequisite_blocked");

    governance.policyAllowed = true;
    governance.hasPendingApproval = true;
    const pendingBlocked = await outcomeRequest(app, owner.token, workspaceId, target.id)
      .send({ status: "approved", note: "Approved for final internal decision." })
      .expect(409);
    expect(pendingBlocked.body.error.code).toBe("decision_outcome_pending_approval");

    governance.hasPendingApproval = false;
    await outcomeRequest(app, owner.token, workspaceId, target.id)
      .send({ status: "approved", note: "Approved after prerequisites were satisfied." })
      .expect(201);
  });

  it("rejects cross-workspace reads and member writes", async () => {
    const { app, comparison } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const member = await register(app, "member@example.com");
    const outsider = await register(app, "outsider@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const outsiderWorkspaceId = await currentWorkspaceId(app, outsider.token);
    const target = comparison.seed(owner.userId);
    await addMember(app, owner.token, workspaceId, "member@example.com", "member");

    await request(app)
      .get(`/decision-outcomes/comparison_item/${target.id}`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .set("X-Workspace-Id", outsiderWorkspaceId)
      .expect(404);

    await outcomeRequest(app, outsider.token, outsiderWorkspaceId, target.id)
      .send({ status: "archived", note: "Cannot resolve across workspace." })
      .expect(404);

    await outcomeRequest(app, member.token, workspaceId, target.id)
      .send({ status: "archived", note: "Members can read but not resolve." })
      .expect(403);
  });
});
