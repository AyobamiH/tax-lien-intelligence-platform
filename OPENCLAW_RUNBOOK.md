# OpenClaw Runbook

## Operating Rule

Continue the existing Tax Lien Intelligence Platform repo. Do not create a new
repo, replacement scaffold, or parallel architecture.

## Startup Inspection

1. Verify the repo path:
   `/home/oneclickwebsitedesignfactory/tax-lien-platform`, then fallback to
   `/home/oneclickwebsitefactory/tax-lien-platform`.
2. Stop if neither path exists.
3. Inspect before choosing work:
   - `git status --short --branch`;
   - current branch and remotes;
   - last 20 to 30 commits;
   - repo root structure;
   - package/workspace scripts;
   - docs and KB files;
   - tests and CI workflows;
   - environment examples without reading secrets;
   - runtime entrypoints;
   - frontend routes/surfaces;
   - API routes;
   - data models;
   - worker, scheduler, and job files;
   - recent partial or unfinished work.

## Choosing Next Work

Choose the safest valuable task that improves the real product. Prefer:

- aligning docs and KB with verified code;
- tightening tests around existing behavior;
- hardening tenancy/security boundaries;
- improving import, scoring, review, or workflow continuity;
- fixing verified bugs or drift.

Do not prioritize marketing, broad redesign, speculative rewrites, or fake AI.

## OpenClaw Skill And Tool Use

- Use coding-lane evidence tools first when they fit the repo-audit task.
- Use direct local inspection when the evidence tool is unavailable, scoped too
  narrowly, or cannot answer a specific repo question.
- Use Crabbox only for verification evidence such as clean builds, tests,
  browser checks, screenshots, smoke tests, or heavier runtime confirmation.
- Do not use Crabbox for planning, architecture decisions, secret handling, or
  destructive actions.
- If Crabbox is missing or broken, diagnose whether the issue is a missing PATH
  binary, broken wrapper, broken local config, or missing repo-local script.
- If Crabbox and browser binaries remain unavailable, use `npm run
  smoke:browser` as the strongest local browser-like DOM render/bootstrap check,
  while recording that it is not screenshot or browser-driver evidence.
- Repair Crabbox only when the current operator request explicitly authorizes
  local repair and the fix is limited to normal local tooling or repo/workspace
  configuration. Do not use paid providers, production credentials, or
  destructive system changes.

## Permission Boundaries

Stop and ask before:

- deployment, release, publish, migration, production mutation, or service
  lifecycle changes;
- dependency updates, broad permission changes, or tool installs not explicitly
  authorized by the current operator request;
- reading secrets or private runtime config;
- destructive schema/data/code/history deletion;
- spending money or enabling paid services;
- legal/compliance-sensitive product choices;
- replacing the current repo or architecture.

Commit and push are allowed only when the current operator request explicitly
authorizes them and the relevant checks pass.

## Verification Loop

For each run:

1. Inspect current truth.
2. Separate verified facts from assumptions.
3. Pick a bounded task.
4. Implement only within approval boundaries.
5. Run the smallest meaningful checks, then broader gates when appropriate.
6. Update docs/control files and `WORK_LEDGER.md`.
7. Record unverified limits honestly.
8. Continue to the next safe task unless a real boundary appears.

## Final Report Format

Return:

- `STATUS`
- `REPO`
- `VERIFIED CURRENT STATE`
- `WORK COMPLETED`
- `FILES TOUCHED`
- `CHECKS RUN`
- `EVIDENCE / NOTES`
- `UNVERIFIED / LIMITS`
- `WORK LEDGER`
- `NEXT SAFE STEP`
- `PERMISSION BLOCKER` only when stopped by a real boundary.
