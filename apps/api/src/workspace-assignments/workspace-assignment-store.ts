import {
  WorkspaceAssignmentModel,
  type WorkspaceAssignmentDocument,
} from "@tax-lien/db";
import type { WorkspaceAssignmentEntityType } from "@tax-lien/types";

export interface StoredWorkspaceAssignment {
  id: string;
  workspaceId: string;
  relatedEntityType: WorkspaceAssignmentEntityType;
  relatedEntityId: string;
  assigneeUserId: string;
  assignedByUserId: string;
  assignedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceAssignmentTarget {
  workspaceId: string;
  relatedEntityType: WorkspaceAssignmentEntityType;
  relatedEntityId: string;
}

export interface SaveWorkspaceAssignmentInput extends WorkspaceAssignmentTarget {
  assigneeUserId: string;
  assignedByUserId: string;
  assignedAt: Date;
}

export interface WorkspaceAssignmentStore {
  findForTarget(target: WorkspaceAssignmentTarget): Promise<StoredWorkspaceAssignment | null>;
  saveAssignment(input: SaveWorkspaceAssignmentInput): Promise<StoredWorkspaceAssignment>;
  clearAssignment(target: WorkspaceAssignmentTarget): Promise<StoredWorkspaceAssignment | null>;
  listForAssignee(workspaceId: string, assigneeUserId: string): Promise<StoredWorkspaceAssignment[]>;
}

export class MongoWorkspaceAssignmentStore implements WorkspaceAssignmentStore {
  public async findForTarget(target: WorkspaceAssignmentTarget): Promise<StoredWorkspaceAssignment | null> {
    const document = await WorkspaceAssignmentModel.findOne(target).exec();
    return document ? mapWorkspaceAssignment(document) : null;
  }

  public async saveAssignment(input: SaveWorkspaceAssignmentInput): Promise<StoredWorkspaceAssignment> {
    const document = await WorkspaceAssignmentModel.findOneAndUpdate(
      {
        workspaceId: input.workspaceId,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
      },
      {
        $set: {
          assigneeUserId: input.assigneeUserId,
          assignedByUserId: input.assignedByUserId,
          assignedAt: input.assignedAt,
        },
        $setOnInsert: {
          workspaceId: input.workspaceId,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
        },
      },
      { new: true, upsert: true },
    ).exec();
    return mapWorkspaceAssignment(document);
  }

  public async clearAssignment(target: WorkspaceAssignmentTarget): Promise<StoredWorkspaceAssignment | null> {
    const document = await WorkspaceAssignmentModel.findOneAndDelete(target).exec();
    return document ? mapWorkspaceAssignment(document) : null;
  }

  public async listForAssignee(
    workspaceId: string,
    assigneeUserId: string,
  ): Promise<StoredWorkspaceAssignment[]> {
    const documents = await WorkspaceAssignmentModel.find({ workspaceId, assigneeUserId })
      .sort({ updatedAt: -1, _id: -1 })
      .limit(100)
      .exec();
    return documents.map(mapWorkspaceAssignment);
  }
}

function mapWorkspaceAssignment(document: WorkspaceAssignmentDocument): StoredWorkspaceAssignment {
  return {
    id: document.id,
    workspaceId: document.workspaceId,
    relatedEntityType: document.relatedEntityType,
    relatedEntityId: document.relatedEntityId,
    assigneeUserId: document.assigneeUserId,
    assignedByUserId: document.assignedByUserId,
    assignedAt: document.assignedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
