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

Every pull request must pass the `quality-gates` GitHub Actions job. The job runs:

- `npm ci`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Branch Protection

Required target state:

- `main` requires pull requests before merge
- `main` requires the `quality-gates` status check before merge
- force pushes are disabled
- branch deletion is disabled

Current state: GitHub protected branches are not available for this repository.
The team enforces soft protection manually.

## Soft Protection

Until GitHub branch protection is available:

- never commit directly to `main`
- develop on `feature/*` branches
- push feature branches to `oneclick`
- validate the `quality-gates` CI job before merge
- review diffs manually before merge
- optionally mirror `main` to `origin` after primary validation

The CI workflow intentionally fails direct non-merge pushes to `main` with:

`Direct pushes to main are not allowed`

## Local Pre-Push Hook

The repository tracks `.githooks/pre-push`. Configure it locally with:

```bash
git config core.hooksPath .githooks
```

The hook runs:

- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Development Discipline

Feature work should be done on short-lived branches. Each stable feature must
include implementation, tests, documentation, a clean commit, and a passing CI run.
