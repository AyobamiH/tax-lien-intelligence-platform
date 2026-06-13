import type { RequestHandler } from "express";
import { ApiError } from "../errors/api-error.js";
import type { WorkspaceAccessContext, WorkspaceService } from "../workspaces/workspace-service.js";

export type WorkspacePermission =
  | "read"
  | "write"
  | "manage_members"
  | "remove_members"
  | "manage_roles"
  | "review_approvals"
  | "execute_sensitive_actions";

declare global {
  namespace Express {
    interface Request {
      workspace?: WorkspaceAccessContext;
    }
  }
}

export function requireWorkspaceAccess(
  workspaceService: WorkspaceService,
  permission: WorkspacePermission,
): RequestHandler {
  return async (request, _response, next) => {
    try {
      if (!request.auth) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const requestedWorkspaceId = request.header("x-workspace-id");
      const context = await workspaceService.resolveContext(
        request.auth.userId,
        requestedWorkspaceId || undefined,
      );

      assertPermission(context, permission);
      request.workspace = context;
      next();
    } catch (error) {
      next(error);
    }
  };
}

function assertPermission(context: WorkspaceAccessContext, permission: WorkspacePermission): void {
  if (permission === "read") {
    return;
  }

  if (permission === "write" && (context.role === "owner" || context.role === "admin")) {
    return;
  }

  if (permission === "manage_members" && (context.role === "owner" || context.role === "admin")) {
    return;
  }

  if (permission === "remove_members" && (context.role === "owner" || context.role === "admin")) {
    return;
  }

  if (permission === "manage_roles" && context.role === "owner") {
    return;
  }

  if (permission === "review_approvals" && (context.role === "owner" || context.role === "admin")) {
    return;
  }

  if (permission === "execute_sensitive_actions" && context.role === "owner") {
    return;
  }

  throw new ApiError(403, "workspace_role_forbidden", "Your workspace role cannot perform this action.");
}
