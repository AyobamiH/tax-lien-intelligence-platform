# Roadmap And Phase Boundaries KB

## What This File Governs

This file governs phase boundaries and dependency order. It prevents feature
sprawl by making clear what belongs now, what belongs later, and what must be
true before heavier product layers are added.

It does not replace issue planning or implementation specs.

## Delivery Workflow Boundary

The current delivery workflow is direct-to-`main` after local verification. A
phase should not be pushed until:

- `git diff --check` passes;
- `npm install` completes;
- `npm run typecheck` passes;
- `npm run test` passes;
- `npm run build` passes;
- the pre-push hook passes.

Pull requests may still be useful for visibility, but they are not the current
phase gate.

## Phase 1: Monorepo Baseline

Current status: complete.

Phase 1 includes:

- npm workspace monorepo;
- React/Vite/Tailwind frontend shell;
- Express/TypeScript API;
- MongoDB connection package;
- shared types package;
- scoring package placeholder;
- local MongoDB docker-compose;
- tests;
- docs;
- CI quality gate;
- baseline tag.

Phase 1 does not include:

- auth;
- user data;
- CSV upload;
- scoring implementation;
- watchlists;
- portfolio;
- automation.

## Phase 2: Authentication And Tenancy Foundation

Current status: implemented.

Phase 2 includes:

- user model;
- register endpoint;
- login endpoint;
- password hashing;
- JWT issuance;
- JWT verification middleware;
- `GET /auth/me`;
- protected route tests;
- invalid JWT tests;
- expired JWT tests;
- duplicate registration handling;
- multi-tenant ownership pattern.
- global API error handling.
- auth API and architecture docs.

Phase 2 should not include:

- CSV upload;
- scoring engine;
- watchlists;
- portfolio;
- background jobs;
- AI;
- automation.

Security focus:

- no trusted client `userId`;
- password hashing;
- safe JWT handling;
- protected routes;
- malformed input handling.

## Phase 3: CSV Upload And Dataset Storage

Current status: implemented as dataset foundation.

Phase 3 includes:

- authenticated CSV upload endpoint;
- file size/type limits;
- CSV parsing;
- header/shape validation;
- malformed row handling;
- empty CSV handling;
- dataset model;
- no full parcel/lien model yet unless the dataset foundation requires it;
- tenant-scoped persistence;
- upload API docs;
- ingestion edge-case tests.

Phase 3 does not include:

- advanced scoring;
- portfolio;
- automation;
- county-specific import wizard sprawl.
- full parcel/lien normalization beyond what the dataset foundation needs.
- duplicate parcel handling beyond future-direction docs, because parcel
  identity is not modeled yet.

Security focus:

- upload limits;
- validation before persistence;
- tenant ownership;
- safe error messages;
- no raw file leakage in logs.

## Phase 3B: Parcel/Lien Normalization

Current status: partially represented by the Phase 4 scoring normalization layer.
There is no standalone parcel/lien model yet.

Phase 3B should include:

- normalized parcel/lien row model;
- required domain field validation;
- duplicate parcel handling;
- row-level validation errors;
- tenant-scoped row queries.

The first scoring foundation now includes lightweight row normalization for
common uploaded fields. A richer parcel/lien normalization phase is still needed
before county-specific ingestion becomes a product promise.

## Phase 4: Scoring Engine

Current status: implemented as a first-pass explainable scoring foundation.

Phase 4 should include:

- pure scoring package implementation;
- modular scoring functions;
- score outputs;
- risk flags;
- reasoning;
- tenant-scoped scored-record persistence;
- authenticated score run and score retrieval endpoints;
- tests for high-quality, low-quality, landlocked, missing-data, and extreme
  ratio cases;
- docs explaining scoring behavior.

Phase 4 should not include:

- ML models;
- AI recommendations;
- external enrichment APIs;
- portfolio analytics.

Security/trust focus:

- explainability;
- no fake precision;
- clear missing-data warnings;
- deterministic logic;
- tenant ownership before scoring or returning scores.

Current limitation:

- the scoring model is rule-based and conservative, not final underwriting;
- internal source-row enrichment and one opt-in external Census Geocoder adapter
  now exist;
