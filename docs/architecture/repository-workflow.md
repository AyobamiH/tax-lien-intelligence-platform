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

`main` is protected to require pull requests and passing status checks before
merge. Force pushes and branch deletion must remain disabled. This follows the
GitHub protected branch model where important branches can require reviews and
status checks before merge.

## Development Discipline

Feature work should be done on short-lived branches. Each stable feature must
include implementation, tests, documentation, a clean commit, and a passing CI run.
