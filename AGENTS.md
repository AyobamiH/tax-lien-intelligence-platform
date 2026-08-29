# Agent Instructions

This repository is the existing Tax Lien Intelligence Platform. Continue this
repo; do not create a replacement scaffold, parallel app, or new architecture.

## First Read

Before changing code or docs here, read:

1. `MISSION.md`
2. `ACCEPTANCE.md`
3. `OPENCLAW_RUNBOOK.md`
4. `WORK_LEDGER.md`
5. `docs/README.md`
6. `docs/engine/README.md`
7. `docs/engine/work-graph.json`

Use `/home/oneclickwebsitedesignfactory/.openclaw/workspace/projects/tax-lien-platform`
as the canonical OpenClaw workspace path. The old
`/home/oneclickwebsitedesignfactory/tax-lien-platform` path may exist as a
compatibility symlink, but new work should use the bounded `projects/` path.

## Operating Rule

Follow `OPENCLAW_RUNBOOK.md` for startup inspection, task selection, tool use,
permission boundaries, verification, and final reporting. Keep `WORK_LEDGER.md`
current whenever material repo work changes code, docs, tests, verification
evidence, or next-step state.

## Phase 47 Work Graph

Intelligence-engine work is graph-governed. Before changing Phase 47 code:

1. select a `ready` node whose dependencies are complete;
2. set only that node to `in_progress` and record the responsible role;
3. stay inside the node scope and declared repository boundaries;
4. implement production behavior without mock intelligence or fabricated
   probabilities;
5. run the node verification commands and repository quality gates;
6. update affected architecture, API, KB, changelog, status, graph, and ledger
   documents in the same work unit;
7. commit and push the verified work before closing the node.

Run `npm run validate:work-graph` whenever the graph changes. A node must not be
marked complete if implementation, verification, documentation, commit, or
push evidence is missing. Handoffs must name the node, current state, evidence,
changed files, remaining limits, and next unblocked nodes.

## Boundaries

Do not read `.env`, credentials, tokens, service keys, private runtime config,
or secret-bearing files without explicit approval.

Do not install dependencies, commit, push, deploy, publish, run migrations,
restart services, mutate production, repair/install external tooling, or make
destructive changes unless the current operator request explicitly authorizes
that action.

Use coding-lane evidence tools first when they fit repo-audit work. Use direct
local inspection only when the evidence tool is unavailable, adapter-limited, or
too broad for the specific question.

## Verification

For documentation-only changes, run at least `git diff --check`. Run broader
checks only when the current change claims runtime behavior or the operator
explicitly asks for validation.

For source changes, use the verification ladder in `ACCEPTANCE.md` and record
what passed, what was skipped, and what remains unverified.
