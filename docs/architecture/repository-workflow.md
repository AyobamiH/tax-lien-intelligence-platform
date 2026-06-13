# Repository Workflow

## Repository

The primary production repository is private:

`https://github.com/OneClickPostFactory/tax-lien-intelligence-platform`

The personal repository is a backup mirror only:

`https://github.com/AyobamiH/tax-lien-intelligence-platform`

Local remotes must be configured as:

- `oneclick`: primary startup repository
- `origin`: personal backup mirror

The default branch is `main`.

## Baseline Tag

`v0.1-phase1-baseline` points to the verified Phase 1 baseline before
authentication and tenant-owned data models are introduced.

## Required Quality Gates

Every completed change must pass local quality gates before it is pushed to
`main`. The GitHub Actions `quality-gates` job also runs after pushes to `main`
and on pull requests for visibility.

The required gate runs:

- `npm ci`
- `npm run audit`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Local pre-push runs `npm install` instead of `npm ci` so it can keep the local
workspace usable while still enforcing the same high-severity audit, typecheck,
test, and build expectations.

## Main Branch Policy

The current operating model is direct-to-`main` after local verification:

- complete the work locally;
- run `git diff --check`;
- run `npm install`;
- run `npm run audit`;
- run `npm run typecheck`;
- run `npm run test`;
- run `npm run build`;
- let the pre-push hook run;
- push directly to `oneclick/main`.

Pull requests may still be opened for visibility or review, but they are not the
gating mechanism for the current workflow.

## Soft Protection

Soft protection is now local-first:

- keep commits focused;
- review diffs before committing;
- do not push if any local quality gate fails;
- do not use the legacy mirror as product truth;
- optionally mirror `main` to `origin` only after the startup repo is updated.

The CI workflow no longer fails direct pushes to `main`; it verifies them.

## Local Pre-Push Hook

The repository tracks `.githooks/pre-push`. Configure it locally with:

```bash
git config core.hooksPath .githooks
```

The hook runs:

- `npm install`
- `npm run audit`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Development Discipline

Each stable feature must include implementation, tests, documentation, a clean
commit, local passing gates, and a successful push to the startup remote.

Dependency changes additionally require advisory-path review, runtime versus
development classification, lockfile inspection, and explicit documentation
for any unresolved high or critical risk.
