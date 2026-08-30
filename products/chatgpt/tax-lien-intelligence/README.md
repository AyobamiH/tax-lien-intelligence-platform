# Tax Lien Intelligence for ChatGPT

This directory is the thin ChatGPT release package. The platform repository
remains the engine, evidence store, tenant authority, and system of record.
This package contains no scoring, jurisdiction, persistence, bidding, or
workspace-membership logic.

## Current state

The plugin metadata is source-controlled and validation-ready. The runtime MCP
server and OAuth 2.1 implementation live in `apps/api`; the staging deployment
boundary lives in `infra/cloudflare`. The package is now
`private_staging_deployed`: the exact stable HTTPS origin and sanitized public
boundary receipt are recorded in `release-provenance.json`. A `.mcp.json`
remains intentionally absent until the private ChatGPT connection and the
authenticated release cases are verified.

## Approved capability

The product exposes exactly six read-only user goals:

1. list authorized workspaces;
2. list datasets in an authorized workspace;
3. list a bounded page of stored candidates;
4. inspect cited facts, labeled inferences, limitations, and unknowns;
5. compare two to ten user-selected candidates without ranking them;
6. retrieve a privacy-reduced decision brief for human review.

It cannot upload data, mutate a score, change membership, approve a decision,
place a bid, purchase an asset, or provide a legal conclusion.

## Promotion rule

Do not add `mcpServers` to `.codex-plugin/plugin.json` until all of these are
true and recorded in `release-provenance.json`:

- the exact engine commit and MCP contract version are pinned;
- the public HTTPS MCP and OAuth issuer URLs are deployed;
- OAuth discovery, PKCE, expiry, refresh rotation, revocation, and tenant
  isolation pass against that deployment;
- a private ChatGPT developer-mode connection completes the real journey;
- monitoring, redaction, support, incident, privacy, and rollback ownership are
  assigned and verified.

Validate this package with:

```bash
npm run validate:chatgpt-release
```
