import mongoose from "mongoose";
import type {
  ClearFollowUpResponse,
  CompleteFollowUpResponse,
  FollowUpDueState,
  FollowUpQueueResponse,
  FollowUpReminderRunResponse,
  FollowUpResponse,
  FollowUpStateResponse,
  SnoozeFollowUpResponse,
  FollowUpTargetEntityType,
  UpsertFollowUpResponse,
} from "@tax-lien/types";
import type { AlertService } from "../alerts/alert-service.js";
import { ApiError } from "../errors/api-error.js";
import type { WorkspaceAssignmentStore } from "../workspace-assignments/workspace-assignment-store.js";
import {
  recordWorkspaceActivitySafely,
  type WorkspaceActivityService,
} from "../workspace-activity/workspace-activity-service.js";
import type { WorkspaceCommentTargetAccess } from "../workspace-comments/comment-target-access.js";
import type { WorkspaceAccessContext } from "../workspaces/workspace-service.js";
import type { WorkspaceMembershipStore } from "../workspaces/workspace-store.js";
import type { FollowUpStore, FollowUpTarget, StoredFollowUp } from "./follow-up-store.js";

const defaultUpcomingWindowDays = 14;
const maxFollowUpNoteLength = 500;
const maxQueueItems = 50;
const maxReminderBatchSize = 100;

export class FollowUpService {
  public constructor(
    private readonly store: FollowUpStore,
    private readonly targetAccess: WorkspaceCommentTargetAccess,
    private readonly assignmentStore: WorkspaceAssignmentStore,
    private readonly membershipStore: WorkspaceMembershipStore,
    private readonly alertService: AlertService,
    private readonly activityService: WorkspaceActivityService,
  ) {}

  public async getState(
    context: WorkspaceAccessContext,
    targetEntityType: FollowUpTargetEntityType,
    targetEntityId: string,
    now = new Date(),
  ): Promise<FollowUpStateResponse> {
    await this.assertTargetAccess(targetEntityType, targetEntityId, context.tenantUserId);
    const followUp = await this.store.findForTarget(target(context.workspaceId, targetEntityType, targetEntityId));
    if (!followUp || followUp.clearedAt) {
      return {
        targetEntityType,
        targetEntityId,
        dueState: "none",
        followUp: null,
      };
    }
    return {
      targetEntityType,
      targetEntityId,
      dueState: dueStateFor(followUp, now),
      followUp: toResponse(followUp, now),
    };
  }

  public async upsert(
    context: WorkspaceAccessContext,
    actorUserId: string,
    targetEntityType: FollowUpTargetEntityType,
    targetEntityId: string,
    input: { dueAt: Date; note?: string },
    now = new Date(),
  ): Promise<UpsertFollowUpResponse> {
    await this.assertTargetAccess(targetEntityType, targetEntityId, context.tenantUserId);
    const dueAt = this.assertUsableDueDate(input.dueAt, now);
    const note = normalizeNote(input.note);
    const result = await this.store.saveFollowUp({
      ...target(context.workspaceId, targetEntityType, targetEntityId),
      dueAt,
      ...(note ? { note } : {}),
      actorUserId,
    });

    if (result.changed) {
      await recordWorkspaceActivitySafely(this.activityService, {
        workspaceId: context.workspaceId,
        actorUserId,
        eventType: "follow_up_set",
        relatedEntityType: targetEntityType,
        relatedEntityId: targetEntityId,
        metadata: {
          targetEntityType,
          followUpId: result.followUp.id,
          followUpDueAt: result.followUp.dueAt.toISOString(),
          ...(result.previous ? { followUpPreviousDueAt: result.previous.dueAt.toISOString() } : {}),
        },
      });
    }

    return {
      followUp: toResponse(result.followUp, now),
      changed: result.changed,
    };
  }

