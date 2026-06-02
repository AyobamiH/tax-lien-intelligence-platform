import type { DecisionHistoryDocument } from "@tax-lien/db";
import { DecisionHistoryModel } from "@tax-lien/db";
import type {
  ComparisonDecision,
  ComparisonSourceType,
  ComparisonHandoffResult,
  DecisionHistoryEventType,
  DecisionHistoryMetadata,
  DecisionHistoryRelatedEntityType,
  DecisionHistoryTargetEntityType,
  PortfolioStatus,
} from "@tax-lien/types";

export interface StoredDecisionHistoryEvent {
  id: string;
  userId: string;
  relatedEntityType: DecisionHistoryRelatedEntityType;
  relatedEntityId: string;
  eventType: DecisionHistoryEventType;
  previousDecision?: ComparisonDecision;
  newDecision?: ComparisonDecision;
  previousNoteSnapshot?: string;
  noteSnapshot?: string;
  metadata?: DecisionHistoryMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDecisionHistoryEventInput {
  userId: string;
  relatedEntityType: DecisionHistoryRelatedEntityType;
  relatedEntityId: string;
  eventType: DecisionHistoryEventType;
  previousDecision?: ComparisonDecision;
  newDecision?: ComparisonDecision;
  previousNoteSnapshot?: string;
  noteSnapshot?: string;
  metadata?: DecisionHistoryMetadata;
}

export interface DecisionHistoryStore {
  createEvent(input: CreateDecisionHistoryEventInput): Promise<StoredDecisionHistoryEvent>;
  listEventsForEntity(
    userId: string,
    relatedEntityType: DecisionHistoryRelatedEntityType,
    relatedEntityId: string,
  ): Promise<StoredDecisionHistoryEvent[]>;
}

export class MongoDecisionHistoryStore implements DecisionHistoryStore {
  public async createEvent(input: CreateDecisionHistoryEventInput): Promise<StoredDecisionHistoryEvent> {
    const document = await DecisionHistoryModel.create(input);
    return mapDecisionHistoryEvent(document);
  }

  public async listEventsForEntity(
    userId: string,
    relatedEntityType: DecisionHistoryRelatedEntityType,
    relatedEntityId: string,
  ): Promise<StoredDecisionHistoryEvent[]> {
    const documents = await DecisionHistoryModel.find({
      userId,
      relatedEntityType,
      relatedEntityId,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();

    return documents.map(mapDecisionHistoryEvent);
  }
}

export function mapDecisionHistoryEvent(document: DecisionHistoryDocument): StoredDecisionHistoryEvent {
  return {
    id: document.id,
    userId: document.userId,
    relatedEntityType: document.relatedEntityType,
    relatedEntityId: document.relatedEntityId,
    eventType: document.eventType,
    ...(document.previousDecision ? { previousDecision: document.previousDecision } : {}),
    ...(document.newDecision ? { newDecision: document.newDecision } : {}),
    ...(document.previousNoteSnapshot ? { previousNoteSnapshot: document.previousNoteSnapshot } : {}),
    ...(document.noteSnapshot ? { noteSnapshot: document.noteSnapshot } : {}),
    ...(document.metadata ? { metadata: mapMetadata(document.metadata) } : {}),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function mapMetadata(metadata: {
  workspaceId?: "default";
  datasetId?: string;
  scoredRecordId?: string;
  sourceType?: ComparisonSourceType;
  targetEntityType?: DecisionHistoryTargetEntityType;
  targetEntityId?: string;
  handoffResult?: ComparisonHandoffResult;
  portfolioStatus?: PortfolioStatus;
}): DecisionHistoryMetadata {
  return {
    ...(metadata.workspaceId ? { workspaceId: metadata.workspaceId } : {}),
    ...(metadata.datasetId ? { datasetId: metadata.datasetId } : {}),
    ...(metadata.scoredRecordId ? { scoredRecordId: metadata.scoredRecordId } : {}),
    ...(metadata.sourceType ? { sourceType: metadata.sourceType } : {}),
    ...(metadata.targetEntityType ? { targetEntityType: metadata.targetEntityType } : {}),
    ...(metadata.targetEntityId ? { targetEntityId: metadata.targetEntityId } : {}),
    ...(metadata.handoffResult ? { handoffResult: metadata.handoffResult } : {}),
    ...(metadata.portfolioStatus ? { portfolioStatus: metadata.portfolioStatus } : {}),
  };
}
