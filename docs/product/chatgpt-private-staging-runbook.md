# ChatGPT Private Staging Runbook

## Purpose

This runbook promotes the repository's real API and thin release package to a
private ChatGPT developer-mode connection. The operator has authorized private
staging work, but this document does not fabricate account entitlement, accept
new spending, create missing secrets, assign privacy/support roles, or convert
local tests into live evidence.

## Current promotion hold

The September 11 private deployment and owner recovery passed, but ChatGPT
Settings continued to show `Connection: Connect` and zero actions. A September
19 browser reproduction and source trace found that OAuth middleware rejected
the unauthenticated MCP initialization/tool-list request before ChatGPT could
discover per-tool authorization policy. Source now permits data-free protocol
and tool discovery, publishes OAuth policy on every tool, and returns a runtime
authorization challenge before any unauthenticated tool can call a data
service. The repair still needs merged-main CI and an exact-revision private
staging deployment before the real owner connection is retried.

## Latest verified deployment

Workflow [34534965346](https://github.com/AyobamiH/tax-lien-intelligence-platform/actions/runs/34534965346) passed on merged revision
`1553eabcadec0f3f24938d2bfff7214210209292`: exact container convergence,
12 public-boundary checks, 18 authenticated OAuth / role / tenant / tool checks,
live log redaction, and governed rollback/recovery. Its sanitized artifact
`10175224054` has SHA-256
`66340bbf1203e6085f2a0d4bee33983a7538a72a23675a2c209832c765de9405`.
Only sanitized receipt metadata is represented here; no credential, token,
email, request body, response body, or evidence payload was retained. The next
deployment must prove the September 19 discovery/challenge repair at its exact
revision before the owner OAuth retry.

## Operational patterns applied

- OpenAI's Apps SDK authentication guidance requires protected-resource
  metadata, per-tool OAuth policy, and a runtime `mcp/www_authenticate`
  challenge; the staging verifier checks all three surfaces.
- Google's OAuth production-readiness guidance reinforces separate test and
  production projects, least scopes, owned HTTPS domains, and accountable
  contacts; this product stays private-staging-only with one read scope.
- GitHub protected environments keep deployment secrets behind branch policy
  and reviewer controls; the workflow receives secrets only in its governed
  environment job.
- Cloudflare gradual-deployment guidance favors observable version routing and
  fast rollback; the workflow pins the exact source revision and proves both
  rollback and recovery instead of treating a deploy command as success.

References: [OpenAI authentication](https://developers.openai.com/plugins/build/auth),
[Google OAuth production readiness](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance),
[GitHub deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments),
and [Cloudflare gradual deployments](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/).

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

## Protected first-owner ceremony

The source contains the manual-only
`.github/workflows/chatgpt-pilot-provision.yml`, but as of 2026-09-01 the
required GitHub environment `chatgpt-pilot-bootstrap` has not been created.
Creating or changing that protected environment, its deployment-branch policy,
or required reviewers is an access-control mutation and requires explicit
action-time authority.

Once authorized, restrict the environment to the trusted default branch and an
accountable reviewer, then add exactly these environment secret names:

- `MONGODB_URI`;
- `CHATGPT_PILOT_EMAIL`;
- `CHATGPT_PILOT_PASSWORD_HASH`.

Generate and retain the 12–256 character plaintext password in a password
manager. Put only its bcrypt `$2a$` or `$2b$` hash at cost 12–14 into GitHub;
never paste the plaintext into a chat message, source, CI inputs, logs, or a
receipt. Enter it only through password-manager autofill or the dedicated
staging OAuth authorization form using the approved browser credential channel.
Dispatch the workflow manually from the default branch with both ceremony
confirmations true. It serializes with staging, refuses identity/workspace/
membership drift, and archives only a sanitized receipt. The workflow does not
open public registration or rotate an existing credential.

### Lost bootstrap credential

If the bootstrap receipt proves that the exact one-owner boundary exists but
the accountable owner did not create or retain the plaintext password, do not
guess it and do not create a second user. Update only `CHATGPT_PILOT_EMAIL` and
`CHATGPT_PILOT_PASSWORD_HASH` in the existing `chatgpt-pilot-bootstrap`
environment after generating and retaining a replacement password in a password
manager. Leave the existing `MONGODB_URI` unchanged.

After the credential-recovery source is merged to the default branch, dispatch
`.github/workflows/chatgpt-pilot-credential-recovery.yml` with all three
confirmations true. The workflow requires exactly one existing user, workspace,
and active default owner membership; preserves their identifiers; rotates only
the normalized email and bcrypt hash; invalidates pending authorization codes,
active OAuth grants, and refresh tokens before rotation; and archives a receipt
containing no email, password, hash, database identifier, or workspace
identifier. Use the retained plaintext password only through the approved
secure OAuth credential channel.

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
   Docker must supply the exact 40-character Git SHA through Wrangler's
   `SOURCE_REVISION` plain-variable option, request immediate rollout, and run
   the same convergence verifier; the bare workspace deploy command is not a
   complete governed deployment.
   Deployment is staging-only and the gateway intentionally exposes no
   ordinary mutation routes.
6. The workflow injects `${{ github.sha }}` as the non-secret
   `SOURCE_REVISION`, requests an immediate container rollout, then requires
   three consecutive `/readyz` responses with the exact
   `X-Tax-Lien-Source-Revision` header. Do not begin public or authenticated
   verification merely because Wrangler reports that deployment started.

Then complete the application checks below:

1. Deploy the exact reviewed workflow SHA with the existing MongoDB-backed API.
   Do not use the older `release-provenance.json` revision as a deployment
   selector and do not deploy a copied MCP service. Pin the new revision in
   provenance only after exact-head live verification succeeds.
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

Verify the exact source-revision header first, then all three discovery
documents, unauthenticated initialization and the exact six-tool inventory,
per-tool OAuth metadata, an unauthenticated tool-call
`mcp/www_authenticate` challenge, TLS certificate, health endpoint, token
expiry, refresh rotation/replay, revocation, and rate limiting. Invalid
presented credentials must still receive HTTP 401. Do not record tokens, codes,
emails, prompts, or evidence payloads in receipts.

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
Cloudflare real-time tail only after reasserting the exact container source
revision, sends three fail-closed MCP requests containing
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
the bound Container resources; the exact current container source revision and
dependency readiness are therefore proved on both sides of the route change
while Worker version routing is verified separately. Cloudflare's current
Wrangler command reference documents JSON output for
[deployment status](https://developers.cloudflare.com/workers/wrangler/commands/workers/#deployments-status)
and states that a rollback `--message` skips the interactive prompts. The
receipt stores only version identifiers, timestamps, response hashes, statuses,
and durations. Bounded Wrangler output is held only long enough to extract the
deployment document; Wrangler output and response bodies are never archived.

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

Real county evaluation data cannot enter through the public gateway, which
intentionally rejects `/datasets`, or through the six read-only MCP tools. Once
written-use permission and the field-minimized pilot extract are approved, use
a separately reviewed owner-operated protected ingestion workflow. Do not add
an upload route or mutation-shaped MCP tool to bypass that control.

The official connection procedure is maintained at
[Connect from ChatGPT](https://developers.openai.com/plugins/deploy/connect-chatgpt).

## Rollback

Disconnect the private ChatGPT product, revoke affected refresh families,
run `wrangler rollback <VERIFIED_VERSION_ID>`, wait for 100% Worker routing,
confirm the bound container still reports the expected source revision plus
healthy `/healthz` and `/readyz` responses, and verify that the failed Worker
can no longer mint or serve tokens. Record trigger,
owner, Worker version, container image/deployment ids, timestamps, and
sanitized verification. Never delete evidence needed for an incident review.
