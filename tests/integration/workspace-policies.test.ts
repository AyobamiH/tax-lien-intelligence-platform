import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type {
  ComparisonHandoffToPortfolioResponse,
  ComparisonHandoffToWatchlistResponse,
  ComparisonItemResponse,
  ReviewChecklistStateResponse,
  WorkspaceAssignmentDetailResponse,
} from "@tax-lien/types";
import { createApp } from "../../apps/api/src/app.js";
import {
  ApprovalService,
  type ApprovalActionExecutor,
} from "../../apps/api/src/approvals/approval-service.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type {
  CreateUserInput,
  StoredUser,
  UserStore,
} from "../../apps/api/src/auth/user-store.js";
import type { ComparisonService } from "../../apps/api/src/comparison/comparison-service.js";
import { WorkspacePolicyService } from "../../apps/api/src/workspace-policies/workspace-policy-service.js";
import { WorkspaceService } from "../../apps/api/src/workspaces/workspace-service.js";
import { InMemoryApprovalRequestStore } from "../support/in-memory-approval-store.js";
import {
  createInMemoryWorkspaceActivityService,
} from "../support/in-memory-workspace-activity-store.js";
import {
  enabledWorkspacePolicyRules,
  InMemoryWorkspacePolicyStore,
} from "../support/in-memory-workspace-policy-store.js";
import {
  InMemoryWorkspaceMembershipStore,
  InMemoryWorkspaceStore,
} from "../support/in-memory-workspace-store.js";

const testJwtSecret = "test-workspace-policy-secret-long-enough-for-jwt";

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

class MutablePolicyEvidence {
  public assigned = false;
  public checklistReady = false;

