import mongoose from "mongoose";
import type {
  DecisionOutcomeStore,
  ListDecisionOutcomesInput,
  StoredDecisionOutcome,
  UpsertDecisionOutcomeInput,
} from "../../apps/api/src/decision-outcomes/decision-outcome-store.js";
import type { DecisionOutcomeTargetEntityType } from "@tax-lien/types";

export class InMemoryDecisionOutcomeStore implements DecisionOutcomeStore {
  private readonly outcomes = new Map<string, StoredDecisionOutcome>();

  public async findForTarget(
    workspaceId: string,
    targetEntityType: DecisionOutcomeTargetEntityType,
    targetEntityId: string,
  ): Promise<StoredDecisionOutcome | null> {
    return (
      [...this.outcomes.values()].find(
        (outcome) =>
          outcome.workspaceId === workspaceId &&
          outcome.targetEntityType === targetEntityType &&
          outcome.targetEntityId === targetEntityId,
      ) ?? null
    );
  }

  public async listForWorkspace(input: ListDecisionOutcomesInput): Promise<StoredDecisionOutcome[]> {
    return [...this.outcomes.values()]
      .filter((outcome) => outcome.workspaceId === input.workspaceId)
      .filter((outcome) => !input.targetEntityType || outcome.targetEntityType === input.targetEntityType)
      .filter((outcome) => !input.status || outcome.status === input.status)
      .filter((outcome) => !input.resolvedSince || outcome.resolvedAt >= input.resolvedSince)
      .sort((first, second) => {
        const resolvedDifference = second.resolvedAt.getTime() - first.resolvedAt.getTime();
        return resolvedDifference === 0 ? second.id.localeCompare(first.id) : resolvedDifference;
      });
  }

  public async upsertForTarget(input: UpsertDecisionOutcomeInput): Promise<StoredDecisionOutcome> {
    const existing = await this.findForTarget(
      input.workspaceId,
      input.targetEntityType,
      input.targetEntityId,
    );
    const now = new Date();
    const outcome: StoredDecisionOutcome = {
      id: existing?.id ?? new mongoose.Types.ObjectId().toString(),
      ...input,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.outcomes.set(outcome.id, outcome);
    return outcome;
  }
}
