# Decision 0001: Monorepo Baseline

## Status

Accepted.

## Context

The product needs a production-grade foundation for a multi-tenant SaaS. The
frontend, API, Mongo schemas, scoring logic, and shared types must evolve together
without copy-pasted contracts.

## Decision

Use an npm workspace monorepo with:

- `apps/web` for React/Vite/Tailwind
- `apps/api` for Express/TypeScript
- `packages/db` for MongoDB connection and future schemas
- `packages/scoring` for pure lien underwriting logic
- `packages/types` for shared DTOs

## Consequences

TypeScript project references keep package boundaries explicit. The scoring engine
can remain pure and independently tested as it becomes the product core in Phase 4.
