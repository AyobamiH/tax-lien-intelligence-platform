import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type {
  CreateUserInput,
  StoredUser,
  UserStore,
} from "../../apps/api/src/auth/user-store.js";
import { ReviewChecklistService } from "../../apps/api/src/review-checklists/review-checklist-service.js";
import { WorkspaceActivityService } from "../../apps/api/src/workspace-activity/workspace-activity-service.js";
import { WorkspaceService } from "../../apps/api/src/workspaces/workspace-service.js";
import {
  InMemoryReviewChecklistInstanceStore,
  InMemoryReviewChecklistTemplateStore,
} from "../support/in-memory-review-checklist-store.js";
import { InMemoryWorkspaceActivityStore } from "../support/in-memory-workspace-activity-store.js";
import { InMemoryWorkspaceCommentTargetAccess } from "../support/in-memory-workspace-comment-store.js";
import {
  InMemoryWorkspaceMembershipStore,
  InMemoryWorkspaceStore,
} from "../support/in-memory-workspace-store.js";

const testJwtSecret = "test-review-checklist-secret-long-enough-for-jwt";

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
  const reviewChecklistService = new ReviewChecklistService(
    new InMemoryReviewChecklistTemplateStore(),
    new InMemoryReviewChecklistInstanceStore(),
    targetAccess,
  );
  return {
    app: createApp({
      authService,
      workspaceService,
      workspaceActivityService: new WorkspaceActivityService(
        new InMemoryWorkspaceActivityStore(),
        userStore,
      ),
      reviewChecklistService,
    }),
    targetAccess,
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

function templateRequest(
  app: ReturnType<typeof createApp>,
  token: string,
  workspaceId: string,
  entityType = "comparison_item",
) {
  return request(app)
    .put(`/review-checklists/templates/${entityType}`)
    .set("Authorization", `Bearer ${token}`)
    .set("X-Workspace-Id", workspaceId);
}

function stateRequest(
  app: ReturnType<typeof createApp>,
  token: string,
  workspaceId: string,
  entityId: string,
) {
  return request(app)
    .get(`/review-checklists/comparison_item/${entityId}`)
    .set("Authorization", `Bearer ${token}`)
    .set("X-Workspace-Id", workspaceId);
}

describe("review checklists", () => {
  it("creates and retrieves workspace-scoped templates with stable ordered items", async () => {
    const { app } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);

    const created = await templateRequest(app, owner.token, workspaceId)
      .send({
        name: "Comparison diligence",
        active: true,
        items: [
          { label: "Verify parcel identity", required: true },
          { label: "Review neighborhood context", required: false },
        ],
      })
      .expect(200);

    expect(created.body.template).toMatchObject({
      workspaceId,
      targetEntityType: "comparison_item",
      name: "Comparison diligence",
      active: true,
      version: 1,
    });
    expect(created.body.template.items).toMatchObject([
      { label: "Verify parcel identity", required: true, position: 0 },
      { label: "Review neighborhood context", required: false, position: 1 },
    ]);
    expect(created.body.template.items[0].id).toMatch(/^[a-f\d]{24}$/);

    const listed = await request(app)
      .get("/review-checklists/templates")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(listed.body.templates).toHaveLength(1);
    expect(listed.body.templates[0].id).toBe(created.body.template.id);
  });

  it("limits template management to owners and admins", async () => {
    const { app } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const admin = await register(app, "admin@example.com");
    const member = await register(app, "member@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    await addMember(app, owner.token, workspaceId, "admin@example.com", "admin");
    await addMember(app, owner.token, workspaceId, "member@example.com", "member");

    const memberDenied = await templateRequest(app, member.token, workspaceId)
      .send({
        name: "Member template",
        items: [{ label: "Should not save", required: true }],
      })
      .expect(403);
    expect(memberDenied.body.error.code).toBe("workspace_role_forbidden");

    await templateRequest(app, admin.token, workspaceId, "portfolio_item")
      .send({
        name: "Portfolio review",
        items: [{ label: "Confirm status evidence", required: true }],
      })
      .expect(200);

    await request(app)
      .get("/review-checklists/templates")
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
  });

  it("tracks member completion, required readiness, attribution, and optional items", async () => {
    const { app, targetAccess } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const member = await register(app, "member@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    await addMember(app, owner.token, workspaceId, "member@example.com", "member");
    const targetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("comparison_item", targetId, owner.userId);

    const template = await templateRequest(app, owner.token, workspaceId)
      .send({
        name: "Comparison diligence",
        items: [
          { label: "Verify lien amount", required: true },
          { label: "Review optional context", required: false },
        ],
      })
      .expect(200);
    const requiredItemId = template.body.template.items[0].id as string;

    const initial = await stateRequest(
      app,
      member.token,
      workspaceId,
      targetId,
    ).expect(200);
    expect(initial.body.progress).toMatchObject({
      status: "not_started",
      completedItems: 0,
      incompleteRequiredItems: 1,
      allRequiredComplete: false,
    });

    const completed = await request(app)
      .patch(
        `/review-checklists/comparison_item/${targetId}/items/${requiredItemId}`,
      )
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ completed: true })
      .expect(200);
    expect(completed.body.state.progress).toMatchObject({
      status: "ready",
      completedItems: 1,
      incompleteItems: 1,
      incompleteRequiredItems: 0,
      allRequiredComplete: true,
    });
    expect(completed.body.state.checklist.items[0]).toMatchObject({
      completed: true,
      completedBy: {
        userId: member.userId,
        email: "member@example.com",
      },
    });
    expect(completed.body.state.checklist.items[0].completedAt).toBeTruthy();

    const reopened = await request(app)
      .patch(
        `/review-checklists/comparison_item/${targetId}/items/${requiredItemId}`,
      )
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ completed: false })
      .expect(200);
    expect(reopened.body.state.progress).toMatchObject({
      status: "not_started",
      incompleteRequiredItems: 1,
    });
    expect(reopened.body.state.checklist.items[0]).not.toHaveProperty(
      "completedBy",
    );
  });

  it("preserves completed stable items when a template revision adds a new requirement", async () => {
    const { app, targetAccess } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const targetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("comparison_item", targetId, owner.userId);

    const first = await templateRequest(app, owner.token, workspaceId)
      .send({
        name: "Comparison diligence",
        items: [{ label: "Verify parcel identity", required: true }],
      })
      .expect(200);
    const stableItem = first.body.template.items[0];

    await stateRequest(app, owner.token, workspaceId, targetId).expect(200);
    await request(app)
      .patch(
        `/review-checklists/comparison_item/${targetId}/items/${stableItem.id}`,
      )
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ completed: true })
      .expect(200);

    const revised = await templateRequest(app, owner.token, workspaceId)
      .send({
        name: "Comparison diligence v2",
        items: [
          {
            id: stableItem.id,
            label: "Verify parcel identity and address",
            required: true,
          },
          { label: "Confirm lien balance", required: true },
        ],
      })
      .expect(200);
    expect(revised.body.template.version).toBe(2);

    const state = await stateRequest(
      app,
      owner.token,
      workspaceId,
      targetId,
    ).expect(200);
    expect(state.body.checklist.templateVersion).toBe(2);
    expect(state.body.checklist.items[0]).toMatchObject({
      id: stableItem.id,
      label: "Verify parcel identity and address",
      completed: true,
    });
    expect(state.body.progress).toMatchObject({
      status: "in_progress",
      completedRequiredItems: 1,
      incompleteRequiredItems: 1,
    });
  });

  it("returns an explicit unconfigured state and rejects stale, invalid, and cross-workspace access", async () => {
    const { app, targetAccess } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const outsider = await register(app, "outsider@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const outsiderWorkspaceId = await currentWorkspaceId(app, outsider.token);
    const targetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("comparison_item", targetId, owner.userId);

    const unconfigured = await stateRequest(
      app,
      owner.token,
      workspaceId,
      targetId,
    ).expect(200);
    expect(unconfigured.body).toMatchObject({
      targetEntityType: "comparison_item",
      targetEntityId: targetId,
      progress: { status: "not_configured", allRequiredComplete: false },
    });

    await stateRequest(app, outsider.token, workspaceId, targetId).expect(403);
    const inaccessible = await stateRequest(
      app,
      outsider.token,
      outsiderWorkspaceId,
      targetId,
    ).expect(404);
    expect(inaccessible.body.error.code).toBe(
      "review_checklist_target_not_found",
    );

    targetAccess.deny("comparison_item", targetId, owner.userId);
    const stale = await stateRequest(
      app,
      owner.token,
      workspaceId,
      targetId,
    ).expect(404);
    expect(stale.body.error.code).toBe("review_checklist_target_not_found");

    const invalid = await stateRequest(
      app,
      owner.token,
      workspaceId,
      "not-an-object-id",
    ).expect(400);
    expect(invalid.body.error.code).toBe(
      "review_checklist_invalid_target_id",
    );
  });

  it("requires authentication for checklist template and record surfaces", async () => {
    const { app } = createTestContext();
    const targetId = new mongoose.Types.ObjectId().toString();
    const itemId = new mongoose.Types.ObjectId().toString();
    await request(app).get("/review-checklists/templates").expect(401);
    await request(app)
      .put("/review-checklists/templates/comparison_item")
      .expect(401);
    await request(app)
      .get(`/review-checklists/comparison_item/${targetId}`)
      .expect(401);
    await request(app)
      .patch(
        `/review-checklists/comparison_item/${targetId}/items/${itemId}`,
      )
      .expect(401);
  });
});
