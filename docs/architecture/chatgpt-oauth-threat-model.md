# ChatGPT OAuth Threat Model

## Assets and trust boundaries

The protected assets are platform identity, workspace membership, property
evidence, stored engine results, and decision briefs. ChatGPT is a public OAuth
client and a read-only MCP consumer; it is not a tenant authority or a source
of engine truth. MongoDB is trusted to persist hashed grants and revocation
state. The HTTPS ingress and signing secret are deployment trust boundaries
that are not established by repository code alone.

## Controls

| Threat | Implemented control | Remaining live proof |
| --- | --- | --- |
| Authorization-code interception | PKCE S256, exact redirect URI, one-time atomic consume, five-minute expiry | Exercise the real ChatGPT callback through public HTTPS |
| Redirect or client substitution | Exact client-id and redirect allowlists; no wildcard or prefix matching | Confirm deployed environment contains only approved values |
| Token sent to the wrong API | Exact `resource`, issuer, audience, type, scope, and algorithm checks | Verify ingress does not route the audience elsewhere |
| Stolen refresh token | Hash-at-rest, rotation, replay detection, family revocation, bounded lifetime | Verify database backup/access controls and incident response |
| Stolen access token | Short expiry, persisted `jti` revocation, no token in tool output | Verify log redaction and revocation from the deployed service |
| Deleted or disabled identity | User existence checked at code exchange, refresh, and MCP access | Add any future account-disabled state to the same check |
| Cross-tenant access | Authenticated subject is captured server-side; workspace membership resolves before tenant data access | Run owner/admin/member/denied/cross-workspace cases on staging |
| Consent confusion | Product name, read-only scope, exclusions, allow and cancel actions are explicit | Validate wording with pilot users and privacy owner |
| Credential guessing or endpoint abuse | Bounded bodies, IP-keyed fixed-window rate limits, generic credential failures | Load test the real ingress and verify proxy-hop configuration |
| Revocation-store outage | Revocation write errors fail the request; MCP verification fails closed on store errors | Alert on store failures and exercise rollback/failover |
| Prompt injection in evidence | Six read-only closed-world tools; no write, bid, browser, or legal action | Run the live prompt-injection evaluation catalog |

## Token storage and logging

Authorization codes and refresh tokens are never stored raw. Access tokens are
not stored; only revoked token identifiers and expiry are persisted. Passwords
continue to use the platform's bcrypt hashes. OAuth routes must never log
credentials, codes, verifiers, bearer tokens, refresh tokens, email addresses,
prompts, tool arguments, raw rows, or evidence payloads.

Allowed operational telemetry remains request id, route or tool name,
success/error class, duration, bounded response size, interface/engine version,
rate-limit event, and redaction outcome.

## Explicit limits

- The current fixed-window limiter is process-local. A multi-instance staging
  topology needs an ingress or shared limiter before load claims are made.
- HMAC token signing is suitable for this same-service authorization/resource
  server topology; secret custody and rotation are deployment responsibilities.
- No stable domain, deployment receipt, ChatGPT connection receipt, privacy
  approval, support owner, or incident owner exists in repository evidence yet.
- OAuth code tests do not prove live TLS, ingress behavior, availability, log
  redaction, tenant isolation with production data, or ChatGPT interoperability.
