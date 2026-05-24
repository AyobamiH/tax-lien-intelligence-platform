# Phase 1 Architecture Baseline

## Scope

Phase 1 establishes the production baseline for the Tax Lien Intelligence Platform:

- npm workspace monorepo
- React/Vite/Tailwind frontend in `apps/web`
- Express/TypeScript API in `apps/api`
- MongoDB connection package in `packages/db`
- shared DTO package in `packages/types`
- scoring package placeholder in `packages/scoring`
- root-level Vitest setup for unit and integration tests
- local MongoDB docker-compose file

## Runtime Shape

The frontend is a Vite app that will call the API through `VITE_API_BASE_URL`.
The API exposes `/healthz` and uses a strict environment parser before startup.
The API connects to MongoDB at process startup through `@tax-lien/db`.

## Multi-Tenant Boundary

No user-owned data models exist in Phase 1. From Phase 2 onward, every user-facing
document must include `userId`, and every query must enforce user ownership.

## Security Baseline

The API uses:

- `helmet` for HTTP hardening headers
- JSON body limit of `1mb`
- CORS configured for browser clients
- strict environment validation

Authentication starts in Phase 2.
