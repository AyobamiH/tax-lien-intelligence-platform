import type { AlertService } from "../alerts/alert-service.js";
import { MongoUserStore } from "../auth/user-store.js";
import { MongoComparisonStore } from "../comparison/comparison-store.js";
import { MongoDatasetStore } from "../datasets/dataset-store.js";
import { MongoPortfolioStore } from "../portfolio/portfolio-store.js";
import { MongoWatchlistStore } from "../watchlist/watchlist-store.js";
import { StoreBackedWorkspaceCommentTargetAccess } from "../workspace-comments/comment-target-access.js";
import type { WorkspaceActivityService } from "../workspace-activity/workspace-activity-service.js";
import { MongoWorkspaceMembershipStore } from "../workspaces/workspace-store.js";
import { WorkspaceAssignmentService } from "./workspace-assignment-service.js";
import { MongoWorkspaceAssignmentStore } from "./workspace-assignment-store.js";

export function createWorkspaceAssignmentService(
  alertService: AlertService,
  activityService: WorkspaceActivityService,
): WorkspaceAssignmentService {
  return new WorkspaceAssignmentService(
    new MongoWorkspaceAssignmentStore(),
    new MongoWorkspaceMembershipStore(),
    new MongoUserStore(),
    new StoreBackedWorkspaceCommentTargetAccess(
      new MongoDatasetStore(),
      new MongoComparisonStore(),
      new MongoWatchlistStore(),
      new MongoPortfolioStore(),
    ),
    alertService,
    activityService,
  );
}
