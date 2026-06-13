import mongoose from "mongoose";
import type {
  AssignedToMeResponse,
  ClearWorkspaceAssignmentResponse,
  UpdateWorkspaceAssignmentResponse,
  WorkspaceAssignmentDetailResponse,
  WorkspaceAssignmentEntityType,
  WorkspaceAssignmentResponse,
} from "@tax-lien/types";
import type { AlertService } from "../alerts/alert-service.js";
import type { UserStore } from "../auth/user-store.js";
import { ApiError } from "../errors/api-error.js";
import type { WorkspaceCommentTargetAccess } from "../workspace-comments/comment-target-access.js";
import {
  recordWorkspaceActivitySafely,
  type WorkspaceActivityService,
} from "../workspace-activity/workspace-activity-service.js";
import type { WorkspaceAccessContext } from "../workspaces/workspace-service.js";
import type { WorkspaceMembershipStore } from "../workspaces/workspace-store.js";
import type {
  StoredWorkspaceAssignment,
  WorkspaceAssignmentStore,
} from "./workspace-assignment-store.js";

export class WorkspaceAssignmentService {
  public constructor(
    private readonly store: WorkspaceAssignmentStore,
    private readonly membershipStore: WorkspaceMembershipStore,
    private readonly userStore: UserStore,
    private readonly targetAccess: WorkspaceCommentTargetAccess,
    private readonly alertService: AlertService,
    private readonly activityService: WorkspaceActivityService,
  ) {}

  public async get(
    context: WorkspaceAccessContext,
    entityType: WorkspaceAssignmentEntityType,
    entityId: string,
  ): Promise<WorkspaceAssignmentDetailResponse> {
    await this.assertTargetAccess(entityType, entityId, context.tenantUserId);
    const assignment = await this.store.findForTarget(target(context.workspaceId, entityType, entityId));
    return { assignment: assignment ? await this.toResponse(assignment) : null };
  }

  public async assign(
    context: WorkspaceAccessContext,
    actorUserId: string,
    entityType: WorkspaceAssignmentEntityType,
    entityId: string,
    assigneeUserId: string,
  ): Promise<UpdateWorkspaceAssignmentResponse> {
    await this.assertTargetAccess(entityType, entityId, context.tenantUserId);
    const assigneeMembership = await this.membershipStore.findForUserInWorkspace(
      assigneeUserId,
      context.workspaceId,
    );
    if (!assigneeMembership) {
      throw new ApiError(400, "assignment_assignee_not_member", "Assignee must be an active workspace member.");
    }
    if (!(await this.userStore.findById(assigneeUserId))) {
      throw new ApiError(400, "assignment_assignee_not_member", "Assignee must be an active workspace member.");
    }

    const assignmentTarget = target(context.workspaceId, entityType, entityId);
    const previous = await this.store.findForTarget(assignmentTarget);
    if (previous?.assigneeUserId === assigneeUserId) {
      return { assignment: await this.toResponse(previous), changed: false };
    }

    const assignment = await this.store.saveAssignment({
      ...assignmentTarget,
      assigneeUserId,
      assignedByUserId: actorUserId,
      assignedAt: new Date(),
    });
    try {
      await this.recordChange(context.workspaceId, actorUserId, assignment, previous);
    } catch {
      // Assignment persistence is authoritative; activity and notifications are best effort.
    }
    return { assignment: await this.toResponse(assignment), changed: true };
  }

  public async clear(
    context: WorkspaceAccessContext,
    actorUserId: string,
    entityType: WorkspaceAssignmentEntityType,
    entityId: string,
  ): Promise<ClearWorkspaceAssignmentResponse> {
    await this.assertTargetAccess(entityType, entityId, context.tenantUserId);
    const previous = await this.store.clearAssignment(target(context.workspaceId, entityType, entityId));
    if (previous) {
      try {
        const previousAssignee = await this.userStore.findById(previous.assigneeUserId);
        await recordWorkspaceActivitySafely(this.activityService, {
          workspaceId: context.workspaceId,
          actorUserId,
          eventType: "entity_assignment_cleared",
          relatedEntityType: entityType,
          relatedEntityId: entityId,
          metadata: {
            targetEntityType: entityType,
            previousAssigneeUserId: previous.assigneeUserId,
            ...(previousAssignee ? { previousAssigneeEmail: previousAssignee.email } : {}),
          },
        });
      } catch {
        // Clearing the assignment remains successful if activity enrichment is unavailable.
      }
    }
    return { relatedEntityType: entityType, relatedEntityId: entityId, cleared: Boolean(previous) };
  }

