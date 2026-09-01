import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { AuthenticatedPrincipal } from "@tax-lien/types";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { OAuthError } from "./oauth-error.js";
import type { OAuthStore, StoredOAuthGrant, StoredRefreshToken } from "./oauth-store.js";

export interface OAuthServiceConfig {
  issuerUrl: string;
  resourceUrl: string;
  allowedClientIds: string[];
  allowedRedirectUris: string[];
  scope: string;
  signingSecret: string;
  authorizationCodeTtlSeconds: number;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
}

export interface AuthorizationRequest {
  responseType: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string;
  scope: string;
  state: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface McpAccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  type: "mcp_access";
  client_id: string;
  grant_id: string;
  scope: string;
  jti: string;
  iat: number;
  exp: number;
}

export class OAuthService {
  public constructor(
    private readonly store: OAuthStore,
    private readonly authService: AuthService,
    public readonly config: OAuthServiceConfig,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public protectedResourceMetadata(): Record<string, unknown> {
    return {
      resource: this.config.resourceUrl,
      authorization_servers: [this.config.issuerUrl],
      scopes_supported: [this.config.scope],
      bearer_methods_supported: ["header"],
      resource_name: "Tax Lien Intelligence",
    };
  }

  public authorizationServerMetadata(): Record<string, unknown> {
    return {
      issuer: this.config.issuerUrl,
      authorization_endpoint: `${this.config.issuerUrl}/oauth/authorize`,
      token_endpoint: `${this.config.issuerUrl}/oauth/token`,
      revocation_endpoint: `${this.config.issuerUrl}/oauth/revoke`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: [this.config.scope],
      authorization_response_iss_parameter_supported: true,
    };
  }

  public validatePublicClient(clientId: string): void {
    this.requireClient(clientId);
  }

  public validateAuthorizationRequest(input: AuthorizationRequest): AuthorizationRequest {
    if (input.responseType !== "code") {
      throw new OAuthError("invalid_request", "response_type must be code.");
    }
    this.requireClient(input.clientId);
    this.requireRedirectUri(input.redirectUri);
    if (input.codeChallengeMethod !== "S256" || !/^[A-Za-z0-9_-]{43,128}$/.test(input.codeChallenge)) {
      throw new OAuthError("invalid_request", "A valid S256 PKCE challenge is required.");
    }
    this.requireResource(input.resource);
    this.requireScope(input.scope);
    if (!input.state || input.state.length > 512) {
      throw new OAuthError("invalid_request", "A bounded OAuth state value is required.");
    }
    return input;
  }

  public async authorize(
    input: AuthorizationRequest,
    credentials: { email: string; password: string },
  ): Promise<string> {
    const request = this.validateAuthorizationRequest(input);
    const user = await this.authService.authenticateUser(credentials);
    const rawCode = randomToken();
    const now = this.now();
    await this.store.createAuthorizationCode({
      codeHash: tokenHash(rawCode),
      userId: user.id,
      email: user.email,
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      codeChallenge: request.codeChallenge,
      resource: request.resource,
      scopes: [this.config.scope],
      expiresAt: addSeconds(now, this.config.authorizationCodeTtlSeconds),
    });

    const redirect = new URL(request.redirectUri);
    redirect.searchParams.set("code", rawCode);
    redirect.searchParams.set("state", request.state);
    redirect.searchParams.set("iss", this.config.issuerUrl);
    return redirect.toString();
  }

  public async exchangeAuthorizationCode(input: {
    code: string;
    codeVerifier: string;
    clientId: string;
    redirectUri: string;
    resource: string;
  }): Promise<TokenResponse> {
    this.requireClient(input.clientId);
    this.requireRedirectUri(input.redirectUri);
    this.requireResource(input.resource);
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(input.codeVerifier)) {
      throw new OAuthError("invalid_grant", "Authorization code or PKCE verifier is invalid.");
    }

    const codeHash = tokenHash(input.code);
    const record = await this.store.findAuthorizationCode(codeHash);
    const now = this.now();
    if (
      !record ||
      record.consumedAt ||
      record.expiresAt <= now ||
      record.clientId !== input.clientId ||
      record.redirectUri !== input.redirectUri ||
      record.resource !== input.resource ||
      !secureEqual(record.codeChallenge, pkceChallenge(input.codeVerifier))
    ) {
      throw new OAuthError("invalid_grant", "Authorization code or PKCE verifier is invalid.");
    }

    if (!(await this.store.consumeAuthorizationCode(codeHash, now))) {
      throw new OAuthError("invalid_grant", "Authorization code has already been used.");
    }
    await this.requireCurrentUser(record.userId);
    return this.issueInitialTokenPair(
      {
        userId: record.userId,
        email: record.email,
        clientId: record.clientId,
        resource: record.resource,
        scopes: record.scopes,
      },
      now,
    );
  }

