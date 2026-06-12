import type {
  DiscussionAttentionResponse,
  WorkspaceCommentEntityType,
} from "@tax-lien/types";
import type {
  DiscussionAttentionStore,
  DiscussionAttentionTarget,
  StoredDiscussionAttention,
} from "./discussion-attention-store.js";

export class DiscussionAttentionService {
  public constructor(private readonly store: DiscussionAttentionStore) {}

  public async get(target: DiscussionAttentionTarget): Promise<DiscussionAttentionResponse> {
    const attention = await this.store.findForTarget(target);
    return attention ? toDiscussionAttentionResponse(attention) : emptyDiscussionAttentionResponse(target);
  }

  public async incrementUnread(
    target: DiscussionAttentionTarget,
    latestCommentAt: Date,
  ): Promise<{ attention: DiscussionAttentionResponse; becameUnread: boolean }> {
    const result = await this.store.incrementUnread({ ...target, latestCommentAt });
    return {
      attention: toDiscussionAttentionResponse(result.attention),
      becameUnread: result.becameUnread,
    };
  }

  public async markRead(
    target: DiscussionAttentionTarget,
    latestCommentAt?: Date,
  ): Promise<DiscussionAttentionResponse> {
    return toDiscussionAttentionResponse(
      await this.store.markRead({
        ...target,
        readAt: new Date(),
        ...(latestCommentAt ? { latestCommentAt } : {}),
      }),
    );
  }
}

export function emptyDiscussionAttentionResponse(input: {
  workspaceId: string;
  relatedEntityType: WorkspaceCommentEntityType;
  relatedEntityId: string;
  latestCommentAt?: Date;
}): DiscussionAttentionResponse {
  return {
    workspaceId: input.workspaceId,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    unreadCount: 0,
    hasUnread: false,
    ...(input.latestCommentAt ? { latestCommentAt: input.latestCommentAt.toISOString() } : {}),
  };
}

function toDiscussionAttentionResponse(attention: StoredDiscussionAttention): DiscussionAttentionResponse {
  return {
    workspaceId: attention.workspaceId,
    relatedEntityType: attention.relatedEntityType,
    relatedEntityId: attention.relatedEntityId,
    unreadCount: attention.unreadCount,
    hasUnread: attention.unreadCount > 0,
    ...(attention.lastReadAt ? { lastReadAt: attention.lastReadAt.toISOString() } : {}),
    ...(attention.latestCommentAt ? { latestCommentAt: attention.latestCommentAt.toISOString() } : {}),
  };
}
