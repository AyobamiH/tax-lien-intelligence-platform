import type { RequestHandler } from "express";
import type { AuthenticatedPrincipal } from "@tax-lien/types";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedPrincipal;
    }
  }
}

export function requireAuth(authService: AuthService): RequestHandler {
  return (request, _response, next) => {
    try {
      const authorizationHeader = request.header("authorization");
      if (!authorizationHeader) {
        throw new ApiError(401, "auth_missing_token", "Authentication token is required.");
      }

      const [scheme, token, extra] = authorizationHeader.split(" ");
      if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
        throw new ApiError(401, "auth_invalid_header", "Authorization header must use Bearer token format.");
      }

      request.auth = authService.verifyToken(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}
