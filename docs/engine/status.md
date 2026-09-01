# Intelligence Engine Status

Last updated: 2026-09-01

## Verified Current State

- Pull request #2 is merged at `main@8622b07`, and main CI run `33482952157`
  passed. Staging workflow `33485144616` deployed that merge twice, but the
  authenticated gate started during Cloudflare's container replacement window
  and failed safely with behavior consistent with the prior image. No
  authenticated, redaction, or rollback receipt or combined workflow artifact
  was archived, and Atlas cleanup verified zero ephemeral fixture residue.
- The active correction branch is `fix/p47-093-staging-rollout-gate`. It passes
  the exact Git revision into the container, exposes the revision on
  health/readiness only, waits for three consecutive exact ready responses,
  rechecks the revision in public, authenticated, log-redaction, rollback, and
  recovery verification, and bounds authenticated JSON parsing. Local
  validators, typecheck, dependency audit, 10 Python tests, 342 Vitest tests,
  and build pass. Exact-head PR CI run `33489598973` passed all 19 substantive
  steps at source commit `90b2de7`; this documentation-only evidence update
  must retain a green PR check, and merged-main staging evidence is pending.
- Atlas is already narrowed to `readWrite@tax_lien_chatgpt_staging` on only the
  `TaxLienStaging` cluster. `AyobamiH` is recorded as owner for privacy,
  operations, support, and incidents. The genuinely open gates are a persistent
  owner-role staging identity plus real private-ChatGPT OAuth, and
  rights-approved real-data evaluation through a separately reviewed protected
  ingestion lane. The public gateway must continue rejecting `/datasets`, and
  MCP must remain the exact six read-only tools.

## Historical Evidence

The entries below are time-scoped checkpoints. Later entries and the verified
current state above supersede historical statements that a control was still
pending.

- Exact-head private-staging workflow `33341199247` is green at
  `2c7862e74dc80aaaba6677173293d06801ac2546`: 12 public cases, 12 OAuth / role /
  tenant / tool cases, and live Cloudflare log-redaction verification all
  passed. That run deployed Worker
  `fbf89d34-5868-4105-921f-980e07bf6437`; its container digest was
  `sha256:f4d431cf31be076ed9756b1893c53ca22432f6e90bf54cc8d90bf8e09e7f69d`.
- Artifact `9740647987` (SHA-256
  `b6287c547c50b4aa3ef10ed8fa2f54b7398598d85e966137bccb5ccf77a40162`)
  contains only the sanitized public, authenticated, and log-redaction
  receipts. Exact copies and deployment provenance are pinned under
  `products/chatgpt/tax-lien-intelligence/receipts`.
- Exact-head run `33341894651` passed source, deployment, all 24
  public/authenticated cases, and live log redaction at `6f663f7`. The
  rollback verifier then failed closed before any traffic mutation because
  `WRANGLER_LOG=none` suppressed the deployment-status JSON document. The
  retry removes that suppression, parses bounded stdout/stderr in memory, and
  uses the documented `--message` non-interactive rollback behavior.
- Exact-head workflow `33342222795` is green at `4fd41e568d8b8a231534ac7b2e610d69a0ff43a3`.
  Worker `72e2302b-0531-44ac-a9e7-df945c9a9ff1` and container digest
  `sha256:7a2273ce0a33abdb43bbf09e3a7c6a502aa5d8b2278912851a9342539fd592ef`
  passed all 24 public/authenticated cases and live log redaction. Governed
  rollback verified preceding version `580b752e-d1b8-4e9f-9d28-94e07ba9ba80`
  and restored the exact current version at 100%, with eight rollback/recovery
  boundary checks passing.
- Artifact `9740953262` (SHA-256
  `2d1589c8c4152d3fad4ee4c16c5f3ce6a8e2dcd883815cb84eeb212ca041de67`)
  contains only four sanitized live receipts; exact copies and deployment
  provenance are pinned in the ChatGPT product package.
- At that checkpoint, `P47-093-chatgpt-private-staging` remained in progress
  for Atlas role narrowing, the real private ChatGPT OAuth connection, and
  approved real-data / prompt-injection verification. Atlas was narrowed later.


- Active implementation repository for this run:
  `AyobamiH/tax-lien-intelligence-platform`.
