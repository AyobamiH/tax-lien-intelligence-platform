import mongoose from "mongoose";
import type {
  ReviewChecklistInstanceResponse,
  ReviewChecklistProgress,
  ReviewChecklistStateResponse,
  ReviewChecklistTargetEntityType,
  ReviewChecklistTemplateListResponse,
  ReviewChecklistTemplateResponse,
  UpdateReviewChecklistItemResponse,
  UpsertReviewChecklistTemplateRequest,
  UpsertReviewChecklistTemplateResponse,
} from "@tax-lien/types";
import { ApiError } from "../errors/api-error.js";
import type { WorkspaceCommentTargetAccess } from "../workspace-comments/comment-target-access.js";
import type { WorkspaceAccessContext } from "../workspaces/workspace-service.js";
import type {
  ReviewChecklistInstanceStore,
  ReviewChecklistTemplateStore,
  StoredReviewChecklistInstance,
  StoredReviewChecklistInstanceItem,
  StoredReviewChecklistTemplate,
} from "./review-checklist-store.js";

export class ReviewChecklistService {
  public constructor(
    private readonly templateStore: ReviewChecklistTemplateStore,
    private readonly instanceStore: ReviewChecklistInstanceStore,
    private readonly targetAccess: WorkspaceCommentTargetAccess,
  ) {}

  public async listTemplates(
    context: WorkspaceAccessContext,
  ): Promise<ReviewChecklistTemplateListResponse> {
    return {
      templates: (await this.templateStore.listForWorkspace(context.workspaceId)).map(
        toTemplateResponse,
      ),
    };
  }

  public async upsertTemplate(
    context: WorkspaceAccessContext,
    actorUserId: string,
    targetEntityType: ReviewChecklistTargetEntityType,
    input: UpsertReviewChecklistTemplateRequest,
  ): Promise<UpsertReviewChecklistTemplateResponse> {
    this.assertCanManageTemplates(context);
    const existing = await this.templateStore.findForType(
      context.workspaceId,
      targetEntityType,
    );
    const existingItemIds = new Set(existing?.items.map((item) => item.id) ?? []);
    const seenIds = new Set<string>();
    const items = input.items.map((item, position) => {
      const id = item.id ?? new mongoose.Types.ObjectId().toString();
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(
          400,
          "review_checklist_invalid_item_id",
          "Checklist item id is invalid.",
        );
      }
      if (item.id && !existingItemIds.has(item.id)) {
        throw new ApiError(
          400,
          "review_checklist_unknown_item_id",
          "Checklist item id does not belong to this template.",
        );
      }
      if (seenIds.has(id)) {
        throw new ApiError(
          400,
          "review_checklist_duplicate_item_id",
          "Checklist item ids must be unique.",
        );
      }
      seenIds.add(id);
      return {
        id,
        label: item.label.trim(),
        required: item.required,
        position,
      };
    });

    const template = await this.templateStore.save({
      workspaceId: context.workspaceId,
      targetEntityType,
      name: input.name.trim(),
      active: input.active ?? true,
      version: (existing?.version ?? 0) + 1,
      items,
      createdByUserId: existing?.createdByUserId ?? actorUserId,
      updatedByUserId: actorUserId,
    });
    return { template: toTemplateResponse(template) };
  }

  public async getState(
    context: WorkspaceAccessContext,
    targetEntityType: ReviewChecklistTargetEntityType,
    targetEntityId: string,
  ): Promise<ReviewChecklistStateResponse> {
    await this.assertTargetAccess(
      targetEntityType,
      targetEntityId,
      context.tenantUserId,
    );
    const template = await this.templateStore.findForType(
      context.workspaceId,
      targetEntityType,
    );
    if (!template?.active) {
      return emptyState(targetEntityType, targetEntityId);
    }
    const checklist = await this.ensureInstance(template, targetEntityId);
    return toStateResponse(template, checklist);
  }

  public async updateItem(
    context: WorkspaceAccessContext,
    actor: { userId: string; email: string },
    targetEntityType: ReviewChecklistTargetEntityType,
    targetEntityId: string,
    itemId: string,
    completed: boolean,
  ): Promise<UpdateReviewChecklistItemResponse> {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      throw new ApiError(
        400,
        "review_checklist_invalid_item_id",
        "Checklist item id is invalid.",
      );
    }
    await this.assertTargetAccess(
      targetEntityType,
      targetEntityId,
      context.tenantUserId,
    );
    const template = await this.templateStore.findForType(
      context.workspaceId,
      targetEntityType,
    );
    if (!template?.active) {
      throw new ApiError(
        409,
        "review_checklist_not_configured",
        "No active checklist is configured for this record type.",
      );
    }
    const checklist = await this.ensureInstance(template, targetEntityId);
    if (!checklist.items.some((item) => item.id === itemId)) {
      throw new ApiError(
        404,
        "review_checklist_item_not_found",
        "Checklist item was not found.",
      );
    }
    const updated = await this.instanceStore.updateItem({
      workspaceId: checklist.workspaceId,
      targetEntityType,
      targetEntityId,
      templateId: template.id,
      templateVersion: template.version,
      itemId,
      completed,
      ...(completed
        ? {
            completedByUserId: actor.userId,
            completedByEmail: actor.email,
            completedAt: new Date(),
          }
        : {}),
    });
    if (!updated) {
      throw new ApiError(
        409,
        "review_checklist_stale_state",
        "Checklist state changed. Reload and try again.",
      );
    }
    return { state: toStateResponse(template, updated) };
  }

  private async ensureInstance(
    template: StoredReviewChecklistTemplate,
    targetEntityId: string,
  ): Promise<StoredReviewChecklistInstance> {
    const existing = await this.instanceStore.findForTarget(
      template.workspaceId,
      template.targetEntityType,
      targetEntityId,
    );
    if (
      existing &&
      existing.templateId === template.id &&
      existing.templateVersion === template.version
    ) {
      return existing;
    }

    const existingById = new Map(
      existing?.items.map((item) => [item.id, item]) ?? [],
    );
    const items: StoredReviewChecklistInstanceItem[] = template.items.map(
      (item) => {
        const prior = existingById.get(item.id);
        return {
          ...item,
          completed: prior?.completed ?? false,
          ...(prior?.completedByUserId
            ? { completedByUserId: prior.completedByUserId }
            : {}),
          ...(prior?.completedByEmail
            ? { completedByEmail: prior.completedByEmail }
            : {}),
          ...(prior?.completedAt ? { completedAt: prior.completedAt } : {}),
        };
      },
    );
    return this.instanceStore.save({
      workspaceId: template.workspaceId,
      targetEntityType: template.targetEntityType,
      targetEntityId,
      templateId: template.id,
      templateName: template.name,
      templateVersion: template.version,
      items,
    });
  }

  private assertCanManageTemplates(context: WorkspaceAccessContext): void {
    if (context.role !== "owner" && context.role !== "admin") {
      throw new ApiError(
        403,
        "workspace_role_forbidden",
        "Your workspace role cannot manage checklist templates.",
      );
    }
  }

  private async assertTargetAccess(
    targetEntityType: ReviewChecklistTargetEntityType,
    targetEntityId: string,
    tenantUserId: string,
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(targetEntityId)) {
      throw new ApiError(
        400,
        "review_checklist_invalid_target_id",
        "Checklist target id is invalid.",
      );
    }
    if (
      !(await this.targetAccess.canAccess(
        targetEntityType,
        targetEntityId,
        tenantUserId,
      ))
    ) {
      throw new ApiError(
        404,
        "review_checklist_target_not_found",
        "Checklist target was not found.",
      );
    }
  }
}

