import type { RequestHandler } from "express";
import type { OAuthService } from "../oauth/oauth-service.js";
import { ApiError } from "../errors/api-error.js";

export function requireMcpOAuth(oauthService: OAuthService): RequestHandler {
  return async (request, response, next) => {
    const metadataUrl = `${oauthService.config.issuerUrl}/.well-known/oauth-protected-resource`;
    response.setHeader(
      "WWW-Authenticate",
      `Bearer resource_metadata="${metadataUrl}", scope="${oauthService.config.scope}"`,
    );
    try {
      const authorizationHeader = request.header("authorization");
      if (!authorizationHeader) {
        throw new ApiError(401, "oauth_missing_token", "OAuth access token is required.");
      }
      const [scheme, token, extra] = authorizationHeader.split(" ");
      if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
        throw new ApiError(401, "oauth_invalid_header", "Authorization header must use Bearer token format.");
      }
      request.auth = await oauthService.verifyAccessToken(token);
      response.removeHeader("WWW-Authenticate");
      next();
    } catch (error) {
      next(error);
    }
  };
}
