import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import type { McpEvidenceServiceContract } from "../../apps/api/src/mcp/evidence-service.js";
import type {
  OAuthStore,
  StoredAuthorizationCode,
  StoredOAuthGrant,
  StoredRefreshToken,
} from "../../apps/api/src/oauth/oauth-store.js";
import { OAuthService, pkceChallenge } from "../../apps/api/src/oauth/oauth-service.js";

const issuerUrl = "https://auth.staging.example.test";
const resourceUrl = "https://api.staging.example.test/mcp";
const clientId = "https://chatgpt.com/oauth/client.json";
const redirectUri = "https://chatgpt.com/connector_platform_oauth_redirect";
const scope = "tax_lien:read";
const verifier = "correct-horse-battery-staple-verifier-0123456789";
const oauthSigningSecret = "oauth-signing-secret-long-enough-for-test-use";
const mcpHeaders = { Accept: "application/json, text/event-stream", "Content-Type": "application/json" };

class InMemoryUserStore implements UserStore {
  private readonly users = new Map<string, StoredUser>();
  public findByEmailCalls = 0;

  public async createUser(input: CreateUserInput): Promise<StoredUser> {
    const now = new Date();
    const user = { id: new mongoose.Types.ObjectId().toString(), ...input, createdAt: now, updatedAt: now };
    this.users.set(user.id, user);
    return user;
  }

  public async findByEmail(email: string): Promise<StoredUser | null> {
    this.findByEmailCalls += 1;
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  public async findById(id: string): Promise<StoredUser | null> {
    return this.users.get(id) ?? null;
  }

  public remove(id: string): void {
    this.users.delete(id);
  }
}

class InMemoryOAuthStore implements OAuthStore {
  private readonly codes = new Map<string, StoredAuthorizationCode>();
  private readonly grants = new Map<string, StoredOAuthGrant>();
  private readonly refreshTokens = new Map<string, StoredRefreshToken>();
  private readonly revokedAccessTokens = new Set<string>();

  public async createAuthorizationCode(record: StoredAuthorizationCode): Promise<void> {
    this.codes.set(record.codeHash, { ...record });
  }

  public async findAuthorizationCode(codeHash: string): Promise<StoredAuthorizationCode | null> {
    const record = this.codes.get(codeHash);
    return record ? { ...record } : null;
  }

  public async consumeAuthorizationCode(codeHash: string, now: Date): Promise<boolean> {
    const record = this.codes.get(codeHash);
    if (!record || record.consumedAt || record.expiresAt <= now) return false;
    record.consumedAt = now;
    return true;
  }

  public async createGrantWithRefreshToken(
    grant: StoredOAuthGrant,
    refreshToken: StoredRefreshToken,
  ): Promise<void> {
    this.refreshTokens.set(refreshToken.tokenHash, { ...refreshToken });
    this.grants.set(grant.grantId, { ...grant, scopes: [...grant.scopes] });
  }

  public async findGrant(grantId: string): Promise<StoredOAuthGrant | null> {
    const record = this.grants.get(grantId);
    return record ? { ...record, scopes: [...record.scopes] } : null;
  }

  public async findRefreshToken(tokenHash: string): Promise<StoredRefreshToken | null> {
    const record = this.refreshTokens.get(tokenHash);
    return record ? { ...record } : null;
  }

  public async rotateRefreshToken(
    grantId: string,
    currentTokenHash: string,
    successor: StoredRefreshToken,
    now: Date,
  ): Promise<boolean> {
    const grant = this.grants.get(grantId);
    if (
      !grant ||
      grant.revokedAt ||
      grant.refreshExpiresAt <= now ||
      grant.currentRefreshTokenHash !== currentTokenHash
    ) {
      return false;
    }
    const current = this.refreshTokens.get(currentTokenHash);
    if (!current || current.consumedAt || current.revokedAt || current.expiresAt <= now) return false;
    this.refreshTokens.set(successor.tokenHash, { ...successor, scopes: [...successor.scopes] });
    current.consumedAt = now;
    grant.currentRefreshTokenHash = successor.tokenHash;
    return true;
  }

  public async revokeGrant(familyId: string, now: Date): Promise<void> {
    const grant = this.grants.get(familyId);
    if (grant && !grant.revokedAt) grant.revokedAt = now;
    for (const record of this.refreshTokens.values()) {
      if (record.familyId === familyId) record.revokedAt = now;
    }
  }

  public async revokeAccessToken(tokenId: string): Promise<void> {
    this.revokedAccessTokens.add(tokenId);
  }

