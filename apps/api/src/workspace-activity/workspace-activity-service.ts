import type {
  ComparisonDecision,
  PortfolioStatus,
  WorkspaceActivityCategory,
  WorkspaceActivityEventType,
  WorkspaceActivityListResponse,
  WorkspaceActivityMetadata,
  WorkspaceActivityRelatedEntityType,
  WorkspaceActivityResponse,
  WorkspaceRole,
} from "@tax-lien/types";
import type { UserStore } from "../auth/user-store.js";
import { ApiError } from "../errors/api-error.js";
import type {
  StoredWorkspaceActivity,
  WorkspaceActivityStore,
} from "./workspace-activity-store.js";

export interface RecordWorkspaceActivityInput {
  workspaceId: string;
  actorUserId: string;
  eventType: WorkspaceActivityEventType;
  relatedEntityType: WorkspaceActivityRelatedEntityType;
  relatedEntityId: string;
  metadata?: WorkspaceActivityMetadata;
}

export class WorkspaceActivityService {
  public constructor(
    private readonly store: WorkspaceActivityStore,
    private readonly userStore: UserStore,
  ) {}

  public async record(input: RecordWorkspaceActivityInput): Promise<WorkspaceActivityResponse> {
    const actor = await this.userStore.findById(input.actorUserId);
    if (!actor) {
      throw new ApiError(401, "activity_actor_not_found", "Activity actor no longer exists.");
    }

    const category = categoryForEvent(input.eventType);
    const summary = summaryForEvent(input.eventType, input.metadata);
    const activity = await this.store.createActivity({
      workspaceId: input.workspaceId,
      actorUserId: actor.id,
      actorEmail: actor.email,
      category,
      eventType: input.eventType,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      summary,
      ...(input.metadata ? { metadata: input.metadata } : {}),
      occurredAt: new Date(),
    });

    return toWorkspaceActivityResponse(activity);
  }

  public async list(
    workspaceId: string,
    options: { category?: WorkspaceActivityCategory; limit?: number } = {},
  ): Promise<WorkspaceActivityListResponse> {
    const limit = Math.max(1, Math.min(Math.floor(options.limit ?? 30), 100));
    const activities = await this.store.listActivity({
      workspaceId,
      ...(options.category ? { category: options.category } : {}),
      limit,
    });

    return { activities: activities.map(toWorkspaceActivityResponse) };
  }
}

export async function recordWorkspaceActivitySafely(
  service: WorkspaceActivityService,
  input: RecordWorkspaceActivityInput,
): Promise<void> {
  try {
    await service.record(input);
  } catch {
    // Activity is operational context, not a transaction boundary for the primary action.
  }
}

function categoryForEvent(eventType: WorkspaceActivityEventType): WorkspaceActivityCategory {
  switch (eventType) {
    case "dataset_uploaded":
    case "dataset_scoring_requested":
    case "dataset_refresh_requested":
      return "data";
    case "comparison_decision_changed":
    case "comparison_handoff_to_watchlist":
    case "comparison_handoff_to_portfolio":
      return "decisions";
    case "portfolio_status_changed":
      return "portfolio";
    case "workspace_member_added":
    case "workspace_member_role_changed":
      return "members";
    case "entity_assigned":
    case "entity_reassigned":
    case "entity_assignment_cleared":
      return "responsibility";
  }
}

function summaryForEvent(
  eventType: WorkspaceActivityEventType,
  metadata: WorkspaceActivityMetadata | undefined,
): string {
  switch (eventType) {
    case "dataset_uploaded":
      return `Uploaded dataset ${safeName(metadata?.datasetName, "dataset")}.`;
    case "dataset_scoring_requested":
      return `Queued scoring for ${safeName(metadata?.datasetName, "a dataset")}.`;
    case "dataset_refresh_requested":
      return `Queued a scoring refresh for ${safeName(metadata?.datasetName, "a dataset")}.`;
    case "comparison_decision_changed":
      return `Changed a comparison decision from ${decisionLabel(metadata?.previousDecision)} to ${decisionLabel(metadata?.newDecision)}.`;
    case "comparison_handoff_to_watchlist":
      return "Moved a comparison candidate to the watchlist.";
    case "comparison_handoff_to_portfolio":
      return "Moved a comparison candidate into portfolio tracking.";
    case "portfolio_status_changed":
      return `Changed a portfolio item from ${statusLabel(metadata?.previousStatus)} to ${statusLabel(metadata?.newStatus)}.`;
    case "workspace_member_added":
      return `Added ${safeName(metadata?.memberEmail, "a registered user")} as ${roleLabel(metadata?.role)}.`;
    case "workspace_member_role_changed":
      return `Changed ${safeName(metadata?.memberEmail, "a workspace member")} from ${roleLabel(metadata?.previousRole)} to ${roleLabel(metadata?.role)}.`;
    case "entity_assigned":
      return `Assigned ${entityLabel(metadata)} to ${safeName(metadata?.assigneeEmail, "a workspace member")}.`;
    case "entity_reassigned":
      return `Reassigned ${entityLabel(metadata)} from ${safeName(metadata?.previousAssigneeEmail, "a workspace member")} to ${safeName(metadata?.assigneeEmail, "a workspace member")}.`;
    case "entity_assignment_cleared":
      return `Cleared responsibility for ${entityLabel(metadata)} previously assigned to ${safeName(metadata?.previousAssigneeEmail, "a workspace member")}.`;
  }
}

function safeName(value: string | undefined, fallback: string): string {
  const normalized = value?.replace(/[\u0000-\u001F\u007F]/gu, "").trim();
  return normalized ? normalized.slice(0, 160) : fallback;
}

function decisionLabel(value: ComparisonDecision | undefined): string {
  return value?.replaceAll("_", " ") ?? "undecided";
}

function statusLabel(value: PortfolioStatus | undefined): string {
  return value ?? "unknown";
}

function roleLabel(value: Exclude<WorkspaceRole, "owner"> | undefined): string {
  return value ?? "member";
}

function entityLabel(metadata: WorkspaceActivityMetadata | undefined): string {
  return metadata?.targetEntityType
    ? `a ${metadata.targetEntityType.replaceAll("_", " ")}`
    : "a shared record";
}

function toWorkspaceActivityResponse(activity: StoredWorkspaceActivity): WorkspaceActivityResponse {
  return {
    id: activity.id,
    workspaceId: activity.workspaceId,
    actor: {
      userId: activity.actorUserId,
      email: activity.actorEmail,
    },
    category: activity.category,
    eventType: activity.eventType,
    relatedEntityType: activity.relatedEntityType,
    relatedEntityId: activity.relatedEntityId,
    summary: activity.summary,
    ...(activity.metadata ? { metadata: activity.metadata } : {}),
    occurredAt: activity.occurredAt.toISOString(),
  };
}
