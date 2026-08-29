# ChatGPT OAuth API

## Boundary

OAuth is disabled by default. When `MCP_OAUTH_ENABLED=true`, `/mcp` accepts
only a scoped OAuth access token; the application's login JWT is rejected at
that boundary. The existing web/API authentication routes continue to use the
application JWT.

The implementation is an OAuth 2.1 public-client flow for the ChatGPT MCP
connection. It requires authorization code plus PKCE S256, exact client and
redirect URI allowlists, an exact resource indicator, and the single
`tax_lien:read` scope.

## Endpoints

| Method and path | Purpose |
| --- | --- |
| `GET /.well-known/oauth-protected-resource` | Advertise the MCP resource, authorization server, and scope |
| `GET /.well-known/oauth-protected-resource/mcp` | Path-specific protected-resource discovery |
| `GET /.well-known/oauth-authorization-server` | Advertise authorization, token, revocation, PKCE, and grant metadata |
| `GET /oauth/authorize` | Validate the request and render sign-in plus explicit read-only consent |
| `POST /oauth/authorize` | Allow or deny consent; successful responses echo `state` and `iss` |
| `POST /oauth/token` | Exchange one-time codes or rotate refresh tokens |
| `POST /oauth/revoke` | Revoke a refresh family or denylist an access-token idempotently |
| `POST /mcp` | Accept the OAuth bearer token and execute only the six read-only tools |

Token and authorization form bodies use
`application/x-www-form-urlencoded`. OAuth responses set `Cache-Control:
no-store`. Failed MCP authentication includes a `WWW-Authenticate` challenge
with the protected-resource metadata URL and required scope.

## Token lifecycle

- Authorization codes are random, stored only as SHA-256 hashes, expire after
  five minutes by default, and are consumed atomically once.
- PKCE verifiers must use the RFC 7636 character and length bounds. Only S256
  is accepted.
- MCP access tokens are HMAC-signed JWTs with issuer, audience, expiry, token
  type, subject, email, client id, exact scope, and `jti` claims. The default
  lifetime is 15 minutes.
- Refresh tokens are random, stored only as SHA-256 hashes, rotate on every
  use, and expire after seven days by default. Reuse revokes the whole token
  family.
- Access-token revocation persists the `jti` until token expiry.
- Code exchange, refresh, and MCP access verify that the platform user still
  exists.

MongoDB TTL indexes remove expired authorization-code, refresh-token, and
access-token-revocation records. TTL cleanup is storage hygiene; every request
also enforces expiry directly and does not depend on background deletion.

## Configuration

The complete configuration is documented in `.env.example`. Enabling OAuth
requires a signing secret of at least 32 characters, an origin-only issuer,
and the same origin's `/mcp` resource URL. Production URLs, client identifiers,
and redirects must use HTTPS. Default exact client metadata targets the stable
ChatGPT public client:

- client id: `https://chatgpt.com/oauth/client.json`;
- redirect URI: `https://chatgpt.com/connector_platform_oauth_redirect`.

`TRUST_PROXY_HOPS` must match the real ingress topology before IP-based OAuth
rate limiting is relied upon. Do not enable it speculatively.

## Verification

`tests/integration/oauth.test.ts` covers discovery, allowlists, consent denial,
sign-in normalization, PKCE failure and recovery, one-time codes, OAuth-only
MCP access, refresh rotation and replay, and access-token revocation. These are
repository proofs, not a claim that a public endpoint or ChatGPT connection is
live.

Current protocol references:

- [OpenAI MCP authentication](https://developers.openai.com/plugins/build/auth)
- [Connect an MCP server from ChatGPT](https://developers.openai.com/plugins/deploy/connect-chatgpt)
