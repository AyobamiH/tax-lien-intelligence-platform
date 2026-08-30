# ChatGPT Private Staging Runbook

## Purpose

This runbook promotes the repository's real API and thin release package to a
private ChatGPT developer-mode connection. It does not authorize deployment,
create a domain, assign privacy/support roles, or convert local tests into live
evidence.

## Required operator inputs

Record these in the work ledger before deployment:

- approved staging provider, service, region, and stable HTTPS origin;
- secret owner and rotation process;
- privacy/security approver and retention/deletion decisions;
- pilot consent, support, and incident owners;
- ingress proxy-hop count and shared/ingress rate-limit design;
- rollback owner, prior artifact, and rollback trigger.

## Build and configure

1. Deploy the repository commit recorded in
   `products/chatgpt/tax-lien-intelligence/release-provenance.json` with the
   existing MongoDB-backed API. Do not deploy a copied MCP service.
2. Configure the existing required API/database settings plus the
   `MCP_OAUTH_*` values from `.env.example`.
3. Set `MCP_OAUTH_ISSUER_URL` to the origin only and
   `MCP_OAUTH_RESOURCE_URL` to that origin plus `/mcp`.
4. Keep the exact ChatGPT client id and redirect URI unless OpenAI's current
   client metadata requires a reviewed change.
5. Generate the OAuth signing secret through the deployment secret manager;
   never commit or paste it into evidence.
6. Configure TLS, proxy-hop count, health checks, request-size limits,
   redaction, rate limits, alerts, and one-step rollback at the ingress and
   service layers.

## Pre-connection verification

Run the repository gates against the exact commit, then query the deployed
URLs—not localhost—and archive sanitized status/headers plus deployment ids:

```bash
npm ci
npm run validate:work-graph
npm run validate:data-inventory
npm run validate:chatgpt-release
npm run audit
npm run typecheck
npm run test
npm run build
```

Verify all three discovery documents, the unauthenticated `/mcp` challenge,
TLS certificate, health endpoint, token expiry, refresh rotation/replay,
revocation, and rate limiting. Do not record tokens, codes, emails, prompts, or
evidence payloads in receipts.

## ChatGPT connection

1. In ChatGPT developer mode, add the exact public HTTPS `/mcp` URL.
2. Complete OAuth using a dedicated staging user with lawful staging data.
3. Confirm the tool inventory is exactly the six tools in
   `release-provenance.json` and all annotations remain read-only.
4. Run the triage-to-brief journey and every critical authorization,
   cross-workspace, grounding, prompt-injection, and out-of-scope case in
   `docs/product/chatgpt-release-evaluation.json`.
5. Store sanitized connection and evaluation receipts in the project, update
   the provenance manifest, then rerun its validator.

The official connection procedure is maintained at
[Connect from ChatGPT](https://developers.openai.com/plugins/deploy/connect-chatgpt).

## Rollback

Disconnect the private ChatGPT product, revoke affected refresh families,
restore the last verified deployment artifact, confirm the old discovery and
health responses, and verify that the failed artifact can no longer mint or
serve tokens. Record trigger, owner, artifact ids, timestamps, and sanitized
verification. Never delete evidence needed for an incident review.
