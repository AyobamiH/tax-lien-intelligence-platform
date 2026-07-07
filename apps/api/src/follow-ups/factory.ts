import type { AlertService } from "../alerts/alert-service.js";
import { MongoComparisonStore } from "../comparison/comparison-store.js";
import { MongoDatasetStore } from "../datasets/dataset-store.js";
import { MongoPortfolioStore } from "../portfolio/portfolio-store.js";
import { MongoWatchlistStore } from "../watchlist/watchlist-store.js";
import { MongoWorkspaceAssignmentStore } from "../workspace-assignments/workspace-assignment-store.js";
import { createWorkspaceActivityService } from "../workspace-activity/factory.js";
import { StoreBackedWorkspaceCommentTargetAccess } from "../workspace-comments/comment-target-access.js";
import { MongoWorkspaceMembershipStore } from "../workspaces/workspace-store.js";
import { FollowUpService } from "./follow-up-service.js";
import { MongoFollowUpStore } from "./follow-up-store.js";

export function createFollowUpService(alertService: AlertService): FollowUpService {
  return new FollowUpService(
    new MongoFollowUpStore(),
    new StoreBackedWorkspaceCommentTargetAccess(
      new MongoDatasetStore(),
      new MongoComparisonStore(),
      new MongoWatchlistStore(),
      new MongoPortfolioStore(),
    ),
    new MongoWorkspaceAssignmentStore(),
    new MongoWorkspaceMembershipStore(),
    alertService,
    createWorkspaceActivityService(),
  );
}
