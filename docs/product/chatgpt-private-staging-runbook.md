# ChatGPT Private Staging Runbook

## Purpose

This runbook promotes the repository's real API and thin release package to a
private ChatGPT developer-mode connection. The operator has authorized private
staging work, but this document does not fabricate account entitlement, accept
new spending, create missing secrets, assign privacy/support roles, or convert
local tests into live evidence.

## Current promotion hold

Main CI is green at merge `8622b07`, but staging workflow `33485144616`
attempts 1 and 2 began authenticated verification less than one second after
deployment and failed with behavior consistent with container rollout overlap;
no completed success receipt was archived. Both attempts cleaned their
ephemeral fixtures. The exact-revision convergence correction must pass review,
CI, and live staging before first-owner provisioning or the real ChatGPT OAuth
journey resumes.

## Latest verified deployment

Exact-head workflow [33342222795](https://github.com/AyobamiH/tax-lien-intelligence-platform/actions/runs/33342222795) passed governed source and
secret validation, deployment, 12 public-boundary checks, 12 authenticated
OAuth / role / tenant / tool checks, live log redaction, and governed
rollback/recovery for revision `4fd41e568d8b8a231534ac7b2e610d69a0ff43a3`. It deployed Worker version
`72e2302b-0531-44ac-a9e7-df945c9a9ff1` and container digest
`sha256:7a2273ce0a33abdb43bbf09e3a7c6a502aa5d8b2278912851a9342539fd592ef`.
The rollback routed 100% of traffic to preceding verified version
`580b752e-d1b8-4e9f-9d28-94e07ba9ba80`, proved health, readiness, OAuth
discovery, MCP fail-closed behavior, MongoDB, and intelligence readiness, then
restored the exact current version at 100% and repeated the proof. Only
sanitized receipts are retained; no provider event, application log, command
output, marker, credential, token, email, request body, or response body is
retained. Atlas least privilege and accountable ownership are now satisfied.
The remaining order is exact-revision redeployment, the protected owner-role
staging identity and real private ChatGPT OAuth connection, then approved-data
ingestion and verification.

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
documents, the unauthenticated `/mcp` challenge,
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
