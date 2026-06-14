import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { HealthResponse } from "@tax-lien/types";
import { createAlertService } from "./alerts/factory.js";
import type { AlertService } from "./alerts/alert-service.js";
import type { AuthService } from "./auth/auth-service.js";
import { createAuthService } from "./auth/factory.js";
import { createComparisonService } from "./comparison/factory.js";
import type { ComparisonService } from "./comparison/comparison-service.js";
import { apiConfig } from "./config/env.js";
import type { DatasetService } from "./datasets/dataset-service.js";
import { createDatasetService } from "./datasets/factory.js";
import { errorHandler, notFoundHandler } from "./errors/error-handler.js";
import { createInternalJobService } from "./jobs/factory.js";
import type { InternalJobService } from "./jobs/internal-job-service.js";
import { createNotificationDeliveryService } from "./notification-delivery/factory.js";
import type { NotificationDeliveryService } from "./notification-delivery/notification-delivery-service.js";
import { createNotificationPreferenceService } from "./notification-preferences/factory.js";
import type { NotificationPreferenceService } from "./notification-preferences/notification-preference-service.js";
import { createPortfolioService } from "./portfolio/factory.js";
import type { PortfolioService } from "./portfolio/portfolio-service.js";
import { createAlertRouter } from "./routes/alerts.js";
import { createAuthRouter } from "./routes/auth.js";
import { createComparisonRouter } from "./routes/comparison.js";
import { createWorkspaceCommentRouter } from "./routes/comments.js";
import { createDatasetRouter } from "./routes/datasets.js";
import { createInternalJobRouter } from "./routes/jobs.js";
import { createNotificationDeliveryRouter } from "./routes/notification-deliveries.js";
import { createNotificationPreferenceRouter } from "./routes/notification-preferences.js";
import { createPortfolioRouter } from "./routes/portfolio.js";
import { createSavedViewRouter } from "./routes/saved-views.js";
import { createScoringRouter } from "./routes/scoring.js";
import { createWatchlistRouter } from "./routes/watchlist.js";
import { createWorkspaceRouter } from "./routes/workspaces.js";
import { createSavedViewService } from "./saved-views/factory.js";
import type { SavedViewService } from "./saved-views/saved-view-service.js";
import { createScoringService } from "./scoring/factory.js";
import type { ScoringService } from "./scoring/scoring-service.js";
import { createWatchlistService } from "./watchlist/factory.js";
import type { WatchlistService } from "./watchlist/watchlist-service.js";
import { createWorkspaceService } from "./workspaces/factory.js";
import type { WorkspaceService } from "./workspaces/workspace-service.js";
import { createWorkspaceActivityService } from "./workspace-activity/factory.js";
import type { WorkspaceActivityService } from "./workspace-activity/workspace-activity-service.js";
import { createWorkspaceCommentService } from "./workspace-comments/factory.js";
import type { WorkspaceCommentService } from "./workspace-comments/workspace-comment-service.js";
import { createWorkspaceAssignmentRouter } from "./routes/assignments.js";
import { createWorkspaceAssignmentService } from "./workspace-assignments/factory.js";
import type { WorkspaceAssignmentService } from "./workspace-assignments/workspace-assignment-service.js";
import { createApprovalService } from "./approvals/factory.js";
import type { ApprovalService } from "./approvals/approval-service.js";
import { createApprovalRouter } from "./routes/approvals.js";
import { createMyWorkService } from "./my-work/factory.js";
import type { MyWorkService } from "./my-work/my-work-service.js";
import { createMyWorkRouter } from "./routes/my-work.js";
import { createFollowService } from "./follows/factory.js";
import type { FollowService } from "./follows/follow-service.js";
import { createFollowRouter } from "./routes/follows.js";

export interface AppDependencies {
  authService?: AuthService;
  datasetService?: DatasetService;
  internalJobService?: InternalJobService;
  scoringService?: ScoringService;
  watchlistService?: WatchlistService;
  portfolioService?: PortfolioService;
  alertService?: AlertService;
  notificationPreferenceService?: NotificationPreferenceService;
  notificationDeliveryService?: NotificationDeliveryService;
  comparisonService?: ComparisonService;
  savedViewService?: SavedViewService;
  workspaceService?: WorkspaceService;
  workspaceActivityService?: WorkspaceActivityService;
  workspaceCommentService?: WorkspaceCommentService;
  workspaceAssignmentService?: WorkspaceAssignmentService;
  approvalService?: ApprovalService;
  myWorkService?: MyWorkService;
  followService?: FollowService;
}

