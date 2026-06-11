import { MongoUserStore } from "../auth/user-store.js";
import { WorkspaceActivityService } from "./workspace-activity-service.js";
import { MongoWorkspaceActivityStore } from "./workspace-activity-store.js";

export function createWorkspaceActivityService(): WorkspaceActivityService {
  return new WorkspaceActivityService(
    new MongoWorkspaceActivityStore(),
    new MongoUserStore(),
  );
}
