# Current Surface KB

## What This File Governs

This file governs the visible and callable product surface that exists today. It
prevents future contributors from mistaking planned flows for implemented flows.

It does not define long-term page design or API schemas. Use frontend, backend,
and shared contract KBs for those.

## Current User-Visible Web Surface

The current web surface is a React review workspace rendered by
`apps/web/src/App.tsx`.

It shows:

- browser login/register controls backed by the auth API;
- authenticated dataset list;
- dataset detail route using `#/datasets/:datasetId`;
- scoring action for a selected dataset;
- scoring success message with internal job id/status;
- scored-results table;
- row-level detail surface with flags and reasoning;
- watchlist keep/remove actions for scored records;
- dedicated watchlist comparison route using `#/watchlist`;
- watchlist detail surface with flags and reasoning;
- portfolio track/untrack actions for scored records;
- watchlist-to-portfolio promotion actions;
- dedicated portfolio route using `#/portfolio`;
- portfolio status tracking surface with flags and reasoning;
- loading, empty, and error states.

This is the first real user-facing review and decision-tracking workflow. It is
not yet a full browser upload or automation workspace.

## Current API Surface

The current API surface is minimal:

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
- structured JSON 404 for unknown routes

Documented in:

- `docs/api/health.md`
- `docs/api/auth.md`
- `docs/api/datasets.md`
- `docs/api/scoring.md`
- `docs/api/watchlist.md`
- `docs/api/portfolio.md`

There is no standalone parcel API yet.

## Review Surface Versus Remaining Shell Areas

The current browser surface has moved past a pure shell for scoring review.
It still keeps the surrounding product deliberately narrow.

Real workflows now present:

- browser-based account registration;
- browser-based login;
- dataset list/detail review for authenticated users;
- score triggering for a selected dataset;
- visible scoring job completion state after a scoring run;
- scored-record table;
- record-level flags and reasoning review.
- add/remove watchlist actions;
- watchlist shortlist comparison.
- portfolio tracking and status updates.

Real workflows not present:

- browser-based dataset upload;
- settings.

## Current Visual Signals

Current visual signals:

- restrained color palette;
- product-oriented copy;
- simple card grid;
- no marketing-heavy hero graphics;
- operator-like language around decisions.

The visual system is early. It should not be treated as a complete design system.

## Current Limitations

The current frontend cannot:

- upload datasets through the browser;
- upload files;
- run automation.

The current API cannot:

- provide a standalone parcel/lien row API;
- persist user-owned parcel records outside scored-record outputs;
- manage alerts, collaboration, or auction execution.

## Where The Current Surface Could Mislead Contributors

The review, watchlist, and portfolio surfaces could make future contributors
think upload and automation workflows also exist. They do not.

The presence of browser auth and score review could make contributors think the
whole V1 app is implemented. It is not: browser upload and automation are still
future work.

The presence of a dataset model could make contributors think full parcel
ingestion exists. It does not.

## Security Implications

The current browser surface now handles authenticated user-owned review data.
Security risk shifts toward protecting the token boundary, API authorization,
and tenant-owned dataset/score queries. Risk increases further when the repo
adds:

- frontend upload workflows;
- alert or automation workflows.

The watchlist is now user-owned decision data and has its own backend ownership
checks. Portfolio tracking is also user-owned decision data and has backend
ownership checks. Internal jobs are user-owned operational metadata and have
backend ownership checks. Future changes must preserve these boundaries.

Future current-surface updates must record both visible functionality and trust
boundaries.

## Update Rules

Update this file whenever:

- a new page becomes user-visible;
- a new API route is added;
- a shell element becomes a real workflow;
- auth/protected routes are introduced;
- current limitations change.
