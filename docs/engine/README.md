# Intelligence Engine Operating Guide

This directory is the durable entry point for Phase 47 intelligence-engine
work. It exists so an agent can resume from repository truth without relying on
chat history or reconstructing architecture decisions.

## Read Order

1. `../../AGENTS.md`
2. `../kb/master-product-kb.md`
3. `phase-47-plan.md`
4. `status.md`
5. `work-graph.json`
6. `../decisions/0002-intelligence-engine-boundary.md`
7. `contracts.md`
8. `rule-packs.md`
9. `open-source-components.md`

## Work-Unit Protocol

Every engine work unit follows the same state transition:

`planned -> ready -> in_progress -> verified -> completed`

`blocked` is allowed only with a named blocker and an unblocking condition.

An agent must:

1. select a `ready` node whose dependencies are `completed`;
2. declare the node and inspect its files before editing;
3. keep changes inside the node scope;
4. implement real production behavior without mock intelligence;
5. run focused checks, then applicable repository-wide gates;
6. update architecture, API, KB, changelog, status, graph, and ledger truth;
7. review the diff, commit, push, and verify the remote ref;
8. expose verified results, risks, unproven claims, and newly ready nodes.

## No-Mock Intelligence Rule

Production paths must never fabricate county evidence, model artifacts,
redemption outcomes, value estimates, probabilities, confidence, or provider
responses. Until verified inputs and artifacts exist, the engine returns
`insufficient_evidence` or `out_of_scope`.

Pure deterministic examples may be used to test contracts and calculations.
They do not count as model validation, county coverage, production evidence, or
real-user outcome proof. Infrastructure test stores already present in the repo
may isolate persistence behavior, but they must not produce or validate a fake
investment conclusion.

## Handoff Contract

Every agent handoff must state:

- graph node and status;
- branch and starting commit;
- scope completed;
- files changed;
- verification commands and results;
- documentation updated;
- commit and remote ref;
- verified facts;
- risks and unproven limits;
- blockers and exact unblocking condition;
- newly ready nodes.

Run `npm run validate:work-graph` before every graph-bearing commit.
