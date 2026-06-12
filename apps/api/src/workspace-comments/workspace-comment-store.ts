import { WorkspaceCommentModel, type WorkspaceCommentDocument } from "@tax-lien/db";
import type { WorkspaceCommentEntityType } from "@tax-lien/types";

export const maxWorkspaceCommentsPerThreadResponse = 200;

export interface StoredWorkspaceComment {
  id: string;
  workspaceId: string;
  actorUserId: string;
  actorEmail: string;
  relatedEntityType: WorkspaceCommentEntityType;
  relatedEntityId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkspaceCommentInput {
  workspaceId: string;
  actorUserId: string;
  actorEmail: string;
  relatedEntityType: WorkspaceCommentEntityType;
  relatedEntityId: string;
  body: string;
}

export interface ListWorkspaceCommentsInput {
  workspaceId: string;
  relatedEntityType: WorkspaceCommentEntityType;
  relatedEntityId: string;
}

export interface WorkspaceCommentStore {
  createComment(input: CreateWorkspaceCommentInput): Promise<StoredWorkspaceComment>;
  listComments(input: ListWorkspaceCommentsInput): Promise<StoredWorkspaceComment[]>;
  findByIdInWorkspace(commentId: string, workspaceId: string): Promise<StoredWorkspaceComment | null>;
  deleteByIdInWorkspace(commentId: string, workspaceId: string): Promise<boolean>;
}

export class MongoWorkspaceCommentStore implements WorkspaceCommentStore {
  public async createComment(input: CreateWorkspaceCommentInput): Promise<StoredWorkspaceComment> {
    const document = await WorkspaceCommentModel.create(input);
    return mapWorkspaceComment(document);
  }

  public async listComments(input: ListWorkspaceCommentsInput): Promise<StoredWorkspaceComment[]> {
    const documents = await WorkspaceCommentModel.find(input)
      .sort({ createdAt: -1, _id: -1 })
      .limit(maxWorkspaceCommentsPerThreadResponse)
      .exec();
    return documents.reverse().map(mapWorkspaceComment);
  }

  public async findByIdInWorkspace(
    commentId: string,
    workspaceId: string,
  ): Promise<StoredWorkspaceComment | null> {
    const document = await WorkspaceCommentModel.findOne({ _id: commentId, workspaceId }).exec();
    return document ? mapWorkspaceComment(document) : null;
  }

  public async deleteByIdInWorkspace(commentId: string, workspaceId: string): Promise<boolean> {
    const result = await WorkspaceCommentModel.deleteOne({ _id: commentId, workspaceId }).exec();
    return result.deletedCount === 1;
  }
}

function mapWorkspaceComment(document: WorkspaceCommentDocument): StoredWorkspaceComment {
  return {
    id: document.id,
    workspaceId: document.workspaceId,
    actorUserId: document.actorUserId,
    actorEmail: document.actorEmail,
    relatedEntityType: document.relatedEntityType,
    relatedEntityId: document.relatedEntityId,
    body: document.body,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
