import { MongoComparisonStore } from "../comparison/comparison-store.js";
import { MongoDatasetStore } from "../datasets/dataset-store.js";
import { DiscussionAttentionService } from "../discussion-attention/discussion-attention-service.js";
import { MongoDiscussionAttentionStore } from "../discussion-attention/discussion-attention-store.js";
import { MongoPortfolioStore } from "../portfolio/portfolio-store.js";
import { MongoWatchlistStore } from "../watchlist/watchlist-store.js";
import type { ApprovalService } from "../approvals/approval-service.js";
import type { FollowService } from "../follows/follow-service.js";
import type { FollowUpService } from "../follow-ups/follow-up-service.js";
import type { WorkspaceAssignmentService } from "../workspace-assignments/workspace-assignment-service.js";
import { StoreBackedWorkspaceCommentTargetAccess } from "../workspace-comments/comment-target-access.js";
import { MyWorkService } from "./my-work-service.js";

export function createMyWorkService(
  assignmentService: WorkspaceAssignmentService,
  approvalService: ApprovalService,
  followService: FollowService,
  followUpService?: FollowUpService,
): MyWorkService {
  return new MyWorkService(
    assignmentService,
    approvalService,
    new DiscussionAttentionService(new MongoDiscussionAttentionStore()),
    new StoreBackedWorkspaceCommentTargetAccess(
      new MongoDatasetStore(),
      new MongoComparisonStore(),
      new MongoWatchlistStore(),
      new MongoPortfolioStore(),
    ),
    followService,
    followUpService,
  );
}