- one Maricopa-style county import adapter now exists for upload-time mapping,
  but no broad county adapter coverage or final underwriting model exists yet.

## Phase 5: Scored Results Frontend Review Surface

Current status: implemented as the first browser review workflow.

Phase 5 includes:

- frontend scored parcel table backed by the Phase 4 scoring API;
- loading/empty/error states;
- score and reasoning display;
- filters and sorting only where needed;
- API and frontend tests.

Phase 5 does not include:

- browser CSV upload, which is implemented later in Phase 17;
- complex portfolio workflows;
- automation dashboards;
- admin tooling.

## Phase 6: Watchlist System

Current status: implemented as the first decision workflow.

Phase 6 should include:

- add/remove watchlist endpoints;
- ownership checks for referenced scored records;
- watchlist UI;
- persistence across reloads;
- tests for cross-user access attempts;
- docs.

Implemented Phase 6 includes:

- tenant-owned watchlist item model;
- authenticated add/list/remove API routes;
- duplicate-safe add behavior;
- cross-user add/delete/list tests;
- frontend keep/remove actions from scored records;
- dedicated watchlist comparison page;
- watchlist detail with flags and reasoning.

Phase 6 should not include:

- full portfolio management;
- team permissions;
- automated bidding;
- AI.

## Phase 7: Portfolio And Status Tracking

Current status: implemented as the first post-shortlist operating layer.

Phase 7 includes:

- tenant-owned portfolio item model;
- authenticated add/list/detail/status/delete endpoints;
- ownership checks for referenced scored records and watchlist items;
- duplicate-safe portfolio adds;
- simple status model;
- frontend track/untrack actions from scored records;
- watchlist-to-portfolio promotion;
- dedicated portfolio status surface;
- portfolio detail with flags and reasoning;
- tests for cross-user access attempts and invalid references;
- docs.

Phase 7 should not include:

- automation;
- alerts;
- collaboration/team workflows;
- live auction execution;
- ML/AI;
- external data sync;
- accounting or complex analytics.

## Phase 8: Automation-Ready Internal Job Plumbing

Current status: implemented as internal execution plumbing, not full
automation.

Phase 8 includes:

- tenant-owned internal job model;
- job status lifecycle: `queued`, `running`, `completed`, `failed`;
- internal job store and service;
- safe job summaries and error metadata;
- authenticated job detail route;
- dataset scoring routed through a `dataset_scoring` job;
- frontend scoring job visibility after a scoring run;
- lifecycle, failure, and cross-user job tests;
- docs.

Phase 8 should not include:

- external schedulers;
- cron automation;
- background worker deployment;
- third-party queue infrastructure;
- email/SMS alerts;
- enrichment integrations;
- ML/AI;
- collaboration;
- live auction execution.

## Phase 9: Alerts And Monitoring Foundation

Current status: implemented as in-app visibility, not delivery automation.

Phase 9 includes:

- tenant-owned alert model;
- alert status lifecycle: `unread` and `read`;
- alert service and store;
- authenticated alert retrieval;
- authenticated alert read/read-all actions;
- safe alert creation from dataset scoring job completion/failure;
- frontend alerts route;
- unread alert count and read actions;
- alert ownership tests;
- docs.

Phase 9 does not include:

- email delivery;
- SMS delivery;
- realtime websockets;
- external schedulers;
- background workers;
- alert rules engine;
- admin observability dashboard;
- ML/AI;
- collaboration;
- live auction execution.

## Phase 10: Background Worker And Scheduler Groundwork

Current status: implemented as execution groundwork, not full automation.

Phase 10 includes:

- dedicated worker entrypoint for the API package;
- worker processor for queued internal jobs;
- queued job claiming with status transition protection;
- worker-driven execution for `dataset_scoring`;
- safe success/failure recording through the existing internal job service;
- existing scoring job alerts preserved;
- minimal internal scheduler module for local timed task registration;
- frontend job-status polling after scoring is requested;
- tests for worker execution, failure handling, stale job targets, job claiming,
  and scheduler behavior;
- docs.

Phase 10 does not include:

- external scheduler or cron provider;
- third-party queue infrastructure;
- worker fleet coordination;
- durable retry policy;
- email/SMS/realtime delivery;
- enrichment adapters;
- ML/AI;
- collaboration;
- live auction execution.