export function createApp(dependencies: AppDependencies = {}): Express {
  const app = express();
  const authService = dependencies.authService ?? createAuthService();
  const datasetService = dependencies.datasetService ?? createDatasetService();
  const notificationPreferenceService =
    dependencies.notificationPreferenceService ?? createNotificationPreferenceService();
  const notificationDeliveryService =
    dependencies.notificationDeliveryService ?? createNotificationDeliveryService(notificationPreferenceService);
  const alertService =
    dependencies.alertService ?? createAlertService(notificationPreferenceService, notificationDeliveryService);
  const internalJobService = dependencies.internalJobService ?? createInternalJobService(alertService);
  const scoringService = dependencies.scoringService ?? createScoringService(internalJobService);
  const watchlistService = dependencies.watchlistService ?? createWatchlistService();
  const portfolioService = dependencies.portfolioService ?? createPortfolioService();
  const comparisonService = dependencies.comparisonService ?? createComparisonService();
  const savedViewService = dependencies.savedViewService ?? createSavedViewService();
  const workspaceService = dependencies.workspaceService ?? createWorkspaceService();
  const workspaceActivityService =
    dependencies.workspaceActivityService ?? createWorkspaceActivityService();
  const workspaceCommentService =
    dependencies.workspaceCommentService ?? createWorkspaceCommentService(alertService);
  const followService =
    dependencies.followService ?? createFollowService(alertService);
  const workspaceAssignmentService =
    dependencies.workspaceAssignmentService ??
    createWorkspaceAssignmentService(alertService, workspaceActivityService, followService);
  const approvalService =
    dependencies.approvalService ?? createApprovalService(comparisonService);
  const myWorkService =
    dependencies.myWorkService ??
    createMyWorkService(workspaceAssignmentService, approvalService, followService);

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/healthz", (_request, response) => {
    const payload: HealthResponse = {
      service: "tax-lien-api",
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: apiConfig.nodeEnv,
    };

    response.status(200).json(payload);
  });

  app.use("/auth", createAuthRouter(authService));
  app.use("/workspaces", createWorkspaceRouter(authService, workspaceService, workspaceActivityService));
  app.use("/comments", createWorkspaceCommentRouter(authService, workspaceService, workspaceCommentService));
  app.use("/assignments", createWorkspaceAssignmentRouter(authService, workspaceService, workspaceAssignmentService));
  app.use(
    "/approvals",
    createApprovalRouter(
      authService,
      workspaceService,
      approvalService,
      workspaceActivityService,
      followService,
    ),
  );
  app.use("/follows", createFollowRouter(authService, workspaceService, followService));
  app.use("/my-work", createMyWorkRouter(authService, workspaceService, myWorkService));
  app.use("/datasets", createDatasetRouter(authService, datasetService, workspaceService, workspaceActivityService));
  app.use("/datasets", createScoringRouter(authService, scoringService, workspaceService, workspaceActivityService));
  app.use("/jobs", createInternalJobRouter(authService, internalJobService, workspaceService));
  app.use("/alerts", createAlertRouter(authService, alertService));
  app.use("/notification-deliveries", createNotificationDeliveryRouter(authService, notificationDeliveryService));
  app.use("/notification-preferences", createNotificationPreferenceRouter(authService, notificationPreferenceService));
  app.use("/watchlist", createWatchlistRouter(authService, watchlistService, workspaceService));
  app.use(
    "/portfolio",
    createPortfolioRouter(
      authService,
      portfolioService,
      workspaceService,
      workspaceActivityService,
      followService,
    ),
  );
  app.use(
    "/comparison",
    createComparisonRouter(
      authService,
      comparisonService,
      workspaceService,
      workspaceActivityService,
      approvalService,
    ),
  );
  app.use("/saved-views", createSavedViewRouter(authService, savedViewService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
