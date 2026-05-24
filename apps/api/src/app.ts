import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { HealthResponse } from "@tax-lien/types";
import { apiConfig } from "./config/env.js";

export function createApp(): Express {
  const app = express();

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

  app.use((_request, response) => {
    response.status(404).json({
      error: {
        code: "route_not_found",
        message: "The requested API route does not exist.",
      },
    });
  });

  return app;
}
