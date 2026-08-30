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
  to `readWrite@tax_lien_platform` before this node closes.
- First live staging run `33334912896` passed the 332-test governed source gate
  and synchronized all five Worker secret-name bindings, then failed closed
  before deployment because Wrangler `4.127.1` no longer accepts
  `secret list --json`. The source now uses `--format=json`, with a validator
  guard; no endpoint is claimed from the failed run.
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
implementation, source packaging, and private staging are authorized. The
deployment boundary is now source-controlled inside this project without
duplicating runtime logic. Remaining work is the real stable HTTPS deployment,
private ChatGPT connection, live tenancy and load/redaction/rollback
verification, database-role narrowing, and ownership decisions. The required
GitHub environment secret names and managed staging Mongo connection now exist,
but no successful Cloudflare deployment or ChatGPT connection receipt exists.
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
- deployed service behavior (source configuration exists; no live receipt);
- service-mesh transport, load, failover, and production-traffic behavior;
- production user outcome improvement;
- a private connected ChatGPT staging product;
- real target-user pilot completion or product-value evidence;
- public ChatGPT OAuth, deployment, and live-connection readiness.
