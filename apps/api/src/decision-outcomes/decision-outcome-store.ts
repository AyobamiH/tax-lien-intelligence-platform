import {
  DecisionOutcomeModel,
  type DecisionOutcomeDocument,
} from "@tax-lien/db";
import type {
  DecisionOutcomeStatus,
  DecisionOutcomeTargetEntityType,
  WorkspaceRole,
} from "@tax-lien/types";

export interface StoredDecisionOutcome {
  id: string;
  workspaceId: string;
  targetEntityType: DecisionOutcomeTargetEntityType;
  targetEntityId: string;
  status: DecisionOutcomeStatus;
  resolverUserId: string;
  resolverEmail: string;
  resolverRole: WorkspaceRole;
  note: string;
  resolvedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertDecisionOutcomeInput {
  workspaceId: string;
  targetEntityType: DecisionOutcomeTargetEntityType;
  targetEntityId: string;
  status: DecisionOutcomeStatus;
  resolverUserId: string;
  resolverEmail: string;
  resolverRole: WorkspaceRole;
  note: string;
  resolvedAt: Date;
}

export interface ListDecisionOutcomesInput {
  workspaceId: string;
  targetEntityType?: DecisionOutcomeTargetEntityType;
  status?: DecisionOutcomeStatus;
  resolvedSince?: Date;
}

export interface DecisionOutcomeStore {
  findForTarget(
    workspaceId: string,
    targetEntityType: DecisionOutcomeTargetEntityType,
    targetEntityId: string,
  ): Promise<StoredDecisionOutcome | null>;
  listForWorkspace(input: ListDecisionOutcomesInput): Promise<StoredDecisionOutcome[]>;
  upsertForTarget(input: UpsertDecisionOutcomeInput): Promise<StoredDecisionOutcome>;
}

export class MongoDecisionOutcomeStore implements DecisionOutcomeStore {
  public async findForTarget(
    workspaceId: string,
    targetEntityType: DecisionOutcomeTargetEntityType,
    targetEntityId: string,
  ): Promise<StoredDecisionOutcome | null> {
    const document = await DecisionOutcomeModel.findOne({
      workspaceId,
      targetEntityType,
      targetEntityId,
    }).exec();
    return document ? mapDecisionOutcome(document) : null;
  }

  public async listForWorkspace(input: ListDecisionOutcomesInput): Promise<StoredDecisionOutcome[]> {
    const query: Record<string, unknown> = {
      workspaceId: input.workspaceId,
      ...(input.targetEntityType ? { targetEntityType: input.targetEntityType } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.resolvedSince ? { resolvedAt: { $gte: input.resolvedSince } } : {}),
    };
    const documents = await DecisionOutcomeModel.find(query)
      .sort({ resolvedAt: -1, _id: -1 })
      .exec();
    return documents.map(mapDecisionOutcome);
  }

  public async upsertForTarget(input: UpsertDecisionOutcomeInput): Promise<StoredDecisionOutcome> {
    const document = await DecisionOutcomeModel.findOneAndUpdate(
      {
        workspaceId: input.workspaceId,
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
      },
      {
        $set: {
          status: input.status,
          resolverUserId: input.resolverUserId,
          resolverEmail: input.resolverEmail,
          resolverRole: input.resolverRole,
          note: input.note,
          resolvedAt: input.resolvedAt,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();
    return mapDecisionOutcome(document);
  }
}

function mapDecisionOutcome(document: DecisionOutcomeDocument): StoredDecisionOutcome {
  return {
    id: document.id,
    workspaceId: document.workspaceId,
    targetEntityType: document.targetEntityType,
    targetEntityId: document.targetEntityId,
    status: document.status,
    resolverUserId: document.resolverUserId,
    resolverEmail: document.resolverEmail,
    resolverRole: document.resolverRole,
    note: document.note,
    resolvedAt: document.resolvedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
