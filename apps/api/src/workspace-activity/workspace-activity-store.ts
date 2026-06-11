import { WorkspaceActivityModel, type WorkspaceActivityDocument } from "@tax-lien/db";
import type {
  WorkspaceActivityCategory,
  WorkspaceActivityEventType,
  WorkspaceActivityMetadata,
  WorkspaceActivityRelatedEntityType,
} from "@tax-lien/types";

export interface StoredWorkspaceActivity {
  id: string;
  workspaceId: string;
  actorUserId: string;
  actorEmail: string;
  category: WorkspaceActivityCategory;
  eventType: WorkspaceActivityEventType;
  relatedEntityType: WorkspaceActivityRelatedEntityType;
  relatedEntityId: string;
  summary: string;
  metadata?: WorkspaceActivityMetadata;
  occurredAt: Date;
}

export interface CreateWorkspaceActivityInput {
  workspaceId: string;
  actorUserId: string;
  actorEmail: string;
  category: WorkspaceActivityCategory;
  eventType: WorkspaceActivityEventType;
  relatedEntityType: WorkspaceActivityRelatedEntityType;
  relatedEntityId: string;
  summary: string;
  metadata?: WorkspaceActivityMetadata;
  occurredAt: Date;
}

export interface ListWorkspaceActivityInput {
  workspaceId: string;
  category?: WorkspaceActivityCategory;
  limit: number;
}

export interface WorkspaceActivityStore {
  createActivity(input: CreateWorkspaceActivityInput): Promise<StoredWorkspaceActivity>;
  listActivity(input: ListWorkspaceActivityInput): Promise<StoredWorkspaceActivity[]>;
}

export class MongoWorkspaceActivityStore implements WorkspaceActivityStore {
  public async createActivity(input: CreateWorkspaceActivityInput): Promise<StoredWorkspaceActivity> {
    const document = await WorkspaceActivityModel.create(input);
    return mapWorkspaceActivity(document);
  }

  public async listActivity(input: ListWorkspaceActivityInput): Promise<StoredWorkspaceActivity[]> {
    const documents = await WorkspaceActivityModel.find({
      workspaceId: input.workspaceId,
      ...(input.category ? { category: input.category } : {}),
    })
      .sort({ occurredAt: -1, _id: -1 })
      .limit(input.limit)
      .exec();

    return documents.map(mapWorkspaceActivity);
  }
}

function mapWorkspaceActivity(document: WorkspaceActivityDocument): StoredWorkspaceActivity {
  const metadata = document.toObject().metadata as WorkspaceActivityMetadata | undefined;
  return {
    id: document.id,
    workspaceId: document.workspaceId,
    actorUserId: document.actorUserId,
    actorEmail: document.actorEmail,
    category: document.category,
    eventType: document.eventType,
    relatedEntityType: document.relatedEntityType,
    relatedEntityId: document.relatedEntityId,
    summary: document.summary,
    ...(metadata ? { metadata } : {}),
    occurredAt: document.occurredAt,
  };
}
