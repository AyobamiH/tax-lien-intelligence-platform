import {
  ReviewChecklistInstanceModel,
  ReviewChecklistTemplateModel,
  type ReviewChecklistInstanceDocument,
  type ReviewChecklistTemplateDocument,
} from "@tax-lien/db";
import type { ReviewChecklistTargetEntityType } from "@tax-lien/types";

export interface StoredReviewChecklistTemplateItem {
  id: string;
  label: string;
  required: boolean;
  position: number;
}

export interface StoredReviewChecklistTemplate {
  id: string;
  workspaceId: string;
  targetEntityType: ReviewChecklistTargetEntityType;
  name: string;
  active: boolean;
  version: number;
  items: StoredReviewChecklistTemplateItem[];
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveReviewChecklistTemplateInput {
  workspaceId: string;
  targetEntityType: ReviewChecklistTargetEntityType;
  name: string;
  active: boolean;
  version: number;
  items: StoredReviewChecklistTemplateItem[];
  createdByUserId: string;
  updatedByUserId: string;
}

export interface ReviewChecklistTemplateStore {
  listForWorkspace(workspaceId: string): Promise<StoredReviewChecklistTemplate[]>;
  findForType(
    workspaceId: string,
    targetEntityType: ReviewChecklistTargetEntityType,
  ): Promise<StoredReviewChecklistTemplate | null>;
  save(input: SaveReviewChecklistTemplateInput): Promise<StoredReviewChecklistTemplate>;
}

export interface StoredReviewChecklistInstanceItem
  extends StoredReviewChecklistTemplateItem {
  completed: boolean;
  completedByUserId?: string;
  completedByEmail?: string;
  completedAt?: Date;
}

export interface StoredReviewChecklistInstance {
  id: string;
  workspaceId: string;
  targetEntityType: ReviewChecklistTargetEntityType;
  targetEntityId: string;
  templateId: string;
  templateName: string;
  templateVersion: number;
  items: StoredReviewChecklistInstanceItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveReviewChecklistInstanceInput {
  workspaceId: string;
  targetEntityType: ReviewChecklistTargetEntityType;
  targetEntityId: string;
  templateId: string;
  templateName: string;
  templateVersion: number;
  items: StoredReviewChecklistInstanceItem[];
}

export interface ReviewChecklistInstanceStore {
  findForTarget(
    workspaceId: string,
    targetEntityType: ReviewChecklistTargetEntityType,
    targetEntityId: string,
  ): Promise<StoredReviewChecklistInstance | null>;
  save(input: SaveReviewChecklistInstanceInput): Promise<StoredReviewChecklistInstance>;
  updateItem(input: {
    workspaceId: string;
    targetEntityType: ReviewChecklistTargetEntityType;
    targetEntityId: string;
    templateId: string;
    templateVersion: number;
    itemId: string;
    completed: boolean;
    completedByUserId?: string;
    completedByEmail?: string;
    completedAt?: Date;
  }): Promise<StoredReviewChecklistInstance | null>;
}

export class MongoReviewChecklistTemplateStore
  implements ReviewChecklistTemplateStore
{
  public async listForWorkspace(
    workspaceId: string,
  ): Promise<StoredReviewChecklistTemplate[]> {
    const documents = await ReviewChecklistTemplateModel.find({ workspaceId })
      .sort({ targetEntityType: 1 })
      .exec();
    return documents.map(mapTemplate);
  }

  public async findForType(
    workspaceId: string,
    targetEntityType: ReviewChecklistTargetEntityType,
  ): Promise<StoredReviewChecklistTemplate | null> {
    const document = await ReviewChecklistTemplateModel.findOne({
      workspaceId,
      targetEntityType,
    }).exec();
    return document ? mapTemplate(document) : null;
  }

  public async save(
    input: SaveReviewChecklistTemplateInput,
  ): Promise<StoredReviewChecklistTemplate> {
    const document = await ReviewChecklistTemplateModel.findOneAndUpdate(
      {
        workspaceId: input.workspaceId,
        targetEntityType: input.targetEntityType,
      },
      {
        $set: {
          name: input.name,
          active: input.active,
          version: input.version,
          items: input.items,
          updatedByUserId: input.updatedByUserId,
        },
        $setOnInsert: { createdByUserId: input.createdByUserId },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).exec();
    return mapTemplate(document);
  }
}

export class MongoReviewChecklistInstanceStore
  implements ReviewChecklistInstanceStore
{
  public async findForTarget(
    workspaceId: string,
    targetEntityType: ReviewChecklistTargetEntityType,
    targetEntityId: string,
  ): Promise<StoredReviewChecklistInstance | null> {
    const document = await ReviewChecklistInstanceModel.findOne({
      workspaceId,
      targetEntityType,
      targetEntityId,
    }).exec();
    return document ? mapInstance(document) : null;
  }

  public async save(
    input: SaveReviewChecklistInstanceInput,
  ): Promise<StoredReviewChecklistInstance> {
    const document = await ReviewChecklistInstanceModel.findOneAndUpdate(
      {
        workspaceId: input.workspaceId,
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
      },
      {
        $set: {
          templateId: input.templateId,
          templateName: input.templateName,
          templateVersion: input.templateVersion,
          items: input.items,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).exec();
    return mapInstance(document);
  }

  public async updateItem(input: {
    workspaceId: string;
    targetEntityType: ReviewChecklistTargetEntityType;
    targetEntityId: string;
    templateId: string;
    templateVersion: number;
    itemId: string;
    completed: boolean;
    completedByUserId?: string;
    completedByEmail?: string;
    completedAt?: Date;
  }): Promise<StoredReviewChecklistInstance | null> {
    const update = input.completed
      ? {
          $set: {
            "items.$.completed": true,
            "items.$.completedByUserId": input.completedByUserId,
            "items.$.completedByEmail": input.completedByEmail,
            "items.$.completedAt": input.completedAt,
          },
        }
      : {
          $set: { "items.$.completed": false },
          $unset: {
            "items.$.completedByUserId": 1,
            "items.$.completedByEmail": 1,
            "items.$.completedAt": 1,
          },
        };
    const document = await ReviewChecklistInstanceModel.findOneAndUpdate(
      {
        workspaceId: input.workspaceId,
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
        templateId: input.templateId,
        templateVersion: input.templateVersion,
        "items.id": input.itemId,
      },
      update,
      { new: true, runValidators: true },
    ).exec();
    return document ? mapInstance(document) : null;
  }
}

function mapTemplate(
  document: ReviewChecklistTemplateDocument,
): StoredReviewChecklistTemplate {
  return {
    id: document.id,
    workspaceId: document.workspaceId,
    targetEntityType: document.targetEntityType,
    name: document.name,
    active: document.active,
    version: document.version,
    items: document.items.map((item) => ({
      id: item.id,
      label: item.label,
      required: item.required,
      position: item.position,
    })),
    createdByUserId: document.createdByUserId,
    updatedByUserId: document.updatedByUserId,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function mapInstance(
  document: ReviewChecklistInstanceDocument,
): StoredReviewChecklistInstance {
  return {
    id: document.id,
    workspaceId: document.workspaceId,
    targetEntityType: document.targetEntityType,
    targetEntityId: document.targetEntityId,
    templateId: document.templateId,
    templateName: document.templateName,
    templateVersion: document.templateVersion,
    items: document.items.map((item) => ({
      id: item.id,
      label: item.label,
      required: item.required,
      position: item.position,
      completed: item.completed,
      ...(item.completedByUserId
        ? { completedByUserId: item.completedByUserId }
        : {}),
      ...(item.completedByEmail
        ? { completedByEmail: item.completedByEmail }
        : {}),
      ...(item.completedAt ? { completedAt: item.completedAt } : {}),
    })),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
