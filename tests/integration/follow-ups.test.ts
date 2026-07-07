import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AlertService } from "../../apps/api/src/alerts/alert-service.js";
import { ApprovalService } from "../../apps/api/src/approvals/approval-service.js";
import { createApp } from "../../apps/api/src/app.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import { DiscussionAttentionService } from "../../apps/api/src/discussion-attention/discussion-attention-service.js";
import { FollowService } from "../../apps/api/src/follows/follow-service.js";
import { FollowUpService } from "../../apps/api/src/follow-ups/follow-up-service.js";
import { MyWorkService } from "../../apps/api/src/my-work/my-work-service.js";
import { WorkspaceAssignmentService } from "../../apps/api/src/workspace-assignments/workspace-assignment-service.js";
import { WorkspaceActivityService } from "../../apps/api/src/workspace-activity/workspace-activity-service.js";
import { WorkspaceService } from "../../apps/api/src/workspaces/workspace-service.js";
import { InMemoryAlertStore } from "../support/in-memory-alert-store.js";
import { InMemoryApprovalRequestStore } from "../support/in-memory-approval-store.js";
import { InMemoryDiscussionAttentionStore } from "../support/in-memory-discussion-attention-store.js";
import { InMemoryFollowStore } from "../support/in-memory-follow-store.js";
import { InMemoryFollowUpStore } from "../support/in-memory-follow-up-store.js";
import { InMemoryWorkspaceAssignmentStore } from "../support/in-memory-workspace-assignment-store.js";
import { InMemoryWorkspaceActivityStore } from "../support/in-memory-workspace-activity-store.js";
import { InMemoryWorkspaceCommentTargetAccess } from "../support/in-memory-workspace-comment-store.js";
import {
  InMemoryWorkspaceMembershipStore,
  InMemoryWorkspaceStore,
} from "../support/in-memory-workspace-store.js";

const testJwtSecret = "test-follow-up-secret-that-is-long-enough-for-jwt";

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
  const targetAccess = new InMemoryWorkspaceCommentTargetAccess();
  const alertStore = new InMemoryAlertStore();
  const alertService = new AlertService(alertStore);
  const assignmentStore = new InMemoryWorkspaceAssignmentStore();
  const followStore = new InMemoryFollowStore();
  const followUpStore = new InMemoryFollowUpStore();
  const activityService = new WorkspaceActivityService(new InMemoryWorkspaceActivityStore(), userStore);
  const attentionService = new DiscussionAttentionService(new InMemoryDiscussionAttentionStore());
  const workspaceService = new WorkspaceService(new InMemoryWorkspaceStore(), membershipStore, userStore);
  const authService = new AuthService(userStore, {
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });
  const followService = new FollowService(
    followStore,
    targetAccess,
    membershipStore,
    userStore,
    alertService,
  );
  const assignmentService = new WorkspaceAssignmentService(
    assignmentStore,
    membershipStore,
    userStore,
    targetAccess,
    alertService,
    activityService,
    followService,
  );
  const approvalService = new ApprovalService(new InMemoryApprovalRequestStore(), {
    getItem: async () => {
      throw new Error("not used");
    },
    handoffToPortfolio: async () => {
      throw new Error("not used");
    },
  });
  const followUpService = new FollowUpService(
    followUpStore,
    targetAccess,
    assignmentStore,
    membershipStore,
    alertService,
    activityService,
  );
  const myWorkService = new MyWorkService(
    assignmentService,
    approvalService,
    attentionService,
    targetAccess,
    followService,
    followUpService,
  );

  return {
    app: createApp({
      authService,
      alertService,
      workspaceService,
      workspaceAssignmentService: assignmentService,
      followService,
      followUpService,
      myWorkService,
      workspaceActivityService: activityService,
      approvalService,
    }),
    alertStore,
    followUpService,
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
    .send({ email, role: "admin" })
    .expect(201);
}

