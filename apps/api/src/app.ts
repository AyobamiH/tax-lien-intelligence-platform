import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { HealthResponse } from "@tax-lien/types";
import type { AuthService } from "./auth/auth-service.js";
import { createAuthService } from "./auth/factory.js";
import { apiConfig } from "./config/env.js";
import type { DatasetService } from "./datasets/dataset-service.js";
import { createDatasetService } from "./datasets/factory.js";
import { errorHandler, notFoundHandler } from "./errors/error-handler.js";
import { createPortfolioService } from "./portfolio/factory.js";
import type { PortfolioService } from "./portfolio/portfolio-service.js";
import { createAuthRouter } from "./routes/auth.js";
import { createDatasetRouter } from "./routes/datasets.js";
import { createPortfolioRouter } from "./routes/portfolio.js";
import { createScoringRouter } from "./routes/scoring.js";
import { createWatchlistRouter } from "./routes/watchlist.js";
import { createScoringService } from "./scoring/factory.js";
import type { ScoringService } from "./scoring/scoring-service.js";
import { createWatchlistService } from "./watchlist/factory.js";
import type { WatchlistService } from "./watchlist/watchlist-service.js";

export interface AppDependencies {
  authService?: AuthService;
  datasetService?: DatasetService;
  scoringService?: ScoringService;
  watchlistService?: WatchlistService;
  portfolioService?: PortfolioService;
}

export function createApp(dependencies: AppDependencies = {}): Express {
  const app = express();
  const authService = dependencies.authService ?? createAuthService();
  const datasetService = dependencies.datasetService ?? createDatasetService();
  const scoringService = dependencies.scoringService ?? createScoringService();
  const watchlistService = dependencies.watchlistService ?? createWatchlistService();
  const portfolioService = dependencies.portfolioService ?? createPortfolioService();

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
  app.use("/datasets", createDatasetRouter(authService, datasetService));
  app.use("/datasets", createScoringRouter(authService, scoringService));
  app.use("/watchlist", createWatchlistRouter(authService, watchlistService));
  app.use("/portfolio", createPortfolioRouter(authService, portfolioService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
