# ChatGPT MCP API

## Endpoint

`POST /mcp`

The endpoint implements stateless MCP Streamable HTTP with JSON responses.
When MCP OAuth is enabled it requires a scoped OAuth access token and rejects
the application's login JWT. OAuth-disabled local/internal operation retains
the application JWT path so existing platform validation remains available.
`GET` and `DELETE` are not supported for the stateless implementation.

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

The MCP service is not yet deployed on a stable public HTTPS origin or
connected from ChatGPT. Repository tests are not live connection evidence.
