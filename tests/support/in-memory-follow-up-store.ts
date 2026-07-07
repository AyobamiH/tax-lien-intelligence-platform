import mongoose from "mongoose";
import type {
  FollowUpStore,
  FollowUpTarget,
  SaveFollowUpInput,
  SaveFollowUpResult,
  StoredFollowUp,
} from "../../apps/api/src/follow-ups/follow-up-store.js";
import type { FollowUpReminderState } from "@tax-lien/types";

export class InMemoryFollowUpStore implements FollowUpStore {
  private readonly followUps = new Map<string, StoredFollowUp>();

  public async findForTarget(target: FollowUpTarget): Promise<StoredFollowUp | null> {
    return this.followUps.get(this.key(target)) ?? null;
  }

  public async saveFollowUp(input: SaveFollowUpInput): Promise<SaveFollowUpResult> {
    const key = this.key(input);
    const previous = this.followUps.get(key) ?? null;
    const now = new Date();
    const followUp: StoredFollowUp = {
      id: previous?.id ?? new mongoose.Types.ObjectId().toString(),
      workspaceId: input.workspaceId,
      targetEntityType: input.targetEntityType,
      targetEntityId: input.targetEntityId,
      dueAt: input.dueAt,
      ...(input.note ? { note: input.note } : {}),
      createdByUserId: previous?.createdByUserId ?? input.actorUserId,
      updatedByUserId: input.actorUserId,
      lastReminderState: "none",
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
    this.followUps.set(key, followUp);
    return {
      followUp,
      previous,
      changed: !previous || previous.dueAt.getTime() !== followUp.dueAt.getTime() || (previous.note ?? "") !== (followUp.note ?? ""),
    };
  }

  public async clearFollowUp(
    target: FollowUpTarget & { actorUserId: string; clearedAt: Date },
  ): Promise<StoredFollowUp | null> {
    const key = this.key(target);
    const previous = this.followUps.get(key) ?? null;
    if (!previous || previous.clearedAt) {
      return null;
    }
    const cleared: StoredFollowUp = {
      ...previous,
      clearedAt: target.clearedAt,
      clearedByUserId: target.actorUserId,
      updatedByUserId: target.actorUserId,
      updatedAt: new Date(),
    };
    this.followUps.set(key, cleared);
    return cleared;
  }

  public async listActiveForWorkspace(
    workspaceId: string,
    _now: Date,
    upcomingUntil: Date,
    limit: number,
  ): Promise<StoredFollowUp[]> {
    return [...this.followUps.values()]
      .filter(
        (followUp) =>
          followUp.workspaceId === workspaceId &&
          !followUp.clearedAt &&
          followUp.dueAt.getTime() <= upcomingUntil.getTime(),
      )
      .sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime() || left.id.localeCompare(right.id))
      .slice(0, limit);
  }

  public async listDueForReminder(now: Date, limit: number): Promise<StoredFollowUp[]> {
    return [...this.followUps.values()]
      .filter((followUp) => !followUp.clearedAt && followUp.dueAt.getTime() <= now.getTime())
      .sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime() || left.id.localeCompare(right.id))
      .slice(0, limit);
  }

  public async markReminderSent(
    followUpId: string,
    state: Exclude<FollowUpReminderState, "none">,
    remindedAt: Date,
  ): Promise<StoredFollowUp | null> {
    const followUp = [...this.followUps.values()].find((candidate) => candidate.id === followUpId) ?? null;
    if (!followUp || followUp.clearedAt) {
      return null;
    }
    const updated = {
      ...followUp,
      lastReminderAt: remindedAt,
      lastReminderState: state,
      updatedAt: new Date(),
    };
    this.followUps.set(this.key(updated), updated);
    return updated;
  }

  private key(target: FollowUpTarget): string {
    return `${target.workspaceId}:${target.targetEntityType}:${target.targetEntityId}`;
  }
}
