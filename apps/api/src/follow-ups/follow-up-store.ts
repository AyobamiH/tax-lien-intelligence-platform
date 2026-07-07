import { FollowUpModel, type FollowUpDocument } from "@tax-lien/db";
import type {
  FollowUpReminderState,
  FollowUpTargetEntityType,
} from "@tax-lien/types";

export interface StoredFollowUp {
  id: string;
  workspaceId: string;
  targetEntityType: FollowUpTargetEntityType;
  targetEntityId: string;
  dueAt: Date;
  note?: string;
  createdByUserId: string;
  updatedByUserId: string;
  clearedAt?: Date;
  clearedByUserId?: string;
  completedAt?: Date;
  completedByUserId?: string;
  snoozedAt?: Date;
  snoozedByUserId?: string;
  previousDueAt?: Date;
  lastReminderAt?: Date;
  lastReminderState: FollowUpReminderState;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUpTarget {
  workspaceId: string;
  targetEntityType: FollowUpTargetEntityType;
  targetEntityId: string;
}

export interface SaveFollowUpInput extends FollowUpTarget {
  dueAt: Date;
  note?: string;
  actorUserId: string;
  snoozedAt?: Date;
}

export interface SaveFollowUpResult {
  followUp: StoredFollowUp;
  previous: StoredFollowUp | null;
  changed: boolean;
}

export interface FollowUpStore {
  findForTarget(target: FollowUpTarget): Promise<StoredFollowUp | null>;
  saveFollowUp(input: SaveFollowUpInput): Promise<SaveFollowUpResult>;
  clearFollowUp(target: FollowUpTarget & { actorUserId: string; clearedAt: Date }): Promise<StoredFollowUp | null>;
  completeFollowUp(target: FollowUpTarget & { actorUserId: string; completedAt: Date }): Promise<StoredFollowUp | null>;
  listActiveForWorkspace(workspaceId: string, now: Date, upcomingUntil: Date, limit: number): Promise<StoredFollowUp[]>;
  listDueForReminder(now: Date, limit: number): Promise<StoredFollowUp[]>;
  markReminderSent(followUpId: string, state: Exclude<FollowUpReminderState, "none">, remindedAt: Date): Promise<StoredFollowUp | null>;
}

export class MongoFollowUpStore implements FollowUpStore {
  public async findForTarget(target: FollowUpTarget): Promise<StoredFollowUp | null> {
    const document = await FollowUpModel.findOne(target).exec();
    return document ? mapFollowUp(document) : null;
  }

  public async saveFollowUp(input: SaveFollowUpInput): Promise<SaveFollowUpResult> {
    const previous = await this.findForTarget(input);
    const update = {
      $set: {
        dueAt: input.dueAt,
        ...(input.note ? { note: input.note } : {}),
        updatedByUserId: input.actorUserId,
        lastReminderState: "none",
        ...(input.snoozedAt
          ? {
              snoozedAt: input.snoozedAt,
              snoozedByUserId: input.actorUserId,
              ...(previous ? { previousDueAt: previous.dueAt } : {}),
            }
          : {}),
      },
      $unset: {
        ...(input.note ? {} : { note: 1 }),
        clearedAt: 1,
        clearedByUserId: 1,
        completedAt: 1,
        completedByUserId: 1,
        lastReminderAt: 1,
        ...(input.snoozedAt ? {} : { snoozedAt: 1, snoozedByUserId: 1, previousDueAt: 1 }),
      },
      $setOnInsert: {
        workspaceId: input.workspaceId,
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
        createdByUserId: input.actorUserId,
      },
    };

    const document = await FollowUpModel.findOneAndUpdate(
      {
        workspaceId: input.workspaceId,
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
      },
      update,
      { new: true, upsert: true },
    ).exec();
    const followUp = mapFollowUp(document);
    return {
      followUp,
      previous,
      changed: !previous || !sameFollowUp(previous, followUp),
    };
  }

  public async clearFollowUp(
    target: FollowUpTarget & { actorUserId: string; clearedAt: Date },
  ): Promise<StoredFollowUp | null> {
    const document = await FollowUpModel.findOneAndUpdate(
      {
        workspaceId: target.workspaceId,
        targetEntityType: target.targetEntityType,
        targetEntityId: target.targetEntityId,
        clearedAt: { $exists: false },
      },
      {
        $set: {
          clearedAt: target.clearedAt,
          clearedByUserId: target.actorUserId,
          updatedByUserId: target.actorUserId,
        },
      },
      { new: true },
    ).exec();
    return document ? mapFollowUp(document) : null;
  }

