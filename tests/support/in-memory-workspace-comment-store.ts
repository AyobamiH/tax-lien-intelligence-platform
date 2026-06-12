import mongoose from "mongoose";
import type { WorkspaceCommentEntityType } from "@tax-lien/types";
import type { UserStore } from "../../apps/api/src/auth/user-store.js";
import type { AlertService } from "../../apps/api/src/alerts/alert-service.js";
import { DiscussionAttentionService } from "../../apps/api/src/discussion-attention/discussion-attention-service.js";
import type { WorkspaceCommentTargetAccess } from "../../apps/api/src/workspace-comments/comment-target-access.js";
import { WorkspaceCommentNotificationService } from "../../apps/api/src/workspace-comments/workspace-comment-notification-service.js";
import { WorkspaceCommentService } from "../../apps/api/src/workspace-comments/workspace-comment-service.js";
import {
  maxWorkspaceCommentsPerThreadResponse,
  type CreateWorkspaceCommentInput,
  type ListWorkspaceCommentsInput,
  type StoredWorkspaceComment,
  type WorkspaceCommentStore,
} from "../../apps/api/src/workspace-comments/workspace-comment-store.js";
import type { WorkspaceMembershipStore } from "../../apps/api/src/workspaces/workspace-store.js";
import { InMemoryDiscussionAttentionStore } from "./in-memory-discussion-attention-store.js";

export class InMemoryWorkspaceCommentStore implements WorkspaceCommentStore {
  private readonly comments = new Map<string, StoredWorkspaceComment>();

  public async createComment(input: CreateWorkspaceCommentInput): Promise<StoredWorkspaceComment> {
    const now = new Date();
    const comment: StoredWorkspaceComment = {
      id: new mongoose.Types.ObjectId().toString(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.comments.set(comment.id, comment);
    return comment;
  }

  public async listComments(input: ListWorkspaceCommentsInput): Promise<StoredWorkspaceComment[]> {
    return [...this.comments.values()]
      .filter(
        (comment) =>
          comment.workspaceId === input.workspaceId &&
          comment.relatedEntityType === input.relatedEntityType &&
          comment.relatedEntityId === input.relatedEntityId,
      )
      .sort(
        (left, right) =>
          left.createdAt.getTime() - right.createdAt.getTime() ||
          left.id.localeCompare(right.id),
      )
      .slice(-maxWorkspaceCommentsPerThreadResponse);
  }

  public async findLatestComment(input: ListWorkspaceCommentsInput): Promise<StoredWorkspaceComment | null> {
    const comments = await this.listComments(input);
    return comments.at(-1) ?? null;
  }

  public async findByIdInWorkspace(
    commentId: string,
    workspaceId: string,
  ): Promise<StoredWorkspaceComment | null> {
    const comment = this.comments.get(commentId);
    return comment?.workspaceId === workspaceId ? comment : null;
  }

  public async deleteByIdInWorkspace(commentId: string, workspaceId: string): Promise<boolean> {
    const comment = await this.findByIdInWorkspace(commentId, workspaceId);
    return comment ? this.comments.delete(commentId) : false;
  }
}

export class InMemoryWorkspaceCommentTargetAccess implements WorkspaceCommentTargetAccess {
  private readonly targets = new Set<string>();

  public allow(entityType: WorkspaceCommentEntityType, entityId: string, tenantUserId: string): void {
    this.targets.add(this.key(entityType, entityId, tenantUserId));
  }

  public deny(entityType: WorkspaceCommentEntityType, entityId: string, tenantUserId: string): void {
    this.targets.delete(this.key(entityType, entityId, tenantUserId));
  }

  public async canAccess(
    entityType: WorkspaceCommentEntityType,
    entityId: string,
    tenantUserId: string,
  ): Promise<boolean> {
    return this.targets.has(this.key(entityType, entityId, tenantUserId));
  }

  private key(entityType: WorkspaceCommentEntityType, entityId: string, tenantUserId: string): string {
    return `${tenantUserId}:${entityType}:${entityId}`;
  }
}

export function createInMemoryWorkspaceCommentService(
  userStore: UserStore,
  membershipStore: WorkspaceMembershipStore,
  alertService: AlertService,
  targetAccess = new InMemoryWorkspaceCommentTargetAccess(),
  store = new InMemoryWorkspaceCommentStore(),
): WorkspaceCommentService {
  const attentionService = new DiscussionAttentionService(new InMemoryDiscussionAttentionStore());
  return new WorkspaceCommentService(
    store,
    userStore,
    targetAccess,
    attentionService,
    new WorkspaceCommentNotificationService(membershipStore, attentionService, alertService),
  );
}
