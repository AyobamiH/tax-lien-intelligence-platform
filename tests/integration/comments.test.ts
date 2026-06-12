import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type { WorkspaceCommentEntityType } from "@tax-lien/types";
import { AlertService } from "../../apps/api/src/alerts/alert-service.js";
import { createApp } from "../../apps/api/src/app.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import { WorkspaceService } from "../../apps/api/src/workspaces/workspace-service.js";
import { createInMemoryWorkspaceActivityService } from "../support/in-memory-workspace-activity-store.js";
import {
  createInMemoryWorkspaceCommentService,
  InMemoryWorkspaceCommentTargetAccess,
} from "../support/in-memory-workspace-comment-store.js";
import {
  InMemoryWorkspaceMembershipStore,
  InMemoryWorkspaceStore,
} from "../support/in-memory-workspace-store.js";
import { InMemoryAlertStore } from "../support/in-memory-alert-store.js";

const testJwtSecret = "test-comment-secret-that-is-long-enough-for-jwt";

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
  const workspaceCommentService = createInMemoryWorkspaceCommentService(
    userStore,
    membershipStore,
    alertService,
    targetAccess,
  );

  return {
    app: createApp({
      authService,
      workspaceService,
      workspaceActivityService: createInMemoryWorkspaceActivityService(userStore),
      workspaceCommentService,
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

describe("workspace comments", () => {
  it("creates and lists attributed comments on every supported entity type for workspace members", async () => {
    const { app, targetAccess } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const member = await register(app, "member@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    await addMember(app, owner.token, workspaceId, "member@example.com");

    const entityTypes: WorkspaceCommentEntityType[] = [
      "dataset",
      "comparison_item",
      "watchlist_item",
      "portfolio_item",
    ];

    for (const entityType of entityTypes) {
      const entityId = new mongoose.Types.ObjectId().toString();
      targetAccess.allow(entityType, entityId, owner.userId);

      const created = await request(app)
        .post(`/comments/${entityType}/${entityId}`)
        .set("Authorization", `Bearer ${owner.token}`)
        .set("X-Workspace-Id", workspaceId)
        .send({ body: ` Review ${entityType}\nwith the team. ` })
        .expect(201);

      expect(created.body.comment).toMatchObject({
        workspaceId,
        author: { userId: owner.userId, email: "owner@example.com" },
        relatedEntityType: entityType,
        relatedEntityId: entityId,
        body: `Review ${entityType}\nwith the team.`,
        canDelete: true,
      });

      const memberList = await request(app)
        .get(`/comments/${entityType}/${entityId}`)
        .set("Authorization", `Bearer ${member.token}`)
        .set("X-Workspace-Id", workspaceId)
        .expect(200);

      expect(memberList.body.comments).toHaveLength(1);
      expect(memberList.body.comments[0].canDelete).toBe(false);
      expect(memberList.body.attention).toMatchObject({
        workspaceId,
        relatedEntityType: entityType,
        relatedEntityId: entityId,
        unreadCount: 1,
        hasUnread: true,
      });
    }

    const memberTargetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("dataset", memberTargetId, owner.userId);
    const memberCreated = await request(app)
      .post(`/comments/dataset/${memberTargetId}`)
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ body: "Member context is allowed even with read-only record access." })
      .expect(201);
    expect(memberCreated.body.comment.author.email).toBe("member@example.com");
    expect(memberCreated.body.comment.canDelete).toBe(true);
  });

  it("tracks peer unread attention and emits one alert per unread cycle without self-notification", async () => {
    const { app, targetAccess, alertStore } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const member = await register(app, "member@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    await addMember(app, owner.token, workspaceId, "member@example.com");
    const entityId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("dataset", entityId, owner.userId);

    for (const body of ["First review note.", "Second review note."]) {
      const created = await request(app)
        .post(`/comments/dataset/${entityId}`)
        .set("Authorization", `Bearer ${owner.token}`)
        .set("X-Workspace-Id", workspaceId)
        .send({ body })
        .expect(201);
      expect(created.body.attention).toMatchObject({ unreadCount: 0, hasUnread: false });
    }

    const memberThread = await request(app)
      .get(`/comments/dataset/${entityId}`)
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(memberThread.body.attention).toMatchObject({ unreadCount: 2, hasUnread: true });
    expect(await alertStore.countUnreadForUser(member.userId)).toBe(1);
    expect(await alertStore.countUnreadForUser(owner.userId)).toBe(0);
    const firstAlert = (await alertStore.listAlertsForUser(member.userId))[0];
    expect(firstAlert).toMatchObject({
      type: "workspace_comment_added",
      relatedEntityType: "dataset",
      relatedEntityId: entityId,
      metadata: {
        workspaceId,
        commentActorUserId: owner.userId,
        commentActorEmail: "owner@example.com",
      },
    });
    expect(JSON.stringify(firstAlert)).not.toContain("First review note");

    const marked = await request(app)
      .patch(`/comments/dataset/${entityId}/read`)
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(marked.body.attention).toMatchObject({ unreadCount: 0, hasUnread: false });
    expect(await alertStore.countUnreadForUser(member.userId)).toBe(0);

    await request(app)
      .post(`/comments/dataset/${entityId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ body: "A new unread cycle." })
      .expect(201);
    expect(await alertStore.countUnreadForUser(member.userId)).toBe(1);

    await request(app)
      .post(`/comments/dataset/${entityId}`)
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ body: "Member follow-up." })
      .expect(201);
    expect(await alertStore.countUnreadForUser(member.userId)).toBe(1);
    expect(await alertStore.listAlertsForUser(member.userId)).toHaveLength(2);
    expect(await alertStore.countUnreadForUser(owner.userId)).toBe(1);
  });

  it("rejects invalid, stale, unsafe, empty, and oversized comment input", async () => {
    const { app, targetAccess } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const entityId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("dataset", entityId, owner.userId);

    const malformedType = await request(app)
      .post(`/comments/not-a-target/${entityId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ body: "No" })
      .expect(400);
    expect(malformedType.body.error.code).toBe("validation_failed");

    const malformedId = await request(app)
      .post("/comments/dataset/not-an-id")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ body: "No" })
      .expect(400);
    expect(malformedId.body.error.code).toBe("comment_invalid_entity_id");

    const missingId = new mongoose.Types.ObjectId().toString();
    const missingTarget = await request(app)
      .get(`/comments/dataset/${missingId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(404);
    expect(missingTarget.body.error.code).toBe("comment_target_not_found");

    const empty = await request(app)
      .post(`/comments/dataset/${entityId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ body: "   " })
      .expect(400);
    expect(empty.body.error.code).toBe("comment_body_required");

    const oversized = await request(app)
      .post(`/comments/dataset/${entityId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ body: "a".repeat(1001) })
      .expect(400);
    expect(oversized.body.error.code).toBe("comment_body_too_long");

    const unsafe = await request(app)
      .post(`/comments/dataset/${entityId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ body: "unsafe\u0000value" })
      .expect(400);
    expect(unsafe.body.error.code).toBe("comment_invalid_content");

    targetAccess.deny("dataset", entityId, owner.userId);
    const staleTarget = await request(app)
      .get(`/comments/dataset/${entityId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(404);
    expect(staleTarget.body.error.code).toBe("comment_target_not_found");
  });

  it("enforces membership, workspace isolation, and author-only hard deletion", async () => {
    const { app, targetAccess } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const member = await register(app, "member@example.com");
    const outsider = await register(app, "outsider@example.com");
    const ownerWorkspaceId = await currentWorkspaceId(app, owner.token);
    const outsiderWorkspaceId = await currentWorkspaceId(app, outsider.token);
    await addMember(app, owner.token, ownerWorkspaceId, "member@example.com");
    await addMember(app, outsider.token, outsiderWorkspaceId, "owner@example.com");

    const entityId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("portfolio_item", entityId, owner.userId);
    const created = await request(app)
      .post(`/comments/portfolio_item/${entityId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", ownerWorkspaceId)
      .send({ body: "Owner-only deletion." })
      .expect(201);
    const commentId = created.body.comment.id as string;

    const outsiderDenied = await request(app)
      .get(`/comments/portfolio_item/${entityId}`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .set("X-Workspace-Id", ownerWorkspaceId)
      .expect(403);
    expect(outsiderDenied.body.error.code).toBe("workspace_access_denied");

    const outsiderPersonal = await request(app)
      .get(`/comments/portfolio_item/${entityId}`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .set("X-Workspace-Id", outsiderWorkspaceId)
      .expect(404);
    expect(outsiderPersonal.body.error.code).toBe("comment_target_not_found");

    const outsiderReadDenied = await request(app)
      .patch(`/comments/portfolio_item/${entityId}/read`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .set("X-Workspace-Id", ownerWorkspaceId)
      .expect(403);
    expect(outsiderReadDenied.body.error.code).toBe("workspace_access_denied");

    const memberDelete = await request(app)
      .delete(`/comments/${commentId}`)
      .set("Authorization", `Bearer ${member.token}`)
      .set("X-Workspace-Id", ownerWorkspaceId)
      .expect(403);
    expect(memberDelete.body.error.code).toBe("comment_delete_forbidden");

    const wrongWorkspaceDelete = await request(app)
      .delete(`/comments/${commentId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", outsiderWorkspaceId)
      .expect(404);
    expect(wrongWorkspaceDelete.body.error.code).toBe("comment_not_found");

    const deleted = await request(app)
      .delete(`/comments/${commentId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", ownerWorkspaceId)
      .expect(200);
    expect(deleted.body).toEqual({ id: commentId, deleted: true });

    const afterDelete = await request(app)
      .get(`/comments/portfolio_item/${entityId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", ownerWorkspaceId)
      .expect(200);
    expect(afterDelete.body.comments).toEqual([]);

    await request(app).get(`/comments/portfolio_item/${entityId}`).expect(401);
  });
});
