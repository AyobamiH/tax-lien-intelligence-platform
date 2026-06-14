import {
  DiscussionAttentionModel,
  type DiscussionAttentionDocument,
} from "@tax-lien/db";
import type { WorkspaceCommentEntityType } from "@tax-lien/types";

export interface StoredDiscussionAttention {
  id: string;
  userId: string;
  workspaceId: string;
  relatedEntityType: WorkspaceCommentEntityType;
  relatedEntityId: string;
  unreadCount: number;
  lastReadAt?: Date;
  latestCommentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiscussionAttentionTarget {
  userId: string;
  workspaceId: string;
  relatedEntityType: WorkspaceCommentEntityType;
  relatedEntityId: string;
}

export interface IncrementDiscussionAttentionInput extends DiscussionAttentionTarget {
  latestCommentAt: Date;
}

export interface MarkDiscussionReadInput extends DiscussionAttentionTarget {
  readAt: Date;
  latestCommentAt?: Date;
}

export interface DiscussionAttentionStore {
  findForTarget(target: DiscussionAttentionTarget): Promise<StoredDiscussionAttention | null>;
  listUnreadForUser(userId: string, workspaceId: string): Promise<StoredDiscussionAttention[]>;
  incrementUnread(
    input: IncrementDiscussionAttentionInput,
  ): Promise<{ attention: StoredDiscussionAttention; becameUnread: boolean }>;
  markRead(input: MarkDiscussionReadInput): Promise<StoredDiscussionAttention>;
}

export class MongoDiscussionAttentionStore implements DiscussionAttentionStore {
  public async findForTarget(target: DiscussionAttentionTarget): Promise<StoredDiscussionAttention | null> {
    const document = await DiscussionAttentionModel.findOne(target).exec();
    return document ? mapDiscussionAttention(document) : null;
  }

  public async listUnreadForUser(
    userId: string,
    workspaceId: string,
  ): Promise<StoredDiscussionAttention[]> {
    const documents = await DiscussionAttentionModel.find({
      userId,
      workspaceId,
      unreadCount: { $gt: 0 },
    })
      .sort({ latestCommentAt: -1, updatedAt: -1, _id: -1 })
      .limit(100)
      .exec();
    return documents.map(mapDiscussionAttention);
  }

  public async incrementUnread(
    input: IncrementDiscussionAttentionInput,
  ): Promise<{ attention: StoredDiscussionAttention; becameUnread: boolean }> {
    const document = await DiscussionAttentionModel.findOneAndUpdate(
      {
        userId: input.userId,
        workspaceId: input.workspaceId,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
      },
      {
        $setOnInsert: {
          userId: input.userId,
          workspaceId: input.workspaceId,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
        },
        $set: {
          latestCommentAt: input.latestCommentAt,
        },
        $inc: {
          unreadCount: 1,
        },
      },
      { new: true, upsert: true },
    ).exec();
    const attention = mapDiscussionAttention(document);
    return {
      attention,
      becameUnread: attention.unreadCount === 1,
    };
  }

  public async markRead(input: MarkDiscussionReadInput): Promise<StoredDiscussionAttention> {
    const document = await DiscussionAttentionModel.findOneAndUpdate(
      {
        userId: input.userId,
        workspaceId: input.workspaceId,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
      },
      {
        $setOnInsert: {
          userId: input.userId,
          workspaceId: input.workspaceId,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
        },
        $set: {
          unreadCount: 0,
          lastReadAt: input.readAt,
          ...(input.latestCommentAt ? { latestCommentAt: input.latestCommentAt } : {}),
        },
      },
      { new: true, upsert: true },
    ).exec();
    return mapDiscussionAttention(document);
  }
}

function mapDiscussionAttention(document: DiscussionAttentionDocument): StoredDiscussionAttention {
  return {
    id: document.id,
    userId: document.userId,
    workspaceId: document.workspaceId,
    relatedEntityType: document.relatedEntityType,
    relatedEntityId: document.relatedEntityId,
    unreadCount: document.unreadCount,
    ...(document.lastReadAt ? { lastReadAt: document.lastReadAt } : {}),
    ...(document.latestCommentAt ? { latestCommentAt: document.latestCommentAt } : {}),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