describe("follow-up reminders API", () => {
  it("sets, updates, clears, and queues follow-ups for the responsible member", async () => {
    const { app, targetAccess } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const admin = await register(app, "admin@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    await addMember(app, owner.token, workspaceId, "admin@example.com");

    const targetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("portfolio_item", targetId, owner.userId);
    const dueAt = "2026-07-08T12:00:00.000Z";

    const created = await request(app)
      .put(`/follow-ups/portfolio_item/${targetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ dueAt, note: "Check redemption docs." })
      .expect(200);
    expect(created.body.followUp).toMatchObject({
      targetEntityType: "portfolio_item",
      targetEntityId: targetId,
      dueAt,
      dueState: "upcoming",
      note: "Check redemption docs.",
      createdByUserId: owner.userId,
    });

    const ownerWork = await request(app)
      .get("/my-work")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(ownerWork.body.counts.followUps).toBe(1);
    expect(ownerWork.body.queues.followUps.items[0].targetEntityId).toBe(targetId);

    await request(app)
      .patch(`/assignments/portfolio_item/${targetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ assigneeUserId: admin.userId })
      .expect(200);

    const adminWork = await request(app)
      .get("/my-work")
      .set("Authorization", `Bearer ${admin.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(adminWork.body.counts.followUps).toBe(1);
    expect(adminWork.body.counts.totalActionable).toBe(2);

    const cleared = await request(app)
      .delete(`/follow-ups/portfolio_item/${targetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(cleared.body).toMatchObject({
      targetEntityType: "portfolio_item",
      targetEntityId: targetId,
      cleared: true,
    });
  });

  it("rejects invalid dates and cross-workspace access", async () => {
    const { app, targetAccess } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const outsider = await register(app, "outsider@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const targetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("comparison_item", targetId, owner.userId);

    const invalid = await request(app)
      .put(`/follow-ups/comparison_item/${targetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ dueAt: "not-a-date" })
      .expect(400);
    expect(invalid.body.error.code).toBe("follow_up_invalid_due_at");

    const tooFar = await request(app)
      .put(`/follow-ups/comparison_item/${targetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ dueAt: "2030-01-01T00:00:00.000Z" })
      .expect(400);
    expect(tooFar.body.error.code).toBe("follow_up_due_at_too_far");

    const crossWorkspace = await request(app)
      .get(`/follow-ups/comparison_item/${targetId}`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(403);
    expect(crossWorkspace.body.error.code).toBe("workspace_access_denied");
  });

  it("generates bounded due/overdue alerts without repeating the same due state", async () => {
    const { app, alertStore, followUpService, targetAccess } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const admin = await register(app, "admin@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    await addMember(app, owner.token, workspaceId, "admin@example.com");

    const targetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("watchlist_item", targetId, owner.userId);
    await request(app)
      .put(`/follow-ups/watchlist_item/${targetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ dueAt: "2026-07-06T12:00:00.000Z", note: "Call county desk." })
      .expect(200);
    await request(app)
      .patch(`/assignments/watchlist_item/${targetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ assigneeUserId: admin.userId })
      .expect(200);

    const firstRun = await followUpService.runReminderScan(new Date("2026-07-07T12:00:00.000Z"));
    expect(firstRun).toMatchObject({ scanned: 1, remindersCreated: 1, suppressed: 0 });
    const firstAlerts = await alertStore.listAlertsForUser(admin.userId);
    const firstFollowUpAlerts = firstAlerts.filter((alert) => alert.type === "follow_up_due");
    expect(firstAlerts).toHaveLength(2);
    expect(firstFollowUpAlerts).toHaveLength(1);
    expect(firstFollowUpAlerts[0]).toMatchObject({
      type: "follow_up_due",
      severity: "error",
      relatedEntityType: "watchlist_item",
      relatedEntityId: targetId,
      metadata: {
        workspaceId,
        followUpDueState: "overdue",
      },
    });

    const secondRun = await followUpService.runReminderScan(new Date("2026-07-07T13:00:00.000Z"));
    expect(secondRun).toMatchObject({ scanned: 1, remindersCreated: 0, suppressed: 1 });
    expect(await alertStore.listAlertsForUser(admin.userId)).toHaveLength(2);
  });

  it("completes follow-ups and suppresses further reminders and queue visibility", async () => {
    const { app, alertStore, followUpService, targetAccess } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const targetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("portfolio_item", targetId, owner.userId);

    await request(app)
      .put(`/follow-ups/portfolio_item/${targetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ dueAt: "2026-07-07T12:00:00.000Z", note: "Verify payoff." })
      .expect(200);

    const firstRun = await followUpService.runReminderScan(new Date("2026-07-07T12:30:00.000Z"));
    expect(firstRun).toMatchObject({ scanned: 1, remindersCreated: 1 });
    expect((await alertStore.listAlertsForUser(owner.userId)).filter((alert) => alert.type === "follow_up_due")).toHaveLength(1);

    const completed = await request(app)
      .post(`/follow-ups/portfolio_item/${targetId}/complete`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(completed.body).toMatchObject({
      targetEntityType: "portfolio_item",
      targetEntityId: targetId,
      completed: true,
      followUp: {
        dueState: "completed",
        completedByUserId: owner.userId,
      },
    });
    expect(completed.body.followUp.completedAt).toBeTruthy();

    const state = await request(app)
      .get(`/follow-ups/portfolio_item/${targetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(state.body).toMatchObject({
      dueState: "completed",
      followUp: {
        dueState: "completed",
        targetEntityId: targetId,
      },
    });

    const queue = await request(app)
      .get("/follow-ups/queue")
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .expect(200);
    expect(queue.body.counts.total).toBe(0);

    const secondRun = await followUpService.runReminderScan(new Date("2026-07-08T12:30:00.000Z"));
    expect(secondRun).toMatchObject({ scanned: 0, remindersCreated: 0 });
    expect((await alertStore.listAlertsForUser(owner.userId)).filter((alert) => alert.type === "follow_up_due")).toHaveLength(1);
  });

  it("snoozes follow-ups, resets reminder state, and rejects invalid snooze dates", async () => {
    const { app, alertStore, followUpService, targetAccess } = createTestContext();
    const owner = await register(app, "owner@example.com");
    const workspaceId = await currentWorkspaceId(app, owner.token);
    const targetId = new mongoose.Types.ObjectId().toString();
    targetAccess.allow("comparison_item", targetId, owner.userId);

    await request(app)
      .put(`/follow-ups/comparison_item/${targetId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ dueAt: "2026-07-07T12:00:00.000Z", note: "Confirm lien status." })
      .expect(200);

    await followUpService.runReminderScan(new Date("2026-07-07T12:30:00.000Z"));
    expect((await alertStore.listAlertsForUser(owner.userId)).filter((alert) => alert.type === "follow_up_due")).toHaveLength(1);

    const invalid = await request(app)
      .post(`/follow-ups/comparison_item/${targetId}/snooze`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ dueAt: "not-a-date" })
      .expect(400);
    expect(invalid.body.error.code).toBe("follow_up_invalid_due_at");

    const snoozed = await request(app)
      .post(`/follow-ups/comparison_item/${targetId}/snooze`)
      .set("Authorization", `Bearer ${owner.token}`)
      .set("X-Workspace-Id", workspaceId)
      .send({ dueAt: "2026-07-08T12:00:00.000Z", note: "Snoozed until county update." })
      .expect(200);
    expect(snoozed.body).toMatchObject({
      changed: true,
      followUp: {
        dueAt: "2026-07-08T12:00:00.000Z",
        dueState: "upcoming",
        previousDueAt: "2026-07-07T12:00:00.000Z",
        lastReminderState: "none",
        note: "Snoozed until county update.",
      },
    });
    expect(snoozed.body.followUp.snoozedAt).toBeTruthy();

    const deferredRun = await followUpService.runReminderScan(new Date("2026-07-07T13:00:00.000Z"));
    expect(deferredRun).toMatchObject({ scanned: 0, remindersCreated: 0 });

    const dueAgainRun = await followUpService.runReminderScan(new Date("2026-07-08T12:30:00.000Z"));
    expect(dueAgainRun).toMatchObject({ scanned: 1, remindersCreated: 1 });
    expect((await alertStore.listAlertsForUser(owner.userId)).filter((alert) => alert.type === "follow_up_due")).toHaveLength(2);
  });
});