function toTemplateResponse(
  template: StoredReviewChecklistTemplate,
): ReviewChecklistTemplateResponse {
  return {
    id: template.id,
    workspaceId: template.workspaceId,
    targetEntityType: template.targetEntityType,
    name: template.name,
    active: template.active,
    version: template.version,
    items: template.items,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

function toInstanceResponse(
  checklist: StoredReviewChecklistInstance,
): ReviewChecklistInstanceResponse {
  return {
    id: checklist.id,
    workspaceId: checklist.workspaceId,
    targetEntityType: checklist.targetEntityType,
    targetEntityId: checklist.targetEntityId,
    templateId: checklist.templateId,
    templateName: checklist.templateName,
    templateVersion: checklist.templateVersion,
    items: checklist.items.map((item) => ({
      id: item.id,
      label: item.label,
      required: item.required,
      position: item.position,
      completed: item.completed,
      ...(item.completedByUserId && item.completedByEmail
        ? {
            completedBy: {
              userId: item.completedByUserId,
              email: item.completedByEmail,
            },
          }
        : {}),
      ...(item.completedAt
        ? { completedAt: item.completedAt.toISOString() }
        : {}),
    })),
    createdAt: checklist.createdAt.toISOString(),
    updatedAt: checklist.updatedAt.toISOString(),
  };
}

function progressFor(
  items: StoredReviewChecklistInstanceItem[],
): ReviewChecklistProgress {
  const completedItems = items.filter((item) => item.completed).length;
  const requiredItems = items.filter((item) => item.required).length;
  const completedRequiredItems = items.filter(
    (item) => item.required && item.completed,
  ).length;
  const incompleteRequiredItems = requiredItems - completedRequiredItems;
  return {
    status:
      completedItems === 0
        ? "not_started"
        : incompleteRequiredItems === 0
          ? "ready"
          : "in_progress",
    totalItems: items.length,
    completedItems,
    incompleteItems: items.length - completedItems,
    requiredItems,
    completedRequiredItems,
    incompleteRequiredItems,
    allRequiredComplete: incompleteRequiredItems === 0,
  };
}

function emptyState(
  targetEntityType: ReviewChecklistTargetEntityType,
  targetEntityId: string,
): ReviewChecklistStateResponse {
  return {
    targetEntityType,
    targetEntityId,
    progress: {
      status: "not_configured",
      totalItems: 0,
      completedItems: 0,
      incompleteItems: 0,
      requiredItems: 0,
      completedRequiredItems: 0,
      incompleteRequiredItems: 0,
      allRequiredComplete: false,
    },
  };
}

function toStateResponse(
  template: StoredReviewChecklistTemplate,
  checklist: StoredReviewChecklistInstance,
): ReviewChecklistStateResponse {
  return {
    targetEntityType: checklist.targetEntityType,
    targetEntityId: checklist.targetEntityId,
    template: toTemplateResponse(template),
    checklist: toInstanceResponse(checklist),
    progress: progressFor(checklist.items),
  };
}
