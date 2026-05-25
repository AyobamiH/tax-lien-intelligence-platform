# Tax Lien Intelligence Platform

Production-grade multi-tenant SaaS for turning county parcel and tax lien data
into structured investment decisions.

## Current State

This repository contains the baseline monorepo plus the Phase 2 authentication
foundation, Phase 3 dataset foundation, and Phase 4 first-pass scoring
foundation, Phase 5 scored-results review surface, Phase 6 watchlist workflow,
Phase 7 portfolio/status tracking, and Phase 8 automation-ready internal job
plumbing:

- `apps/web`: React, Vite, TypeScript, Tailwind review workspace
- `apps/api`: Express, TypeScript, auth, dataset, scoring, internal jobs,
  watchlist, and portfolio APIs
- `packages/db`: MongoDB connection plus user, dataset, scored-record,
  internal-job, watchlist, and portfolio models
- `packages/scoring`: pure explainable scoring engine
- `packages/types`: shared API types

Implemented API surfaces:

- `GET /healthz`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /datasets`
- `GET /datasets`
- `GET /datasets/:datasetId`
- `POST /datasets/:datasetId/score`
- `GET /datasets/:datasetId/scores`
- `GET /jobs/:jobId`
- `POST /watchlist`
- `GET /watchlist`
- `DELETE /watchlist/:watchlistItemId`
- `POST /portfolio`
- `GET /portfolio`
- `GET /portfolio/:portfolioItemId`
- `PATCH /portfolio/:portfolioItemId`
- `DELETE /portfolio/:portfolioItemId`

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
