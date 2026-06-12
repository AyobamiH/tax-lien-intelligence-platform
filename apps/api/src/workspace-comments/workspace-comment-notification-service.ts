import type {
  DiscussionAttentionResponse,
  WorkspaceCommentEntityType,
} from "@tax-lien/types";
import type { AlertService } from "../alerts/alert-service.js";
import type { DiscussionAttentionService } from "../discussion-attention/discussion-attention-service.js";
import type { WorkspaceMembershipStore } from "../workspaces/workspace-store.js";

export interface WorkspaceCommentCreatedEvent {
  workspaceId: string;
  actorUserId: string;
  actorEmail: string;
  relatedEntityType: WorkspaceCommentEntityType;
  relatedEntityId: string;
  commentId: string;
  createdAt: Date;
}

export class WorkspaceCommentNotificationService {
  public constructor(
    private readonly membershipStore: WorkspaceMembershipStore,
    private readonly attentionService: DiscussionAttentionService,
    private readonly alertService: AlertService,
  ) {}

  public async recordCommentCreated(
    event: WorkspaceCommentCreatedEvent,
  ): Promise<DiscussionAttentionResponse> {
    const memberships = await this.membershipStore.listForWorkspace(event.workspaceId);
    const actorAttention = await this.attentionService.markRead(
      attentionTarget(event.actorUserId, event),
      event.createdAt,
    );

    await Promise.all(
      memberships
        .filter((membership) => membership.userId !== event.actorUserId)
        .map(async (membership) => {
          const result = await this.attentionService.incrementUnread(
            attentionTarget(membership.userId, event),
            event.createdAt,
          );
          if (!result.becameUnread) {
            return;
          }

          await this.alertService.recordWorkspaceCommentAdded({
            recipientUserId: membership.userId,
            workspaceId: event.workspaceId,
            actorUserId: event.actorUserId,
            actorEmail: event.actorEmail,
            relatedEntityType: event.relatedEntityType,
            relatedEntityId: event.relatedEntityId,
            commentId: event.commentId,
          });
        }),
    );

    return actorAttention;
  }

  public async markDiscussionRead(input: {
    userId: string;
    workspaceId: string;
    relatedEntityType: WorkspaceCommentEntityType;
    relatedEntityId: string;
    latestCommentAt?: Date;
  }): Promise<DiscussionAttentionResponse> {
    const attention = await this.attentionService.markRead(
      {
        userId: input.userId,
        workspaceId: input.workspaceId,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
      },
      input.latestCommentAt,
    );
    try {
      await this.alertService.markWorkspaceDiscussionAlertsRead(
        input.userId,
        input.workspaceId,
        input.relatedEntityType,
        input.relatedEntityId,
      );
    } catch {
      // Attention state remains authoritative when alert acknowledgement fails.
    }
    return attention;
  }
}

function attentionTarget(userId: string, event: WorkspaceCommentCreatedEvent) {
  return {
    userId,
    workspaceId: event.workspaceId,
    relatedEntityType: event.relatedEntityType,
    relatedEntityId: event.relatedEntityId,
  };
}
