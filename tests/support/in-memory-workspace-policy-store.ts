import type { WorkspacePolicyRules } from "@tax-lien/types";
import {
  WorkspacePolicyService,
  defaultWorkspacePolicyRules,
} from "../../apps/api/src/workspace-policies/workspace-policy-service.js";
import type {
  StoredWorkspacePolicy,
  WorkspacePolicyStore,
} from "../../apps/api/src/workspace-policies/workspace-policy-store.js";

export class InMemoryWorkspacePolicyStore implements WorkspacePolicyStore {
  private readonly policies = new Map<string, StoredWorkspacePolicy>();

  public async findForWorkspace(workspaceId: string): Promise<StoredWorkspacePolicy | null> {
    return this.policies.get(workspaceId) ?? null;
  }

  public async save(input: {
    workspaceId: string;
    rules: WorkspacePolicyRules;
    updatedByUserId: string;
  }): Promise<StoredWorkspacePolicy> {
    const existing = this.policies.get(input.workspaceId);
    const now = new Date();
    const policy: StoredWorkspacePolicy = {
      id: existing?.id ?? `policy-${input.workspaceId}`,
      workspaceId: input.workspaceId,
      rules: { ...input.rules },
      updatedByUserId: input.updatedByUserId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.policies.set(input.workspaceId, policy);
    return policy;
  }
}

export function createDisabledWorkspacePolicyService(): WorkspacePolicyService {
  return new WorkspacePolicyService(
    new InMemoryWorkspacePolicyStore(),
    {
      async get() {
        return { assignment: null };
      },
    },
    {
      async getState(_context, _entityType, targetEntityId) {
        return {
          targetEntityType: "comparison_item" as const,
          targetEntityId,
          progress: {
            status: "not_configured" as const,
            totalItems: 0,
            completedItems: 0,
            incompleteItems: 0,
            requiredItems: 0,
            completedRequiredItems: 0,
            incompleteRequiredItems: 0,
            allRequiredComplete: false,
          },
        };
      },
    },
  );
}

export const enabledWorkspacePolicyRules: WorkspacePolicyRules = {
  ...defaultWorkspacePolicyRules,
  requireAssignmentBeforeComparisonHandoff: true,
  requireChecklistBeforeComparisonHandoff: true,
  requireApprovalForComparisonPortfolio: true,
};
