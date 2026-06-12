import { MongoUserStore } from "../auth/user-store.js";
import { MongoComparisonStore } from "../comparison/comparison-store.js";
import { MongoDatasetStore } from "../datasets/dataset-store.js";
import { MongoPortfolioStore } from "../portfolio/portfolio-store.js";
import { MongoWatchlistStore } from "../watchlist/watchlist-store.js";
import { StoreBackedWorkspaceCommentTargetAccess } from "./comment-target-access.js";
import { WorkspaceCommentService } from "./workspace-comment-service.js";
import { MongoWorkspaceCommentStore } from "./workspace-comment-store.js";

export function createWorkspaceCommentService(): WorkspaceCommentService {
  return new WorkspaceCommentService(
    new MongoWorkspaceCommentStore(),
    new MongoUserStore(),
    new StoreBackedWorkspaceCommentTargetAccess(
      new MongoDatasetStore(),
      new MongoComparisonStore(),
      new MongoWatchlistStore(),
      new MongoPortfolioStore(),
    ),
  );
}
