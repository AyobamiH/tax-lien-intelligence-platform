import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type {
  ApprovalRequestResponse,
  ComparisonItemResponse,
  DatasetResponse,
  DecisionHistoryEventResponse,
  ReviewChecklistStateResponse,
  WorkspaceAssignmentDetailResponse,
  WorkspaceCommentListResponse,
  WorkspacePolicyEvaluation,
} from "@tax-lien/types";
import { createApp } from "../../apps/api/src/app.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type {
  CreateUserInput,
  StoredUser,
  UserStore,
} from "../../apps/api/src/auth/user-store.js";
import { DecisionBriefService } from "../../apps/api/src/decision-briefs/decision-brief-service.js";
import { ApiError } from "../../apps/api/src/errors/api-error.js";
import { WorkspaceService } from "../../apps/api/src/workspaces/workspace-service.js";
import {
  InMemoryWorkspaceMembershipStore,
  InMemoryWorkspaceStore,
} from "../support/in-memory-workspace-store.js";

const testJwtSecret = "test-decision-brief-secret-long-enough-for-jwt";

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

class FakeComparisonEvidence {
  private readonly targets = new Map<string, { tenantUserId: string; item: ComparisonItemResponse }>();
  public history: DecisionHistoryEventResponse[] = [];

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
      note: "Strong candidate if assignment and approval gates are satisfied.",
      noteUpdatedAt: now,
      sourceRowNumber: 12,
      normalizedFields: {
        parcelId: "PX-410",
        lienAmount: 1750,
        estimatedValue: 32000,
        propertyType: "Single family",
        propertyTypeCategory: "residential",
        address: "410 Cedar Street",
      },
      investmentScore: 86,
      riskScore: 22,
      liquidityScore: 74,
      redemptionProbability: 0.69,
      confidenceScore: 91,
      valueCoverageRatio: 18.29,
      flags: ["Verify owner redemption history."],
      reasoning: ["High value coverage and clean normalized parcel identity."],
      scoredAt: now,
      addedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.targets.set(item.id, { tenantUserId, item });
    this.history = [
      {
        id: new mongoose.Types.ObjectId().toString(),
        relatedEntityType: "comparison_item",
        relatedEntityId: item.id,
        eventType: "comparison_decision_changed",
        previousDecision: "keep_reviewing",
        newDecision: "move_forward",
        metadata: { datasetId: item.datasetId },
        createdAt: now,
        updatedAt: now,
      },
    ];
    return item;
  }

  public async getItem(tenantUserId: string, comparisonItemId: string): Promise<ComparisonItemResponse> {
    const target = this.targets.get(comparisonItemId);
    if (!target || target.tenantUserId !== tenantUserId) {
      throw new ApiError(404, "comparison_item_not_found", "Comparison item was not found.");
    }
    return target.item;
  }

  public async listHistory(tenantUserId: string, comparisonItemId: string) {
    await this.getItem(tenantUserId, comparisonItemId);
    return { events: this.history };
  }

  public findByDataset(datasetId: string, tenantUserId: string): ComparisonItemResponse | null {
    const target = [...this.targets.values()].find(
      (candidate) => candidate.item.datasetId === datasetId && candidate.tenantUserId === tenantUserId,
    );
    return target?.item ?? null;
  }
}

class FakeDecisionBriefEvidence {
  public datasetMissing = false;
  public readonly comparison = new FakeComparisonEvidence();
  public assignment: WorkspaceAssignmentDetailResponse = { assignment: null };
  public checklist: ReviewChecklistStateResponse | null = null;
  public approvals: ApprovalRequestResponse[] = [];
  public comments: WorkspaceCommentListResponse["comments"] = [];
  public policyEvaluations: WorkspacePolicyEvaluation[] = [];

