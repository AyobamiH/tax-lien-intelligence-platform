import mongoose from "mongoose";
import type {
  DiscussionAttentionStore,
  DiscussionAttentionTarget,
  IncrementDiscussionAttentionInput,
  MarkDiscussionReadInput,
  StoredDiscussionAttention,
} from "../../apps/api/src/discussion-attention/discussion-attention-store.js";

export class InMemoryDiscussionAttentionStore implements DiscussionAttentionStore {
  private readonly attentionByTarget = new Map<string, StoredDiscussionAttention>();

  public async findForTarget(target: DiscussionAttentionTarget): Promise<StoredDiscussionAttention | null> {
    return this.attentionByTarget.get(this.key(target)) ?? null;
  }

  public async incrementUnread(
    input: IncrementDiscussionAttentionInput,
  ): Promise<{ attention: StoredDiscussionAttention; becameUnread: boolean }> {
    const now = new Date();
    const current = await this.findForTarget(input);
    const attention: StoredDiscussionAttention = {
      id: current?.id ?? new mongoose.Types.ObjectId().toString(),
      userId: input.userId,
      workspaceId: input.workspaceId,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      unreadCount: (current?.unreadCount ?? 0) + 1,
      ...(current?.lastReadAt ? { lastReadAt: current.lastReadAt } : {}),
      latestCommentAt: input.latestCommentAt,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
    this.attentionByTarget.set(this.key(input), attention);
    return {
      attention,
      becameUnread: attention.unreadCount === 1,
    };
  }

  public async markRead(input: MarkDiscussionReadInput): Promise<StoredDiscussionAttention> {
    const now = new Date();
    const current = await this.findForTarget(input);
    const attention: StoredDiscussionAttention = {
      id: current?.id ?? new mongoose.Types.ObjectId().toString(),
      userId: input.userId,
      workspaceId: input.workspaceId,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      unreadCount: 0,
      lastReadAt: input.readAt,
      ...(input.latestCommentAt
        ? { latestCommentAt: input.latestCommentAt }
        : current?.latestCommentAt
          ? { latestCommentAt: current.latestCommentAt }
          : {}),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
    this.attentionByTarget.set(this.key(input), attention);
    return attention;
  }

  private key(target: DiscussionAttentionTarget): string {
    return [
      target.userId,
      target.workspaceId,
      target.relatedEntityType,
      target.relatedEntityId,
    ].join(":");
  }
}
