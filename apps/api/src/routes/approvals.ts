import { Router, type Request } from "express";
import { z } from "zod";
import type { ApprovalRequestStatus } from "@tax-lien/types";
import type { ApprovalService } from "../approvals/approval-service.js";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { toValidationError } from "../errors/error-handler.js";
import type { FollowService } from "../follows/follow-service.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import {
  recordWorkspaceActivitySafely,
  type WorkspaceActivityService,
} from "../workspace-activity/workspace-activity-service.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

const safeNote = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value));
const createApprovalSchema = z.object({
  targetEntityType: z.literal("comparison_item"),
  targetEntityId: z.string().min(1).max(128),
  requestedAction: z.literal("comparison_handoff_to_portfolio"),
  requestNote: safeNote,
});
const approveSchema = z.object({ responseNote: safeNote.optional() });
const rejectSchema = z.object({ responseNote: safeNote });
const listSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
  targetEntityType: z.literal("comparison_item").optional(),
  targetEntityId: z.string().min(1).max(128).optional(),
});

export function createApprovalRouter(
  authService: AuthService,
  workspaceService: WorkspaceService,
  approvalService: ApprovalService,
  activityService: WorkspaceActivityService,
  followService: FollowService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");
  const requireApprovalReview = requireWorkspaceAccess(workspaceService, "review_approvals");

  router.get("/", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      const parsed = listSchema.safeParse(request.query);
      if (!parsed.success) {
        throw toValidationError();
      }
      response.status(200).json(
        await approvalService.list(request.workspace, request.auth.userId, {
          ...(parsed.data.status ? { status: parsed.data.status as ApprovalRequestStatus } : {}),
          ...(parsed.data.targetEntityType
            ? { targetEntityType: parsed.data.targetEntityType }
            : {}),
          ...(parsed.data.targetEntityId ? { targetEntityId: parsed.data.targetEntityId } : {}),
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      const parsed = createApprovalSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }
      const result = await approvalService.create(
        request.workspace,
        request.auth,
        parsed.data.targetEntityId,
        parsed.data.requestNote,
      );
      if (!result.alreadyPending) {
        await recordApprovalActivity(activityService, request, result.approval, "approval_requested");
      }
      response.status(result.alreadyPending ? 200 : 201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:approvalRequestId", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace || typeof request.params.approvalRequestId !== "string") {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      response.status(200).json(
        await approvalService.get(
          request.workspace,
          request.auth.userId,
          request.params.approvalRequestId,
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/:approvalRequestId/approve", requireAuthenticatedUser, requireApprovalReview, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace || typeof request.params.approvalRequestId !== "string") {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      const parsed = approveSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        throw toValidationError();
      }
      const result = await approvalService.approve(
        request.workspace,
        request.auth,
        request.params.approvalRequestId,
        parsed.data.responseNote,
      );
      await recordApprovalActivity(activityService, request, result.approval, "approval_approved");
      await notifyApprovalFollowers(followService, request, result.approval.targetEntityId);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:approvalRequestId/reject", requireAuthenticatedUser, requireApprovalReview, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace || typeof request.params.approvalRequestId !== "string") {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      const parsed = rejectSchema.safeParse(request.body);
      if (!parsed.success) {
        throw toValidationError();
      }
      const result = await approvalService.reject(
        request.workspace,
        request.auth,
        request.params.approvalRequestId,
        parsed.data.responseNote,
      );
      await recordApprovalActivity(activityService, request, result.approval, "approval_rejected");
      await notifyApprovalFollowers(followService, request, result.approval.targetEntityId);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:approvalRequestId/cancel", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.auth || !request.workspace || typeof request.params.approvalRequestId !== "string") {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }
      const result = await approvalService.cancel(
        request.workspace,
        request.auth.userId,
        request.params.approvalRequestId,
      );
      await recordApprovalActivity(activityService, request, result.approval, "approval_cancelled");
      await notifyApprovalFollowers(followService, request, result.approval.targetEntityId);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

async function notifyApprovalFollowers(
  followService: FollowService,
  request: Request,
  targetEntityId: string,
): Promise<void> {
  if (!request.auth || !request.workspace) {
    return;
  }
  try {
    await followService.notifyFollowers({
      workspaceId: request.workspace.workspaceId,
      actorUserId: request.auth.userId,
      targetEntityType: "comparison_item",
      targetEntityId,
      changeType: "approval_resolved",
    });
  } catch {
    // Approval resolution is authoritative; follower alerts are best effort.
  }
}

async function recordApprovalActivity(
  activityService: WorkspaceActivityService,
  request: Request,
  approval: Awaited<ReturnType<ApprovalService["get"]>>["approval"],
  eventType: "approval_requested" | "approval_approved" | "approval_rejected" | "approval_cancelled",
): Promise<void> {
  if (!request.auth || !request.workspace) {
    return;
  }
  await recordWorkspaceActivitySafely(activityService, {
    workspaceId: request.workspace.workspaceId,
    actorUserId: request.auth.userId,
    eventType,
    relatedEntityType: "comparison_item",
    relatedEntityId: approval.targetEntityId,
    metadata: {
      approvalRequestId: approval.id,
      approvalAction: approval.requestedAction,
      approvalStatus: approval.status,
      approvalRequesterEmail: approval.requester.email,
      ...(approval.reviewer ? { approvalReviewerEmail: approval.reviewer.email } : {}),
      ...(approval.outcome
        ? {
            targetEntityType: approval.outcome.targetEntityType,
            targetEntityId: approval.outcome.targetEntityId,
          }
        : {}),
    },
  });
}
