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

Use `/home/oneclickwebsitedesignfactory/.openclaw/workspace/projects/tax-lien-platform`
as the canonical OpenClaw workspace path. The old
`/home/oneclickwebsitedesignfactory/tax-lien-platform` path may exist as a
compatibility symlink, but new work should use the bounded `projects/` path.

## Operating Rule

Follow `OPENCLAW_RUNBOOK.md` for startup inspection, task selection, tool use,
permission boundaries, verification, and final reporting. Keep `WORK_LEDGER.md`
current whenever material repo work changes code, docs, tests, verification
evidence, or next-step state.

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
