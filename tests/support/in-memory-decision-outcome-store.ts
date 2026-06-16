import mongoose from "mongoose";
import type {
  DecisionOutcomeStore,
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
