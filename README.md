# Tax Lien Intelligence Platform

Production-grade multi-tenant SaaS for turning county parcel and tax lien data
into structured investment decisions.

## Current State

This repository contains the baseline monorepo plus the Phase 2 authentication
foundation:

- `apps/web`: React, Vite, TypeScript, Tailwind
- `apps/api`: Express, TypeScript, auth API
- `packages/db`: MongoDB connection and user model
- `packages/scoring`: future pure scoring engine
- `packages/types`: shared API types

Implemented API surfaces:

- `GET /healthz`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start MongoDB:

   ```bash
   docker compose -f infra/docker/docker-compose.yml up -d
   ```

3. Start the API:

   ```bash
   npm run dev:api
   ```

4. Start the frontend:

   ```bash
   npm run dev:web
   ```

## Quality Gates

```bash
npm run typecheck
npm run test
npm run build
```
