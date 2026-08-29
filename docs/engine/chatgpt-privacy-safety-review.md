# ChatGPT Interface Privacy and Safety Review

Status: repository and CI review complete, production connection review pending

Scope: read-only MCP tools in `apps/api/src/mcp`

## Safety Decision

The first ChatGPT surface is intentionally evidence retrieval, not an
autonomous investment agent. It is safe to validate internally because it
cannot write platform state or execute an external action. It is not ready for
public connection until the implemented OAuth boundary is validated through
stable HTTPS, production observability, and live ChatGPT authorization and
tenancy tests.

## Data Handling

| Data class | Returned | Treatment |
|---|---:|---|
| Workspace id, name, caller role | Yes | Only after bearer authentication |
| Dataset filename and user source label | Yes | Treated as untrusted source data |
| Parcel id and property address | Yes | Required to identify the reviewed property; cited to the uploaded row |
| Normalized lien and value fields | Yes | Marked as unverified user-upload evidence |
| Engine signals and findings | Yes | Returned only from stored contract-validated results |
| Legacy fixed-rule scores | Yes | Labeled as heuristics, never probabilities |
| User email addresses | No | Used for authorization context only |
| Workspace member list | No | Not needed for evidence review |
| Comments, notes, approval notes | No | Excluded from decision-brief output |
| Access tokens and service tokens | No | Never included in tool results |
| Raw uploaded rows | No | Only selected normalized fields are returned |
| Bid or purchase instructions | No | No tool exists for this capability |

## Threat Review

### Cross-tenant access

Every workspace-scoped tool first calls `resolveContext(authenticatedUserId,
workspaceId)`. Data services receive the resolved `tenantUserId`; they never
receive a caller-provided tenant identity. Denied membership stops before a
dataset or score lookup.

### Prompt injection in source data

Filenames, source labels, flags, reasoning, and evidence text are data. They do
not alter the MCP server instructions or select tools. The exposed tool set has
no mutation or open-world action. Adversarial tests verify that prompt-like
source labels remain inside citations while the normal evidence and safety
contract stays unchanged.

### Fabricated intelligence

The interface does not compute new intelligence values. It returns persisted
versioned results or an explicit `not_configured` or `failed` state. Current
legacy fields remain visible only under `legacyFixedRuleHeuristics`, including
the correction that the redemption signal is not a probability.

### Over-broad retrieval

Candidate lists are limited to 50 records per call with offset pagination.
Comparisons accept 2 to 10 ids. Raw rows, member directories, discussion text,
and exported decision-brief prose are excluded.

### Error leakage

Known application failures return stable error codes and safe messages.
Unexpected failures return a generic error. Tool results do not expose stack
traces, database queries, environment values, or credentials.

## Residual Risks and Required Controls

| Risk | Current state | Required before public ChatGPT use |
|---|---|---|
| OAuth code exists but is not validated through the real ChatGPT and staging ingress | Repository-tested | Deploy exact source and run discovery, PKCE, expiry, refresh, revocation, and role cases live |
| MCP endpoint is not deployed on stable public HTTPS | Blocked | Deploy with approved infrastructure and validate from ChatGPT |
| Production traffic and abuse behavior are unmeasured | Blocked | Add payload-safe metrics, latency/error alerts, rate limits, and load tests |
| User uploads may contain inaccurate or unlawfully obtained data | Open | Preserve source qualification and add operator terms and provenance controls |
| Property address can be sensitive | Open | Confirm product privacy notice, retention, deletion, and access controls |
| ChatGPT may overstate evidence in narrative | Reduced, not eliminated | Add grounded answer evals and require citation/unknown preservation in review |
| Existing scoring labels may influence users despite warnings | Open | Continue UI and API migration away from prediction-like legacy names |

## Release Gate

Public connection is allowed only when all of the following are verified:

1. OAuth authorization and token isolation work for owner, admin, member,
   expired, revoked, and cross-workspace cases.
2. The server is reachable through stable HTTPS at the intended `/mcp` URL.
3. Every listed tool passes direct, indirect, invalid-input, and out-of-scope
   evals with production-like data volumes.
4. Logs and metrics prove that no tokens, emails, free-form notes, or raw rows
   are recorded.
5. Rate limits, timeouts, alerting, rollback, and incident ownership are named.
6. The release-readiness review records deployment evidence rather than
   repository claims.

Until those conditions pass, the correct label is `internal MCP validation`,
not `published ChatGPT plugin`.
