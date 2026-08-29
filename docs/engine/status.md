# Intelligence Engine Status

Last updated: 2026-08-29

## Verified Current State

- Active implementation repository for this run:
  `AyobamiH/tax-lien-intelligence-platform`.
- Active branch: `feature/intelligence-engine-foundation`.
- Starting main commit: `f7b6cbeab0d35712a60933c598e6fcfa39ffdd5d`.
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
- `P47-060-data-inventory` has reviewed six source classes and added a
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
  evaluation report, deployed intelligence service, or ChatGPT tool surface
  exists yet.

## Repository Authority Limit

Repository documentation identifies a OneClickPostFactory repository as the
startup source of truth and the AyobamiH repository as a mirror. That external
startup repository was not verified or mutated in this run. This branch is
being developed in AyobamiH because the operator explicitly selected it and the
connected GitHub account has administrative access. No cross-repository sync is
claimed.

## Current Work

`P47-060-data-inventory` is in progress pending publication and remote CI. The
implementation adds `data-source-inventory.json`, a source promotion validator,
CI enforcement, a real Assessor archive/schema sample, a county GIS metadata
and terms review, and a blocked redemption training data card.

## Next Graph Work

- After `P47-060` closure, `P47-065-lawful-data-acquisition` prepares the
  accurate commercial-purpose request, written terms, lifecycle schema,
  artifact manifest, privacy controls, and time-aware entity resolution.
- `P47-090-chatgpt-interface` can proceed independently against stored evidence
  and abstention. It does not need to wait for trained model promotion.

## Explicitly Unproven

- real redemption probability;
- AVM accuracy;
- liquidity prediction accuracy;
- broad county coverage;
- model calibration or fairness;
- deployed service behavior;
- service-mesh transport, load, failover, and production-traffic behavior;
- production user outcome improvement;
- ChatGPT plugin readiness.
