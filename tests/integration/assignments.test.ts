import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type { WorkspaceAssignmentEntityType } from "@tax-lien/types";
import { AlertService } from "../../apps/api/src/alerts/alert-service.js";
import { createApp } from "../../apps/api/src/app.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import { WorkspaceAssignmentService } from "../../apps/api/src/workspace-assignments/workspace-assignment-service.js";
import { WorkspaceActivityService } from "../../apps/api/src/workspace-activity/workspace-activity-service.js";
import { WorkspaceService } from "../../apps/api/src/workspaces/workspace-service.js";
import { InMemoryAlertStore } from "../support/in-memory-alert-store.js";
import { InMemoryWorkspaceAssignmentStore } from "../support/in-memory-workspace-assignment-store.js";
import { InMemoryWorkspaceActivityStore } from "../support/in-memory-workspace-activity-store.js";
import { InMemoryWorkspaceCommentTargetAccess } from "../support/in-memory-workspace-comment-store.js";
import {
  InMemoryWorkspaceMembershipStore,
  InMemoryWorkspaceStore,
} from "../support/in-memory-workspace-store.js";

const testJwtSecret = "test-assignment-secret-that-is-long-enough-for-jwt";

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
  const alertStore = new InMemoryAlertStore();
  const alertService = new AlertService(alertStore);
  const activityStore = new InMemoryWorkspaceActivityStore();
  const activityService = new WorkspaceActivityService(activityStore, userStore);
  const workspaceAssignmentService = new WorkspaceAssignmentService(
    new InMemoryWorkspaceAssignmentStore(),
    membershipStore,
    userStore,
    targetAccess,
    alertService,
    activityService,
  );

  return {
    app: createApp({
      authService,
      alertService,
      workspaceService,
      workspaceActivityService: activityService,
      workspaceAssignmentService,
    }),
    targetAccess,
    alertStore,
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
): Promise<void> {
  await request(app)
    .post("/workspaces/current/members")
    .set("Authorization", `Bearer ${ownerToken}`)
    .set("X-Workspace-Id", workspaceId)
    .send({ email, role: "member" })
    .expect(201);
}

function assignmentRequest(
  app: ReturnType<typeof createApp>,
  token: string,
  workspaceId: string,
  entityType: WorkspaceAssignmentEntityType,
  entityId: string,
) {
  return request(app)
    .patch(`/assignments/${entityType}/${entityId}`)
    .set("Authorization", `Bearer ${token}`)
    .set("X-Workspace-Id", workspaceId);
}

