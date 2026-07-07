import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import { WorkspaceActivityService } from "../../apps/api/src/workspace-activity/workspace-activity-service.js";
import { InMemoryWorkspaceActivityStore } from "../support/in-memory-workspace-activity-store.js";

class SingleUserStore implements UserStore {
  public readonly user: StoredUser = {
    id: new mongoose.Types.ObjectId().toString(),
    email: "analyst@example.com",
    passwordHash: "unused",
    createdAt: new Date("2026-06-11T10:00:00.000Z"),
    updatedAt: new Date("2026-06-11T10:00:00.000Z"),
  };

  public async createUser(_input: CreateUserInput): Promise<StoredUser> {
    return this.user;
  }

  public async findByEmail(email: string): Promise<StoredUser | null> {
    return email === this.user.email ? this.user : null;
  }

  public async findById(id: string): Promise<StoredUser | null> {
    return id === this.user.id ? this.user : null;
  }
}

describe("workspace activity service", () => {
  it("builds bounded summaries and categories for the supported operational events", async () => {
    const userStore = new SingleUserStore();
    const service = new WorkspaceActivityService(new InMemoryWorkspaceActivityStore(), userStore);
    const workspaceId = new mongoose.Types.ObjectId().toString();

    const events = await Promise.all([
      service.record({
        workspaceId,
        actorUserId: userStore.user.id,
        eventType: "dataset_scoring_requested",
        relatedEntityType: "job",
        relatedEntityId: "job-score",
        metadata: { datasetId: "dataset-1", jobId: "job-score", requestKind: "score" },
      }),
      service.record({
        workspaceId,
        actorUserId: userStore.user.id,
        eventType: "dataset_refresh_requested",
        relatedEntityType: "job",
        relatedEntityId: "job-refresh",
        metadata: { datasetId: "dataset-1", jobId: "job-refresh", requestKind: "refresh" },
      }),
      service.record({
        workspaceId,
        actorUserId: userStore.user.id,
        eventType: "dataset_scoring_rate_limited",
        relatedEntityType: "dataset",
        relatedEntityId: "dataset-1",
        metadata: { datasetId: "dataset-1", requestKind: "score", rateLimitRetryAfterMs: 30_000 },
      }),
      service.record({
        workspaceId,
        actorUserId: userStore.user.id,
        eventType: "dataset_refresh_rate_limited",
        relatedEntityType: "dataset",
        relatedEntityId: "dataset-1",
        metadata: { datasetId: "dataset-1", requestKind: "refresh", rateLimitRetryAfterMs: 30_000 },
      }),
      service.record({
        workspaceId,
        actorUserId: userStore.user.id,
        eventType: "comparison_decision_changed",
        relatedEntityType: "comparison_item",
        relatedEntityId: "comparison-1",
        metadata: { previousDecision: "undecided", newDecision: "move_forward" },
      }),
      service.record({
        workspaceId,
        actorUserId: userStore.user.id,
        eventType: "comparison_handoff_to_watchlist",
        relatedEntityType: "comparison_item",
        relatedEntityId: "comparison-1",
      }),
      service.record({
        workspaceId,
        actorUserId: userStore.user.id,
        eventType: "comparison_handoff_to_portfolio",
        relatedEntityType: "comparison_item",
        relatedEntityId: "comparison-1",
      }),
      service.record({
        workspaceId,
        actorUserId: userStore.user.id,
        eventType: "portfolio_status_changed",
        relatedEntityType: "portfolio_item",
        relatedEntityId: "portfolio-1",
        metadata: { previousStatus: "tracked", newStatus: "reviewing" },
      }),
      service.record({
        workspaceId,
        actorUserId: userStore.user.id,
        eventType: "workspace_member_removed",
        relatedEntityType: "workspace_membership",
        relatedEntityId: "membership-1",
        metadata: {
          memberUserId: "member-1",
          memberEmail: "member@example.com",
          role: "member",
        },
      }),
      service.record({
        workspaceId,
        actorUserId: userStore.user.id,
        eventType: "entity_assigned",
        relatedEntityType: "watchlist_item",
        relatedEntityId: "watchlist-1",
        metadata: {
          targetEntityType: "watchlist_item",
          assigneeUserId: "member-1",
          assigneeEmail: "member@example.com",
        },
      }),
      service.record({
        workspaceId,
        actorUserId: userStore.user.id,
        eventType: "entity_assignment_cleared",
        relatedEntityType: "watchlist_item",
        relatedEntityId: "watchlist-1",
        metadata: {
          targetEntityType: "watchlist_item",
          previousAssigneeUserId: "member-1",
          previousAssigneeEmail: "member@example.com",
        },
      }),
      service.record({
        workspaceId,
        actorUserId: userStore.user.id,
        eventType: "approval_requested",
        relatedEntityType: "comparison_item",
        relatedEntityId: "comparison-1",
        metadata: {
          approvalRequestId: "approval-1",
          approvalAction: "comparison_handoff_to_portfolio",
          approvalStatus: "pending",
          approvalRequesterEmail: "member@example.com",
        },
      }),
      service.record({
        workspaceId,
        actorUserId: userStore.user.id,
        eventType: "approval_approved",
        relatedEntityType: "comparison_item",
        relatedEntityId: "comparison-1",
        metadata: {
          approvalRequestId: "approval-1",
          approvalAction: "comparison_handoff_to_portfolio",
          approvalStatus: "approved",
          approvalRequesterEmail: "member@example.com",
          approvalReviewerEmail: "owner@example.com",
          targetEntityType: "portfolio_item",
          targetEntityId: "portfolio-1",
        },
      }),
    ]);

    expect(events.map((event) => event.category)).toEqual([
      "data",
      "data",
      "data",
      "data",
      "decisions",
      "decisions",
      "decisions",
      "portfolio",
      "members",
      "responsibility",
      "responsibility",
      "approvals",
      "approvals",
    ]);
    expect(events.map((event) => event.summary)).toEqual([
      "Queued scoring for a dataset.",
      "Queued a scoring refresh for a dataset.",
      "Blocked repeated scoring requests for a dataset.",
      "Blocked repeated scoring refresh requests for a dataset.",
      "Changed a comparison decision from undecided to move forward.",
      "Moved a comparison candidate to the watchlist.",
      "Moved a comparison candidate into portfolio tracking.",
      "Changed a portfolio item from tracked to reviewing.",
      "Removed member@example.com from the workspace.",
      "Assigned a watchlist item to member@example.com.",
      "Cleared responsibility for a watchlist item previously assigned to member@example.com.",
      "member@example.com requested approval to move a comparison item to portfolio.",
      "owner@example.com approved a comparison-to-portfolio handoff.",
    ]);
    expect(events.every((event) => event.actor.email === "analyst@example.com")).toBe(true);
  });

  it("filters activity by workspace and category", async () => {
    const userStore = new SingleUserStore();
    const service = new WorkspaceActivityService(new InMemoryWorkspaceActivityStore(), userStore);

    await service.record({
      workspaceId: "workspace-a",
      actorUserId: userStore.user.id,
      eventType: "dataset_uploaded",
      relatedEntityType: "dataset",
      relatedEntityId: "dataset-1",
      metadata: { datasetName: "A.csv" },
    });
    await service.record({
      workspaceId: "workspace-a",
      actorUserId: userStore.user.id,
      eventType: "portfolio_status_changed",
      relatedEntityType: "portfolio_item",
      relatedEntityId: "portfolio-1",
      metadata: { previousStatus: "tracked", newStatus: "ready" },
    });
    await service.record({
      workspaceId: "workspace-b",
      actorUserId: userStore.user.id,
      eventType: "dataset_uploaded",
      relatedEntityType: "dataset",
      relatedEntityId: "dataset-2",
      metadata: { datasetName: "B.csv" },
    });

    const result = await service.list("workspace-a", { category: "data" });
    expect(result.activities).toHaveLength(1);
    expect(result.activities[0]?.relatedEntityId).toBe("dataset-1");
  });
});