  public async isAccessTokenRevoked(tokenId: string): Promise<boolean> {
    return this.revokedAccessTokens.has(tokenId);
  }
}

class EvidenceService implements McpEvidenceServiceContract {
  public lastUserId?: string;
  public async listWorkspaces(principal: { userId: string }): Promise<Record<string, unknown>> {
    this.lastUserId = principal.userId;
    return { workspaces: [] };
  }
  public async listDatasets(): Promise<Record<string, unknown>> { return { datasets: [] }; }
  public async listDatasetCandidates(): Promise<Record<string, unknown>> { return { candidates: [] }; }
  public async getCandidateEvidence(): Promise<Record<string, unknown>> { return { candidate: null }; }
  public async compareCandidates(): Promise<Record<string, unknown>> { return { candidates: [] }; }
  public async getDecisionBrief(): Promise<Record<string, unknown>> { return { brief: null }; }
}

describe("ChatGPT OAuth 2.1 boundary", () => {
  it("publishes protected-resource and authorization-server discovery", async () => {
    const { app } = await fixture();
    const resource = await request(app).get("/.well-known/oauth-protected-resource").expect(200);
    expect(resource.body).toMatchObject({ resource: resourceUrl, authorization_servers: [issuerUrl], scopes_supported: [scope] });

    const authorizationServer = await request(app).get("/.well-known/oauth-authorization-server").expect(200);
    expect(authorizationServer.body).toMatchObject({
      issuer: issuerUrl,
      authorization_endpoint: `${issuerUrl}/oauth/authorize`,
      token_endpoint: `${issuerUrl}/oauth/token`,
      code_challenge_methods_supported: ["S256"],
      authorization_response_iss_parameter_supported: true,
    });
  });

  it("rejects unregistered redirects and non-S256 authorization requests", async () => {
    const { app } = await fixture();
    const invalidRedirect = await request(app).get("/oauth/authorize").query({
      ...authorizationParameters(),
      redirect_uri: "https://attacker.example/callback",
    }).expect(400);
    expect(invalidRedirect.body.error).toBe("invalid_request");

    const invalidPkce = await request(app).get("/oauth/authorize").query({
      ...authorizationParameters(),
      code_challenge_method: "plain",
    }).expect(400);
    expect(invalidPkce.body.error).toBe("invalid_request");
  });

  it("exchanges a one-time PKCE code and accepts only the OAuth token at MCP", async () => {
    const context = await fixture();
    const authorization = await authorize(context.app);
    const callback = new URL(authorization.headers.location);
    expect(callback.searchParams.get("state")).toBe("test-state");
    expect(callback.searchParams.get("iss")).toBe(issuerUrl);

    const token = await exchangeCode(context.app, callback.searchParams.get("code") ?? "", verifier).expect(200);
    expect(token.body).toMatchObject({ token_type: "Bearer", expires_in: 900, scope });

    await exchangeCode(context.app, callback.searchParams.get("code") ?? "", verifier).expect(400);
    const appTokenAttempt = await mcpList(context.app, context.applicationToken).expect(401);
    expect(appTokenAttempt.body.error.code).toBe("oauth_invalid_token");
    expect(appTokenAttempt.headers["www-authenticate"]).toContain("oauth-protected-resource");

    await mcpList(context.app, token.body.access_token).expect(200);
    expect(context.evidenceService.lastUserId).toBe(context.userId);
  });

  it("does not consume a code for a wrong verifier, then rejects code replay", async () => {
    const { app } = await fixture();
    const authorization = await authorize(app);
    const code = new URL(authorization.headers.location).searchParams.get("code") ?? "";
    await exchangeCode(app, code, "wrong-verifier-value-that-is-long-enough-0123456789").expect(400);
    await exchangeCode(app, code, verifier).expect(200);
    await exchangeCode(app, code, verifier).expect(400);
  });

  it("rotates refresh tokens and revokes every same-grant token after replay", async () => {
    const { app } = await fixture();
    const initial = await authorizeAndExchange(app);

    const rotated = await refresh(app, initial.body.refresh_token).expect(200);
    await mcpList(app, initial.body.access_token).expect(200);
    await mcpList(app, rotated.body.access_token).expect(200);
    await refresh(app, initial.body.refresh_token).expect(400);
    await refresh(app, rotated.body.refresh_token).expect(400);

    for (const accessToken of [initial.body.access_token, rotated.body.access_token]) {
      const revoked = await mcpList(app, accessToken).expect(401);
      expect(revoked.body.error.code).toBe("oauth_token_revoked");
    }
  });

  it("revokes access and refresh tokens grant-wide while preserving an independent grant", async () => {
    const { app } = await fixture();
    const initial = await authorizeAndExchange(app);
    const rotated = await refresh(app, initial.body.refresh_token).expect(200);
    const independent = await authorizeAndExchange(app);

    await request(app).post("/oauth/revoke").type("form").send({
      token: initial.body.access_token,
      client_id: clientId,
    }).expect(200);

    for (const accessToken of [initial.body.access_token, rotated.body.access_token]) {
      const revoked = await mcpList(app, accessToken).expect(401);
      expect(revoked.body.error.code).toBe("oauth_token_revoked");
    }
    await refresh(app, rotated.body.refresh_token).expect(400);
    await mcpList(app, independent.body.access_token).expect(200);
    await refresh(app, independent.body.refresh_token).expect(200);
  });

  it("revoking a refresh token invalidates its access token", async () => {
    const { app } = await fixture();
    const issued = await authorizeAndExchange(app);
    await request(app).post("/oauth/revoke").type("form").send({
      token: issued.body.refresh_token,
      client_id: clientId,
    }).expect(200);

    const revoked = await mcpList(app, issued.body.access_token).expect(401);
    expect(revoked.body.error.code).toBe("oauth_token_revoked");
    await refresh(app, issued.body.refresh_token).expect(400);
  });

  it("fails a concurrent refresh replay closed without leaving a usable successor", async () => {
    const { app } = await fixture();
    const issued = await authorizeAndExchange(app);
    const attempts = await Promise.all([
      refresh(app, issued.body.refresh_token),
      refresh(app, issued.body.refresh_token),
    ]);
    expect(attempts.filter((attempt) => attempt.status === 200)).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === 400)).toHaveLength(1);

    const originalAccess = await mcpList(app, issued.body.access_token).expect(401);
    expect(originalAccess.body.error.code).toBe("oauth_token_revoked");
    for (const attempt of attempts.filter((candidate) => candidate.status === 200)) {
      const access = await mcpList(app, attempt.body.access_token).expect(401);
      expect(access.body.error.code).toBe("oauth_token_revoked");
      await refresh(app, attempt.body.refresh_token).expect(400);
    }
  });

