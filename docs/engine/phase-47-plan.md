# Phase 47 Intelligence Engine Plan

## Outcome

Deliver a trustworthy ChatGPT product on top of the completed versioned,
evidence-first interface. ChatGPT is priority one; trained predictive accuracy
is not claimed or pursued before outcome data and evaluation evidence exist.

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
- Keep the platform repository as the engine and system of record; use a thin,
  separately released ChatGPT product for connector-specific packaging without
  duplicating engine or tenancy logic.
- Enforce a single sequential product release train with WIP 1.

## Delivery Stages

### 47A: Truthful foundation

- graph-governed agent workflow;
- `CandidateEvidenceV1` and `EngineResultV1` contracts;
- provenance, unknown, applicability, abstention, and version fields;
- deterministic jurisdiction-rule interface;
- explicit heuristic labelling for the current scoring package;
- service health, contract, and evaluation-manifest boundaries;
- platform compatibility adapter and CI coverage.

### 47B: Data and evaluation foundation — partially complete, now deferred

- Maricopa source and licensing inventory;
- machine-enforced source promotion gates;
- commercial-purpose records request and written data-use agreement;
- historical auction, parcel, sale, and redemption outcome contracts;
- entity resolution and dataset validation pipeline;
- temporal and county holdout definitions;
- data and model cards;
- reproducible dataset and artifact versioning.

### 47C: Verified models — deferred

- valuation baseline and uncertainty interval;
- time-to-redemption survival model;
- liquidity signal baseline;
- calibration, out-of-distribution detection, and abstention;
- shadow comparison against the existing heuristic;
- promotion gates based on evidence, not a roadmap date.

### 47D: ChatGPT evidence surface — complete

- read-only evidence retrieval tools;
- record comparison and cited explanations;
- missing-evidence and next-verification guidance;
- decision memo drafting from stored evidence;
- no autonomous bid, legal conclusion, or invented calculation.

### 47E: ChatGPT priority-one release train

- `P47-092`: lock the product definition, user jobs, thin release boundary,
  journey, pilot measures, and ownership;
- `P47-093`: connect a private ChatGPT staging product through stable HTTPS and
  approved OAuth, with real authorization, isolation, monitoring, and rollback;
- `P47-094`: run a real-user pilot and a reproducible safety/grounding suite;
- `P47-095`: approve policy/listing materials and perform a monitored public
  release.

`P47-095-chatgpt-public-release` is blocked until the operator supplies and
authorizes the production domain, deployment target, OAuth ownership, and
privacy decisions and the private staging and real-user pilot dependencies are
complete. Repository MCP completion is not public release evidence.

The evidence interface already works against stored deterministic results and
explicit abstention without a trained model. Data acquisition and model work
remain deferred until pilot evidence names them as the highest-impact blocker,
or the public release node completes.

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
- `P47-060-data-inventory`: machine-readable six-source inventory, real
  Assessor artifact sample, GIS terms review, outcome-label gap, blocked
  training data card, CI gate, and Mongo-backed branch verification are
  published at `9cbc841` through GitHub Actions run `33248227529`.
- `P47-090-chatgpt-interface`: authenticated stateless MCP implementation,
  six read-only tools, tenant resolution, cited evidence projection, privacy
  reduction, no-ranking comparison, memo outline, and focused adversarial and
  authorization tests are published at `8f6a1bd`. GitHub Actions run
  `33249393142` passed every gate, including real-process service and real Mongo
  persistence smokes. Public OAuth and deployment remain outside this completed
  repository node.
