import { apiConfig } from "../config/env.js";
import type { AuthService } from "../auth/auth-service.js";
import { MongoOAuthStore } from "./oauth-store.js";
import { OAuthService } from "./oauth-service.js";

export function createOAuthService(authService: AuthService): OAuthService | null {
  const config = apiConfig.mcp.oauth;
  if (!config.enabled) {
    return null;
  }
  return new OAuthService(new MongoOAuthStore(), authService, {
    issuerUrl: config.issuerUrl,
    resourceUrl: config.resourceUrl,
    allowedClientIds: config.allowedClientIds,
    allowedRedirectUris: config.allowedRedirectUris,
    scope: config.scope,
    signingSecret: config.signingSecret,
    authorizationCodeTtlSeconds: config.authorizationCodeTtlSeconds,
    accessTokenTtlSeconds: config.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: config.refreshTokenTtlSeconds,
  });
}