## Phase 11: Enrichment Adapter Foundation

Current status: implemented as internal source-data enrichment, not external
provider enrichment.

Phase 11 includes:

- enrichment service and adapter interface;
- `source_field_inference` adapter;
- inferred parcel id, lien amount, estimated value, property type, address, and
  data-quality context from uploaded fields;
- persisted enrichment metadata on scored records;
- enrichment-aware worker scoring path;
- frontend enrichment visibility in scored record detail;
- tests for enrichment behavior, weak data, safe adapter failure, and scoring
  improvement;
- docs.

Phase 11 does not include:

- third-party geocoding;
- external valuation providers;
- county live integrations;
- ML/AI enrichment;
- scheduled enrichment passes;
- collaboration;
- auction execution.

## Phase 12: First External Enrichment Integration

Current status: implemented as one controlled external enrichment path, not
broad provider coverage.

Phase 12 includes:

- async-capable enrichment adapter boundary;
- `census_geocoder` adapter for the U.S. Census Geocoder;
- opt-in environment config for Census geocoding;
- HTTPS provider config validation;
- timeout and per-job row limits;
- safe external result persistence on scored-record enrichment metadata;
- worker scoring path runs external enrichment inside the existing
  `dataset_scoring` execution boundary;
- frontend detail visibility for normalized external address/location context;
- tests for matched, no-match, timeout, skipped, and worker-persisted external
  enrichment behavior;
- docs.

Phase 12 does not include:

- multiple provider integrations;
- paid geocoding or valuation providers;
- county live integrations;
- ML/AI enrichment;
- scheduled enrichment passes;
- collaboration;
- auction execution.

## Phase 13: Enrichment Orchestration And Recency Foundation

Current status: implemented as operational maturity for the existing enrichment
layer, not provider expansion.

Phase 13 includes:

- explicit enrichment orchestration layer;
- ordered internal/external adapter execution;
- adapter outcomes for success, skipped, partial, and failed states;
- deliberate fallback records when Census geocoding is disabled, weak,
  unavailable, or fails;
- freshness metadata with source version, `enrichedAt`, `staleAt`,
  `reprocessAfter`, and reprocess eligibility;
- job summary enrichment counts and earliest reprocess timing;
- frontend detail visibility for adapter outcomes and freshness;
- tests for orchestration order, disabled fallback, no-match/timeout fallback,
  freshness evaluation, worker scoring continuity, and safe persistence.

Phase 13 does not include:

- new providers;
- provider marketplace/plugin framework;
- ML/AI enrichment;
- external scheduler or broad sync automation;
- collaboration;
- auction execution.

## Phase 14: Controlled Refresh And Reprocessing Workflow

Current status: implemented as a manual/user-triggered refresh workflow, not
autonomous recurring automation.

Phase 14 includes:

- authenticated `POST /datasets/:datasetId/refresh`;
- authenticated `GET /datasets/:datasetId/scoring-status`;
- refresh requests that enqueue `dataset_scoring` jobs with
  `requestKind: "refresh"`;
- duplicate-safe behavior that returns an active queued/running dataset job
  instead of creating duplicate refresh work;
- compact scoring status states: `not_scored`, `fresh`, `stale`,
  `refresh_requested`, `refresh_in_progress`, `refresh_failed`, and
  `refresh_completed`;
- frontend refresh action and status visibility on the dataset detail surface;
- refresh-aware alerts and safe job metadata;
- tests for refresh success, duplicate/in-progress behavior, unauthenticated and
  cross-user rejection, failure handling, and status visibility.

Phase 14 does not include:

- unlimited automatic recurring refresh;
- cron-based broad dataset sync;
- provider expansion;
- ML/AI refresh logic;
- email/SMS delivery;
- collaboration;
- auction execution.

## Phase 15: Scheduled Maintenance And Policy-Driven Auto-Refresh Foundation

Current status: implemented as bounded scheduled maintenance groundwork, not
unlimited autonomous refresh.

Phase 15 includes:

