import express, { Router, type Request, type Response } from "express";
import { ApiError } from "../errors/api-error.js";
import { loginSchema } from "../auth/validation.js";
import { createFixedWindowRateLimit, type FixedWindowRateLimitOptions } from "../middleware/rate-limit.js";
import { OAuthError } from "./oauth-error.js";
import type { AuthorizationRequest, OAuthService } from "./oauth-service.js";

export function createOAuthRouter(
  oauthService: OAuthService,
  rateLimit: Omit<FixedWindowRateLimitOptions, "key">,
): Router {
  const router = Router();
  const limit = createFixedWindowRateLimit({
    ...rateLimit,
    key: (request) => `oauth:${request.ip ?? request.socket.remoteAddress ?? "unknown"}:${request.path}`,
  });

  router.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Pragma", "no-cache");
    next();
  });
  router.get("/.well-known/oauth-protected-resource", (_request, response) => {
    response.json(oauthService.protectedResourceMetadata());
  });
  router.get("/.well-known/oauth-protected-resource/mcp", (_request, response) => {
    response.json(oauthService.protectedResourceMetadata());
  });
  router.get("/.well-known/oauth-authorization-server", (_request, response) => {
    response.json(oauthService.authorizationServerMetadata());
  });

  router.get("/oauth/authorize", limit, (request, response) => {
    try {
      const authorizationRequest = oauthService.validateAuthorizationRequest(readAuthorizationRequest(request));
      response.type("html").send(renderConsentPage(authorizationRequest));
    } catch (error) {
      sendOAuthError(response, error);
    }
  });

  router.post("/oauth/authorize", limit, express.urlencoded({ extended: false, limit: "16kb" }), async (request, response) => {
    let authorizationRequest: AuthorizationRequest | undefined;
    try {
      authorizationRequest = oauthService.validateAuthorizationRequest(readAuthorizationRequest(request));
      if (stringValue(request.body?.decision) === "deny") {
        response.redirect(
          303,
          authorizationErrorRedirect(authorizationRequest, "access_denied", oauthService.config.issuerUrl),
        );
        return;
      }
      const credentials = loginSchema.safeParse({
        email: stringValue(request.body?.email),
        password: stringValue(request.body?.password),
      });
      if (!credentials.success) {
        throw new ApiError(401, "auth_invalid_credentials", "Email and password are required.");
      }
      const redirect = await oauthService.authorize(authorizationRequest, credentials.data);
      response.redirect(303, redirect);
    } catch (error) {
      if (authorizationRequest && error instanceof ApiError && error.statusCode === 401) {
        response.status(401).type("html").send(renderConsentPage(authorizationRequest, "Email or password is incorrect."));
        return;
      }
      sendOAuthError(response, error);
    }
  });

  router.post("/oauth/token", limit, express.urlencoded({ extended: false, limit: "16kb" }), async (request, response) => {
    try {
      rejectClientSecret(request);
      const grantType = stringValue(request.body?.grant_type);
      let tokenResponse;
      if (grantType === "authorization_code") {
        tokenResponse = await oauthService.exchangeAuthorizationCode({
          code: requiredBodyValue(request, "code"),
          codeVerifier: requiredBodyValue(request, "code_verifier"),
          clientId: requiredBodyValue(request, "client_id"),
          redirectUri: requiredBodyValue(request, "redirect_uri"),
          resource: requiredBodyValue(request, "resource"),
        });
      } else if (grantType === "refresh_token") {
        const scope = stringValue(request.body?.scope);
        tokenResponse = await oauthService.exchangeRefreshToken({
          refreshToken: requiredBodyValue(request, "refresh_token"),
          clientId: requiredBodyValue(request, "client_id"),
          resource: requiredBodyValue(request, "resource"),
          ...(scope ? { scope } : {}),
        });
      } else {
        throw new OAuthError("unsupported_grant_type", "grant_type is not supported.");
      }
      response.json(tokenResponse);
    } catch (error) {
      sendOAuthError(response, error);
    }
  });

  router.post("/oauth/revoke", limit, express.urlencoded({ extended: false, limit: "16kb" }), async (request, response) => {
    try {
      rejectClientSecret(request);
      oauthService.validatePublicClient(requiredBodyValue(request, "client_id"));
      await oauthService.revoke(requiredBodyValue(request, "token"));
      response.status(200).send();
    } catch (error) {
      sendOAuthError(response, error);
    }
  });

  return router;
}

function readAuthorizationRequest(request: Request): AuthorizationRequest {
  const source = request.method === "GET" ? request.query : request.body;
  return {
    responseType: stringValue(source?.response_type),
    clientId: stringValue(source?.client_id),
    redirectUri: stringValue(source?.redirect_uri),
    codeChallenge: stringValue(source?.code_challenge),
    codeChallengeMethod: stringValue(source?.code_challenge_method),
    resource: stringValue(source?.resource),
    scope: stringValue(source?.scope),
    state: stringValue(source?.state),
  };
}

function requiredBodyValue(request: Request, key: string): string {
  const value = stringValue(request.body?.[key]);
  if (!value) {
    throw new OAuthError("invalid_request", `${key} is required.`);
  }
  return value;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function rejectClientSecret(request: Request): void {
  if (request.header("authorization") || stringValue(request.body?.client_secret)) {
    throw new OAuthError("invalid_client", "This OAuth public client must not use a client secret.", 401);
  }
}

function sendOAuthError(response: Response, error: unknown): void {
  if (error instanceof OAuthError) {
    if (error.code === "invalid_client") {
      response.setHeader("WWW-Authenticate", "Basic realm=\"oauth-token\"");
    }
    response.status(error.statusCode).json({ error: error.code, error_description: error.message });
    return;
  }
  response.status(500).json({ error: "server_error", error_description: "OAuth request could not be completed." });
}

function renderConsentPage(request: AuthorizationRequest, errorMessage?: string): string {
  const hidden = Object.entries({
    response_type: request.responseType,
    client_id: request.clientId,
    redirect_uri: request.redirectUri,
    code_challenge: request.codeChallenge,
    code_challenge_method: request.codeChallengeMethod,
    resource: request.resource,
    scope: request.scope,
    state: request.state,
  })
    .map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`)
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect Tax Lien Intelligence</title></head>
<body><main><h1>Connect Tax Lien Intelligence</h1>
<p>Sign in to allow ChatGPT read-only access to evidence in workspaces you are already authorized to use.</p>
<p>This connection cannot upload data, change scores, approve decisions, place bids, or provide legal advice.</p>
${errorMessage ? `<p role="alert">${escapeHtml(errorMessage)}</p>` : ""}
<form method="post" action="/oauth/authorize">${hidden}
<label>Email <input name="email" type="email" autocomplete="username" required maxlength="320"></label><br>
<label>Password <input name="password" type="password" autocomplete="current-password" required maxlength="256"></label><br>
<button type="submit" name="decision" value="allow">Sign in and allow read-only access</button>
<button type="submit" name="decision" value="deny" formnovalidate>Cancel</button>
</form></main></body></html>`;
}

function authorizationErrorRedirect(request: AuthorizationRequest, error: string, issuer: string): string {
  const redirect = new URL(request.redirectUri);
  redirect.searchParams.set("error", error);
  redirect.searchParams.set("state", request.state);
  redirect.searchParams.set("iss", issuer);
  return redirect.toString();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}
