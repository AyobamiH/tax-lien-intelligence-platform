import mongoose from "mongoose";
import type {
  FollowStore,
  FollowSubscriptionKey,
  FollowTarget,
  SaveFollowResult,
  StoredFollowSubscription,
} from "../../apps/api/src/follows/follow-store.js";

export class InMemoryFollowStore implements FollowStore {
  private readonly subscriptions = new Map<string, StoredFollowSubscription>();

  public async findFollow(
    input: FollowSubscriptionKey,
  ): Promise<StoredFollowSubscription | null> {
    return (
      [...this.subscriptions.values()].find(
        (subscription) =>
          subscription.workspaceId === input.workspaceId &&
          subscription.followerUserId === input.followerUserId &&
          subscription.targetEntityType === input.targetEntityType &&
          subscription.targetEntityId === input.targetEntityId,
      ) ?? null
    );
  }

  public async saveFollow(
    input: FollowSubscriptionKey & { followedAt: Date },
  ): Promise<SaveFollowResult> {
    const existing = await this.findFollow(input);
    if (existing) {
      return { subscription: existing, alreadyFollowing: true };
    }

    const now = new Date();
    const subscription: StoredFollowSubscription = {
      id: new mongoose.Types.ObjectId().toString(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.subscriptions.set(subscription.id, subscription);
    return { subscription, alreadyFollowing: false };
  }

  public async deleteFollow(
    input: FollowSubscriptionKey,
  ): Promise<StoredFollowSubscription | null> {
    const existing = await this.findFollow(input);
    if (!existing) {
      return null;
    }
    this.subscriptions.delete(existing.id);
    return existing;
  }

  public async listForFollower(
    workspaceId: string,
    followerUserId: string,
  ): Promise<StoredFollowSubscription[]> {
    return [...this.subscriptions.values()]
      .filter(
        (subscription) =>
          subscription.workspaceId === workspaceId &&
          subscription.followerUserId === followerUserId,
      )
      .sort((left, right) => right.followedAt.getTime() - left.followedAt.getTime());
  }

  public async listForTarget(target: FollowTarget): Promise<StoredFollowSubscription[]> {
    return [...this.subscriptions.values()]
      .filter(
        (subscription) =>
          subscription.workspaceId === target.workspaceId &&
          subscription.targetEntityType === target.targetEntityType &&
          subscription.targetEntityId === target.targetEntityId,
      )
      .sort((left, right) => left.followedAt.getTime() - right.followedAt.getTime());
  }
}
