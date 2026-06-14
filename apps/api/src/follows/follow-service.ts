import mongoose from "mongoose";
import type {
  FollowEntityResponse,
  FollowedItemChangeType,
  FollowListResponse,
  FollowStateResponse,
  FollowSubscriptionResponse,
  FollowTargetEntityType,
  UnfollowEntityResponse,
} from "@tax-lien/types";
import type { AlertService } from "../alerts/alert-service.js";
import type { UserStore } from "../auth/user-store.js";
import { ApiError } from "../errors/api-error.js";
import type { WorkspaceCommentTargetAccess } from "../workspace-comments/comment-target-access.js";
import type { WorkspaceAccessContext } from "../workspaces/workspace-service.js";
import type { WorkspaceMembershipStore } from "../workspaces/workspace-store.js";
import type {
  FollowStore,
  FollowTarget,
  StoredFollowSubscription,
} from "./follow-store.js";

export class FollowService {
  public constructor(
    private readonly store: FollowStore,
    private readonly targetAccess: WorkspaceCommentTargetAccess,
    private readonly membershipStore: WorkspaceMembershipStore,
    private readonly userStore: UserStore,
    private readonly alertService: AlertService,
  ) {}

  public async getState(
    context: WorkspaceAccessContext,
    actorUserId: string,
    targetEntityType: FollowTargetEntityType,
    targetEntityId: string,
  ): Promise<FollowStateResponse> {
    await this.assertTargetAccess(targetEntityType, targetEntityId, context.tenantUserId);
    const followTarget = target(context.workspaceId, targetEntityType, targetEntityId);
    const [subscription, followerCount] = await Promise.all([
      this.store.findFollow({ ...followTarget, followerUserId: actorUserId }),
      this.activeFollowerCount(followTarget),
    ]);
    return {
      targetEntityType,
      targetEntityId,
      following: Boolean(subscription),
      followerCount,
      ...(subscription ? { subscription: toResponse(subscription) } : {}),
    };
  }

  public async follow(
    context: WorkspaceAccessContext,
    actorUserId: string,
    targetEntityType: FollowTargetEntityType,
    targetEntityId: string,
  ): Promise<FollowEntityResponse> {
    await this.assertTargetAccess(targetEntityType, targetEntityId, context.tenantUserId);
    const followTarget = target(context.workspaceId, targetEntityType, targetEntityId);
    const result = await this.store.saveFollow({
      ...followTarget,
      followerUserId: actorUserId,
      followedAt: new Date(),
    });
    return {
      targetEntityType,
      targetEntityId,
      following: true,
      followerCount: await this.activeFollowerCount(followTarget),
      subscription: toResponse(result.subscription),
      alreadyFollowing: result.alreadyFollowing,
    };
  }

  public async unfollow(
    context: WorkspaceAccessContext,
    actorUserId: string,
    targetEntityType: FollowTargetEntityType,
    targetEntityId: string,
  ): Promise<UnfollowEntityResponse> {
    this.assertTargetId(targetEntityId);
    const followTarget = target(context.workspaceId, targetEntityType, targetEntityId);
    const removed = await this.store.deleteFollow({
      ...followTarget,
      followerUserId: actorUserId,
    });
    return {
      targetEntityType,
      targetEntityId,
      unfollowed: Boolean(removed),
      followerCount: await this.activeFollowerCount(followTarget),
    };
  }

  public async listMine(
    context: WorkspaceAccessContext,
    actorUserId: string,
  ): Promise<FollowListResponse> {
    const subscriptions = await this.store.listForFollower(context.workspaceId, actorUserId);
    const accessible: FollowSubscriptionResponse[] = [];
    for (const subscription of subscriptions) {
      if (
        await this.targetAccess.canAccess(
          subscription.targetEntityType,
          subscription.targetEntityId,
          context.tenantUserId,
        )
      ) {
        accessible.push(toResponse(subscription));
      }
    }
    return { follows: accessible };
  }

  public async notifyFollowers(input: {
    workspaceId: string;
    actorUserId: string;
    targetEntityType: FollowTargetEntityType;
    targetEntityId: string;
    changeType: FollowedItemChangeType;
    excludeUserIds?: string[];
  }): Promise<void> {
    const actor = await this.userStore.findById(input.actorUserId);
    if (!actor) {
      return;
    }
    const subscriptions = await this.activeFollowers(
      target(input.workspaceId, input.targetEntityType, input.targetEntityId),
    );
    const excluded = new Set([input.actorUserId, ...(input.excludeUserIds ?? [])]);
    const followEventId = new mongoose.Types.ObjectId().toString();
    await Promise.all(
      subscriptions
        .filter((subscription) => !excluded.has(subscription.followerUserId))
        .map((subscription) =>
          this.alertService.recordFollowedItemChanged({
            recipientUserId: subscription.followerUserId,
            workspaceId: input.workspaceId,
            actorUserId: actor.id,
            actorEmail: actor.email,
            relatedEntityType: input.targetEntityType,
            relatedEntityId: input.targetEntityId,
            followEventId,
            changeType: input.changeType,
          }),
        ),
    );
  }

  private async activeFollowerCount(targetInput: FollowTarget): Promise<number> {
    return (await this.activeFollowers(targetInput)).length;
  }

  private async activeFollowers(targetInput: FollowTarget): Promise<StoredFollowSubscription[]> {
    const subscriptions = await this.store.listForTarget(targetInput);
    const active: StoredFollowSubscription[] = [];
    for (const subscription of subscriptions) {
      if (
        await this.membershipStore.findForUserInWorkspace(
          subscription.followerUserId,
          targetInput.workspaceId,
        )
      ) {
        active.push(subscription);
      }
    }
    return active;
  }

  private async assertTargetAccess(
    targetEntityType: FollowTargetEntityType,
    targetEntityId: string,
    tenantUserId: string,
  ): Promise<void> {
    this.assertTargetId(targetEntityId);
    if (!(await this.targetAccess.canAccess(targetEntityType, targetEntityId, tenantUserId))) {
      throw new ApiError(404, "follow_target_not_found", "Follow target was not found.");
    }
  }

  private assertTargetId(targetEntityId: string): void {
    if (!mongoose.Types.ObjectId.isValid(targetEntityId)) {
      throw new ApiError(400, "follow_invalid_target_id", "Follow target id is invalid.");
    }
  }
}

function target(
  workspaceId: string,
  targetEntityType: FollowTargetEntityType,
  targetEntityId: string,
): FollowTarget {
  return { workspaceId, targetEntityType, targetEntityId };
}

function toResponse(subscription: StoredFollowSubscription): FollowSubscriptionResponse {
  return {
    id: subscription.id,
    workspaceId: subscription.workspaceId,
    targetEntityType: subscription.targetEntityType,
    targetEntityId: subscription.targetEntityId,
    followedAt: subscription.followedAt.toISOString(),
  };
}
