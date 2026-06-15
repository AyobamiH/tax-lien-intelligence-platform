import { MongoComparisonStore } from "../comparison/comparison-store.js";
import { MongoDatasetStore } from "../datasets/dataset-store.js";
import { MongoPortfolioStore } from "../portfolio/portfolio-store.js";
import { MongoWatchlistStore } from "../watchlist/watchlist-store.js";
import { StoreBackedWorkspaceCommentTargetAccess } from "../workspace-comments/comment-target-access.js";
import { ReviewChecklistService } from "./review-checklist-service.js";
import {
  MongoReviewChecklistInstanceStore,
  MongoReviewChecklistTemplateStore,
} from "./review-checklist-store.js";

export function createReviewChecklistService(): ReviewChecklistService {
  return new ReviewChecklistService(
    new MongoReviewChecklistTemplateStore(),
    new MongoReviewChecklistInstanceStore(),
    new StoreBackedWorkspaceCommentTargetAccess(
      new MongoDatasetStore(),
      new MongoComparisonStore(),
      new MongoWatchlistStore(),
      new MongoPortfolioStore(),
    ),
  );
}
