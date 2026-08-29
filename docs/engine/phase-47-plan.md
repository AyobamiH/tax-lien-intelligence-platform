# Phase 47 Intelligence Engine Plan

## Outcome

Replace the ambiguous scoring boundary with a versioned, evidence-first engine
that can be consumed by the existing platform and later by ChatGPT. The phase
does not claim trained predictive accuracy before outcome data and evaluation
evidence exist.

## Architecture Direction

- Keep the TypeScript application as the workflow and system of record.
- Introduce versioned evidence and result contracts before changing stored
  score semantics.
- Separate deterministic jurisdiction rules, evidence quality, model-backed
  signals, aggregation, and explanation.
- Introduce a Python analytics service only behind the versioned contract and
  only when its production path is real and verified.
- Preserve compatibility explicitly while deprecating misleading probability
  names.
- Keep ChatGPT outside numerical calculation. It retrieves, compares, cites,
  and explains engine results.

## Delivery Stages

### 47A: Truthful foundation

- graph-governed agent workflow;
- `CandidateEvidenceV1` and `EngineResultV1` contracts;
- provenance, unknown, applicability, abstention, and version fields;
- deterministic jurisdiction-rule interface;
- explicit heuristic labelling for the current scoring package;
- service health, contract, and evaluation-manifest boundaries;
- platform compatibility adapter and CI coverage.

### 47B: Data and evaluation foundation

- Maricopa source and licensing inventory;
- historical auction, parcel, sale, and redemption outcome contracts;
- entity resolution and dataset validation pipeline;
- temporal and county holdout definitions;
- data and model cards;
- reproducible dataset and artifact versioning.

### 47C: Verified models

- valuation baseline and uncertainty interval;
- time-to-redemption survival model;
- liquidity signal baseline;
- calibration, out-of-distribution detection, and abstention;
- shadow comparison against the existing heuristic;
- promotion gates based on evidence, not a roadmap date.

### 47D: ChatGPT product surface

- read-only evidence retrieval tools;
- record comparison and cited explanations;
- missing-evidence and next-verification guidance;
- decision memo drafting from stored evidence;
- no autonomous bid, legal conclusion, or invented calculation.

## Definition Of Done For Every Node

A node is complete only when implementation, focused verification, applicable
full gates, documentation, graph state, ledger evidence, clean commit, push,
and remote-ref verification are all present. Partial work remains
`in_progress`, `verified`, or `blocked`.

## Verified Checkpoints

- `P47-000-baseline-recovery`: published at `ba1b0cb`.
- `P47-010-governance`: published at `f236b72`.
- `P47-020-contracts`: published at `9f89fc2`.
- `P47-030-rule-engine`: source verification, implementation, 10 focused rule
  tests, and repository-wide gates published at `2c44a63`.
- `P47-040-service`: Python implementation, 10 unit tests, 7 real-process HTTP
  tests, cross-language parity, service smoke, and repository gates complete
  in this checkpoint.
- `P47-050-platform-integration`: client, persistence, compatibility metadata,
  UI abstention, bounded concurrency, and stale-result removal are published at
  `eefcf3a`. GitHub Actions run `33247151199` passed every gate, including the
  real MongoDB persistence smoke.
