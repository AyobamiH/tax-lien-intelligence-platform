# Tax Lien Intelligence Platform

Production-grade multi-tenant SaaS for turning county parcel and tax lien data
into structured investment decisions.

## Phase 1

This repository currently contains the baseline monorepo:

- `apps/web`: React, Vite, TypeScript, Tailwind
- `apps/api`: Express, TypeScript
- `packages/db`: MongoDB connection
- `packages/scoring`: future pure scoring engine
- `packages/types`: shared API types

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
