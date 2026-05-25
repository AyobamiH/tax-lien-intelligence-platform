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
- no external enrichment or county-specific adapter exists yet.

## Phase 5: Scored Results Frontend Review Surface

Current status: implemented as the first browser review workflow.

Phase 5 includes:

- frontend scored parcel table backed by the Phase 4 scoring API;
- loading/empty/error states;
- score and reasoning display;
- filters and sorting only where needed;
- API and frontend tests.

Phase 5 does not include:

- browser CSV upload unless a separate upload phase is explicitly planned;
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

## Later Phases

Later phases may include:

- notes and decision history;
- richer filtering;
- import templates;
- enrichment;
- external alert delivery;
- scheduled ingestion;
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
10. automation.

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