  public async listMine(
    context: WorkspaceAccessContext,
    userId: string,
  ): Promise<AssignedToMeResponse> {
    const assignments = await this.store.listForAssignee(context.workspaceId, userId);
    const accessible: WorkspaceAssignmentResponse[] = [];
    for (const assignment of assignments) {
      if (
        await this.targetAccess.canAccess(
          assignment.relatedEntityType,
          assignment.relatedEntityId,
          context.tenantUserId,
        )
      ) {
        accessible.push(await this.toResponse(assignment));
      }
    }
    return { assignments: accessible };
  }

  private async recordChange(
    workspaceId: string,
    actorUserId: string,
    assignment: StoredWorkspaceAssignment,
    previous: StoredWorkspaceAssignment | null,
  ): Promise<void> {
    const [actor, assignee, previousAssignee] = await Promise.all([
      this.userStore.findById(actorUserId),
      this.userStore.findById(assignment.assigneeUserId),
      previous ? this.userStore.findById(previous.assigneeUserId) : Promise.resolve(null),
    ]);
    if (!actor || !assignee) {
      return;
    }

    await recordWorkspaceActivitySafely(this.activityService, {
      workspaceId,
      actorUserId,
      eventType: previous ? "entity_reassigned" : "entity_assigned",
      relatedEntityType: assignment.relatedEntityType,
      relatedEntityId: assignment.relatedEntityId,
      metadata: {
        targetEntityType: assignment.relatedEntityType,
        assigneeUserId: assignee.id,
        assigneeEmail: assignee.email,
        ...(previous
          ? {
              previousAssigneeUserId: previous.assigneeUserId,
              ...(previousAssignee ? { previousAssigneeEmail: previousAssignee.email } : {}),
            }
          : {}),
      },
    });

    if (assignment.assigneeUserId !== actorUserId) {
      try {
        await this.alertService.recordWorkspaceItemAssigned({
          recipientUserId: assignment.assigneeUserId,
          workspaceId,
          actorUserId,
          actorEmail: actor.email,
          relatedEntityType: assignment.relatedEntityType,
          relatedEntityId: assignment.relatedEntityId,
          assignmentId: assignment.id,
        });
      } catch {
        // Assignment persistence is authoritative; notification delivery is best effort.
      }
    }
  }

  private async assertTargetAccess(
    entityType: WorkspaceAssignmentEntityType,
    entityId: string,
    tenantUserId: string,
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      throw new ApiError(400, "assignment_invalid_entity_id", "Assignment target id is invalid.");
    }
    if (!(await this.targetAccess.canAccess(entityType, entityId, tenantUserId))) {
      throw new ApiError(404, "assignment_target_not_found", "Assignment target was not found.");
    }
  }

  private async toResponse(assignment: StoredWorkspaceAssignment): Promise<WorkspaceAssignmentResponse> {
    const [assignee, assignedBy] = await Promise.all([
      this.userStore.findById(assignment.assigneeUserId),
      this.userStore.findById(assignment.assignedByUserId),
    ]);
    if (!assignee || !assignedBy) {
      throw new ApiError(500, "assignment_user_missing", "Assignment member record is incomplete.");
    }
    return {
      id: assignment.id,
      workspaceId: assignment.workspaceId,
      relatedEntityType: assignment.relatedEntityType,
      relatedEntityId: assignment.relatedEntityId,
      assignee: { userId: assignee.id, email: assignee.email },
      assignedBy: { userId: assignedBy.id, email: assignedBy.email },
      assignedAt: assignment.assignedAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString(),
    };
  }
}

function target(
  workspaceId: string,
  relatedEntityType: WorkspaceAssignmentEntityType,
  relatedEntityId: string,
) {
  return { workspaceId, relatedEntityType, relatedEntityId };
}
