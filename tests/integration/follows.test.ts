import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AlertService } from "../../apps/api/src/alerts/alert-service.js";
import { createApp } from "../../apps/api/src/app.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type {
  CreateUserInput,
  StoredUser,
  UserStore,
} from "../../apps/api/src/auth/user-store.js";
import { FollowService } from "../../apps/api/src/follows/follow-service.js";
import { WorkspaceActivityService } from "../../apps/api/src/workspace-activity/workspace-activity-service.js";
import { WorkspaceService } from "../../apps/api/src/workspaces/workspace-service.js";
import { InMemoryAlertStore } from "../support/in-memory-alert-store.js";
import { InMemoryFollowStore } from "../support/in-memory-follow-store.js";
import { InMemoryWorkspaceActivityStore } from "../support/in-memory-workspace-activity-store.js";
import { InMemoryWorkspaceCommentTargetAccess } from "../support/in-memory-workspace-comment-store.js";
import {
  InMemoryWorkspaceMembershipStore,
  InMemoryWorkspaceStore,
} from "../support/in-memory-workspace-store.js";

const testJwtSecret = "test-follow-secret-that-is-long-enough-for-jwt";

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
  const workspaceActivityService = new WorkspaceActivityService(
    new InMemoryWorkspaceActivityStore(),
    userStore,
  );
  const followService = new FollowService(
    new InMemoryFollowStore(),
    targetAccess,
    membershipStore,
    userStore,
    alertService,
  );

  return {
    app: createApp({
      authService,
      workspaceService,
      workspaceActivityService,
      alertService,
      followService,
    }),
    targetAccess,
    followService,
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
): Promise<void> {
  await request(app)
    .post("/workspaces/current/members")
    .set("Authorization", `Bearer ${ownerToken}`)
    .set("X-Workspace-Id", workspaceId)
    .send({ email, role: "member" })
    .expect(201);
}

function followRequest(
  app: ReturnType<typeof createApp>,
  token: string,
  workspaceId: string,
  entityType: string,
  entityId: string,
) {
  return request(app)
    .put(`/follows/${entityType}/${entityId}`)
    .set("Authorization", `Bearer ${token}`)
    .set("X-Workspace-Id", workspaceId);
}

describe("follow subscriptions", () => {
  it("creates duplicate-safe follows, exposes state and queue, and unfollows idempotently", async () => {
    const { app, targetAccess } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const targetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("portfolio_item", targetId, owner.userId);

    const created = await followRequest(
      app,
      owner.token,
      workspaceId,
      "portfolio_item",
      targetId,
    ).expect(201);
    expect(created.body).toMatchObject({
      following: true,
      alreadyFollowing: false,
      followerCount: 1,
      subscription: {
        workspaceId,
        targetEntityType: "portfolio_item",
        targetEntityId: targetId,
      },
    });

    const duplicate = await followRequest(
      app,
      owner.token,
      workspaceId,
      "portfolio_item",
      targetId,
    ).expect(200);
    expect(duplicate.body.alreadyFollowing).toBe(true);
    expect(duplicate.body.subscription.id).toBe(created.body.subscription.id);

    const state = await request(app)
      .get(`/follows/portfolio_item/${targetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(state.body).toMatchObject({ following: true, followerCount: 1 });

    const queue = await request(app)
      .get("/follows")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(queue.body.follows).toHaveLength(1);

    const removed = await request(app)
      .delete(`/follows/portfolio_item/${targetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(removed.body).toMatchObject({ unfollowed: true, followerCount: 0 });

    const repeated = await request(app)
      .delete(`/follows/portfolio_item/${targetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(repeated.body.unfollowed).toBe(false);
  });

  it("rejects inaccessible, stale, invalid, and cross-workspace targets", async () => {
    const { app, targetAccess } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const outsider = await register(app, "outsider@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const outsiderWorkspaceId = await currentWorkspaceId(app, outsider.token);
    const targetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("dataset", targetId, owner.userId);

    await followRequest(app, owner.token, workspaceId, "dataset", targetId).expect(201);

    const crossWorkspace = await followRequest(
      app,
      outsider.token,
      workspaceId,
      "dataset",
      targetId,
    ).expect(403);
    expect(crossWorkspace.body.error.code).toBe("workspace_access_denied");

    const inaccessible = await followRequest(
      app,
      outsider.token,
      outsiderWorkspaceId,
      "dataset",
      targetId,
    ).expect(404);
    expect(inaccessible.body.error.code).toBe("follow_target_not_found");

    targetAccess.deny("dataset", targetId, owner.userId);
    const staleState = await request(app)
      .get(`/follows/dataset/${targetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(404);
    expect(staleState.body.error.code).toBe("follow_target_not_found");

    const filteredQueue = await request(app)
      .get("/follows")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(filteredQueue.body.follows).toEqual([]);

    const invalid = await followRequest(
      app,
      owner.token,
      workspaceId,
      "dataset",
      "not-an-object-id",
    ).expect(400);
    expect(invalid.body.error.code).toBe("follow_invalid_target_id");
  });

  it("alerts active followers about bounded changes while excluding the actor", async () => {
    const { app, targetAccess, followService, alertStore } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const member = await register(app, "member@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    await addMember(app, owner.token, workspaceId, "member@example.com");
    const targetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("comparison_item", targetId, owner.userId);

    await followRequest(
      app,
      member.token,
      workspaceId,
      "comparison_item",
      targetId,
    ).expect(201);
    await followRequest(
      app,
      owner.token,
      workspaceId,
      "comparison_item",
      targetId,
    ).expect(201);

    await followService.notifyFollowers({
      workspaceId,
      actorUserId: owner.userId,
      targetEntityType: "comparison_item",
      targetEntityId: targetId,
      changeType: "approval_resolved",
    });

    const memberAlerts = await alertStore.listAlertsForUser(member.userId);
    expect(memberAlerts).toHaveLength(1);
    expect(memberAlerts[0]).toMatchObject({
      type: "followed_item_changed",
      relatedEntityType: "comparison_item",
      relatedEntityId: targetId,
      metadata: {
        workspaceId,
        followChangeType: "approval_resolved",
        followActorUserId: owner.userId,
      },
    });
    expect(await alertStore.listAlertsForUser(owner.userId)).toEqual([]);
  }, 10_000);

  it("requires authentication for all follow surfaces", async () => {
    const { app } = createTestContext();
    const targetId = new mongoose.Types.ObjectId().toString();
    await request(app).get("/follows").expect(401);
    await request(app).get(`/follows/dataset/${targetId}`).expect(401);
    await request(app).put(`/follows/dataset/${targetId}`).expect(401);
    await request(app).delete(`/follows/dataset/${targetId}`).expect(401);
  });
});