  public async clear(
    context: WorkspaceAccessContext,
    actorUserId: string,
    targetEntityType: FollowUpTargetEntityType,
    targetEntityId: string,
  ): Promise<ClearFollowUpResponse> {
    await this.assertTargetAccess(targetEntityType, targetEntityId, context.tenantUserId);
    const cleared = await this.store.clearFollowUp({
      ...target(context.workspaceId, targetEntityType, targetEntityId),
      actorUserId,
      clearedAt: new Date(),
    });
    if (cleared) {
      await recordWorkspaceActivitySafely(this.activityService, {
        workspaceId: context.workspaceId,
        actorUserId,
        eventType: "follow_up_cleared",
        relatedEntityType: targetEntityType,
        relatedEntityId: targetEntityId,
        metadata: {
          targetEntityType,
          followUpId: cleared.id,
          followUpDueAt: cleared.dueAt.toISOString(),
        },
      });
    }
    return { targetEntityType, targetEntityId, cleared: Boolean(cleared) };
  }

  public async complete(
    context: WorkspaceAccessContext,
    actorUserId: string,
    targetEntityType: FollowUpTargetEntityType,
    targetEntityId: string,
    now = new Date(),
  ): Promise<CompleteFollowUpResponse> {
    await this.assertTargetAccess(targetEntityType, targetEntityId, context.tenantUserId);
    const completed = await this.store.completeFollowUp({
      ...target(context.workspaceId, targetEntityType, targetEntityId),
      actorUserId,
      completedAt: now,
    });
    if (completed) {
      await recordWorkspaceActivitySafely(this.activityService, {
        workspaceId: context.workspaceId,
        actorUserId,
        eventType: "follow_up_completed",
        relatedEntityType: targetEntityType,
        relatedEntityId: targetEntityId,
        metadata: {
          targetEntityType,
          followUpId: completed.id,
          followUpDueAt: completed.dueAt.toISOString(),
          followUpCompletedAt: completed.completedAt?.toISOString() ?? now.toISOString(),
        },
      });
    }
    return {
      targetEntityType,
      targetEntityId,
      completed: Boolean(completed),
      followUp: completed ? toResponse(completed, now) : null,
    };
  }

  public async snooze(
    context: WorkspaceAccessContext,
    actorUserId: string,
    targetEntityType: FollowUpTargetEntityType,
    targetEntityId: string,
    input: { dueAt: Date; note?: string },
    now = new Date(),
  ): Promise<SnoozeFollowUpResponse> {
    await this.assertTargetAccess(targetEntityType, targetEntityId, context.tenantUserId);
    const existing = await this.store.findForTarget(target(context.workspaceId, targetEntityType, targetEntityId));
    if (!existing || existing.clearedAt) {
      throw new ApiError(404, "follow_up_not_found", "Follow-up was not found.");
    }
    const dueAt = this.assertUsableDueDate(input.dueAt, now);
    const note = normalizeNote(input.note);
    const result = await this.store.saveFollowUp({
      ...target(context.workspaceId, targetEntityType, targetEntityId),
      dueAt,
      ...(note ? { note } : {}),
      actorUserId,
      snoozedAt: now,
    });

    if (result.changed) {
      await recordWorkspaceActivitySafely(this.activityService, {
        workspaceId: context.workspaceId,
        actorUserId,
        eventType: "follow_up_snoozed",
        relatedEntityType: targetEntityType,
        relatedEntityId: targetEntityId,
        metadata: {
          targetEntityType,
          followUpId: result.followUp.id,
          followUpDueAt: result.followUp.dueAt.toISOString(),
          ...(result.previous ? { followUpPreviousDueAt: result.previous.dueAt.toISOString() } : {}),
          followUpSnoozedAt: now.toISOString(),
        },
      });
    }

    return {
      followUp: toResponse(result.followUp, now),
      changed: result.changed,
    };
  }

