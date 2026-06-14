import type { AlertService } from "../alerts/alert-service.js";
import { MongoUserStore } from "../auth/user-store.js";
import { MongoComparisonStore } from "../comparison/comparison-store.js";
import { MongoDatasetStore } from "../datasets/dataset-store.js";
import { MongoPortfolioStore } from "../portfolio/portfolio-store.js";
import { MongoWatchlistStore } from "../watchlist/watchlist-store.js";
import { StoreBackedWorkspaceCommentTargetAccess } from "../workspace-comments/comment-target-access.js";
import { MongoWorkspaceMembershipStore } from "../workspaces/workspace-store.js";
import { FollowService } from "./follow-service.js";
import { MongoFollowStore } from "./follow-store.js";

export function createFollowService(alertService: AlertService): FollowService {
  return new FollowService(
    new MongoFollowStore(),
    new StoreBackedWorkspaceCommentTargetAccess(
      new MongoDatasetStore(),
      new MongoComparisonStore(),
      new MongoWatchlistStore(),
      new MongoPortfolioStore(),
    ),
    new MongoWorkspaceMembershipStore(),
    new MongoUserStore(),
    alertService,
  );
}
