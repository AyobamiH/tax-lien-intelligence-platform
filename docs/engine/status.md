# Intelligence Engine Status

Last updated: 2026-08-30

## Verified Current State

- Active implementation repository for this run:
  `AyobamiH/tax-lien-intelligence-platform`.
- Active branch: `feature/p47-093-chatgpt-private-staging`.
- Starting main commit: `50dae44f797af6b1c99f8bc4044c5965f2f36381`.
- Verified private-staging source checkpoint:
  `eed50b6ac9f08cc99825cbeff33715ea2722100a`.
- Baseline recovery is published at `ba1b0cb`.
- Graph governance is published at `f236b72`.
- `P47-020-contracts` adds the versioned `CandidateEvidenceV1` and
  `EngineResultV1` TypeScript contracts, dependency-free runtime validators,
  strict JSON Schemas, and a machine-readable schema manifest.
- `P47-030-rule-engine` adds the exact-scope
  `us-az-maricopa-statutory-baseline@2026-08-29.2` pack, source-citation
  resolution, deterministic evidence hashing, and evidence-backed internal
  exclusion rules.
- `P47-040-service` adds a stateless, authenticated Python 3.12 HTTP service
  with request bounds, strict evidence and result validation, health/version
  endpoints, safe failure responses, and no provider or model fallback.
- `P47-050-platform-integration` is complete with a tenant-aware API client,
  `user_upload` evidence provenance, versioned result persistence, explicit
  failure and disabled states, legacy heuristic metadata, UI abstention, and a
  real MongoDB CI smoke path.
- `P47-060-data-inventory` is complete at `9cbc841`. It reviewed six source
  classes and added a
  machine-enforced source promotion gate. No external source is approved for
  production or model training.
- The current Assessor Secured Master artifact has a verified 39-field schema,
  twice-monthly declared cadence, and current-tax-year coverage, but no
  certificate redemption outcomes, record observation timestamp, or explicit
  commercial model-training grant.
- The county Lien and Delinquent Parcels GIS terms require written
  authorization for external use and prohibit commercial use except under an
  agreement. Its current layers are not longitudinal outcome labels.
- Current `packages/scoring` implementation is deterministic rules-based
  prioritization, not a calibrated prediction engine.
- One Maricopa-style import adapter and generic fallback exist.
- No verified historical redemption dataset, trained model artifact, temporal
  evaluation report, deployed intelligence service, live public OAuth flow, or
  deployed ChatGPT connection exists yet.
- The feature branch now contains an authenticated stateless MCP endpoint with
  six read-only evidence tools, explicit tenant resolution, cited stored
  values, labeled legacy heuristics, versioned engine states, unknowns, bounded
  comparison, and a privacy-reduced decision-brief projection.
- `P47-090-chatgpt-interface` is complete at `8f6a1bd`. GitHub Actions run
  `33249393142`, quality-gates job `99092320186`, passed graph and data-source
  validation, dependency audit, typecheck, all tests and builds, the real
  intelligence-service smoke, and the real Mongo intelligence-persistence
  smoke.
- `P47-092-chatgpt-product-definition` is complete at `81f4664`. GitHub Actions
  run `33251144894`, quality-gates job `99096911716`, passed all graph, source,
  audit, typecheck, test, build, real-service, and real-Mongo gates.
- `P47-093-chatgpt-private-staging` is in progress. The platform now contains
  a real OAuth 2.1/PKCE boundary with persistent one-time grants, rotating
  refresh tokens, replay-family revocation, access-token revocation, exact
  resource/client/redirect/scope checks, and OAuth-only MCP enforcement when
  enabled. The source-only ChatGPT package is isolated under `products/chatgpt`
  with pinned engine provenance and no invented connection URL.
- The OAuth/source-package checkpoint is published at `627b60b`. GitHub Actions
  run `33253453470`, quality-gates job `99102992513`, passed every validator,
  audit, typecheck, complete tests/build, real-service smoke, real intelligence
  Mongo smoke, and the new real OAuth Mongo atomicity/revocation smoke.
