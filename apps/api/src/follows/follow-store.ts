import {
  FollowSubscriptionModel,
  type FollowSubscriptionDocument,
} from "@tax-lien/db";
import type { FollowTargetEntityType } from "@tax-lien/types";

export interface StoredFollowSubscription {
  id: string;
  workspaceId: string;
  followerUserId: string;
  targetEntityType: FollowTargetEntityType;
  targetEntityId: string;
  followedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowTarget {
  workspaceId: string;
  targetEntityType: FollowTargetEntityType;
  targetEntityId: string;
}

export interface FollowSubscriptionKey extends FollowTarget {
  followerUserId: string;
}

export interface SaveFollowResult {
  subscription: StoredFollowSubscription;
  alreadyFollowing: boolean;
}

export interface FollowStore {
  findFollow(input: FollowSubscriptionKey): Promise<StoredFollowSubscription | null>;
  saveFollow(input: FollowSubscriptionKey & { followedAt: Date }): Promise<SaveFollowResult>;
  deleteFollow(input: FollowSubscriptionKey): Promise<StoredFollowSubscription | null>;
  listForFollower(workspaceId: string, followerUserId: string): Promise<StoredFollowSubscription[]>;
  listForTarget(target: FollowTarget): Promise<StoredFollowSubscription[]>;
}

export class MongoFollowStore implements FollowStore {
  public async findFollow(input: FollowSubscriptionKey): Promise<StoredFollowSubscription | null> {
    const document = await FollowSubscriptionModel.findOne(input).exec();
    return document ? mapFollow(document) : null;
  }

  public async saveFollow(
    input: FollowSubscriptionKey & { followedAt: Date },
  ): Promise<SaveFollowResult> {
    const existing = await this.findFollow(input);
    if (existing) {
      return { subscription: existing, alreadyFollowing: true };
    }

    try {
      const document = await FollowSubscriptionModel.create(input);
      return { subscription: mapFollow(document), alreadyFollowing: false };
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      const duplicate = await this.findFollow(input);
      if (!duplicate) {
        throw error;
      }
      return { subscription: duplicate, alreadyFollowing: true };
    }
  }

  public async deleteFollow(input: FollowSubscriptionKey): Promise<StoredFollowSubscription | null> {
    const document = await FollowSubscriptionModel.findOneAndDelete(input).exec();
    return document ? mapFollow(document) : null;
  }

  public async listForFollower(
    workspaceId: string,
    followerUserId: string,
  ): Promise<StoredFollowSubscription[]> {
    const documents = await FollowSubscriptionModel.find({ workspaceId, followerUserId })
      .sort({ followedAt: -1, _id: -1 })
      .limit(100)
      .exec();
    return documents.map(mapFollow);
  }

  public async listForTarget(target: FollowTarget): Promise<StoredFollowSubscription[]> {
    const documents = await FollowSubscriptionModel.find(target)
      .sort({ followedAt: 1, _id: 1 })
      .limit(500)
      .exec();
    return documents.map(mapFollow);
  }
}

function mapFollow(document: FollowSubscriptionDocument): StoredFollowSubscription {
  return {
    id: document.id,
    workspaceId: document.workspaceId,
    followerUserId: document.followerUserId,
    targetEntityType: document.targetEntityType,
    targetEntityId: document.targetEntityId,
    followedAt: document.followedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === 11000);
}