- Historical implementation branch: `feature/p47-093-chatgpt-private-staging`.
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
- At the initial engine checkpoint, no verified historical redemption dataset,
  trained model artifact, temporal evaluation report, deployed intelligence
  service, live public OAuth flow, or deployed ChatGPT connection existed.
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
  was read or committed. At that checkpoint, the MongoDB role remained
  `readWriteAnyDatabase@admin` within the single cluster. It was later narrowed
  to `readWrite@tax_lien_chatgpt_staging`.
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
- The source then added an authenticated live verifier after the public-boundary
  verifier. It creates and removes a unique test-only
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
- Exact-head run `33337608603` passed every source, deployment, public-boundary,
  authenticated-boundary, cleanup, and artifact gate at `60d3cca`. Live OAuth
  now proves PKCE, code replay rejection, refresh rotation and family replay
  revocation, access revocation, expiry, exact redirects, owner/admin/member/
  denied isolation, cross-workspace denial, and exactly six deployed read-only
  tools. The normalized repository receipts pin Worker version
  `6c96de84-9571-4724-85ab-61a6e252ecce`, container image digest
  `sha256:f9c69e865f19422a9d5fab73dc403f232a9d2022fc4d08fd1b7fbb9f34e91d82`,
  and workflow artifact `9739571402`.
- A bounded 100-request probe against that exact deployment again returned 70
  `429` responses after 30 handled validations while health remained `200`.
- Exact-head run `33340916921` deployed `593a733` as Worker version
  `c0585f03-5b0f-470b-bce7-0d93d4a8fc55` with container digest
  `sha256:46e475c7b26896e3c2cae32e0b08021cfbb4361d76304fd3fcf1ffd75772a84a`.
  Source and all 24 application cases passed. The application log contains
  the exact 10 expected fields plus Cloudflare's `$cf` provider enrichment;
  the verifier now validates and excludes that envelope. No receipt is claimed.
- Exact-head run `33340616895` deployed `d381a84` as Worker version
  `c9c4387b-74e9-45bb-a0e5-d01d420b682f` with container digest
  `sha256:e0fa0ec21fe245c71d9bd4cd7c654cdccb187c96b661c82472f7c4bb5f8440ee`.
  Source and all 24 application cases passed. The existing token successfully
  queried Workers Observability and found the application event, then failed
  closed on provider key-shape drift. No redaction receipt is claimed.
- Exact-head run `33340248905` deployed `ed85a44` as Worker version
  `81e2777f-08e5-43b6-a222-0fa4229894e6` with container digest
  `sha256:237c21a51d304e6a20a892a2019a90c5ec160af909586c5833399617622204ac`.
  Source and all 24 application cases passed. The corrected parser observed
  eight provider events, four console entries, and all three gateway events;
  application events were absent from Worker tail because container logs use
  Workers Observability. No redaction receipt is claimed.
- Exact-head run `33339888358` deployed `c52bbdf` as Worker version
  `a5e83918-e6c3-4ea6-a5c4-d1164ad3816d` with container digest
  `sha256:030a8f2294ac7c1c558317c64c31966aac7e8335be2fceed07fed08c62e6d95e`.
  Source and all 24 live application cases passed; the tail session remained
  open and the probes ran, but the line-oriented parser did not recognize
  Wrangler's pretty multi-line JSON events. No redaction receipt is claimed.
- Exact-head run `33339651921` deployed `71cfa4d` as Worker version
  `35807be0-4fb6-4ed7-8c12-8428bf66774f` with container digest
  `sha256:370d813eb110094b75f53abc3c67237526d90c882e34f0b05d84c33466c6ffbb`.
  Source and all 24 live application cases passed. The sanitized diagnostic
  classified tail startup as `argument_rejected`; the verifier now uses a
  documented sub-1 sampling fraction. No redaction receipt is claimed.
- Exact-head run `33339301424` deployed `a3d7ec8` as Worker version
  `13a00fa6-40e9-4597-8884-937489a00c52` with container digest
  `sha256:8954252bbf7d639f5c714a5290a0708d719718b3c4bce0dd0a0530086d8b7308`.
  The source gate and all 24 public/authenticated live cases passed. Tail
  startup still returned `exit_code_1`; the next diagnostic uses Wrangler's
  sanitized, ephemeral debug file only for allowlisted classification and
  deletes it before exit. No redaction receipt is claimed.