- Pull request [#1](https://github.com/AyobamiH/tax-lien-intelligence-platform/pull/1)
  is merged with preserved history at `main@50dae44`. GitHub Actions run
  `33309185096`, quality-gates job `99251022127`, passed all 16 steps at the
  supplied integrated head. This is source integration evidence, not private
  staging or release evidence.
- Private-staging source now selects one Cloudflare Worker and one `basic`
  Cloudflare Container instance. The Worker exposes only health/readiness,
  OAuth discovery/lifecycle, and `/mcp`; the container runs the existing Node
  API and Python service; MongoDB remains external and available only to the
  API.
- The source adds exact-origin enforcement, a 1 MiB ingress bound, edge OAuth
  and MCP rate-limit bindings, process-local OAuth limiting, dependency
  readiness, payload-free operational telemetry, SIGTERM supervision, a
  staging-only manual deployment workflow, secret-name preflight, and a
  rollback procedure.
- Feature-branch deployment is inert on ordinary pushes. The exact
  `[deploy-private-staging]` commit marker enables the deploy job, which derives
  the authorized workers.dev origin and synchronizes five Worker bindings from
  six GitHub environment secret references over stdin.
- Live external prerequisites now exist: a `$0` MongoDB Atlas Free cluster
  `TaxLienStaging` in AWS `eu-west-1`, a SCRAM application user restricted to
  that cluster, the user-approved dynamic-egress access-list rule, and all six
  required `chatgpt-staging` GitHub environment secret names. No secret value
  was read or committed. The current MongoDB role remains
  `readWriteAnyDatabase@admin` within the single cluster and must be narrowed
  to `readWrite@tax_lien_chatgpt_staging` before this node closes.
- First live staging run `33334912896` passed the 332-test governed source gate
  and synchronized all five Worker secret-name bindings, then failed closed
  before deployment because Wrangler `4.127.1` no longer accepts
  `secret list --json`. The source now uses `--format=json`, with a validator
  guard; no endpoint is claimed from the failed run.
- Repaired exact-head run `33335163254` passed that preflight and reached the
  real Cloudflare container build, then failed closed because the Node-only
  build stage invoked Python. The Dockerfile now builds Node workspaces in the
  Node stage and validates Python source in the final Python stage. The failed
  run created no endpoint.
- Exact-head staging run `33335437008` succeeded at
  `fec745e0e1e08e7ce3fcf4da0c647cf030f668cd`. It built and pushed container
  image digest `sha256:5826a233fab2a84a3b4823bc7be96c80ccbd28384e7518f6b63894566481ab71`
  and deployed Worker version `cfc90ff0-729a-4622-8a0c-4b1c2e760d42` at the
  stable named workers.dev origin.
- Direct live verification passed 12 checks against that origin: TLS/HSTS and
  health, Mongo and intelligence readiness, exact protected-resource and
  authorization-server metadata, unauthenticated MCP rejection, the ingress
  body bound, and rejection of registration, dataset, score, bid, purchase,
  and GraphQL routes. The sanitized receipt stores no bodies, credentials,
  tokens, users, prompts, or evidence payloads.
- Future staging deployments now disable preview URLs, run the same exact-origin
  live verifier after deployment, and archive its sanitized receipt before the
  workflow can pass.
- Governed redeployment run `33336257365` attempt 2 passed at exact head
  `aca4081724969094dcdf5b50d4cf1e600febc1c2`, deploying Worker version
  `0b6656c5-4535-4552-9f8a-37a3fc19cef2` and container image digest
  `sha256:32ea2bc7adde03a36919abb98cc3ab1aad7ea4097bef1b22ec55c6011e4188a5`.
  Its workflow-archived and repository-normalized receipts match that head.
- A bounded 100-request OAuth load probe returned 70 `429` responses after 30
  handled validation responses, while `/healthz` remained `200`. This proves
  the deployed ingress/application throttling path without using credentials
  or tokens.
- The next governed deployment will run an authenticated live verifier after
  the public-boundary verifier. It creates and removes a unique test-only
  Mongo fixture and covers real PKCE, code replay, refresh rotation/replay,
  access revocation and expiry, exact redirects, owner/admin/member/denied
  views, cross-workspace denial, and the exact six read-only deployed tools.
  Its receipt excludes fixture identifiers and all credentials, codes, tokens,
  response bodies, prompts, and evidence payloads.
- First authenticated-gate run `33337074423` passed deployment and the public
  live boundary but failed closed because the verifier's error reporter
  referenced a class before initialization. No authenticated receipt is
  claimed. The reporter is repaired without changing any security assertion or
  the `finally` cleanup path, pending an exact-head rerun.
- Repaired-reporting run `33337338853` revealed that the application's intended
  personal-workspace bootstrap invalidated the test's zero-workspace assumption
  for a denied principal. No authenticated receipt is claimed. The test now
  requires that the denied principal sees only its own isolated test workspace
  and is denied the target, with ownership-aware fixture cleanup.
- Local staging verification passed the source validator, Cloudflare TypeScript
  build, Python supervisor compilation, 13 focused readiness, redaction, and
  gateway-policy tests, plus 10 Python and 332 Vitest tests across 51 files.
- Pull request [#2](https://github.com/AyobamiH/tax-lien-intelligence-platform/pull/2)
  is open. Exact-head GitHub Actions run `33329355584`, quality-gates job
  `99305018587`, passed every validator, audit, typecheck, complete tests and
  builds, real-process intelligence smoke, real Mongo intelligence persistence
  smoke, and real Mongo OAuth atomicity/revocation smoke. No live Cloudflare or
  Mongo deployment receipt is claimed.
- The graph enforces ChatGPT product priority one with WIP 1. The data
  acquisition and model track is deferred pending real-user pilot evidence or
  public release.

## Repository Authority

The operator selected `AyobamiH/tax-lien-intelligence-platform` as the sole
source of truth for this continuation. The connected GitHub account has admin
and push access. No OneClickPostFactory repository is consulted or synchronized.

## Current Work

`P47-093-chatgpt-private-staging` is the only in-progress node. Repository
implementation, source packaging, and private staging are authorized. The real
stable HTTPS service is deployed and its public boundary has a sanitized live
receipt. Remaining work is authenticated OAuth and tenant verification, the
private ChatGPT connection, tool-inventory and load/redaction/rollback
verification, database-role narrowing, and ownership decisions. No ChatGPT
connection receipt exists yet.
No deferred node becomes runnable while this product gate is active.

## Next Graph Work

The single active sequence is:

1. `P47-092-chatgpt-product-definition`: completed with the user, three jobs,
   product promise, thin release boundary, journey, pilot measures, and owners;
2. `P47-093-chatgpt-private-staging`: in progress; deploy the implemented OAuth
   and MCP service through stable HTTPS, connect it privately in ChatGPT, then
   verify tenancy, safety, observability, load, and rollback;
3. `P47-094-chatgpt-real-user-pilot`: validate at least five target users, ten
   real tasks, and thirty scripted safety/grounding scenarios;
4. `P47-095-chatgpt-public-release`: approve policy/listing material and release
   through a monitored, reversible launch.

`P47-065-lawful-data-acquisition`, `P47-070-trained-models`, and
`P47-080-evaluation` are deferred. They resume only if pilot evidence identifies
them as the highest-impact product blocker or after public release completes.

## Explicitly Unproven

- real redemption probability;
- AVM accuracy;
- liquidity prediction accuracy;
- broad county coverage;
- model calibration or fairness;
- authenticated deployed service behavior beyond the verified public boundary;
- service-mesh transport, load, failover, and production-traffic behavior;
- production user outcome improvement;
- a private connected ChatGPT staging product;
- real target-user pilot completion or product-value evidence;
- public ChatGPT OAuth, deployment, and live-connection readiness.