- `dataset_maintenance` internal job type;
- `maintenance_scan` request kind for scheduler-created maintenance jobs;
- `policy_refresh` request kind for maintenance-policy-created scoring jobs;
- stale dataset scanning based on scored-record freshness metadata;
- explicit server-side maintenance policy with manual-only default;
- per-run dataset cap;
- duplicate guards for active maintenance and scoring work;
- recent maintenance/refresh/failure suppression;
- safe maintenance job summaries and decisions;
- scoring status maintenance mode/message for the frontend;
- tests for policy evaluation, stale scan queuing, duplicate suppression,
  manual-only behavior, policy refresh creation, and recent failure suppression.

Phase 15 does not include:

- user-facing scheduler controls;
- unlimited autonomous refresh;
- external scheduler products;
- external provider expansion;
- broad county sync automation;
- email/SMS delivery;
- ML/AI policy engines;
- collaboration;
- auction execution.

## Phase 16: County-Specific Import Adapter Foundation

Current status: implemented as one deterministic county import adapter boundary,
not broad county coverage.

Phase 16 includes:

- county import adapter interface for uploaded CSV rows;
- `maricopa_tax_lien_v1` adapter for Maricopa-style tax lien CSV headers;
- generic CSV fallback for all non-matching uploads;
- safe import summary metadata on dataset responses;
- canonical mapping for parcel id, lien amount, estimated value, property type,
  and address when explicit header evidence is present;
- tests for adapter match, fallback, partial files, non-match behavior, and
  scoreability improvement;
- frontend dataset list/detail visibility for adapter/fallback context;
- docs.

Phase 16 does not include:

- broad county adapter coverage;
- live county sync;
- scraping;
- external provider import integrations;
- ML/AI import classification;
- browser upload UI;
- collaboration;
- auction execution.

## Phase 17: Browser Upload And Import Workflow

Current status: implemented as the first authenticated browser upload path, not
batch ingestion or automation.

Phase 17 includes:

- browser CSV upload form on the dataset surface;
- authenticated multipart upload through the existing `POST /datasets` API;
- optional source label submission;
- upload submitting, success, and error states;
- import summary visibility after upload;
- county adapter match/fallback visibility after upload;
- navigation into dataset review after successful upload;
- tests for upload API client behavior and import summary presentation;
- docs.

Phase 17 does not include:

- multi-file batch upload;
- drag-and-drop mega uploader;
- live county sync;
- scraping;
- ML/AI import classification;
- collaboration;
- auction execution.

## Phase 18: Import Validation And Scoring-Readiness Workflow

Current status: implemented as a read-only import quality and scoring-readiness
layer, not manual mapping or automation.

Phase 18 includes:

- backend-computed dataset readiness summaries;
- readiness statuses: `ready`, `partial`, `weak`, and `blocked`;
- canonical field coverage for parcel identifier, lien amount, estimated value,
  property type, and address context;
- readiness score and scoring recommendation;
- dataset-level warning/blocking issue summaries;
- frontend readiness badges on dataset list/upload success;
- dataset detail readiness panel with field coverage, top issues, and guidance;
- tests for strong, partial, weak, and blocked imports;
- docs.

Phase 18 does not include:

- manual field-mapping editor;
- spreadsheet transform tooling;
- broad county adapter coverage;
- live county sync;
- scraping;
- ML/AI import suggestions;
- collaboration;
- auction execution.

## Phase 19: Manual Mapping And Import Repair Workflow

Current status: implemented as focused critical-field repair, not spreadsheet
editing.

Phase 19 includes:

- dataset-owned manual mapping metadata;
- authenticated mapping context and save endpoints;
- validation for supported target fields and existing source columns;
- readiness re-evaluation after mapping changes;
- scoring path support for manual mapping overlays;
- frontend repair panel for not-ready datasets;
- tests for valid mappings, invalid targets, invalid columns, cross-user
  rejection, and scoring with repaired mappings;
- docs.

Phase 19 does not include:

- full spreadsheet editor;
- row-by-row editing;
- ML/AI mapping suggestions;
- broad county adapter expansion;
- live county sync;
- collaboration;
- auction execution.

## Phase 20: Reusable Import Profiles And Mapping Reuse

Current status: implemented as tenant-owned deterministic mapping reuse, not a
full ETL product.

Phase 20 includes:

