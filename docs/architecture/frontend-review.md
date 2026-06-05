# Frontend Review Surface Architecture

## Scope

Phase 5 introduces the first real in-app review surface for scored datasets.
Phase 6 extends that surface with watchlist actions and a dedicated shortlist
comparison page. Phase 7 adds a portfolio/status tracking surface for records
promoted from scoring review or the watchlist. Phase 9 adds an in-app alerts
surface for important scoring job outcomes. Phase 14 adds controlled refresh
actions and scoring freshness/status visibility on the dataset detail surface.
Phase 15 adds compact maintenance policy status so the page can distinguish
manual-only refresh from policy-auto-refresh eligibility without showing raw
scheduler internals. Phase 17 adds browser dataset upload on the authenticated
dataset surface, including import summary and county-adapter/fallback
visibility after upload. Phase 18 adds import readiness status, field coverage,
issues, and guidance on the upload/list/detail surfaces. Phase 19 adds a
focused manual mapping repair panel for datasets that are not ready. Phase 20
adds import profile reuse visibility plus focused save/apply actions for
reusable mapping profiles. Phase 21 adds compare actions plus a dedicated
side-by-side comparison workspace with lightweight decision notes.
The frontend is no longer only a shell: it now authenticates against the API,
uploads CSV datasets, lists the signed-in user's datasets, opens a dataset,
triggers scoring, renders scored records with flags and reasoning, and supports
watchlist, portfolio, alerts, and comparison review surfaces.

Implemented:

- browser login/register flow using the existing auth API;
- session-scoped JWT storage in `sessionStorage`;
- browser CSV upload form on the dataset surface;
- upload submitting, success, and error states;
- import summary visibility after upload;
- import readiness visibility after upload;
- county adapter match/fallback visibility after upload;
- authenticated dataset list view;
- hash-based dataset detail route;
- scoring action for a selected dataset;
- controlled refresh action for an already scored dataset;
- scoring/refresh status badge and stale-record count;
- maintenance mode/message from `GET /datasets/:datasetId/scoring-status`;
- dataset readiness badge and readiness panel from `DatasetResponse`;
- focused manual mapping controls for critical import fields;
- import profile status visibility for not-used, suggested, auto-applied, and
  user-applied profile reuse;
- save-current-mapping-as-profile action;
- apply-suggested-profile action;
- scoring job completion message after a score run;
- scored results table;
- record detail surface with flags and reasoning;
- watchlist keep/remove actions on scored records;
- dedicated watchlist route and comparison surface;
- portfolio track/untrack actions on scored records;
- watchlist-to-portfolio promotion action;
- dedicated portfolio route and status tracking surface;
- compare actions from scored records, watchlist rows, and portfolio rows;
- dedicated comparison route with side-by-side matrix;
- comparison decision selector and bounded note editor;
- selected comparison item decision history timeline;
- selected comparison item handoff actions to watchlist and portfolio;
- dedicated alerts route with unread/read state;
- alert links back to related datasets when available;
- loading, empty, and error states;
- reusable review model helpers and unit tests.

Not implemented:

- SMS/push alert delivery;
- scheduled digest email delivery;
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
- `#/comparison`
- `#/alerts`

This avoids adding a router before the app needs nested navigation. If future
phases add settings pages, batch upload, or nested import review routes, a
router can be introduced with tests and docs.

## API Boundary

The frontend calls only the existing authenticated API routes:

- `POST /auth/register`;
- `POST /auth/login`;
- `GET /auth/me`;
- `POST /datasets`;
- `GET /datasets`;
- `GET /datasets/:datasetId`;
- `GET /datasets/:datasetId/mapping`;
- `PATCH /datasets/:datasetId/mapping`;
- `GET /datasets/import-profiles`;
- `POST /datasets/:datasetId/import-profile`;
- `POST /datasets/:datasetId/import-profile/apply`;
- `POST /datasets/:datasetId/score`;
- `POST /datasets/:datasetId/refresh`;
- `GET /datasets/:datasetId/scoring-status`;
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
- `POST /comparison`;
- `GET /comparison`;
- `PATCH /comparison/:comparisonItemId`;
- `GET /comparison/:comparisonItemId/history`;
- `POST /comparison/:comparisonItemId/handoff/watchlist`;
- `POST /comparison/:comparisonItemId/handoff/portfolio`;
- `DELETE /comparison/:comparisonItemId`;
- `GET /alerts`;
- `PATCH /alerts/:alertId/read`;
- `PATCH /alerts/read-all`.

The frontend does not accept or send trusted score values. Scores remain
server-derived. Scoring and refresh requests return internal job metadata; the
frontend displays only the safe job id/status/request-kind summary.

