import mongoose from "mongoose";
import type { UserStore } from "../../apps/api/src/auth/user-store.js";
import { WorkspaceActivityService } from "../../apps/api/src/workspace-activity/workspace-activity-service.js";
import type {
  CreateWorkspaceActivityInput,
  ListWorkspaceActivityInput,
  StoredWorkspaceActivity,
  WorkspaceActivityStore,
} from "../../apps/api/src/workspace-activity/workspace-activity-store.js";

export class InMemoryWorkspaceActivityStore implements WorkspaceActivityStore {
  private readonly activities: StoredWorkspaceActivity[] = [];

  public async createActivity(input: CreateWorkspaceActivityInput): Promise<StoredWorkspaceActivity> {
    const activity: StoredWorkspaceActivity = {
      id: new mongoose.Types.ObjectId().toString(),
      ...input,
    };
    this.activities.push(activity);
    return activity;
  }

  public async listActivity(input: ListWorkspaceActivityInput): Promise<StoredWorkspaceActivity[]> {
    return this.activities
      .filter(
        (activity) =>
          activity.workspaceId === input.workspaceId &&
          (!input.category || activity.category === input.category),
      )
      .sort(
        (left, right) =>
          right.occurredAt.getTime() - left.occurredAt.getTime() ||
          right.id.localeCompare(left.id),
      )
      .slice(0, input.limit);
  }
}

export function createInMemoryWorkspaceActivityService(
  userStore: UserStore,
  store = new InMemoryWorkspaceActivityStore(),
): WorkspaceActivityService {
  return new WorkspaceActivityService(store, userStore);
}