  public async listQueue(
    context: WorkspaceAccessContext,
    actorUserId: string,
    options: { now?: Date; windowDays?: number; limit?: number } = {},
  ): Promise<FollowUpQueueResponse> {
    const now = options.now ?? new Date();
    const windowDays = boundedWindowDays(options.windowDays);
    const limit = Math.max(1, Math.min(options.limit ?? maxQueueItems, maxQueueItems));
    const upcomingUntil = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
    const candidates = await this.store.listActiveForWorkspace(context.workspaceId, now, upcomingUntil, limit * 3);
    const items: FollowUpResponse[] = [];

    for (const followUp of candidates) {
      if (items.length >= limit) {
        break;
      }
      if (!(await this.isAccessibleFollowUp(followUp, context.tenantUserId))) {
        continue;
      }
      const recipientUserId = await this.resolveRecipientUserId(followUp);
      if (recipientUserId !== actorUserId) {
        continue;
      }
      items.push(toResponse(followUp, now));
    }

    const counts = countDueStates(items);
    return {
      workspaceId: context.workspaceId,
      generatedAt: now.toISOString(),
      windowDays,
      counts: {
        ...counts,
        total: items.length,
      },
      items,
    };
  }

  public async runReminderScan(now = new Date()): Promise<FollowUpReminderRunResponse> {
    const candidates = await this.store.listDueForReminder(now, maxReminderBatchSize);
    let remindersCreated = 0;
    let suppressed = 0;
    let stale = 0;

    for (const followUp of candidates) {
      if (!(await this.isAccessibleFollowUp(followUp, followUp.createdByUserId))) {
        stale += 1;
        continue;
      }
      const dueState = dueStateFor(followUp, now);
      if (dueState !== "due" && dueState !== "overdue") {
        suppressed += 1;
        continue;
      }
      if (followUp.lastReminderState === dueState) {
        suppressed += 1;
        continue;
      }
      const recipientUserId = await this.resolveRecipientUserId(followUp);
      if (!recipientUserId) {
        suppressed += 1;
        continue;
      }
      await this.alertService.recordFollowUpDue({
        recipientUserId,
        workspaceId: followUp.workspaceId,
        relatedEntityType: followUp.targetEntityType,
        relatedEntityId: followUp.targetEntityId,
        followUpId: followUp.id,
        dueAt: followUp.dueAt,
        dueState,
        ...(followUp.note ? { note: followUp.note } : {}),
      });
      await this.store.markReminderSent(followUp.id, dueState, now);
      remindersCreated += 1;
    }

    return {
      generatedAt: now.toISOString(),
      scanned: candidates.length,
      remindersCreated,
      suppressed,
      stale,
    };
  }

  private async resolveRecipientUserId(followUp: StoredFollowUp): Promise<string | null> {
    const assignment = await this.assignmentStore.findForTarget({
      workspaceId: followUp.workspaceId,
      relatedEntityType: followUp.targetEntityType,
      relatedEntityId: followUp.targetEntityId,
    });
    const preferredUserId = assignment?.assigneeUserId ?? followUp.createdByUserId;
    const membership = await this.membershipStore.findForUserInWorkspace(preferredUserId, followUp.workspaceId);
    return membership ? preferredUserId : null;
  }

  private async isAccessibleFollowUp(followUp: StoredFollowUp, tenantUserId: string): Promise<boolean> {
    return this.targetAccess.canAccess(followUp.targetEntityType, followUp.targetEntityId, tenantUserId);
  }

  private async assertTargetAccess(
    targetEntityType: FollowUpTargetEntityType,
    targetEntityId: string,
    tenantUserId: string,
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(targetEntityId)) {
      throw new ApiError(400, "follow_up_invalid_target_id", "Follow-up target id is invalid.");
    }
    if (!(await this.targetAccess.canAccess(targetEntityType, targetEntityId, tenantUserId))) {
      throw new ApiError(404, "follow_up_target_not_found", "Follow-up target was not found.");
    }
  }

  private assertUsableDueDate(dueAt: Date, now: Date): Date {
    if (Number.isNaN(dueAt.getTime())) {
      throw new ApiError(400, "follow_up_invalid_due_at", "Follow-up due date is invalid.");
    }
    const maxDueAt = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000);
    if (dueAt.getTime() > maxDueAt.getTime()) {
      throw new ApiError(400, "follow_up_due_at_too_far", "Follow-up due date must be within one year.");
    }
    return dueAt;
  }
}