Alert APIs return safe monitoring summaries. The frontend does not render raw
job payloads, stack traces, or diagnostic internals.

Dataset upload uses the existing authenticated `POST /datasets` multipart API.
The frontend sends a CSV file and optional source label only; it does not send
`userId`, trusted normalized fields, or score values. Upload success displays
the returned dataset import summary and readiness summary so users can see
whether generic fallback or the current county adapter handled the file, how
complete recognized fields are, and whether scoring is recommended.

The frontend displays readiness as user guidance only. It does not run its own
field-mapping logic, override backend readiness, or invent score values.

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

## Import Readiness Surface

The dataset list and upload success states show compact readiness labels. The
dataset detail page shows:

- readiness status and score;
- scoring recommendation guidance;
- field coverage for parcel identifier, lien amount, estimated value, property
  type, and address context;
- top readiness issues ordered by severity;
- safe guidance returned by the API.

This surface helps users spot weak imports before relying on scores. It is not a
manual field-mapping editor, spreadsheet transformation tool, or broad county
adapter management interface.

## Manual Mapping Repair Surface

The dataset detail readiness panel now exposes a focused repair form when the
dataset is not ready or already has manual mappings.

The form lets users map available source columns to:

- parcel id;
- lien amount;
- estimated value;
- property type;
- address.

Saving the form calls the authenticated dataset mapping API, receives the
updated dataset response, and shows the re-evaluated readiness state. Existing
scoring controls remain the way to run or refresh scoring after repair.

The UI distinguishes manual mapping from automatic adapter mapping, but it does
not provide row-by-row editing, data-grid transforms, or AI suggestions.

## Import Profile Reuse Surface

The dataset detail readiness panel now shows reusable profile state returned by
the API:

- no profile used;
- profile suggested;
- profile auto-applied;
- profile confirmed by the user.

When mappings exist, the panel can save the current repair as a private reusable
import profile. When the backend suggests a compatible profile, the panel lets
the user apply it explicitly. Profile-derived mappings are labelled separately
from manual mappings so users can see whether readiness improved because of
prior import knowledge or a fresh manual repair.

The frontend does not implement a profile marketplace, rule builder, global
profile search, ML suggestion layer, or full profile management console.

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

## Comparison Surface

The comparison surface is side-by-side decision support rather than a
spreadsheet builder. It shows:

- compared record label and source layer;
- decision state;
- investment, risk, confidence, liquidity, redemption, and coverage values;
- lien/value/type context;
- compact flags and reasoning;
- note preview;
- selected-item detail with full flags, reasoning, bounded note editing, and
  lightweight decision/note history;
- explicit handoff controls with duplicate/result visibility and destination
  navigation.

It is a lightweight decision workspace. It is not team comments, legal-grade
audit history, rich text, task management, workflow automation, auction
execution, or ML/AI recommendation.

## Alerts Surface

The alerts surface is informational rather than noisy. It shows:

- unread alert count;
- recent scoring completion/failure alerts;
- severity;
- safe message;
- related job/dataset identifiers;
- read/read-all actions;
- dataset navigation when the alert references a dataset.

It is not a realtime notification center, an admin logs console, or a generic
event feed. Email delivery is handled server-side through the notification
delivery foundation when preferences and SMTP config allow it.

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
- refresh requests still depend on backend dataset ownership checks;
- browser upload still depends on the backend file/type/size/parse guardrails;
- import readiness display depends on backend-computed safe summaries;
- manual mapping repair depends on backend validation and never sends `userId`;
- auth failures clear the browser session;
- user-owned data is not mocked into the UI.

Known future hardening:

- production CORS should be restricted to known frontend origins;
- browser auth/session strategy should be revisited before broader public use.

## Drift Risks

Do not:

- add UI-only score fields not returned by the scoring API;
- imply accounting, realized returns, or auction execution exist;
- treat client-side filters as an authorization boundary;
- add mock records that look like real user data;
- duplicate scoring logic in the browser.
- render raw alert metadata as if it were a diagnostic log.
- turn refresh into a client-side automation loop.
- treat upload import summaries as raw source row previews or broad county
  verification.
- treat readiness warnings as browser-generated truth or as a substitute for
  backend scoring and ownership checks.
- turn manual mapping into a client-side source-row mutation system.

## Update Rules

Update this document when:

- frontend routing changes;
- CSV upload becomes a browser workflow;
- import readiness/validation surfaces change;
- score table columns change;
- auth/session behavior changes;
- watchlist, portfolio, or alerts pages become real.
- refresh status or dataset review actions change.