  public seed(tenantUserId: string): ComparisonItemResponse {
    const item = this.comparison.seed(tenantUserId);
    const now = new Date().toISOString();
    this.assignment = {
      assignment: {
        id: new mongoose.Types.ObjectId().toString(),
        workspaceId: "workspace",
        relatedEntityType: "comparison_item",
        relatedEntityId: item.id,
        assignee: { userId: new mongoose.Types.ObjectId().toString(), email: "analyst@example.com" },
        assignedBy: { userId: tenantUserId, email: "owner@example.com" },
        assignedAt: now,
        updatedAt: now,
      },
    };
    this.checklist = {
      targetEntityType: "comparison_item",
      targetEntityId: item.id,
      template: {
        id: new mongoose.Types.ObjectId().toString(),
        workspaceId: "workspace",
        targetEntityType: "comparison_item",
        name: "Comparison diligence",
        active: true,
        version: 1,
        items: [{ id: new mongoose.Types.ObjectId().toString(), label: "Verify parcel", required: true, position: 0 }],
        createdAt: now,
        updatedAt: now,
      },
      checklist: {
        id: new mongoose.Types.ObjectId().toString(),
        workspaceId: "workspace",
        targetEntityType: "comparison_item",
        targetEntityId: item.id,
        templateId: new mongoose.Types.ObjectId().toString(),
        templateName: "Comparison diligence",
        templateVersion: 1,
        items: [
          {
            id: new mongoose.Types.ObjectId().toString(),
            label: "Verify parcel",
            required: true,
            position: 0,
            completed: true,
            completedBy: { userId: tenantUserId, email: "owner@example.com" },
            completedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
      progress: {
        status: "ready",
        totalItems: 1,
        completedItems: 1,
        incompleteItems: 0,
        requiredItems: 1,
        completedRequiredItems: 1,
        incompleteRequiredItems: 0,
        allRequiredComplete: true,
      },
    };
    this.approvals = [
      {
        id: new mongoose.Types.ObjectId().toString(),
        workspaceId: "workspace",
        targetEntityType: "comparison_item",
        targetEntityId: item.id,
        requestedAction: "comparison_handoff_to_portfolio",
        status: "pending",
        requester: { userId: tenantUserId, email: "owner@example.com", role: "owner" },
        requestNote: "Please verify before portfolio handoff.",
        canReview: false,
        canCancel: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    this.comments = [
      {
        id: new mongoose.Types.ObjectId().toString(),
        workspaceId: "workspace",
        author: { userId: tenantUserId, email: "owner@example.com" },
        relatedEntityType: "comparison_item",
        relatedEntityId: item.id,
        body: "Check county file freshness before moving forward.",
        canDelete: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    this.policyEvaluations = [
      {
        action: "comparison_handoff_to_watchlist",
        allowed: true,
        unmetRequirements: [],
      },
      {
        action: "comparison_handoff_to_portfolio",
        allowed: false,
        unmetRequirements: [
          {
            code: "approval_required",
            message: "Workspace policy requires approval before moving this item to portfolio.",
            resolution: "Create an approval request and have a different owner or administrator approve it.",
          },
        ],
      },
    ];
    return item;
  }

  public datasetFor(item: ComparisonItemResponse): DatasetResponse {
    const now = new Date().toISOString();
    return {
      id: item.datasetId,
      originalFilename: "maricopa-june.csv",
      sourceType: "manual_csv",
      sourceLabel: "June Maricopa sale",
      status: "validated",
      rowCount: 120,
      columnCount: 8,
      headers: ["parcel", "lien", "value"],
      validationSummary: { totalRows: 120, validRows: 118, invalidRows: 2, warnings: [], errors: [] },
      importSummary: {
        adapterMatched: true,
        adapterId: "maricopa_tax_lien_v1",
        adapterName: "Maricopa tax lien CSV",
        source: "county_adapter",
        confidence: "high",
        fallbackUsed: false,
        mappedFields: ["parcel_id", "lien_amount", "estimated_value"],
        warnings: [],
      },
      readinessSummary: {
        status: "ready",
        score: 94,
        scoringRecommended: true,
        fieldCoverage: [],
        issues: [],
        guidance: ["Dataset is ready for scoring review."],
      },
      manualMapping: { mappings: [] },
      importProfile: { status: "none", matchedMappings: 0, totalMappings: 0, message: "No import profile applied." },
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
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
  const evidence = new FakeDecisionBriefEvidence();
  const decisionBriefService = new DecisionBriefService(
    evidence.comparison,
    {
      getDatasetForUser: async (datasetId, tenantUserId) => {
        const target = evidence.comparison.findByDataset(datasetId, tenantUserId);
        if (!target || evidence.datasetMissing) {
          throw new ApiError(404, "dataset_not_found", "Dataset was not found.");
        }
        return { dataset: evidence.datasetFor(target) };
      },
    },
    { get: async () => evidence.assignment },
    {
      getState: async (_context, _type, targetEntityId) => {
        if (!evidence.checklist) {
          throw new ApiError(404, "review_checklist_target_not_found", "Checklist target was not found.");
        }
        return { ...evidence.checklist, targetEntityId };
      },
    },
    { list: async () => ({ approvals: evidence.approvals }) },
    {
      list: async (_context, entityType, entityId) => {
        const latestCommentAt = evidence.comments[0]?.createdAt;
        return {
          comments: evidence.comments,
          attention: {
            workspaceId: "workspace",
            relatedEntityType: entityType,
            relatedEntityId: entityId,
            unreadCount: 1,
            hasUnread: true,
            ...(latestCommentAt ? { latestCommentAt } : {}),
          },
        };
      },
    },
    {
      evaluateComparisonAction: async (_context, action) =>
        evidence.policyEvaluations.find((evaluation) => evaluation.action === action) ?? {
          action,
          allowed: true,
          unmetRequirements: [],
        },
    },
    {
      getState: async (_context, _entityType, targetEntityId) => ({
        targetEntityType: "comparison_item",
        targetEntityId,
        resolved: false,
      }),
    },
  );

  return {
    app: createApp({ authService, workspaceService, decisionBriefService }),
    evidence,
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

async function currentWorkspaceId(
  app: ReturnType<typeof createApp>,
  token: string,
): Promise<string> {
  const response = await request(app)
    .get("/workspaces/current")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  return response.body.workspace.id as string;
}

describe("decision briefs", () => {
  it("returns a consolidated comparison evidence pack with policy readiness", async () => {
    const { app, evidence } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const target = evidence.seed(owner.userId);

    const response = await request(app)
      .get(`/decision-briefs/comparison_item/${target.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);

    expect(response.body).toMatchObject({
      workspaceId,
      targetEntityType: "comparison_item",
      targetEntityId: target.id,
      summary: {
        title: "PX-410",
        readinessStatus: "blocked",
      },
      assignment: {
        assignee: { email: "analyst@example.com" },
      },
      checklist: {
        progress: { status: "ready", allRequiredComplete: true },
      },
      approvals: { pendingCount: 1 },
      outcome: { resolved: false },
      policy: { blocked: true },
      discussion: { totalComments: 1 },
      history: { totalEvents: 1 },
    });
    expect(response.body.policy.unmetRequirements[0].code).toBe("approval_required");
    expect(response.body.exportText).toContain("Workspace policy requires approval");
    expect(response.body.dataset.sourceLabel).toBe("June Maricopa sale");
  });

  it("keeps the brief available when the source dataset is stale or removed", async () => {
    const { app, evidence } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const target = evidence.seed(owner.userId);
    evidence.datasetMissing = true;

    const response = await request(app)
      .get(`/decision-briefs/comparison_item/${target.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);

    expect(response.body.dataset).toBeUndefined();
    expect(response.body.exportText).toContain("Dataset: unavailable or no longer accessible");
  });

  it("rejects cross-workspace access before returning aggregated evidence", async () => {
    const { app, evidence } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const outsider = await register(app, "outsider@example.com");
    const outsiderWorkspaceId = await currentWorkspaceId(app, outsider.token);
    const target = evidence.seed(owner.userId);

    const response = await request(app)
      .get(`/decision-briefs/comparison_item/${target.id}`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .set("X-Workspace-Id", outsiderWorkspaceId)
      .expect(404);

    expect(response.body.error.code).toBe("comparison_item_not_found");
  });

  it("rejects unsupported brief target types", async () => {
    const { app, evidence } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const target = evidence.seed(owner.userId);

    const response = await request(app)
      .get(`/decision-briefs/portfolio_item/${target.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(400);

    expect(response.body.error.code).toBe("validation_failed");
  });
});
