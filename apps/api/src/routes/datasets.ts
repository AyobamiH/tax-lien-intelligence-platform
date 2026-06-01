import multer from "multer";
import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { parseRequestBody } from "../auth/validation.js";
import { maxDatasetUploadBytes } from "../datasets/csv-parser.js";
import type { DatasetService } from "../datasets/dataset-service.js";
import { ApiError } from "../errors/api-error.js";
import { requireAuth } from "../middleware/auth.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxDatasetUploadBytes,
    files: 1,
  },
});

const saveManualMappingSchema = z.object({
  mappings: z.record(z.string(), z.string().max(255).nullable()),
});

export function createDatasetRouter(authService: AuthService, datasetService: DatasetService): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);

  router.post("/", requireAuthenticatedUser, upload.single("file"), async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      if (!request.file) {
        throw new ApiError(400, "dataset_file_required", "CSV file is required.");
      }

      const result = await datasetService.createDataset({
        userId: request.auth.userId,
        file: request.file,
        sourceLabel: typeof request.body.sourceLabel === "string" ? request.body.sourceLabel : undefined,
      });

      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      response.status(200).json(await datasetService.listDatasets(request.auth.userId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:datasetId", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const datasetId = request.params.datasetId;
      if (typeof datasetId !== "string") {
        throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
      }

      response.status(200).json(await datasetService.getDatasetForUser(datasetId, request.auth.userId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:datasetId/mapping", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const datasetId = request.params.datasetId;
      if (typeof datasetId !== "string") {
        throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
      }

      response.status(200).json(await datasetService.getManualMappingContext(datasetId, request.auth.userId));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:datasetId/mapping", requireAuthenticatedUser, async (request, response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const datasetId = request.params.datasetId;
      if (typeof datasetId !== "string") {
        throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
      }

      const payload = parseRequestBody(saveManualMappingSchema, request.body);

      response.status(200).json(
        await datasetService.saveManualMapping({
          datasetId,
          userId: request.auth.userId,
          mappings: payload.mappings,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