- tenant-owned import profile model;
- authenticated profile list/save/apply endpoints;
- saving a scoring-ready dataset mapping as a reusable profile;
- deterministic header-signature matching during upload;
- conservative auto-apply only for high-confidence header-shape matches;
- suggested profile state when mapped columns match but the broader shape
  changed;
- explicit user confirmation path for suggested profiles;
- frontend profile visibility and focused save/apply controls;
- tests for profile save, reuse, false-positive avoidance, invalid profiles,
  and cross-user isolation;
- docs.

Phase 20 does not include:

- full rule-builder UI;
- ML/AI mapping suggestions;
- global/shared profiles;
- marketplace/profile sharing;
- live sync;
- spreadsheet editing;
- collaboration;
- auction execution.

## Phase 21: Comparison Workspace And Decision Notes

Current status: implemented.

Phase 21 includes:

- tenant-owned comparison item model;
- authenticated comparison add/list/update/delete API;
- source resolution from owned scored records, watchlist items, or portfolio
  items;
- duplicate-safe comparison adds;
- explicit decision states;
- bounded lightweight plain-text notes;
- compare actions from scored review, watchlist, and portfolio surfaces;
- dedicated `#/comparison` workspace;
- side-by-side comparison matrix;
- selected-item note, reasoning, and flag detail;
- cross-user comparison source/update/delete tests.

Phase 21 does not include:

- multiple saved workspaces;
- collaboration/team comments;
- audit trails;
- task/project management;
- rich text notes;
- spreadsheet comparison builders;
- auction execution;
- ML/AI decision suggestions.

## Later Phases

Later phases may include:

- richer decision history;
- richer filtering;
- richer import profile management;
- additional county import adapters after deterministic mapping tests;
- richer enrichment adapters;
- external enrichment provider hardening;
- external alert delivery;
- scheduled ingestion;
- external worker deployment hardening;
- team workflows;
- audit logs.

Later phases depend on secure auth, tenant-scoped data, ingestion, scoring, and
watchlists being stable.

## Dependency Order

Dependency order matters:

1. repo baseline;
2. auth;
3. tenant-owned dataset model and upload;
4. first-pass scoring foundation;
5. frontend review table;
6. watchlist;
7. portfolio;
8. internal job plumbing;
9. alerts and monitoring foundation;
10. background worker and scheduler groundwork;
11. enrichment adapter foundation;
12. controlled refresh/reprocessing workflow;
13. scheduled maintenance and policy-driven auto-refresh foundation;
14. county import adapter foundation;
15. browser upload and import workflow;
16. import validation and scoring-readiness workflow;
17. manual mapping and import repair workflow;
18. reusable import profile workflow;
19. comparison workspace and decision notes;
20. broader automation.

Do not invert this order without an explicit architecture decision.

## Anti-Bloat Logic

Every phase should produce a stable, tested, documented system. A narrower
complete feature is better than a broad half-built surface.

Avoid adding:

- speculative pages;
- unused packages;
- generic infrastructure;
- automation scaffolds;
- AI abstractions;
- admin panels;
- complex role systems;

before the current phase needs them.

## What Must Be True Before Heavy Automation

Before heavy automation:

- auth must be stable;
- tenant isolation must be tested;
- CSV ingestion must be reliable;
- scoring must be explainable;
- watchlist decisions must exist;
- portfolio/status tracking must exist;
- internal job boundaries must exist;
- in-app visibility for important job outcomes must exist;
- worker execution boundary must exist;
- deterministic import adapter behavior should exist for any county-specific
  source before automating it;
- import readiness should make weak or blocked datasets visible before broader
  automation depends on them;
- focused manual mapping should prove critical-field repair before broad import
  tooling or automation expands;
- reusable import profiles should remain tenant-owned and deterministic before
  broader mapping automation expands;
- job ownership and logging patterns must be designed;
- rate limits and failure handling must exist.

## Drift Risks

Roadmap drift risks:

- implementing Phase 4 before Phase 2/3;
- building UI ahead of API truth;
- adding automation before data quality;
- mixing future automation direction into V1;
- forgetting security tests in each phase.

## Update Rules

Update this file when:

- a phase completes;
- phase scope changes;
- dependencies change;
- a future capability becomes current work;
- security boundaries alter phase order.
