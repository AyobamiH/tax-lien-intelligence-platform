import type {
  ApprovalRequestResponse,
  DiscussionAttentionResponse,
  MyWorkResponse,
} from "@tax-lien/types";
import type { ApprovalService } from "../approvals/approval-service.js";
import type { DiscussionAttentionService } from "../discussion-attention/discussion-attention-service.js";
import type { FollowService } from "../follows/follow-service.js";
import type { WorkspaceAssignmentService } from "../workspace-assignments/workspace-assignment-service.js";
import type { WorkspaceCommentTargetAccess } from "../workspace-comments/comment-target-access.js";
import type { WorkspaceAccessContext } from "../workspaces/workspace-service.js";

const maxQueueItems = 8;

export class MyWorkService {
  public constructor(
    private readonly assignmentService: WorkspaceAssignmentService,
    private readonly approvalService: ApprovalService,
    private readonly discussionAttentionService: DiscussionAttentionService,
    private readonly targetAccess: WorkspaceCommentTargetAccess,
    private readonly followService: FollowService,
  ) {}

  public async get(
    context: WorkspaceAccessContext,
    actorUserId: string,
  ): Promise<MyWorkResponse> {
    const [assignmentResult, approvalResult, unreadDiscussionResult, followResult] = await Promise.all([
      this.assignmentService.listMine(context, actorUserId),
      this.approvalService.list(context, actorUserId, { status: "pending" }),
      this.discussionAttentionService.listUnread(actorUserId, context.workspaceId),
      this.followService.listMine(context, actorUserId),
    ]);

    const approvals = await this.accessibleReviewableApprovals(
      approvalResult.approvals,
      context.tenantUserId,
    );
    const discussions = await this.accessibleUnreadDiscussions(
      unreadDiscussionResult,
      context.tenantUserId,
    );
    const unreadMessages = discussions.reduce(
      (total, discussion) => total + discussion.unreadCount,
      0,
    );
    const assignedCount = assignmentResult.assignments.length;
    const approvalCount = approvals.length;
    const discussionCount = discussions.length;

    return {
      workspaceId: context.workspaceId,
      generatedAt: new Date().toISOString(),
      counts: {
        assigned: assignedCount,
        approvals: approvalCount,
        unreadDiscussions: discussionCount,
        unreadMessages,
        following: followResult.follows.length,
        totalActionable: assignedCount + approvalCount + discussionCount,
      },
      queues: {
        assignments: {
          count: assignedCount,
          items: assignmentResult.assignments.slice(0, maxQueueItems),
        },
        approvals: {
          count: approvalCount,
          items: approvals.slice(0, maxQueueItems),
        },
        discussions: {
          count: discussionCount,
          unreadCount: unreadMessages,
          items: discussions.slice(0, maxQueueItems),
        },
        following: {
          count: followResult.follows.length,
          items: followResult.follows.slice(0, maxQueueItems),
        },
      },
    };
  }

  private async accessibleReviewableApprovals(
    approvals: ApprovalRequestResponse[],
    tenantUserId: string,
  ): Promise<ApprovalRequestResponse[]> {
    const accessible: ApprovalRequestResponse[] = [];
    for (const approval of approvals) {
      if (
        approval.canReview &&
        (await this.targetAccess.canAccess(
          approval.targetEntityType,
          approval.targetEntityId,
          tenantUserId,
        ))
      ) {
        accessible.push(approval);
      }
    }
    return accessible;
  }

  private async accessibleUnreadDiscussions(
    discussions: DiscussionAttentionResponse[],
    tenantUserId: string,
  ): Promise<DiscussionAttentionResponse[]> {
    const accessible: DiscussionAttentionResponse[] = [];
    for (const discussion of discussions) {
      if (
        discussion.hasUnread &&
        (await this.targetAccess.canAccess(
          discussion.relatedEntityType,
          discussion.relatedEntityId,
          tenantUserId,
        ))
      ) {
        accessible.push(discussion);
      }
    }
    return accessible;
  }
}
