# ChatGPT MCP API

## Endpoint

`POST /mcp`

The endpoint implements stateless MCP Streamable HTTP with JSON responses.
When MCP OAuth is enabled, initialization and tool discovery may proceed
without a token so ChatGPT can inspect the six tool definitions and their OAuth
requirements. Every tool still requires a scoped OAuth access token before any
data service runs. An unauthenticated tool call returns a safe MCP error with an
`mcp/www_authenticate` challenge; malformed, invalid, expired, or revoked
credentials fail at the HTTP authentication boundary. The application's login
JWT is rejected. OAuth-disabled local/internal operation retains the application
JWT path so existing platform validation remains available. `GET` and `DELETE`
are not supported for the stateless implementation.

## Tools

The server exposes six read-only tools:

- `list_workspaces`;
- `list_datasets`;
- `list_dataset_candidates`;
- `get_candidate_evidence`;
- `compare_candidates`;
- `get_decision_brief`.

All workspace-scoped inputs include `workspaceId`. The server resolves that id
against the authenticated user and derives the tenant owner id. No tool accepts
a user id, tenant id, token, formula, score override, workflow mutation, or bid
instruction.

In an OAuth-enabled deployment, every tool descriptor mirrors the required
`tax_lien:read` scope in `_meta.securitySchemes`. This compatibility metadata
and the runtime `mcp/www_authenticate` challenge let ChatGPT discover tools and
start account linking without exposing evidence before authorization.

Candidate pages allow `offset` from 0 to 100,000 and `limit` from 1 to 50.
Comparison accepts 2 to 10 candidate ids. Input outside those bounds is
rejected by the MCP schema.

Successful calls return contract `1.0.0` structured content plus equivalent
JSON text content. See `../engine/chatgpt-mcp-contract.md` for exact semantics,
citations, fact/inference/unknown separation, and safe error behavior.

## Authentication and release limit

OAuth 2.1 discovery, PKCE S256, exact resource and allowlist checks, scoped
short-lived access tokens, rotating refresh tokens, and revocation are
implemented and repository-tested. See [the OAuth API](oauth.md).

The MCP service is deployed at a stable private-staging HTTPS origin, but the
ChatGPT owner connection remains unverified. Repository and deployment tests
are not a successful ChatGPT connection receipt.
