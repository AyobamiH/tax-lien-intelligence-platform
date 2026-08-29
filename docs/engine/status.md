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
  `us-az-maricopa-statutory-baseline@2026-08-29.1` pack, source-citation
  resolution, deterministic evidence hashing, and evidence-backed internal
  exclusion rules.
- Current application gates pass: audit with 0 vulnerabilities, graph
  validation, typecheck, 289 tests across 42 files, and every workspace build.
- Current `packages/scoring` implementation is deterministic rules-based
  prioritization, not a calibrated prediction engine.
- One Maricopa-style import adapter and generic fallback exist.
- No verified historical redemption dataset, trained model artifact, temporal
  evaluation report, production intelligence service, or ChatGPT tool surface
  exists yet.

## Repository Authority Limit

Repository documentation identifies a OneClickPostFactory repository as the
startup source of truth and the AyobamiH repository as a mirror. That external
startup repository was not verified or mutated in this run. This branch is
being developed in AyobamiH because the operator explicitly selected it and the
connected GitHub account has administrative access. No cross-repository sync is
claimed.

## Current Work

`P47-030-rule-engine` is verified. The rule evaluator supports only Maricopa
County, calculates only deterministic value coverage, returns out-of-scope or
insufficient-evidence states where required, and leaves redemption probability
unavailable. Arizona statutory context resolves to dated Legislature sources.
Current Maricopa auction operating rules remain explicitly unverified.

## Next Ready Work

- `P47-040-service`: production intelligence-service boundary with
  cross-language contract parity and truthful failure behavior.
- `P47-060-data-inventory`: Maricopa data-source and outcome-label inventory.

## Explicitly Unproven

- real redemption probability;
- AVM accuracy;
- liquidity prediction accuracy;
- broad county coverage;
- model calibration or fairness;
- deployed service behavior;
- production user outcome improvement;
- ChatGPT plugin readiness.
