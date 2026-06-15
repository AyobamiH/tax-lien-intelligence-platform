import {
  WorkspacePolicyModel,
  type WorkspacePolicyDocument,
} from "@tax-lien/db";
import type { WorkspacePolicyRules } from "@tax-lien/types";

export interface StoredWorkspacePolicy {
  id: string;
  workspaceId: string;
  rules: WorkspacePolicyRules;
  updatedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspacePolicyStore {
  findForWorkspace(workspaceId: string): Promise<StoredWorkspacePolicy | null>;
  save(input: {
    workspaceId: string;
    rules: WorkspacePolicyRules;
    updatedByUserId: string;
  }): Promise<StoredWorkspacePolicy>;
}

export class MongoWorkspacePolicyStore implements WorkspacePolicyStore {
  public async findForWorkspace(workspaceId: string): Promise<StoredWorkspacePolicy | null> {
    const document = await WorkspacePolicyModel.findOne({ workspaceId }).exec();
    return document ? mapWorkspacePolicy(document) : null;
  }

  public async save(input: {
    workspaceId: string;
    rules: WorkspacePolicyRules;
    updatedByUserId: string;
  }): Promise<StoredWorkspacePolicy> {
    const document = await WorkspacePolicyModel.findOneAndUpdate(
      { workspaceId: input.workspaceId },
      {
        $set: {
          rules: input.rules,
          updatedByUserId: input.updatedByUserId,
        },
        $setOnInsert: { workspaceId: input.workspaceId },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).exec();
    return mapWorkspacePolicy(document);
  }
}

function mapWorkspacePolicy(document: WorkspacePolicyDocument): StoredWorkspacePolicy {
  return {
    id: document.id,
    workspaceId: document.workspaceId,
    rules: {
      requireAssignmentBeforeComparisonHandoff:
        document.rules.requireAssignmentBeforeComparisonHandoff,
      requireChecklistBeforeComparisonHandoff:
        document.rules.requireChecklistBeforeComparisonHandoff,
      requireApprovalForComparisonPortfolio:
        document.rules.requireApprovalForComparisonPortfolio,
    },
    updatedByUserId: document.updatedByUserId,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
