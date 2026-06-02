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
- authenticated browser CSV upload form;
- upload submitting, success, and error states;
- authenticated dataset list;
- dataset detail route using `#/datasets/:datasetId`;
- dataset import summary visibility for generic CSV fallback or the current
  Maricopa-style county import adapter;
- dataset readiness status, field coverage, warnings, and guidance for uploaded
  datasets;
- focused manual mapping repair controls for critical fields on not-ready
  datasets;
- reusable import profile status plus save/apply actions for repeated mapping
  workflows;
- scoring action for a selected dataset;
- controlled refresh action for a scored dataset;
- scoring freshness/status badge and stale-record count;
- maintenance mode and safe policy message for scored datasets;
- scoring job queued/running/completed/failed status while the worker processes
  the selected dataset;
- scored-results table;
- scored-record enrichment/data-quality detail;
- safe external enrichment detail when Census geocoding is enabled and a row
  has usable address context;
- enrichment adapter outcome and freshness/reprocess timing detail;
- row-level detail surface with flags and reasoning;
- watchlist keep/remove actions for scored records;
- dedicated watchlist comparison route using `#/watchlist`;
- watchlist detail surface with flags and reasoning;
- portfolio track/untrack actions for scored records;
- watchlist-to-portfolio promotion actions;
- dedicated portfolio route using `#/portfolio`;
- portfolio status tracking surface with flags and reasoning;
- compare actions from scored review, watchlist, and portfolio surfaces;
- dedicated comparison route using `#/comparison`;
- side-by-side comparison matrix with decision state and lightweight notes;
- dedicated alerts route using `#/alerts`;
- unread alert count and alert read/read-all actions;
- loading, empty, and error states.

This is the first real user-facing review and decision-tracking workflow. It is
now also includes a practical browser upload path. It is not a batch import,
live county sync, or automation workspace.

## Current API Surface

The current API surface is minimal:

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
- `GET /portfolio/:portfolioItemId`
- `PATCH /portfolio/:portfolioItemId`
- `DELETE /portfolio/:portfolioItemId`
- `POST /comparison`
- `GET /comparison`
- `PATCH /comparison/:comparisonItemId`
- `DELETE /comparison/:comparisonItemId`
- structured JSON 404 for unknown routes

Documented in:

- `docs/api/health.md`
- `docs/api/auth.md`
- `docs/api/datasets.md`
- `docs/api/scoring.md`
- `docs/api/jobs.md`
- `docs/api/alerts.md`
- `docs/api/watchlist.md`
- `docs/api/portfolio.md`
- `docs/api/comparison.md`

There is no standalone parcel API yet.

## Review Surface Versus Remaining Shell Areas

The current browser surface has moved past a pure shell for scoring review.
It still keeps the surrounding product deliberately narrow.

Real workflows now present:

- browser-based account registration;
- browser-based login;
- browser-based single CSV dataset upload through the authenticated API;
- dataset list/detail review for authenticated users;
- safe county import/fallback summary visibility on dataset list/detail;
- safe import readiness visibility on dataset list/detail;
- manual mapping repair for key fields from dataset headers;
- saving a repaired mapping as a private reusable import profile;
- auto-applied/suggested import profile visibility on dataset detail;
- explicit suggested-profile application;
- score triggering for a selected dataset;
- controlled refresh/reprocessing for a selected dataset;
- visible scoring job completion state after a scoring run;
- visible refresh requested/running/failed/completed state;
- visible manual-only versus policy-auto-refresh maintenance state;
- background scoring status polling after a scoring run is requested;
- scored-record table;
- record-level flags and reasoning review.
- enrichment and data-quality context for scored records.
- add/remove watchlist actions;
- watchlist shortlist comparison.
- portfolio tracking and status updates.
- comparison workspace, decision state, and lightweight notes.
- in-app alert review for scoring completions and failures.
- import readiness review before relying on score output.
- focused import repair before rerunning readiness/scoring.
- deterministic import profile reuse for repeated upload shapes.

Real workflows not present:

- settings;
- email/SMS alert delivery;
- realtime alerts.

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

- batch upload multiple files;
- manually remap columns beyond the focused critical-field repair workflow;
- edit individual row values or spreadsheet cells;
- run automation.
- configure scheduled maintenance policy.
- run unlimited automatic recurring refresh.
- manage county-wide shared import profile catalogs or live county sync.
- share import profiles globally or edit profile rules in a full management
  console.

The current API cannot:

- provide a standalone parcel/lien row API;
- persist user-owned parcel records outside scored-record outputs;
- deliver alerts outside the app;
- provide realtime worker status;
- show external enrichment/provider verification;
- perform broad scheduled refresh or sync;
- expose a user-facing scheduler console;
- provide broad county adapter coverage or scraping;
- provide a full spreadsheet transformation workflow;
- manage collaboration or auction execution.

## Where The Current Surface Could Mislead Contributors

The review, upload, watchlist, and portfolio surfaces could make future
contributors think automation workflows also exist. They do not.

The presence of browser auth, score review, and worker-backed scoring could make
contributors think the whole V1 app is implemented. It is not: batch upload,
settings, external delivery, and product automation are still future work.

The presence of a dataset model could make contributors think full parcel
ingestion exists. It does not.

The presence of one Maricopa-style import adapter could make contributors think
broad county-specific import coverage exists. It does not. The current browser
surface only exposes safe adapter/fallback summary metadata.

The presence of readiness status could make contributors think manual mapping or
data correction exists. Focused manual mapping now exists, but it is limited to
target-to-column repair metadata. It is not row editing or source data mutation.

The presence of import profiles could make contributors think broad import
automation exists. It does not. Profiles are private, deterministic,
target-to-column mapping reuse. There is no global profile catalog, ML mapping
suggestion engine, live sync, or ETL rule builder.

## Security Implications

The current browser surface now handles authenticated user-owned upload and
review data.
Security risk shifts toward protecting the token boundary, API authorization,
tenant-owned dataset/score queries, and file upload behavior. Risk increases
further when the repo adds:

- batch upload or raw file persistence workflows;
- alert or automation workflows.

The watchlist is now user-owned decision data and has its own backend ownership
checks. Portfolio tracking is also user-owned decision data and has backend
ownership checks. Comparison items and decision notes are also user-owned
decision data and have backend ownership checks. Internal jobs are user-owned
operational metadata and have backend ownership checks. Future changes must
preserve these boundaries.

Alerts are now user-owned monitoring records. They expose safe summaries only and
must not become raw logs or stack-trace displays. Future current-surface updates
must record both visible functionality and trust boundaries.

Dataset import summaries are also safe display metadata. They must not grow into
raw source-row previews, parser internals, or county identity claims based only
on user-provided labels.

Dataset readiness summaries are backend-computed safe metadata. They must not
become raw row previews, client-side scoring, or a substitute for server-side
ownership checks.

Dataset manual mappings are backend-validated safe metadata. They must not
become arbitrary browser-side row transforms or a way to bypass scoring
validation.

Dataset import profiles are tenant-owned configuration. They must not leak
mapping knowledge across users, silently rewrite source rows, or imply that a
filename/source label proves county identity.

## Update Rules

Update this file whenever:

- a new page becomes user-visible;
- a new API route is added;
- a shell element becomes a real workflow;
- auth/protected routes are introduced;
- current limitations change.
