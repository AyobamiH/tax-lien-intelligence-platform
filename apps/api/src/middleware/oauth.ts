import type { RequestHandler } from "express";
import type { OAuthService } from "../oauth/oauth-service.js";
import { ApiError } from "../errors/api-error.js";

export function mcpOAuthChallenge(
  oauthService: OAuthService,
  options: { includeError?: boolean } = {},
): string {
  const metadataUrl = `${oauthService.config.issuerUrl}/.well-known/oauth-protected-resource`;
  const parameters = [
    `resource_metadata="${metadataUrl}"`,
    `scope="${oauthService.config.scope}"`,
  ];
  if (options.includeError) {
    parameters.push(
      'error="insufficient_scope"',
      'error_description="OAuth sign-in is required for this tool."',
    );
  }
  return `Bearer ${parameters.join(", ")}`;
}

/**
 * Resolve an OAuth principal when a bearer token is present while leaving MCP
 * initialization, tool discovery, and tool-level authentication challenges
 * available to unauthenticated clients. Invalid supplied credentials still
 * fail at the HTTP boundary.
 */
export function resolveMcpOAuth(oauthService: OAuthService): RequestHandler {
  return async (request, response, next) => {
    response.setHeader("WWW-Authenticate", mcpOAuthChallenge(oauthService));
    const authorizationHeader = request.header("authorization");
    if (!authorizationHeader) {
      next();
      return;
    }

    try {
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
