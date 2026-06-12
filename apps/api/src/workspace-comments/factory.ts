import { MongoUserStore } from "../auth/user-store.js";
import { createAlertService } from "../alerts/factory.js";
import type { AlertService } from "../alerts/alert-service.js";
import { MongoComparisonStore } from "../comparison/comparison-store.js";
import { MongoDatasetStore } from "../datasets/dataset-store.js";
import { DiscussionAttentionService } from "../discussion-attention/discussion-attention-service.js";
import { MongoDiscussionAttentionStore } from "../discussion-attention/discussion-attention-store.js";
import { MongoPortfolioStore } from "../portfolio/portfolio-store.js";
import { MongoWatchlistStore } from "../watchlist/watchlist-store.js";
import { MongoWorkspaceMembershipStore } from "../workspaces/workspace-store.js";
import { StoreBackedWorkspaceCommentTargetAccess } from "./comment-target-access.js";
import { WorkspaceCommentNotificationService } from "./workspace-comment-notification-service.js";
import { WorkspaceCommentService } from "./workspace-comment-service.js";
import { MongoWorkspaceCommentStore } from "./workspace-comment-store.js";

export function createWorkspaceCommentService(
  alertService: AlertService = createAlertService(),
): WorkspaceCommentService {
  const attentionService = new DiscussionAttentionService(new MongoDiscussionAttentionStore());
  return new WorkspaceCommentService(
    new MongoWorkspaceCommentStore(),
    new MongoUserStore(),
    new StoreBackedWorkspaceCommentTargetAccess(
      new MongoDatasetStore(),
      new MongoComparisonStore(),
      new MongoWatchlistStore(),
      new MongoPortfolioStore(),
    ),
    attentionService,
    new WorkspaceCommentNotificationService(
      new MongoWorkspaceMembershipStore(),
      attentionService,
      alertService,
    ),
  );
}
