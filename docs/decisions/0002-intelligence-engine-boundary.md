# Decision 0002: Evidence-First Intelligence Engine Boundary

## Status

Accepted for Phase 47 foundation.

## Context

The existing application contains a substantial review workflow and a pure
TypeScript scoring package. The scoring package uses fixed rules and produces a
field named `redemptionProbability`, but no verified historical redemption
training set, calibrated model, or time-based validation evidence supports that
name. ChatGPT integration must not amplify this ambiguity.

## Decision

1. Keep the existing TypeScript application as the workflow and system of
   record.
2. Add versioned evidence and engine-result contracts before changing runtime
   architecture.
3. Separate evidence quality, jurisdiction rules, valuation, redemption,
   liquidity, aggregation, and explanations.
4. Label deterministic rules as heuristics. Do not expose them as calibrated
   probabilities.
5. Make abstention a first-class result: `insufficient_evidence` and
   `out_of_scope` are valid successful engine outcomes.
6. Introduce Python analytics behind the contract because the selected mature
   data, entity-resolution, survival-analysis, and interpretable-model tooling
   is Python-native.
7. Require data, model, rule-pack, and engine versions plus field-level
   provenance in every result.
8. Keep ChatGPT as a retrieval and explanation layer. It must not calculate or
   alter engine values and must distinguish facts, inferences, and unknowns.

## Consequences

- Existing API compatibility requires an explicit transition adapter.
- A trained redemption model is blocked until historical outcomes and temporal
  evaluation exist.
- The product can become more truthful before it becomes more predictive.
- Python service dependencies and deployment design must be introduced through
  separate graph nodes and verified independently.
- Model promotion becomes an evidence gate rather than a feature-completion
  claim.
