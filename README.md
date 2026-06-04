# Tax Lien Intelligence Platform

Production-grade multi-tenant SaaS for turning county parcel and tax lien data
into structured investment decisions.

## Current State

This repository contains the baseline monorepo plus authenticated dataset
upload, first-pass explainable scoring, scored-results review, watchlist,
portfolio/status tracking, comparison, decision history, decision handoff,
internal jobs, alerts, worker/scheduler groundwork, enrichment, import repair,
reusable import profiles, and the Phase 24 portfolio dashboard:

- `apps/web`: React, Vite, TypeScript, Tailwind review workspace
- `apps/api`: Express, TypeScript, auth, dataset, scoring, internal jobs,
  alerts, watchlist, portfolio, and comparison APIs
- `packages/db`: MongoDB connection plus user, dataset, scored-record,
  internal-job, alert, watchlist, portfolio, comparison, decision-history, and
  import-profile models
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
- `GET /datasets/import-profiles`
- `GET /datasets/:datasetId/mapping`
- `PATCH /datasets/:datasetId/mapping`
- `POST /datasets/:datasetId/import-profile`
- `POST /datasets/:datasetId/import-profile/apply`
- `POST /datasets/:datasetId/score`
- `POST /datasets/:datasetId/refresh`
- `GET /datasets/:datasetId/scoring-status`
- `GET /datasets/:datasetId/scores`
- `GET /jobs/:jobId`
- `GET /alerts`
- `PATCH /alerts/:alertId/read`
- `PATCH /alerts/read-all`
- `POST /watchlist`
- `GET /watchlist`
- `DELETE /watchlist/:watchlistItemId`
- `POST /portfolio`
- `GET /portfolio`
- `GET /portfolio/summary`
- `GET /portfolio/:portfolioItemId`
- `PATCH /portfolio/:portfolioItemId`
- `DELETE /portfolio/:portfolioItemId`
- `POST /comparison`
- `GET /comparison`
- `PATCH /comparison/:comparisonItemId`
- `GET /comparison/:comparisonItemId/history`
- `POST /comparison/:comparisonItemId/handoff/watchlist`
- `POST /comparison/:comparisonItemId/handoff/portfolio`
- `DELETE /comparison/:comparisonItemId`

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