  public async exchangeRefreshToken(input: {
    refreshToken: string;
    clientId: string;
    resource: string;
    scope?: string;
  }): Promise<TokenResponse> {
    this.requireClient(input.clientId);
    this.requireResource(input.resource);
    if (input.scope !== undefined) {
      this.requireScope(input.scope);
    }

    const hash = tokenHash(input.refreshToken);
    const record = await this.store.findRefreshToken(hash);
    const now = this.now();
    if (!record) {
      throw new OAuthError("invalid_grant", "Refresh token is invalid.");
    }
    const grant = await this.store.findGrant(record.familyId);
    if (
      !grant ||
      record.consumedAt ||
      record.revokedAt ||
      record.expiresAt <= now ||
      record.clientId !== input.clientId ||
      record.resource !== input.resource ||
      !refreshGrantMatches(grant, record) ||
      grant.revokedAt ||
      grant.refreshExpiresAt <= now ||
      grant.currentRefreshTokenHash !== hash
    ) {
      await this.store.revokeGrant(record.familyId, now);
      throw new OAuthError("invalid_grant", "Refresh token is invalid or has been replayed.");
    }

    try {
      await this.requireCurrentUser(record.userId);
    } catch (error) {
      if (error instanceof OAuthError && error.code === "invalid_grant") {
        await this.store.revokeGrant(record.familyId, now);
      }
      throw error;
    }

    return this.rotateTokenPair(record, grant, hash, now);
  }

