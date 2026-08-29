# Tax Lien Intelligence Platform

Production-grade multi-tenant SaaS for turning county parcel and tax lien data
into structured investment decisions.

## Current State

This repository contains the baseline monorepo plus authenticated dataset
upload, first-pass explainable scoring, scored-results review, watchlist,
portfolio/status tracking, comparison, decision history, decision handoff,
saved operational views, internal jobs, alerts, worker/scheduler groundwork,
enrichment, import repair, reusable import profiles, notification preferences,
email delivery, digest processing/delivery history, workspace access, activity,
comments, assignment, approvals, my-work queues, follows, review checklists,
workspace policies, decision briefs, final decision outcomes, and outcome
review. Phase 34 adds a clean audited dependency graph and high-severity
supply-chain gates.

Current packages:

- `apps/web`: React, Vite, TypeScript, Tailwind review workspace
- `apps/api`: Express, TypeScript, auth, dataset, scoring, internal jobs,
  alerts, notification delivery, workspace membership/activity, watchlist,
  portfolio, and comparison APIs
- `packages/db`: MongoDB connection plus user, dataset, scored-record,
  internal-job, alert, watchlist, portfolio, comparison, decision-history, and
  import-profile/saved-view/notification-preference/notification-delivery/
  notification-digest-batch, workspace, workspace-membership, and
  workspace-activity, workspace-comment, workspace-assignment,
  approval-request, follow-subscription, review-checklist, workspace-policy,
  decision-outcome, and discussion-attention models
- `packages/scoring`: pure explainable scoring engine
- `packages/engine-contract`: versioned evidence and engine-result contracts
- `packages/jurisdiction-rules`: source-cited deterministic jurisdiction rules
- `packages/types`: shared API types
- `services/intelligence`: authenticated Python engine-service boundary

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
- `DELETE /workspaces/current/members/:membershipId`
- `GET /workspaces/current/activity`
- `GET /comments/:entityType/:entityId`
- `POST /comments/:entityType/:entityId`
- `PATCH /comments/:entityType/:entityId/read`
- `DELETE /comments/:commentId`
- `GET /assignments/mine`
- `GET /assignments/:entityType/:entityId`
- `PATCH /assignments/:entityType/:entityId`
- `DELETE /assignments/:entityType/:entityId`
- `GET /approvals`
- `POST /approvals`
- `GET /approvals/:approvalRequestId`
- `POST /approvals/:approvalRequestId/approve`
- `POST /approvals/:approvalRequestId/reject`
- `POST /approvals/:approvalRequestId/cancel`
- `GET /my-work`
- `GET /follows`
- `GET /follows/:entityType/:entityId`
- `PUT /follows/:entityType/:entityId`
- `DELETE /follows/:entityType/:entityId`
- `GET /review-checklists/templates`
- `PUT /review-checklists/templates/:entityType`
- `GET /review-checklists/:entityType/:entityId`
- `PATCH /review-checklists/:entityType/:entityId/items/:itemId`
- `GET /workspace-policies`
- `PUT /workspace-policies`
- `GET /decision-briefs/comparison_item/:entityId`
- `GET /decision-outcomes/comparison_item/:entityId`
- `PUT /decision-outcomes/comparison_item/:entityId`
- `GET /outcome-review`
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

Workspace access uses an explicit `X-Workspace-Id` selection boundary. Existing
users receive a personal owner workspace automatically. Datasets, scoring/jobs,
watchlist, portfolio, comparison, decision history, comments, assignments,
approvals, follows, review checklists, policies, decision briefs, final
outcomes, and outcome review operate inside verified workspace membership and
role boundaries. Alerts, notification settings/history, and saved views remain
personal. The workspace layer is a practical operating system for shared review,
not enterprise IAM, realtime collaboration, legal case management, or a
compliance-grade audit log.

## Local Development

Use Node.js `^20.19.0 || >=22.12.0`.

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

5. Start the internal intelligence service with a strong local token:

   ```bash
   PYTHONPATH=services/intelligence/src \
   INTELLIGENCE_SERVICE_TOKEN=replace-with-at-least-32-random-characters \
   python3 -m tax_lien_intelligence.server
   ```

   To enable API worker calls, use the same token and set
   `INTELLIGENCE_SERVICE_ENABLED=true`. The service remains disabled by default
   and must be reachable only on a private application network.

## Quality Gates

```bash
npm run audit
npm run typecheck
npm run test
npm run build
npm run smoke:local
npm run smoke:browser
npm run smoke:intelligence-service
npm run smoke:intelligence:mongo
```

`npm run test` includes the dependency-free Python unit suite and all Vitest
tests. `npm run build` compiles every TypeScript workspace and byte-compiles the
Python service. `npm run smoke:intelligence-service` starts the real
authenticated Python process on loopback and verifies health, version,
contract parity, invalid evidence, and out-of-scope behavior over HTTP.
`npm run smoke:intelligence:mongo` builds the application, writes and reads a
contract-valid result through the real Mongo scored-record store, then proves a
later service failure removes the prior result. CI supplies a temporary real
MongoDB service and drops the bounded smoke database after the check.

`npm run smoke:local` builds the workspace, starts the API app in-process,
serves the built web shell from `apps/web/dist`, verifies `/healthz`, verifies
the structured unknown-route response, and fetches the built HTML/CSS/JS assets
over local HTTP. It is a bounded local runtime smoke, not full browser
automation or deployed proof.

`npm run smoke:browser` mounts the real React app in a jsdom browser-like DOM,
checks the unauthenticated app shell, and bootstraps the authenticated operator
shell with mocked API responses. It also runs the follow-up lifecycle browser
smoke for due-state rendering plus update, complete, and snooze controls, and
renders completed, not-configured, and failed intelligence evidence states.

`npm run smoke:follow-ups:browser` runs only the focused follow-up lifecycle
browser-like smoke and writes local JSON evidence to
`/tmp/tax-lien-follow-up-browser-smoke.json` by default. These browser smoke
commands are local render/control proof, not screenshot capture,
browser-driver automation, MongoDB-backed end-to-end proof, Crabbox proof, or
deployed proof.