  public async getAssignment(): Promise<WorkspaceAssignmentDetailResponse> {
    return {
      assignment: this.assigned
        ? {
            id: new mongoose.Types.ObjectId().toString(),
            workspaceId: "workspace",
            relatedEntityType: "comparison_item",
            relatedEntityId: "target",
            assignee: {
              userId: new mongoose.Types.ObjectId().toString(),
              email: "assignee@example.com",
            },
            assignedByUserId: new mongoose.Types.ObjectId().toString(),
            assignedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : null,
    };
  }

  public async getChecklist(
    _context: unknown,
    _entityType: unknown,
    targetEntityId: string,
  ): Promise<ReviewChecklistStateResponse> {
    return {
      targetEntityType: "comparison_item",
      targetEntityId,
      ...(this.checklistReady
        ? {
            template: {
              id: new mongoose.Types.ObjectId().toString(),
              workspaceId: "workspace",
              targetEntityType: "comparison_item" as const,
              name: "Comparison review",
              active: true,
              version: 1,
              items: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }
        : {}),
      progress: {
        status: this.checklistReady ? "ready" : "not_configured",
        totalItems: this.checklistReady ? 1 : 0,
        completedItems: this.checklistReady ? 1 : 0,
        incompleteItems: 0,
        requiredItems: this.checklistReady ? 1 : 0,
        completedRequiredItems: this.checklistReady ? 1 : 0,
        incompleteRequiredItems: 0,
        allRequiredComplete: this.checklistReady,
      },
    };
  }
}

class InMemoryComparisonExecutor implements ApprovalActionExecutor {
  public readonly target: ComparisonItemResponse;
  public watchlistHandoffs = 0;
  public portfolioHandoffs = 0;

  public constructor() {
    const now = new Date().toISOString();
    this.target = {
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
  }

  public async getItem(_userId: string, comparisonItemId: string): Promise<ComparisonItemResponse> {
    if (comparisonItemId !== this.target.id) {
      throw new Error("Target not found.");
    }
    return this.target;
  }

  public async handoffToWatchlist(): Promise<ComparisonHandoffToWatchlistResponse> {
    this.watchlistHandoffs += 1;
    return {
      destination: "watchlist",
      alreadyExists: false,
      item: {
        id: new mongoose.Types.ObjectId().toString(),
        datasetId: this.target.datasetId,
        scoredRecordId: this.target.scoredRecordId,
        sourceRowNumber: this.target.sourceRowNumber,
        normalizedFields: this.target.normalizedFields,
        investmentScore: this.target.investmentScore,
        riskScore: this.target.riskScore,
        liquidityScore: this.target.liquidityScore,
        redemptionProbability: this.target.redemptionProbability,
        confidenceScore: this.target.confidenceScore,
        valueCoverageRatio: this.target.valueCoverageRatio,
        flags: [],
        reasoning: [],
        scoredAt: this.target.scoredAt,
        addedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      historyEvent: historyEvent("comparison_handoff_to_watchlist"),
    };
  }

  public async handoffToPortfolio(): Promise<ComparisonHandoffToPortfolioResponse> {
    this.portfolioHandoffs += 1;
    return {
      destination: "portfolio",
      alreadyExists: false,
      item: {
        id: new mongoose.Types.ObjectId().toString(),
        datasetId: this.target.datasetId,
        scoredRecordId: this.target.scoredRecordId,
        status: "tracked",
        statusUpdatedAt: new Date().toISOString(),
        sourceRowNumber: this.target.sourceRowNumber,
        normalizedFields: this.target.normalizedFields,
        investmentScore: this.target.investmentScore,
        riskScore: this.target.riskScore,
        liquidityScore: this.target.liquidityScore,
        redemptionProbability: this.target.redemptionProbability,
        confidenceScore: this.target.confidenceScore,
        valueCoverageRatio: this.target.valueCoverageRatio,
        flags: [],
        reasoning: [],
        scoredAt: this.target.scoredAt,
        trackedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      historyEvent: historyEvent("comparison_handoff_to_portfolio"),
    };
  }
}

function historyEvent(
  eventType: "comparison_handoff_to_watchlist" | "comparison_handoff_to_portfolio",
) {
  const now = new Date().toISOString();
  return {
    id: new mongoose.Types.ObjectId().toString(),
    relatedEntityType: "comparison_item" as const,
    relatedEntityId: new mongoose.Types.ObjectId().toString(),
    eventType,
    metadata: {},
    createdAt: now,
    updatedAt: now,
  };
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
  const evidence = new MutablePolicyEvidence();
  const policyService = new WorkspacePolicyService(
    new InMemoryWorkspacePolicyStore(),
    { get: () => evidence.getAssignment() },
    { getState: (...args) => evidence.getChecklist(...args) },
  );
  const comparison = new InMemoryComparisonExecutor();
  const approvalService = new ApprovalService(
    new InMemoryApprovalRequestStore(),
    comparison,
    policyService,
  );
  return {
    app: createApp({
      authService,
      workspaceService,
      workspaceActivityService: createInMemoryWorkspaceActivityService(userStore),
      comparisonService: comparison as unknown as ComparisonService,
      approvalService,
      workspacePolicyService: policyService,
    }),
    evidence,
    comparison,
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

function policyRequest(app: ReturnType<typeof createApp>, token: string, id: string) {
  return request(app)
    .put("/workspace-policies")
    .set("Authorization", `Bearer ${token}`)
    .set("X-Workspace-Id", id);
}

describe("workspace policies", () => {
  it("retrieves default-off policy and restricts updates without cross-workspace leakage", async () => {
    const { app } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const member = await register(app, "member@example.com");
    const outsider = await register(app, "outsider@example.com");
    const ownerWorkspaceId = await workspaceId(app, owner.token);
    await request(app)
      .post("/workspaces/current/members")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", ownerWorkspaceId)
      .send({ email: "member@example.com", role: "member" })
      .expect(201);

    const defaults = await request(app)
      .get("/workspace-policies")
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", ownerWorkspaceId)
      .expect(200);
    expect(defaults.body.rules).toEqual({
      requireAssignmentBeforeComparisonHandoff: false,
      requireChecklistBeforeComparisonHandoff: false,
      requireApprovalForComparisonPortfolio: false,
    });

    await policyRequest(app, member.token, ownerWorkspaceId)
      .send({ rules: enabledWorkspacePolicyRules })
      .expect(403);

    const saved = await policyRequest(app, owner.token, ownerWorkspaceId)
      .send({ rules: enabledWorkspacePolicyRules })
      .expect(200);
    expect(saved.body.rules).toEqual(enabledWorkspacePolicyRules);

    const leaked = await request(app)
      .get("/workspace-policies")
      .set("Authorization", `Bearer ${outsider.token}`)
      .set("X-Workspace-Id", ownerWorkspaceId)
      .expect(403);
    expect(leaked.body.error.code).toBe("workspace_access_denied");
  });

  it("blocks handoffs with structured requirements and allows them after evidence is satisfied", async () => {
    const { app, evidence, comparison } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const id = await workspaceId(app, owner.token);
    await policyRequest(app, owner.token, id)
      .send({ rules: enabledWorkspacePolicyRules })
      .expect(200);

    const blocked = await request(app)
      .post(`/comparison/${comparison.target.id}/handoff/watchlist`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", id)
      .expect(409);
    expect(blocked.body.error.code).toBe("workspace_policy_blocked");
    expect(blocked.body.error.details).toMatchObject({
      allowed: false,
      action: "comparison_handoff_to_watchlist",
      unmetRequirements: [
        { code: "assignment_required" },
        { code: "checklist_required" },
      ],
    });
    expect(comparison.watchlistHandoffs).toBe(0);

    evidence.assigned = true;
    evidence.checklistReady = true;
    await request(app)
      .post(`/comparison/${comparison.target.id}/handoff/watchlist`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", id)
      .expect(201);
    expect(comparison.watchlistHandoffs).toBe(1);

    const approvalBlocked = await request(app)
      .post(`/comparison/${comparison.target.id}/handoff/portfolio`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", id)
      .send({})
      .expect(409);
    expect(approvalBlocked.body.error.details.unmetRequirements).toMatchObject([
      { code: "approval_required" },
    ]);
  });

  it("allows the approval path to satisfy the portfolio rule and rechecks readiness at resolution", async () => {
    const { app, evidence, comparison } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const admin = await register(app, "admin@example.com");
    const id = await workspaceId(app, owner.token);
    await request(app)
      .post("/workspaces/current/members")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", id)
      .send({ email: "admin@example.com", role: "admin" })
      .expect(201);
    await policyRequest(app, owner.token, id)
      .send({ rules: enabledWorkspacePolicyRules })
      .expect(200);
    evidence.assigned = true;
    evidence.checklistReady = true;

    const created = await request(app)
      .post("/approvals")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", id)
      .send({
        targetEntityType: "comparison_item",
        targetEntityId: comparison.target.id,
        requestedAction: "comparison_handoff_to_portfolio",
        requestNote: "Ready for independent review.",
      })
      .expect(201);

    evidence.checklistReady = false;
    const stale = await request(app)
      .post(`/approvals/${created.body.approval.id}/approve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .set("X-Workspace-Id", id)
      .send({ responseNote: "Approved." })
      .expect(409);
    expect(stale.body.error.details.unmetRequirements).toMatchObject([
      { code: "checklist_required" },
    ]);
    expect(comparison.portfolioHandoffs).toBe(0);

    evidence.checklistReady = true;
    await request(app)
      .post(`/approvals/${created.body.approval.id}/approve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .set("X-Workspace-Id", id)
      .send({ responseNote: "Approved after checklist review." })
      .expect(200);
    expect(comparison.portfolioHandoffs).toBe(1);
  });
});
