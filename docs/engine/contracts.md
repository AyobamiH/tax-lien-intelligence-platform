# Intelligence Engine Contracts

Phase 47 introduces the first executable boundary between collected evidence,
deterministic rules, future model artifacts, platform persistence, and ChatGPT.
The boundary lives in `packages/engine-contract` and is independent of Express,
MongoDB, Python, and any LLM.

## Published Versions

| Contract | Version | Runtime type | JSON Schema |
| --- | --- | --- | --- |
| Candidate evidence | `1.0.0` | `CandidateEvidenceV1` | `candidate-evidence-v1.schema.json` |
| Engine result | `1.0.0` | `EngineResultV1` | `engine-result-v1.schema.json` |

`packages/engine-contract/schemas/manifest.json` is the machine-readable version
manifest. The TypeScript constants and schema identifiers are covered by tests.

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

The existing `packages/scoring` contract and current `/datasets/:datasetId/scores`
response remain unchanged in this node so active users are not broken. Its
`redemptionProbability` property is a legacy fixed-rule heuristic. It is not a
trained or calibrated probability and must not be mapped to the new
`redemption_probability` signal.

The platform-integration node will map the legacy value to
`redemption_heuristic_signal`, persist engine versions, expose abstention to the
UI, and preserve the current route while clients transition. Until that work is
complete, the legacy scoring API is not an `EngineResultV1` endpoint.

## Validation Boundary

The package exports `validateCandidateEvidenceV1` and
`validateEngineResultV1`. They perform dependency-free runtime validation so
both Node and a future service-client boundary can reject drift. JSON Schemas
support non-TypeScript consumers and cross-language parity tests.

Contract test vectors are deterministic shape tests only. They do not establish
county coverage, source validity, legal correctness, model existence, model
quality, or production readiness.
