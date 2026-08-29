# Intelligence Engine Contracts

Phase 47 introduces the first executable boundary between collected evidence,
deterministic rules, future model artifacts, platform persistence, and ChatGPT.
The boundary lives in `packages/engine-contract` and is independent of Express,
MongoDB, Python, and any LLM.

## Published Versions

| Contract | Version | Runtime type | JSON Schema |
| --- | --- | --- | --- |
| Candidate evidence | `1.1.0` | `CandidateEvidenceV1` | `candidate-evidence-v1.schema.json` |
| Engine result | `1.1.0` | `EngineResultV1` | `engine-result-v1.schema.json` |

`packages/engine-contract/schemas/manifest.json` is the machine-readable version
manifest. The TypeScript constants and schema identifiers are covered by tests.

Version `1.1.0` adds `user_upload` as an evidence-source category so the
platform can cite an ingested row without misrepresenting it as an official
county or assessor record. The platform records a limitation that uploaded
evidence has not been independently verified. Current upload evidence also
retains an unknown jurisdiction; a county-style header match does not establish
issuing authority.

## Candidate Evidence

`CandidateEvidenceV1` separates a field's value from its evidence state. Every
canonical field is one of:

- `observed`: present in a cited source;
- `derived`: calculated through a named derivation from cited sources;
- `unknown`: not established by available evidence;
- `not_applicable`: not meaningful for this candidate.

Observed and derived fields require a value and at least one `sourceRef` that
resolves to the candidate's provenance collection. Derived fields also require
a human-readable derivation. Unknown and not-applicable fields must not carry a
value. This prevents missing data from silently becoming a default fact.

Every source records its authority, URI, retrieval time, source category, and
optional effective time, adapter version, and license. These references are
the citation boundary for rule findings, service results, and future ChatGPT
answers.

## Engine Results

`EngineResultV1` has three top-level outcomes:

- `assessed`: at least one supported signal is available for an applicable
  jurisdiction;
- `insufficient_evidence`: the engine cannot support an assessment with the
  supplied evidence or available artifacts;
- `out_of_scope`: the jurisdiction or candidate is not covered by the active
  versioned rule pack.

Signals separately declare status, method, unit, evidence references, missing
evidence, and an explanation. Status is `available`, `unknown`, `unavailable`,
or `not_applicable`. Method is `deterministic`, `heuristic`, `model`, or
`not_computed`.

The validator enforces these truth boundaries:

- non-available signals cannot carry values and must use `not_computed`;
- model signals require an artifact identifier, version, SHA-256 digest,
  training-dataset version, and evaluation-report reference;
- an available `redemption_probability` must be a 0-to-1 model output with a
  model artifact;
- rule-based redemption output must use `redemption_heuristic_signal`, method
  `heuristic`, and a non-probability unit;
- `assessed` requires applicable jurisdiction status and an available signal;
- `out_of_scope` requires out-of-scope applicability;
- unsupported object properties, versions, enums, timestamps, and duplicate
  signal keys are rejected.

An LLM is intentionally absent from the method enumeration. ChatGPT may
retrieve, compare, and explain stored engine outputs and cited evidence. It may
not calculate or alter an engine signal.

## Compatibility Boundary

The existing `packages/scoring` numerical fields remain on
`/datasets/:datasetId/scores` for client compatibility. The response now adds
`legacyScoring` metadata that identifies `redemptionProbability` as a
`fixed_rule_heuristic` and `heuristic_not_probability`.

The response also carries a separate `intelligence` envelope. A completed
envelope contains the complete stored `EngineResultV1`. Disabled and failed
envelopes carry no result. The API client validates contract shape, request and
candidate identity, evidence version, and evidence digest before persistence.
It never reuses a prior result after a service failure.

## Validation Boundary

The package exports `validateCandidateEvidenceV1` and
`validateEngineResultV1`. They perform dependency-free runtime validation so
both Node and a future service-client boundary can reject drift. JSON Schemas
support non-TypeScript consumers and cross-language parity tests.

Contract test vectors are deterministic shape tests only. They do not establish
county coverage, source validity, legal correctness, model existence, model
quality, or production readiness.
