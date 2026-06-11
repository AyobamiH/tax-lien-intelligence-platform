import { MongoUserStore } from "../auth/user-store.js";
import { WorkspaceService } from "./workspace-service.js";
import { MongoWorkspaceMembershipStore, MongoWorkspaceStore } from "./workspace-store.js";

export function createWorkspaceService(): WorkspaceService {
  return new WorkspaceService(
    new MongoWorkspaceStore(),
    new MongoWorkspaceMembershipStore(),
    new MongoUserStore(),
  );
}
