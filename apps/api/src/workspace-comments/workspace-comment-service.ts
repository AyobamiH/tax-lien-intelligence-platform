import mongoose from "mongoose";
import type {
  CreateWorkspaceCommentResponse,
  DeleteWorkspaceCommentResponse,
  WorkspaceCommentEntityType,
  WorkspaceCommentListResponse,
  WorkspaceCommentResponse,
} from "@tax-lien/types";
import type { UserStore } from "../auth/user-store.js";
import { ApiError } from "../errors/api-error.js";
import type { WorkspaceCommentTargetAccess } from "./comment-target-access.js";
import type {
  StoredWorkspaceComment,
  WorkspaceCommentStore,
} from "./workspace-comment-store.js";

export const maxWorkspaceCommentLength = 1000;
const unsafeControlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

export interface WorkspaceCommentContext {
  workspaceId: string;
  tenantUserId: string;
  actorUserId: string;
}

export class WorkspaceCommentService {
  public constructor(
    private readonly store: WorkspaceCommentStore,
    private readonly userStore: UserStore,
    private readonly targetAccess: WorkspaceCommentTargetAccess,
  ) {}

  public async list(
    context: WorkspaceCommentContext,
    entityType: WorkspaceCommentEntityType,
    entityId: string,
  ): Promise<WorkspaceCommentListResponse> {
    await this.assertTargetAccess(entityType, entityId, context.tenantUserId);
    const comments = await this.store.listComments({
      workspaceId: context.workspaceId,
      relatedEntityType: entityType,
      relatedEntityId: entityId,
    });

    return {
      comments: comments.map((comment) => toWorkspaceCommentResponse(comment, context.actorUserId)),
    };
  }

  public async create(
    context: WorkspaceCommentContext,
    entityType: WorkspaceCommentEntityType,
    entityId: string,
    body: string,
  ): Promise<CreateWorkspaceCommentResponse> {
    await this.assertTargetAccess(entityType, entityId, context.tenantUserId);
    const actor = await this.userStore.findById(context.actorUserId);
    if (!actor) {
      throw new ApiError(401, "comment_actor_not_found", "Comment author no longer exists.");
    }

    const normalizedBody = normalizeCommentBody(body);
    const comment = await this.store.createComment({
      workspaceId: context.workspaceId,
      actorUserId: actor.id,
      actorEmail: actor.email,
      relatedEntityType: entityType,
      relatedEntityId: entityId,
      body: normalizedBody,
    });

    return { comment: toWorkspaceCommentResponse(comment, context.actorUserId) };
  }

  public async delete(
    workspaceId: string,
    actorUserId: string,
    commentId: string,
  ): Promise<DeleteWorkspaceCommentResponse> {
    assertObjectId(commentId, "comment_invalid_id", "Comment id is invalid.");
    const comment = await this.store.findByIdInWorkspace(commentId, workspaceId);
    if (!comment) {
      throw new ApiError(404, "comment_not_found", "Comment was not found.");
    }
    if (comment.actorUserId !== actorUserId) {
      throw new ApiError(403, "comment_delete_forbidden", "Only the comment author can delete this comment.");
    }

    const deleted = await this.store.deleteByIdInWorkspace(commentId, workspaceId);
    if (!deleted) {
      throw new ApiError(404, "comment_not_found", "Comment was not found.");
    }

    return { id: commentId, deleted: true };
  }

  private async assertTargetAccess(
    entityType: WorkspaceCommentEntityType,
    entityId: string,
    tenantUserId: string,
  ): Promise<void> {
    assertObjectId(entityId, "comment_invalid_entity_id", "Comment target id is invalid.");
    if (!(await this.targetAccess.canAccess(entityType, entityId, tenantUserId))) {
      throw new ApiError(404, "comment_target_not_found", "Comment target was not found.");
    }
  }
}

export function normalizeCommentBody(body: string): string {
  const normalized = body.trim();
  if (!normalized) {
    throw new ApiError(400, "comment_body_required", "Comment body is required.");
  }
  if (normalized.length > maxWorkspaceCommentLength) {
    throw new ApiError(
      400,
      "comment_body_too_long",
      `Comment body cannot exceed ${maxWorkspaceCommentLength} characters.`,
    );
  }
  if (unsafeControlCharacters.test(normalized)) {
    throw new ApiError(400, "comment_invalid_content", "Comment body contains unsupported characters.");
  }
  return normalized;
}

function assertObjectId(id: string, code: string, message: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, code, message);
  }
}

function toWorkspaceCommentResponse(
  comment: StoredWorkspaceComment,
  currentUserId: string,
): WorkspaceCommentResponse {
  return {
    id: comment.id,
    workspaceId: comment.workspaceId,
    author: {
      userId: comment.actorUserId,
      email: comment.actorEmail,
    },
    relatedEntityType: comment.relatedEntityType,
    relatedEntityId: comment.relatedEntityId,
    body: comment.body,
    canDelete: comment.actorUserId === currentUserId,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}