  public async verifyAccessToken(token: string): Promise<AuthenticatedPrincipal> {
    try {
      const decoded = jwt.verify(token, this.config.signingSecret, {
        algorithms: ["HS256"],
        issuer: this.config.issuerUrl,
        audience: this.config.resourceUrl,
      });
      if (!isMcpAccessTokenPayload(decoded) || decoded.scope !== this.config.scope) {
        throw new ApiError(401, "oauth_invalid_token", "OAuth access token is invalid.");
      }
      if (!this.config.allowedClientIds.includes(decoded.client_id)) {
        throw new ApiError(401, "oauth_invalid_token", "OAuth access token is invalid.");
      }
      if (await this.store.isAccessTokenRevoked(decoded.jti)) {
        throw new ApiError(401, "oauth_token_revoked", "OAuth access token has been revoked.");
      }
      const grant = await this.store.findGrant(decoded.grant_id);
      if (grant?.revokedAt) {
        throw new ApiError(401, "oauth_token_revoked", "OAuth access token has been revoked.");
      }
      if (!grant || !accessGrantMatches(grant, decoded, this.config.resourceUrl) || grant.purgeAt <= this.now()) {
        throw new ApiError(401, "oauth_invalid_token", "OAuth access token is invalid.");
      }
      const user = await this.authService.getCurrentUser(decoded.sub);
      return { userId: user.id, email: user.email };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, "oauth_token_expired", "OAuth access token has expired.");
      }
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(401, "oauth_invalid_token", "OAuth access token is invalid.");
    }
  }

  public async revoke(token: string, clientId: string): Promise<void> {
    const refresh = await this.store.findRefreshToken(tokenHash(token));
    if (refresh) {
      if (refresh.clientId === clientId) {
        await this.store.revokeGrant(refresh.familyId, this.now());
      }
      return;
    }

    let decoded: string | JwtPayload;
    try {
      decoded = jwt.verify(token, this.config.signingSecret, {
        algorithms: ["HS256"],
        issuer: this.config.issuerUrl,
        audience: this.config.resourceUrl,
        ignoreExpiration: true,
      });
    } catch {
      // RFC 7009 revocation is intentionally idempotent and does not reveal token validity.
      return;
    }
    if (isMcpAccessTokenPayload(decoded) && decoded.client_id === clientId) {
      await this.store.revokeGrant(decoded.grant_id, this.now());
    }
  }

  private async requireCurrentUser(userId: string): Promise<void> {
    try {
      await this.authService.getCurrentUser(userId);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        throw new OAuthError("invalid_grant", "The resource owner is no longer available.");
      }
      throw error;
    }
  }

  private async issueInitialTokenPair(
    principal: Pick<StoredRefreshToken, "userId" | "email" | "clientId" | "resource" | "scopes">,
    now: Date,
  ): Promise<TokenResponse> {
    const grantId = randomUUID();
    const refreshToken = randomToken();
    const refreshTokenHash = tokenHash(refreshToken);
    const refreshExpiresAt = addSeconds(now, this.config.refreshTokenTtlSeconds);
    const grant: StoredOAuthGrant = {
      grantId,
      userId: principal.userId,
      email: principal.email,
      clientId: principal.clientId,
      resource: principal.resource,
      scopes: [...principal.scopes],
      currentRefreshTokenHash: refreshTokenHash,
      refreshExpiresAt,
      purgeAt: addSeconds(refreshExpiresAt, this.config.accessTokenTtlSeconds),
    };
    const refreshRecord: StoredRefreshToken = {
      tokenHash: refreshTokenHash,
      familyId: grantId,
      userId: principal.userId,
      email: principal.email,
      clientId: principal.clientId,
      resource: principal.resource,
      scopes: [...principal.scopes],
      expiresAt: refreshExpiresAt,
    };
    await this.store.createGrantWithRefreshToken(grant, refreshRecord);
    return this.tokenResponse(principal, grantId, refreshToken, now);
  }

  private async rotateTokenPair(
    record: StoredRefreshToken,
    grant: StoredOAuthGrant,
    currentTokenHash: string,
    now: Date,
  ): Promise<TokenResponse> {
    const refreshToken = randomToken();
    const successor: StoredRefreshToken = {
      tokenHash: tokenHash(refreshToken),
      familyId: grant.grantId,
      userId: record.userId,
      email: record.email,
      clientId: record.clientId,
      resource: record.resource,
      scopes: [...record.scopes],
      expiresAt: grant.refreshExpiresAt,
    };
    if (!(await this.store.rotateRefreshToken(grant.grantId, currentTokenHash, successor, now))) {
      await this.store.revokeGrant(grant.grantId, now);
      throw new OAuthError("invalid_grant", "Refresh token is invalid or has been replayed.");
    }

    const activeGrant = await this.store.findGrant(grant.grantId);
    if (
      !activeGrant ||
      activeGrant.revokedAt ||
      activeGrant.currentRefreshTokenHash !== successor.tokenHash ||
      !refreshGrantMatches(activeGrant, successor)
    ) {
      throw new OAuthError("invalid_grant", "Refresh token is invalid or has been replayed.");
    }
    return this.tokenResponse(record, grant.grantId, refreshToken, now);
  }

  private tokenResponse(
    principal: Pick<StoredRefreshToken, "userId" | "email" | "clientId" | "resource" | "scopes">,
    grantId: string,
    refreshToken: string,
    now: Date,
  ): TokenResponse {
    const accessToken = jwt.sign(
      {
        sub: principal.userId,
        email: principal.email,
        type: "mcp_access",
        client_id: principal.clientId,
        grant_id: grantId,
        scope: principal.scopes.join(" "),
        jti: randomUUID(),
        iat: Math.floor(now.getTime() / 1000),
      },
      this.config.signingSecret,
      {
        algorithm: "HS256",
        issuer: this.config.issuerUrl,
        audience: principal.resource,
        expiresIn: this.config.accessTokenTtlSeconds,
      },
    );
    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: this.config.accessTokenTtlSeconds,
      refresh_token: refreshToken,
      scope: principal.scopes.join(" "),
    };
  }

  private requireClient(clientId: string): void {
    if (!this.config.allowedClientIds.includes(clientId)) {
      throw new OAuthError("unauthorized_client", "OAuth client is not allowed.", 401);
    }
  }

  private requireRedirectUri(redirectUri: string): void {
    if (!this.config.allowedRedirectUris.includes(redirectUri)) {
      throw new OAuthError("invalid_request", "OAuth redirect_uri is not allowed.");
    }
  }

  private requireResource(resource: string): void {
    if (resource !== this.config.resourceUrl) {
      throw new OAuthError("invalid_request", "OAuth resource does not match this MCP server.");
    }
  }

  private requireScope(scope: string): void {
    const scopes = scope.split(/\s+/).filter(Boolean);
    if (scopes.length !== 1 || scopes[0] !== this.config.scope) {
      throw new OAuthError("invalid_scope", "Requested OAuth scope is not supported.");
    }
  }
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function refreshGrantMatches(grant: StoredOAuthGrant, token: StoredRefreshToken): boolean {
  return (
    grant.grantId === token.familyId &&
    grant.userId === token.userId &&
    grant.email === token.email &&
    grant.clientId === token.clientId &&
    grant.resource === token.resource &&
    grant.refreshExpiresAt.getTime() === token.expiresAt.getTime() &&
    sameScopes(grant.scopes, token.scopes)
  );
}

function accessGrantMatches(
  grant: StoredOAuthGrant,
  token: McpAccessTokenPayload,
  resourceUrl: string,
): boolean {
  return (
    grant.grantId === token.grant_id &&
    grant.userId === token.sub &&
    grant.email === token.email &&
    grant.clientId === token.client_id &&
    grant.resource === resourceUrl &&
    grant.scopes.join(" ") === token.scope
  );
}

function sameScopes(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((scope, index) => scope === right[index]);
}

function isMcpAccessTokenPayload(decoded: string | JwtPayload): decoded is McpAccessTokenPayload {
  return (
    typeof decoded !== "string" &&
    typeof decoded.sub === "string" &&
    typeof decoded.email === "string" &&
    decoded.type === "mcp_access" &&
    typeof decoded.client_id === "string" &&
    typeof decoded.grant_id === "string" &&
    typeof decoded.scope === "string" &&
    typeof decoded.jti === "string" &&
    typeof decoded.iat === "number" &&
    typeof decoded.exp === "number"
  );
}