  it("uses one absolute refresh-family expiry across rotations", async () => {
    const clock = { now: new Date() };
    const { app } = await fixture(clock);
    const issued = await authorizeAndExchange(app);
    clock.now = new Date(clock.now.getTime() + 6 * 24 * 60 * 60 * 1000);
    const rotated = await refresh(app, issued.body.refresh_token).expect(200);
    clock.now = new Date(clock.now.getTime() + 2 * 24 * 60 * 60 * 1000);
    await refresh(app, rotated.body.refresh_token).expect(400);
  });

  it("renders consent without leaking credentials after failed sign-in", async () => {
    const { app } = await fixture();
    const response = await request(app).post("/oauth/authorize").type("form").send({
      ...authorizationParameters(),
      decision: "allow",
      email: "oauth-user@example.com",
      password: "not-the-password",
    }).expect(401);
    expect(response.text).toContain("Email or password is incorrect.");
    expect(response.text).not.toContain("not-the-password");
  });

  it.each([
    ["missing", undefined],
    ["blank", ""],
    ["unknown", "approve"],
    ["case variant", "ALLOW"],
    ["duplicate", ["allow", "deny"]],
  ])("rejects %s consent without authenticating or issuing a code", async (_label, decision) => {
    const { app, userStore } = await fixture();
    const callsBeforeRequest = userStore.findByEmailCalls;
    const body: Record<string, unknown> = {
      ...authorizationParameters(),
      email: "oauth-user@example.com",
      password: "StrongPassword123!",
    };
    if (decision !== undefined) body.decision = decision;

    const response = await request(app).post("/oauth/authorize").type("form").send(body).expect(400);
    expect(response.body.error).toBe("invalid_request");
    expect(response.headers.location).toBeUndefined();
    expect(response.text).not.toContain("code=");
    expect(userStore.findByEmailCalls).toBe(callsBeforeRequest);
  });

