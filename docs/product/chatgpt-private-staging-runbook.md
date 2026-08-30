# ChatGPT Private Staging Runbook

## Purpose

This runbook promotes the repository's real API and thin release package to a
private ChatGPT developer-mode connection. The operator has authorized private
staging work, but this document does not fabricate account entitlement, accept
new spending, create missing secrets, assign privacy/support roles, or convert
local tests into live evidence.

## Latest verified deployment

Exact-head workflow [33341199247](https://github.com/AyobamiH/tax-lien-intelligence-platform/actions/runs/33341199247) passed the source, secret,
deployment, 12 public-boundary, 12 authenticated-boundary, and live
log-redaction gates for revision `2c7862e74dc80aaaba6677173293d06801ac2546`. It deployed Worker version
`fbf89d34-5868-4105-921f-980e07bf6437` and container digest
`sha256:f4d431cf31be076ed9756b1893c53ca22432f6e90bf54cc8d90bf8e09e7f69d`.
Only sanitized receipts are retained in the product package; no provider event,
application log, marker, credential, token, email, request body, or response
body is retained. The remaining order is governed rollback/recovery, Atlas
least-privilege narrowing, then the real private ChatGPT OAuth connection and
approved-data verification.

## Selected staging topology

The selected source topology is `infra/cloudflare`: one workers.dev HTTPS
gateway and one `basic` Cloudflare Container instance. The container supervises
the existing Node API and Python intelligence service; MongoDB remains an
external managed service used only by the API. See the
[topology decision](../architecture/chatgpt-private-staging-topology.md).

Cloudflare Containers require the Workers Paid plan. Confirm the connected
account already has that plan or obtain spending approval before deployment.
Do not create a paid plan implicitly.

## Required operator inputs

Record these in the work ledger before deployment:

- verified Cloudflare account, existing Workers Paid entitlement, workers.dev
  subdomain, and stable HTTPS origin;
- a managed TLS MongoDB URI for a staging-only least-privilege database user;
- secret owner and rotation process;
- privacy/security approver and retention/deletion decisions;
- pilot consent, support, and incident owners;
- ingress proxy-hop count and shared/ingress rate-limit design;
- rollback owner, prior artifact, and rollback trigger.

## Build and configure

1. Confirm GitHub environment `chatgpt-staging` contains these secret names.
   Do not print values:

   - `CLOUDFLARE_API_TOKEN`;
   - `CLOUDFLARE_ACCOUNT_ID`;
   - `MONGODB_URI`;
   - `JWT_SECRET`;
   - `INTELLIGENCE_SERVICE_TOKEN`;
   - `MCP_OAUTH_SIGNING_SECRET`.

2. The workflow resolves the authorized workers.dev subdomain and synchronizes
   these exact Worker bindings over Wrangler stdin without writing a secret
   file or printing a value:

   - `STAGING_ORIGIN`;
   - `MONGODB_URI`;
   - `JWT_SECRET`;
   - `INTELLIGENCE_SERVICE_TOKEN`;
   - `MCP_OAUTH_SIGNING_SECRET`.

3. `STAGING_ORIGIN` is derived as the exact named Worker origin. The source
   derives the MCP resource as that origin plus `/mcp` and rejects preview or
   mismatched hosts.
4. Run the source and authority preflight:

   ```bash
   npm ci
   npm run validate:chatgpt-staging
   npm run preflight -w @tax-lien/cloudflare-staging
   ```

5. Dispatch `.github/workflows/chatgpt-staging.yml` when it is available on the
   default branch, or push a reviewed commit to the bounded feature branch
   whose message contains exactly `[deploy-private-staging]`. Ordinary feature
   pushes create no deployment job. An authenticated local operator with
   Docker may instead run `npm run deploy -w @tax-lien/cloudflare-staging`.
   Deployment is staging-only and the gateway intentionally exposes no
   ordinary mutation routes.

Then complete the application checks below:

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
6. Verify TLS, one trusted proxy hop, `/healthz`, `/readyz`, the 1 MiB body
   bound, payload-free Worker/API logs, both gateway rate-limit bindings, the
   process OAuth limit, and version rollback. Source configuration is not live
   proof.

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

The deployment workflow runs both public-boundary and authenticated-boundary
verifiers. The authenticated verifier may create deterministic fixtures only
inside the live test. It must use unique `example.invalid` identities, mark all
workspace names as test-only, remove users, memberships, workspaces, and OAuth
records in `finally` cleanup, and never present the fixture as a real staging
user, county record, model result, deployment result, or pilot outcome.

Also verify the Worker rejects `/auth/register`, `/datasets`, `/scores`,
`/bid`, `/purchase`, and every unlisted route before the container. Inspect
logs using known injection-shaped test values and prove none of those values
appear in Worker or API logs.

The governed deployment runs
`npm run verify:chatgpt-staging:log-redaction-live`. It opens a bounded
Cloudflare real-time tail, sends three fail-closed MCP requests containing
unique payload and credential markers, requires both the Worker gateway event
and API operational event with their exact allowlisted fields, and proves the
markers are absent from application console messages. The verifier never writes
the provider envelope, console messages, markers, headers, or bodies. Persistent
Cloudflare invocation logs are disabled; only the explicit payload-free custom
events remain enabled.


## Governed rollback and recovery

After the public, authenticated, and log-redaction checks pass, the workflow
discovers the current single-version deployment and the most recent preceding
single-version deployment. It uses Wrangler's governed rollback command to
route 100% of staging traffic to the preceding version, verifies health,
readiness, OAuth discovery, MCP fail-closed behavior, and MongoDB/intelligence
readiness, then restores the exact current version from a `finally` recovery
path and repeats the same checks. Cloudflare Worker rollback does not roll back
the bound Container resources; dependency readiness is therefore proved on both
sides of the route change. The receipt stores only version identifiers,
timestamps, response hashes, statuses, and durations. Wrangler output and
response bodies are never archived.

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
run `wrangler rollback <VERIFIED_VERSION_ID>`, wait for the container rollout,
confirm the restored discovery, `/healthz`, and `/readyz` responses, and verify
that the failed artifact can no longer mint or serve tokens. Record trigger,
owner, Worker version, container image/deployment ids, timestamps, and
sanitized verification. Never delete evidence needed for an incident review.
