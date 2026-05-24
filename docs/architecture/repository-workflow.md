# Repository Workflow

## Repository

The production repository is private:

`https://github.com/AyobamiH/tax-lien-intelligence-platform`

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

Current state: GitHub rejected branch protection for the private personal
repository because the account/repository plan does not currently allow protected
branches on private repositories. Do not begin Phase 2 authentication work until
this is resolved by moving the repository to an eligible organization/plan or
enabling GitHub Pro/Team/Enterprise.

## Development Discipline

Feature work should be done on short-lived branches. Each stable feature must
include implementation, tests, documentation, a clean commit, and a passing CI run.
