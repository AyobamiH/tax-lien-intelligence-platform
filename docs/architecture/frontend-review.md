# Frontend Review Surface Architecture

## Scope

Phase 5 introduces the first real in-app review surface for scored datasets.
Phase 6 extends that surface with watchlist actions and a dedicated shortlist
comparison page. Phase 7 adds a portfolio/status tracking surface for records
promoted from scoring review or the watchlist. Phase 9 adds an in-app alerts
surface for important scoring job outcomes.
The frontend is no longer only a shell: it now authenticates against the API,
lists the signed-in user's datasets, opens a dataset, triggers scoring, and
renders scored records with flags and reasoning.

Implemented:

- browser login/register flow using the existing auth API;
- session-scoped JWT storage in `sessionStorage`;
- authenticated dataset list view;
- hash-based dataset detail route;
- scoring action for a selected dataset;
- scoring job completion message after a score run;
- scored results table;
- record detail surface with flags and reasoning;
- watchlist keep/remove actions on scored records;
- dedicated watchlist route and comparison surface;
- portfolio track/untrack actions on scored records;
- watchlist-to-portfolio promotion action;
- dedicated portfolio route and status tracking surface;
- dedicated alerts route with unread/read state;
- alert links back to related datasets when available;
- loading, empty, and error states;
- reusable review model helpers and unit tests.

Not implemented:

- browser CSV upload;
- email/SMS alert delivery;
- automation;
- ML/AI features;
- final design polish or advanced filtering.

## Route Model

The current app keeps routing intentionally small and dependency-free.

Implemented hash routes:

- `#/datasets`
- `#/datasets/:datasetId`
- `#/watchlist`
- `#/portfolio`
- `#/alerts`

This avoids adding a router before the app needs nested navigation. If future
phases add upload and settings pages, a router can be introduced with tests and
docs.

## API Boundary

The frontend calls only the existing authenticated API routes:

- `POST /auth/register`;
- `POST /auth/login`;
- `GET /auth/me`;
- `GET /datasets`;
- `GET /datasets/:datasetId`;
- `POST /datasets/:datasetId/score`;
- `GET /datasets/:datasetId/scores`;
- `GET /jobs/:jobId`;
- `POST /watchlist`;
- `GET /watchlist`;
- `DELETE /watchlist/:watchlistItemId`;
- `POST /portfolio`;
- `GET /portfolio`;
- `GET /portfolio/:portfolioItemId`;
- `PATCH /portfolio/:portfolioItemId`;
- `DELETE /portfolio/:portfolioItemId`;
- `GET /alerts`;
- `PATCH /alerts/:alertId/read`;
- `PATCH /alerts/read-all`.

The frontend does not accept or send trusted score values. Scores remain
server-derived. Scoring now returns internal job metadata; the frontend displays
only the safe job id/status summary.

Alert APIs return safe monitoring summaries. The frontend does not render raw
job payloads, stack traces, or diagnostic internals.

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

## Watchlist Surface

The watchlist surface is comparison-oriented rather than decorative. It shows:

- kept record label;
- dataset reference;
- investment, risk, confidence, liquidity, redemption, and coverage values;
- compact flags;
- remove action;
- detail panel with full reasoning and flags.

It is a shortlist foundation. Portfolio/status tracking is now a separate Phase
7 surface. The watchlist itself is not notes, tags, alerts, auction execution,
or accounting.

## Portfolio Surface

The portfolio surface is operational rather than decorative. It shows:

- tracked record label;
- source dataset reference;
- whether the item came from the watchlist or score review;
- portfolio status;
- investment, risk, confidence, liquidity, and coverage values;
- compact flags;
- status update and remove actions;
- detail panel with full reasoning, flags, tracked timestamp, and status update
  timestamp.

It is a decision/status foundation. It is not P&L tracking, accounting, live
auction execution, alerts, or collaboration.

## Alerts Surface

The alerts surface is informational rather than noisy. It shows:

- unread alert count;
- recent scoring completion/failure alerts;
- severity;
- safe message;
- related job/dataset identifiers;
- read/read-all actions;
- dataset navigation when the alert references a dataset.

It is not email delivery, realtime notifications, an admin logs console, or a
generic event feed.

## Security Notes

The frontend stores the current JWT in `sessionStorage` so a page reload keeps
the review session available without long-lived local persistence. This is a
practical Phase 5 choice, not a final session architecture.

Authorization remains server-side:

- the frontend never sends `userId`;
- dataset and score access still depends on API ownership checks;
- watchlist actions still depend on backend ownership checks;
- portfolio actions still depend on backend ownership checks;
- alert reads and acknowledgements still depend on backend ownership checks;
- auth failures clear the browser session;
- user-owned data is not mocked into the UI.

Known future hardening:

- production CORS should be restricted to known frontend origins;
- future upload UI must preserve the API's file validation and size limits;
- browser auth/session strategy should be revisited before broader public use.

## Drift Risks

Do not:

- add UI-only score fields not returned by the scoring API;
- imply accounting, realized returns, or auction execution exist;
- treat client-side filters as an authorization boundary;
- add mock records that look like real user data;
- duplicate scoring logic in the browser.
- render raw alert metadata as if it were a diagnostic log.

## Update Rules

Update this document when:

- frontend routing changes;
- CSV upload becomes a browser workflow;
- score table columns change;
- auth/session behavior changes;
- watchlist, portfolio, or alerts pages become real.
