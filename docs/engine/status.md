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

`P47-050-platform-integration` is published at `eefcf3a`. Local verification
passed 10 Python tests, 306 Vitest tests across 46 files, all builds, 9
real-process service tests, 6 browser-like smoke tests, local runtime smoke,
graph validation, and an audit with 0 vulnerabilities. GitHub Actions run
`33247151199`, job `99086489141`, passed every quality gate and the real MongoDB
write, read-validation, and stale-result removal smoke.

## Next Ready Work

- `P47-060-data-inventory`: Maricopa data-source and outcome-label inventory.

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