export function dueStateFor(followUp: StoredFollowUp, now = new Date()): FollowUpDueState {
  if (followUp.completedAt) {
    return "completed";
  }
  if (followUp.clearedAt) {
    return "cleared";
  }
  const dueAt = followUp.dueAt.getTime();
  if (dueAt > now.getTime()) {
    return "upcoming";
  }
  return isSameUtcDay(followUp.dueAt, now) ? "due" : "overdue";
}

export function toResponse(followUp: StoredFollowUp, now = new Date()): FollowUpResponse {
  return {
    id: followUp.id,
    workspaceId: followUp.workspaceId,
    targetEntityType: followUp.targetEntityType,
    targetEntityId: followUp.targetEntityId,
    dueAt: followUp.dueAt.toISOString(),
    dueState: dueStateFor(followUp, now),
    ...(followUp.note ? { note: followUp.note } : {}),
    createdByUserId: followUp.createdByUserId,
    updatedByUserId: followUp.updatedByUserId,
    ...(followUp.clearedAt ? { clearedAt: followUp.clearedAt.toISOString() } : {}),
    ...(followUp.clearedByUserId ? { clearedByUserId: followUp.clearedByUserId } : {}),
    ...(followUp.completedAt ? { completedAt: followUp.completedAt.toISOString() } : {}),
    ...(followUp.completedByUserId ? { completedByUserId: followUp.completedByUserId } : {}),
    ...(followUp.snoozedAt ? { snoozedAt: followUp.snoozedAt.toISOString() } : {}),
    ...(followUp.snoozedByUserId ? { snoozedByUserId: followUp.snoozedByUserId } : {}),
    ...(followUp.previousDueAt ? { previousDueAt: followUp.previousDueAt.toISOString() } : {}),
    ...(followUp.lastReminderAt ? { lastReminderAt: followUp.lastReminderAt.toISOString() } : {}),
    lastReminderState: followUp.lastReminderState,
    createdAt: followUp.createdAt.toISOString(),
    updatedAt: followUp.updatedAt.toISOString(),
  };
}

function target(
  workspaceId: string,
  targetEntityType: FollowUpTargetEntityType,
  targetEntityId: string,
): FollowUpTarget {
  return { workspaceId, targetEntityType, targetEntityId };
}

function normalizeNote(note: string | undefined): string | undefined {
  const normalized = note?.trim();
  if (!normalized) {
    return undefined;
  }
  if (normalized.length > maxFollowUpNoteLength) {
    throw new ApiError(400, "follow_up_note_too_long", "Follow-up note is too long.");
  }
  return normalized;
}

function boundedWindowDays(windowDays: number | undefined): number {
  if (!windowDays || !Number.isFinite(windowDays)) {
    return defaultUpcomingWindowDays;
  }
  return Math.max(1, Math.min(Math.floor(windowDays), 30));
}

function countDueStates(items: FollowUpResponse[]): { upcoming: number; due: number; overdue: number } {
  return items.reduce(
    (counts, item) => ({
      upcoming: counts.upcoming + (item.dueState === "upcoming" ? 1 : 0),
      due: counts.due + (item.dueState === "due" ? 1 : 0),
      overdue: counts.overdue + (item.dueState === "overdue" ? 1 : 0),
    }),
    { upcoming: 0, due: 0, overdue: 0 },
  );
}

function isSameUtcDay(left: Date, right: Date): boolean {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}