- Exact-head run `33339042402` deployed `17cd71f` as Worker version
  `ce9df7d9-4540-4947-ab71-46e519179f2c` with container digest
  `sha256:38f220a5b6239d5b3ded53eb5158bd8ca01e628e027b66393ea7a63e5e66adf6`.
  All source, public, and authenticated gates passed. Tail startup still
  returned only `exit_code_1`; structured non-log Wrangler JSON is now
  included in the bounded classifier. No redaction receipt is claimed.
- Exact-head run `33338765853` deployed `1b489e9` as Worker version
  `1f5bcdd3-de99-4078-8317-d4ec395e1985` with container digest
  `sha256:1d8a7fa702c09207c496da6ff5136acdd0a1f1ef7cd1cdbff542775d1179ee4a`.
  Source and both live boundary suites passed. Tail startup again exited before
  a probe; its first classifier returned only `exit_code_1`, so the bounded
  classifier now reads non-JSON stdout as well as stderr without emitting raw
  diagnostics. No redaction receipt exists from this run.
- Exact-head run `33338469468` deployed `a17afd5` as Worker version
  `f7300a86-9e30-49a8-9c39-fa7f2a872b23` with container digest
  `sha256:26da7da0922bf770ef6a4c4d4fc8c2db0e5402e2ffc5e9fec624344e7a39700e`.
  Source, public, and authenticated live gates passed; the log-tail process
  exited before its probe, so no live redaction receipt exists. A bounded
  classifier will identify the startup authority/configuration class on the
  next exact-head run without exposing raw diagnostics.
- At that checkpoint, the staging source disabled persistent provider
  invocation logs and added an exact-head real-time-tail gate. The gate had to
  observe both Worker and API
  payload-free events while unique payload and credential markers remain
  absent, then archive only a sanitized receipt. Live verification was pending
  at that checkpoint and passed in later runs.
- Local staging verification passed the source validator, Cloudflare TypeScript
  build, Python supervisor compilation, 13 focused readiness, redaction, and
  gateway-policy tests, plus 10 Python and 332 Vitest tests across 51 files.
- At that checkpoint, pull request
  [#2](https://github.com/AyobamiH/tax-lien-intelligence-platform/pull/2)
  was open. Exact-head GitHub Actions run `33329355584`, quality-gates job
  `99305018587`, passed every validator, audit, typecheck, complete tests and
  builds, real-process intelligence smoke, real Mongo intelligence persistence
  smoke, and real Mongo OAuth atomicity/revocation smoke. That source-CI run
  claimed no live Cloudflare or Mongo deployment receipt; the PR later merged.
- The graph enforces ChatGPT product priority one with WIP 1. The data
  acquisition and model track is deferred pending real-user pilot evidence or
  public release.

## Repository Authority

The operator selected `AyobamiH/tax-lien-intelligence-platform` as the sole
source of truth for this continuation. The connected GitHub account has admin
and push access. No OneClickPostFactory repository is consulted or synchronized.

## Current Work

`P47-093-chatgpt-private-staging` is the only in-progress node. Repository
implementation, source packaging, and private staging are authorized. Prior
revisions have public, authenticated, redaction, rate-limit, and rollback live
receipts. Current work is to review and land the exact-revision rollout gate,
reverify merged main, provision the protected owner-role staging identity, and
complete the real private-ChatGPT OAuth journey. The final data gate needs
written-use approval, a field-minimized market-relevant extract, and a
separately reviewed protected ingestion workflow before the real-data safety
cases run. Atlas narrowing and accountable ownership are complete; no real
ChatGPT connection or real-data evaluation receipt exists yet.
No deferred node becomes runnable while this product gate is active.

## Next Graph Work

The single active sequence is:

1. `P47-092-chatgpt-product-definition`: completed with the user, three jobs,
   product promise, thin release boundary, journey, pilot measures, and owners;
2. `P47-093-chatgpt-private-staging`: in progress; land the rollout-convergence
   gate, reverify exact merged source, provision the protected staging identity,
   complete private ChatGPT OAuth, then ingest approved data through the
   separately reviewed owner-operated lane and execute the real-data cases;
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
- exact-revision authenticated behavior for the current merged-main OAuth source;
- service-mesh transport, load, failover, and production-traffic behavior;
- production user outcome improvement;
- a private connected ChatGPT staging product;
- real target-user pilot completion or product-value evidence;
- public ChatGPT OAuth, deployment, and live-connection readiness.
