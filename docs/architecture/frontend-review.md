# Frontend Review Surface Architecture

## Scope

Phase 5 introduces the first real in-app review surface for scored datasets.
The frontend is no longer only a shell: it now authenticates against the API,
lists the signed-in user's datasets, opens a dataset, triggers scoring, and
renders scored records with flags and reasoning.

Implemented:

- browser login/register flow using the existing auth API;
- session-scoped JWT storage in `sessionStorage`;
- authenticated dataset list view;
- hash-based dataset detail route;
- scoring action for a selected dataset;
- scored results table;
- record detail surface with flags and reasoning;
- loading, empty, and error states;
- reusable review model helpers and unit tests.

Not implemented:

- browser CSV upload;
- watchlist;
- portfolio;
- automation;
- ML/AI features;
- final design polish or advanced filtering.

## Route Model

The current app keeps routing intentionally small and dependency-free.

Implemented hash routes:

- `#/datasets`
- `#/datasets/:datasetId`

This avoids adding a router before the app needs nested navigation. If future
phases add upload, watchlist, and portfolio pages, a router can be introduced
with tests and docs.

## API Boundary

The frontend calls only the existing authenticated API routes:

- `POST /auth/register`;
- `POST /auth/login`;
- `GET /auth/me`;
- `GET /datasets`;
- `GET /datasets/:datasetId`;
- `POST /datasets/:datasetId/score`;
- `GET /datasets/:datasetId/scores`.

The frontend does not accept or send trusted score values. Scores remain
server-derived.

## Review Table

The scored-record table is designed for dense comparison rather than decorative
dashboard presentation. It shows:

- record label or source row;
- investment score;
- risk score;
- confidence score;
- liquidity score;
- redemption probability;
- value coverage ratio;
- compact flags;
- first reasoning line.

The detail surface shows the full flag and reasoning arrays for the selected
record.

## Security Notes

The frontend stores the current JWT in `sessionStorage` so a page reload keeps
the review session available without long-lived local persistence. This is a
practical Phase 5 choice, not a final session architecture.

Authorization remains server-side:

- the frontend never sends `userId`;
- dataset and score access still depends on API ownership checks;
- auth failures clear the browser session;
- user-owned data is not mocked into the UI.

Known future hardening:

- production CORS should be restricted to known frontend origins;
- future upload UI must preserve the API's file validation and size limits;
- browser auth/session strategy should be revisited before broader public use.

## Drift Risks

Do not:

- add UI-only score fields not returned by the scoring API;
- imply watchlists or portfolio decisions exist;
- treat client-side filters as an authorization boundary;
- add mock records that look like real user data;
- duplicate scoring logic in the browser.

## Update Rules

Update this document when:

- frontend routing changes;
- CSV upload becomes a browser workflow;
- score table columns change;
- auth/session behavior changes;
- watchlist or portfolio pages become real.