  it("returns a state-bound access_denied callback when the user cancels", async () => {
    const { app } = await fixture();
    const response = await request(app).post("/oauth/authorize").type("form").send({
      ...authorizationParameters(),
      decision: "deny",
    }).expect(303);
    const callback = new URL(response.headers.location);
    expect(callback.searchParams.get("error")).toBe("access_denied");
    expect(callback.searchParams.get("state")).toBe("test-state");
    expect(callback.searchParams.get("iss")).toBe(issuerUrl);
  });

  it("rejects expired grants, expired access tokens, and removed users", async () => {
    const clock = { now: new Date() };
    const context = await fixture(clock);
    const firstAuthorization = await authorize(context.app);
    const expiredCode = new URL(firstAuthorization.headers.location).searchParams.get("code") ?? "";
    clock.now = new Date(clock.now.getTime() + 301_000);
    await exchangeCode(context.app, expiredCode, verifier).expect(400);

    const secondAuthorization = await authorize(context.app);
    const code = new URL(secondAuthorization.headers.location).searchParams.get("code") ?? "";
    const issued = await exchangeCode(context.app, code, verifier).expect(200);
    clock.now = new Date(clock.now.getTime() + 604_801_000);
    await refresh(context.app, issued.body.refresh_token).expect(400);

    const expiredAccessToken = jwt.sign(
      {
        sub: context.userId,
        email: "oauth-user@example.com",
        type: "mcp_access",
        client_id: clientId,
        scope,
        jti: randomUUID(),
      },
      oauthSigningSecret,
      { algorithm: "HS256", issuer: issuerUrl, audience: resourceUrl, expiresIn: -1 },
    );
    const expired = await mcpList(context.app, expiredAccessToken).expect(401);
    expect(expired.body.error.code).toBe("oauth_token_expired");

    const thirdAuthorization = await authorize(context.app);
    const thirdCode = new URL(thirdAuthorization.headers.location).searchParams.get("code") ?? "";
    const active = await exchangeCode(context.app, thirdCode, verifier).expect(200);
    context.userStore.remove(context.userId);
    const removed = await mcpList(context.app, active.body.access_token).expect(401);
    expect(removed.body.error.code).toBe("auth_user_not_found");
  });
});

async function fixture(clock = { now: new Date() }) {
  const userStore = new InMemoryUserStore();
  const authService = new AuthService(userStore, {
    jwtSecret: "application-jwt-secret-long-enough-for-tests",
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });
  const oauthService = new OAuthService(new InMemoryOAuthStore(), authService, {
    issuerUrl,
    resourceUrl,
    allowedClientIds: [clientId],
    allowedRedirectUris: [redirectUri],
    scope,
    signingSecret: oauthSigningSecret,
    authorizationCodeTtlSeconds: 300,
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
  }, () => clock.now);
  const evidenceService = new EvidenceService();
  const app = createApp({ authService, oauthService, mcpEvidenceService: evidenceService });
  const registration = await request(app).post("/auth/register").send({
    email: "OAUTH-USER@EXAMPLE.COM",
    password: "StrongPassword123!",
  }).expect(201);
  return {
    app,
    evidenceService,
    userStore,
    userId: registration.body.user.id as string,
    applicationToken: registration.body.token as string,
  };
}

function authorizationParameters() {
  return {
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: "S256",
    resource: resourceUrl,
    scope,
    state: "test-state",
  };
}

function authorize(app: ReturnType<typeof createApp>) {
  return request(app).post("/oauth/authorize").type("form").send({
    ...authorizationParameters(),
    decision: "allow",
    email: "oauth-user@example.com",
    password: "StrongPassword123!",
  }).expect(303);
}

async function authorizeAndExchange(app: ReturnType<typeof createApp>) {
  const authorization = await authorize(app);
  const code = new URL(authorization.headers.location).searchParams.get("code") ?? "";
  return exchangeCode(app, code, verifier).expect(200);
}

function exchangeCode(app: ReturnType<typeof createApp>, code: string, codeVerifier: string) {
  return request(app).post("/oauth/token").type("form").send({
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    client_id: clientId,
    redirect_uri: redirectUri,
    resource: resourceUrl,
  });
}

function refresh(app: ReturnType<typeof createApp>, refreshToken: string) {
  return request(app).post("/oauth/token").type("form").send({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    resource: resourceUrl,
  });
}

function mcpList(app: ReturnType<typeof createApp>, token: string) {
  return request(app).post("/mcp").set(mcpHeaders).set("Authorization", `Bearer ${token}`).send({
    jsonrpc: "2.0",
    id: randomUUID(),
    method: "tools/call",
    params: { name: "list_workspaces", arguments: {} },
  });
}
