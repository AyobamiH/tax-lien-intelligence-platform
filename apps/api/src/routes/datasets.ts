import multer from "multer";
import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../auth/auth-service.js";
import { parseRequestBody } from "../auth/validation.js";
import { maxDatasetUploadBytes } from "../datasets/csv-parser.js";
import type { DatasetService } from "../datasets/dataset-service.js";
import { ApiError } from "../errors/api-error.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceAccess } from "../middleware/workspace.js";
import type { WorkspaceService } from "../workspaces/workspace-service.js";

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

const saveImportProfileSchema = z.object({
  name: z.string().max(120).optional(),
});

const applyImportProfileSchema = z.object({
  profileId: z.string().min(1),
});

export function createDatasetRouter(
  authService: AuthService,
  datasetService: DatasetService,
  workspaceService: WorkspaceService,
): Router {
  const router = Router();
  const requireAuthenticatedUser = requireAuth(authService);
  const requireWorkspaceRead = requireWorkspaceAccess(workspaceService, "read");
  const requireWorkspaceWrite = requireWorkspaceAccess(workspaceService, "write");

  router.post("/", requireAuthenticatedUser, requireWorkspaceWrite, upload.single("file"), async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      if (!request.file) {
        throw new ApiError(400, "dataset_file_required", "CSV file is required.");
      }

      const result = await datasetService.createDataset({
        userId: request.workspace.tenantUserId,
        file: request.file,
        sourceLabel: typeof request.body.sourceLabel === "string" ? request.body.sourceLabel : undefined,
      });

      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      response.status(200).json(await datasetService.listDatasets(request.workspace.tenantUserId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/import-profiles", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      response.status(200).json(await datasetService.listImportProfiles(request.workspace.tenantUserId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:datasetId", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const datasetId = request.params.datasetId;
      if (typeof datasetId !== "string") {
        throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
      }

      response.status(200).json(await datasetService.getDatasetForUser(datasetId, request.workspace.tenantUserId));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:datasetId/mapping", requireAuthenticatedUser, requireWorkspaceRead, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const datasetId = request.params.datasetId;
      if (typeof datasetId !== "string") {
        throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
      }

      response.status(200).json(await datasetService.getManualMappingContext(datasetId, request.workspace.tenantUserId));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:datasetId/mapping", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const datasetId = request.params.datasetId;
      if (typeof datasetId !== "string") {
        throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
      }

      const payload = parseRequestBody(saveManualMappingSchema, request.body);

      response.status(200).json(
        await datasetService.saveManualMapping({
          datasetId,
          userId: request.workspace.tenantUserId,
          mappings: payload.mappings,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/:datasetId/import-profile", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const datasetId = request.params.datasetId;
      if (typeof datasetId !== "string") {
        throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
      }

      const payload = parseRequestBody(saveImportProfileSchema, request.body);

      response.status(201).json(
        await datasetService.saveImportProfileFromDataset({
          datasetId,
          userId: request.workspace.tenantUserId,
          ...(payload.name ? { name: payload.name } : {}),
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post("/:datasetId/import-profile/apply", requireAuthenticatedUser, requireWorkspaceWrite, async (request, response, next) => {
    try {
      if (!request.workspace) {
        throw new ApiError(403, "workspace_access_denied", "Workspace access is required.");
      }

      const datasetId = request.params.datasetId;
      if (typeof datasetId !== "string") {
        throw new ApiError(400, "dataset_invalid_id", "Dataset id is invalid.");
      }

      const payload = parseRequestBody(applyImportProfileSchema, request.body);

      response.status(200).json(
        await datasetService.applyImportProfileToDataset({
          datasetId,
          userId: request.workspace.tenantUserId,
          profileId: payload.profileId,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
