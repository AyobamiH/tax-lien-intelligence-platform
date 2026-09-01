import express from "express";
import helmet from "helmet";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createOAuthRouter } from "../../apps/api/src/oauth/router.js";
import type { AuthorizationRequest, OAuthService } from "../../apps/api/src/oauth/oauth-service.js";

const issuerUrl = "https://tax-lien-chatgpt-staging.example.test";

function createConsentTestApp() {
  const oauthService = {
    config: { issuerUrl },
    validateAuthorizationRequest(input: AuthorizationRequest) {
      return input;
    },
    protectedResourceMetadata() {
      return {};
    },
    authorizationServerMetadata() {
      return {};
    },
  } as unknown as OAuthService;

  const app = express();
  app.use(helmet());
  app.use(createOAuthRouter(oauthService, { windowMs: 60_000, maxRequests: 30 }));
  return app;
}

describe("OAuth consent CSP", () => {
  it("overrides Helmet's self-only form policy with the exact OAuth issuer origin", async () => {
    const response = await request(createConsentTestApp())
      .get("/oauth/authorize")
      .query({
        response_type: "code",
        client_id: "https://chatgpt.com/oauth/client.json",
        redirect_uri: "https://chatgpt.com/connector_platform_oauth_redirect",
        code_challenge: "a".repeat(43),
        code_challenge_method: "S256",
        resource: `${issuerUrl}/mcp`,
        scope: "tax_lien:read",
        state: "test-state",
      })
      .expect(200);

    expect(response.headers["content-security-policy"]).toBe(
      `default-src 'none'; base-uri 'none'; form-action 'self' ${issuerUrl}; frame-ancestors 'none'`,
    );
    expect(response.text).toContain('<form method="post" action="/oauth/authorize">');
    expect(response.headers["content-security-policy"]).not.toContain("form-action *");
  });
});
