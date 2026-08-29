# ChatGPT MCP API

## Endpoint

`POST /mcp`

The endpoint implements stateless MCP Streamable HTTP with JSON responses. It
requires the same `Authorization: Bearer <token>` header as the existing API.
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

## Authentication Limit

The current API JWT path supports internal validation. It is not a completed
public ChatGPT authorization design. OAuth discovery, authorization, token
lifecycle, revocation, and stable public HTTPS remain required before a public
connection.
