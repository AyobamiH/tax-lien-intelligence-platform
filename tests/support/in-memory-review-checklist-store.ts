import mongoose from "mongoose";
import type { ReviewChecklistTargetEntityType } from "@tax-lien/types";
import type {
  ReviewChecklistInstanceStore,
  ReviewChecklistTemplateStore,
  SaveReviewChecklistInstanceInput,
  SaveReviewChecklistTemplateInput,
  StoredReviewChecklistInstance,
  StoredReviewChecklistTemplate,
} from "../../apps/api/src/review-checklists/review-checklist-store.js";

export class InMemoryReviewChecklistTemplateStore
  implements ReviewChecklistTemplateStore
{
  private readonly templates = new Map<string, StoredReviewChecklistTemplate>();

  public async listForWorkspace(
    workspaceId: string,
  ): Promise<StoredReviewChecklistTemplate[]> {
    return [...this.templates.values()]
      .filter((template) => template.workspaceId === workspaceId)
      .sort((left, right) =>
        left.targetEntityType.localeCompare(right.targetEntityType),
      );
  }

  public async findForType(
    workspaceId: string,
    targetEntityType: ReviewChecklistTargetEntityType,
  ): Promise<StoredReviewChecklistTemplate | null> {
    return (
      [...this.templates.values()].find(
        (template) =>
          template.workspaceId === workspaceId &&
          template.targetEntityType === targetEntityType,
      ) ?? null
    );
  }

  public async save(
    input: SaveReviewChecklistTemplateInput,
  ): Promise<StoredReviewChecklistTemplate> {
    const existing = await this.findForType(
      input.workspaceId,
      input.targetEntityType,
    );
    const now = new Date();
    const template: StoredReviewChecklistTemplate = {
      id: existing?.id ?? new mongoose.Types.ObjectId().toString(),
      ...input,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.templates.set(template.id, template);
    return template;
  }
}

export class InMemoryReviewChecklistInstanceStore
  implements ReviewChecklistInstanceStore
{
  private readonly instances = new Map<string, StoredReviewChecklistInstance>();

  public async findForTarget(
    workspaceId: string,
    targetEntityType: ReviewChecklistTargetEntityType,
    targetEntityId: string,
  ): Promise<StoredReviewChecklistInstance | null> {
    return (
      [...this.instances.values()].find(
        (instance) =>
          instance.workspaceId === workspaceId &&
          instance.targetEntityType === targetEntityType &&
          instance.targetEntityId === targetEntityId,
      ) ?? null
    );
  }

  public async save(
    input: SaveReviewChecklistInstanceInput,
  ): Promise<StoredReviewChecklistInstance> {
    const existing = await this.findForTarget(
      input.workspaceId,
      input.targetEntityType,
      input.targetEntityId,
    );
    const now = new Date();
    const instance: StoredReviewChecklistInstance = {
      id: existing?.id ?? new mongoose.Types.ObjectId().toString(),
      ...input,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.instances.set(instance.id, instance);
    return instance;
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
    const existing = await this.findForTarget(
      input.workspaceId,
      input.targetEntityType,
      input.targetEntityId,
    );
    if (
      !existing ||
      existing.templateId !== input.templateId ||
      existing.templateVersion !== input.templateVersion ||
      !existing.items.some((item) => item.id === input.itemId)
    ) {
      return null;
    }
    const updated: StoredReviewChecklistInstance = {
      ...existing,
      items: existing.items.map((item) => {
        if (item.id !== input.itemId) {
          return item;
        }
        const base = {
          id: item.id,
          label: item.label,
          required: item.required,
          position: item.position,
          completed: input.completed,
        };
        return input.completed
          ? {
              ...base,
              ...(input.completedByUserId
                ? { completedByUserId: input.completedByUserId }
                : {}),
              ...(input.completedByEmail
                ? { completedByEmail: input.completedByEmail }
                : {}),
              ...(input.completedAt
                ? { completedAt: input.completedAt }
                : {}),
            }
          : base;
      }),
      updatedAt: new Date(),
    };
    this.instances.set(updated.id, updated);
    return updated;
  }
}