  public async completeFollowUp(
    target: FollowUpTarget & { actorUserId: string; completedAt: Date },
  ): Promise<StoredFollowUp | null> {
    const document = await FollowUpModel.findOneAndUpdate(
      {
        workspaceId: target.workspaceId,
        targetEntityType: target.targetEntityType,
        targetEntityId: target.targetEntityId,
        clearedAt: { $exists: false },
        completedAt: { $exists: false },
      },
      {
        $set: {
          completedAt: target.completedAt,
          completedByUserId: target.actorUserId,
          updatedByUserId: target.actorUserId,
        },
      },
      { new: true },
    ).exec();
    return document ? mapFollowUp(document) : null;
  }

  public async listActiveForWorkspace(
    workspaceId: string,
    now: Date,
    upcomingUntil: Date,
    limit: number,
  ): Promise<StoredFollowUp[]> {
    const documents = await FollowUpModel.find({
      workspaceId,
      clearedAt: { $exists: false },
      completedAt: { $exists: false },
      dueAt: { $lte: upcomingUntil },
    })
      .sort({ dueAt: 1, _id: 1 })
      .limit(Math.max(1, Math.min(limit, 100)))
      .exec();
    return documents
      .map(mapFollowUp)
      .filter((followUp) => followUp.dueAt.getTime() <= upcomingUntil.getTime() || followUp.dueAt.getTime() <= now.getTime());
  }

  public async listDueForReminder(now: Date, limit: number): Promise<StoredFollowUp[]> {
    const documents = await FollowUpModel.find({
      clearedAt: { $exists: false },
      completedAt: { $exists: false },
      dueAt: { $lte: now },
    })
      .sort({ dueAt: 1, _id: 1 })
      .limit(Math.max(1, Math.min(limit, 200)))
      .exec();
    return documents.map(mapFollowUp);
  }

  public async markReminderSent(
    followUpId: string,
    state: Exclude<FollowUpReminderState, "none">,
    remindedAt: Date,
  ): Promise<StoredFollowUp | null> {
    const document = await FollowUpModel.findOneAndUpdate(
      { _id: followUpId, clearedAt: { $exists: false }, completedAt: { $exists: false } },
      {
        $set: {
          lastReminderAt: remindedAt,
          lastReminderState: state,
        },
      },
      { new: true },
    ).exec();
    return document ? mapFollowUp(document) : null;
  }
}

function sameFollowUp(left: StoredFollowUp, right: StoredFollowUp): boolean {
  return (
    left.dueAt.getTime() === right.dueAt.getTime() &&
    (left.note ?? "") === (right.note ?? "") &&
    !left.clearedAt &&
    !left.completedAt &&
    !right.clearedAt &&
    !right.completedAt
  );
}

function mapFollowUp(document: FollowUpDocument): StoredFollowUp {
  return {
    id: document.id,
    workspaceId: document.workspaceId,
    targetEntityType: document.targetEntityType,
    targetEntityId: document.targetEntityId,
    dueAt: document.dueAt,
    ...(document.note ? { note: document.note } : {}),
    createdByUserId: document.createdByUserId,
    updatedByUserId: document.updatedByUserId,
    ...(document.clearedAt ? { clearedAt: document.clearedAt } : {}),
    ...(document.clearedByUserId ? { clearedByUserId: document.clearedByUserId } : {}),
    ...(document.completedAt ? { completedAt: document.completedAt } : {}),
    ...(document.completedByUserId ? { completedByUserId: document.completedByUserId } : {}),
    ...(document.snoozedAt ? { snoozedAt: document.snoozedAt } : {}),
    ...(document.snoozedByUserId ? { snoozedByUserId: document.snoozedByUserId } : {}),
    ...(document.previousDueAt ? { previousDueAt: document.previousDueAt } : {}),
    ...(document.lastReminderAt ? { lastReminderAt: document.lastReminderAt } : {}),
    lastReminderState: document.lastReminderState,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