describe("workspace assignments", () => {
  it("assigns all supported targets, provides a personal queue, and records bounded responsibility activity", async () => {
    const { app, targetAccess, alertStore } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const member = await register(app, "member@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    await addMember(app, owner.token, workspaceId, "member@example.com");

    const entityTypes: WorkspaceAssignmentEntityType[] = [
      "dataset",
      "comparison_item",
      "watchlist_item",
      "portfolio_item",
    ];
    const targets = entityTypes.map((entityType) => ({
      entityType,
      entityId: new mongoose.Types.ObjectId().toString(),
    }));

    for (const { entityType, entityId } of targets) {
      targetAccess.allow(entityType, entityId, owner.userId);
      const response = await assignmentRequest(
        app,
        owner.token,
        workspaceId,
        entityType,
        entityId,
      )
        .send({ assigneeUserId: member.userId })
        .expect(200);
      expect(response.body).toMatchObject({
        changed: true,
        assignment: {
          workspaceId,
          relatedEntityType: entityType,
          relatedEntityId: entityId,
          assignee: { userId: member.userId, email: "member@example.com" },
          assignedBy: { userId: owner.userId, email: "owner@example.com" },
        },
      });
    }

    const queue = await request(app)
      .get("/assignments/mine")
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(queue.body.assignments).toHaveLength(4);
    expect(
      new Set(
        queue.body.assignments.map(
          (assignment: { relatedEntityType: WorkspaceAssignmentEntityType }) =>
            assignment.relatedEntityType,
        ),
      ),
    ).toEqual(new Set(entityTypes));

    const alerts = await alertStore.listAlertsForUser(member.userId);
    expect(alerts).toHaveLength(4);
    expect(alerts.every((alert) => alert.type === "workspace_item_assigned")).toBe(true);
    expect(JSON.stringify(alerts)).not.toContain("note");

    const activity = await request(app)
      .get("/workspaces/current/activity?category=responsibility")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(activity.body.activities).toHaveLength(4);
    expect(activity.body.activities[0]).toMatchObject({
      category: "responsibility",
      eventType: "entity_assigned",
      actor: { userId: owner.userId, email: "owner@example.com" },
    });
  });

  it("handles no-op, reassignment, clear, self-notification, and stale queue filtering explicitly", async () => {
    const { app, targetAccess, alertStore } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const member = await register(app, "member@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    await addMember(app, owner.token, workspaceId, "member@example.com");
    const entityId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("dataset", entityId, owner.userId);

    await assignmentRequest(app, owner.token, workspaceId, "dataset", entityId)
      .send({ assigneeUserId: member.userId })
      .expect(200);
    const noOp = await assignmentRequest(app, owner.token, workspaceId, "dataset", entityId)
      .send({ assigneeUserId: member.userId })
      .expect(200);
    expect(noOp.body.changed).toBe(false);
    expect(await alertStore.listAlertsForUser(member.userId)).toHaveLength(1);

    const reassigned = await assignmentRequest(app, owner.token, workspaceId, "dataset", entityId)
      .send({ assigneeUserId: owner.userId })
      .expect(200);
    expect(reassigned.body).toMatchObject({
      changed: true,
      assignment: { assignee: { userId: owner.userId } },
    });
    expect(await alertStore.listAlertsForUser(owner.userId)).toHaveLength(0);

    const responsibilityActivity = await request(app)
      .get("/workspaces/current/activity?category=responsibility")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(
      responsibilityActivity.body.activities.map(
        (activity: { eventType: string }) => activity.eventType,
      ),
    ).toEqual(["entity_reassigned", "entity_assigned"]);

    await request(app)
      .delete(`/assignments/dataset/${entityId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200, {
        relatedEntityType: "dataset",
        relatedEntityId: entityId,
        cleared: true,
      });
    const empty = await request(app)
      .get(`/assignments/dataset/${entityId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(empty.body.assignment).toBeNull();

    await assignmentRequest(app, owner.token, workspaceId, "dataset", entityId)
      .send({ assigneeUserId: member.userId })
      .expect(200);
    targetAccess.deny("dataset", entityId, owner.userId);
    const staleFiltered = await request(app)
      .get("/assignments/mine")
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(staleFiltered.body.assignments).toEqual([]);
  });

  it("rejects invalid assignees, inaccessible targets, and cross-workspace access", async () => {
    const { app, targetAccess } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const outsider = await register(app, "outsider@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const entityId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("dataset", entityId, owner.userId);

    const nonMember = await assignmentRequest(app, owner.token, workspaceId, "dataset", entityId)
      .send({ assigneeUserId: outsider.userId })
      .expect(400);
    expect(nonMember.body.error.code).toBe("assignment_assignee_not_member");

    const invalidTarget = await assignmentRequest(
      app,
      owner.token,
      workspaceId,
      "dataset",
      "not-an-id",
    )
      .send({ assigneeUserId: owner.userId })
      .expect(400);
    expect(invalidTarget.body.error.code).toBe("assignment_invalid_entity_id");

    const missingId = new mongoose.Types.ObjectId().toString();
    const missingTarget = await request(app)
      .get(`/assignments/dataset/${missingId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(404);
    expect(missingTarget.body.error.code).toBe("assignment_target_not_found");

    const crossWorkspace = await request(app)
      .get(`/assignments/dataset/${entityId}`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(403);
    expect(crossWorkspace.body.error.code).toBe("workspace_access_denied");
  });
});
