# Tax Lien Intelligence Platform

Production-grade multi-tenant SaaS for turning county parcel and tax lien data
into structured investment decisions.

## Current State

This repository contains the baseline monorepo plus authenticated dataset
upload, first-pass explainable scoring, scored-results review, watchlist,
portfolio/status tracking, comparison, decision history, decision handoff,
saved operational views, internal jobs, alerts, worker/scheduler groundwork,
enrichment, import repair, reusable import profiles, saved views, notification
preferences, email delivery, digest processing/delivery history, and the Phase
29 workspace and team-access foundation:

- `apps/web`: React, Vite, TypeScript, Tailwind review workspace
- `apps/api`: Express, TypeScript, auth, dataset, scoring, internal jobs,
  alerts, notification delivery, workspace membership, watchlist, portfolio,
  and comparison APIs
- `packages/db`: MongoDB connection plus user, dataset, scored-record,
  internal-job, alert, watchlist, portfolio, comparison, decision-history, and
  import-profile/saved-view/notification-preference/notification-delivery/
  notification-digest-batch, workspace, and workspace-membership models
- `packages/scoring`: pure explainable scoring engine
- `packages/types`: shared API types

Implemented API surfaces:

- `GET /healthz`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /workspaces`
- `GET /workspaces/current`
- `GET /workspaces/current/members`
- `POST /workspaces/current/members`
- `PATCH /workspaces/current/members/:membershipId`
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
- `GET /notification-preferences`
- `PATCH /notification-preferences`
- `GET /notification-deliveries`
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
- `POST /saved-views`
- `GET /saved-views`
- `GET /saved-views/:savedViewId/apply`
- `PATCH /saved-views/:savedViewId`
- `DELETE /saved-views/:savedViewId`

Email delivery is provider-configured and disabled by default. When SMTP and
sender env config are present, supported delivery-eligible product alerts can
send immediate email or be grouped into bounded scheduled digests. Users can
review delivery and digest outcomes at `#/delivery-history`; otherwise the API
records provider-disabled outbox state. SMS, push, campaigns, and marketing
messaging are future work.

Phase 29 uses an explicit `X-Workspace-Id` selection boundary. Existing users
receive a personal owner workspace automatically. Datasets, scoring/jobs,
watchlist, portfolio, comparison, and decision history can be shared with
verified workspace members; owners/admins may mutate them and members are
read-only. Alerts, notification settings/history, and saved views remain
personal. This is a team-access foundation, not full collaboration.

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
