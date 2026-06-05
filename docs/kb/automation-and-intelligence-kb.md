# Automation And Intelligence KB

## What This File Governs

This file governs how automation and intelligence should be understood in this
product. It explains what belongs later, what should remain manual first, and how
automation should support the core SaaS rather than become a separate product.

## Current Reality

Current implementation:

- no broad external automation;
- no external background worker fleet;
- no AI;
- no ingestion pipeline;
- internal job plumbing exists;
- a dedicated worker entrypoint can claim and execute queued internal jobs;
- minimal scheduler groundwork exists for local timed task registration;
- dataset scoring runs through a worker-claimed `dataset_scoring` job;
- first-pass deterministic scoring engine exists;
- frontend review of scored records exists;
- watchlist shortlisting exists;
- portfolio/status tracking exists;
- comparison workspace and lightweight decision notes exist;
- lightweight comparison decision history exists;
- explicit user-driven comparison handoff exists;
- in-app alert records exist for scoring job completion/failure;
- notification preferences and provider-agnostic delivery classification exist
  for current scoring alert types;
- first internal enrichment adapter exists for uploaded source-row inference;
- controlled user-triggered dataset refresh/reprocessing exists through the
  worker job boundary;
- scheduled maintenance scans can create policy-gated maintenance jobs for stale
  scored datasets;
- policy auto-refresh exists only as an explicit server-side mode and is
  manual-only by default;
- county import adapter boundary exists with one Maricopa-style CSV adapter and
  a generic fallback;
- browser upload exists for authenticated single CSV imports;
- import readiness summaries exist to show weak/blocked imports before users
  rely on scoring or future automation;
- focused manual mapping repair exists for critical source-column mapping;
- reusable import profiles exist for deterministic tenant-owned mapping reuse;
- no portfolio automation, automated comparison recommendations, broad external
  monitoring, or provider-backed notification delivery.

The current repo establishes the monorepo, auth, dataset foundation, first-pass
scoring foundation, manual review surface, watchlist shortlist, portfolio
status tracking, comparison workspace, automation-ready internal job records, in-app alerts, and a
minimal worker/scheduler execution boundary. It also has enrichment
orchestration, a controlled manual refresh workflow for dataset reprocessing,
and scheduled maintenance groundwork with explicit policy gates. Broad product
automation is still intentionally absent. Phase 16 adds a deterministic
county-import boundary for one Maricopa-style CSV path, and Phase 17 exposes
manual browser upload, but neither adds broad county sync, scraping, or
automated ingestion. Phase 18 adds readiness visibility for uploaded data, but
it is still manual-first guidance, not automated field mapping. Phase 19 adds
human-controlled repair mapping. Phase 20 adds deterministic reuse of saved
mapping profiles, but it is still not broad automated import tooling. Phase 26
adds notification preference control and delivery-ready classification, but it
does not send external messages or introduce a provider platform.

## Why Automation Is Part Of The SaaS

Automation can eventually reduce repetitive data work:

- recurring county file ingestion;
- validation and normalization;
- score calculation;
- watchlist monitoring;
- alerting when records change;
- portfolio status tracking.

Automation is useful only if it improves trustworthy decision support.

## Why Automation Is Not A Separate Product

Automation should not become a standalone automation platform. It should be
embedded in the tax lien intelligence workflow and constrained by domain rules,
tenant isolation, and explainability.

The core product remains:

- upload or ingest data;
- understand risk;
- shortlist opportunities;
- track decisions.

Automation should serve that loop.

## Manual-First, Automation-Later Logic

The product should become reliable manually before automation is added.

Manual-first sequence:

1. auth;
2. upload;
3. validation;
4. storage;
5. scoring;
6. table review;
7. watchlist;
8. portfolio;
9. internal job plumbing;
10. in-app alert visibility;
11. worker execution boundary;
12. enrichment foundation;
13. controlled refresh/reprocessing;
14. scheduled maintenance policy groundwork;
15. county import adapter boundary;
16. import readiness and scoring-suitability visibility;
17. focused manual mapping repair;
18. reusable import profiles;
19. notification preference control;
20. then broader automation.

Automation before reliable manual workflows risks making errors faster and less
visible.

## Ingestion Automation

Future ingestion automation may include:

- repeat upload templates;
- county-specific mapping profiles;
- scheduled import reminders;
- validation presets.

Current ingestion intelligence is limited to one deterministic Maricopa-style
CSV adapter that can map APN, tax-due, value, property-use, and situs-address
headers into canonical internal fields before scoring. All other uploads fall
back to generic CSV handling.

Broader ingestion automation should not begin before CSV upload, validation,
deterministic adapter behavior, readiness visibility, and focused repair mapping
are solid.

## Enrichment Foundation

Current enrichment:

- runs inside worker-driven dataset scoring;
- runs through an explicit orchestration layer;
- uses uploaded source-row data and, when enabled, one controlled external
  Census Geocoder adapter;
- infers missing core fields from alternate headers;
- records adapter outcomes for success, skipped, partial, and failed states;
- records freshness and reprocess-after metadata for later scheduled
  re-enrichment;
- exposes a manual refresh path that safely reruns enrichment/scoring through a
  dataset job;
- exposes a scheduled maintenance path that can inspect stale freshness metadata
  and queue policy refresh only when server policy allows it;
- records safe external address/location context without raw provider payloads;
- persists safe enrichment metadata on scored records;
- improves scoring confidence when uploaded data is inconsistent.

Future enrichment may include:

- property type improvement;
- location quality hints;
- value confidence scoring;
- public record linking;
- geographic indicators.
- additional external providers after provider-specific security design.

Enrichment must label source, confidence, outcome, and freshness. It must not
silently overwrite user or source data without traceability. External enrichment
must stay bounded, timeout-controlled, opt-in, and rerun-ready without unbounded
loops.

## Scoring And Reasoning Automation

Scoring is the first intelligence layer, but it should be deterministic and
explainable before any machine-learning or AI layer is considered.

The scoring package should expose:

- scores;
- flags;
- reasoning;
- confidence warnings.

## Monitoring And Alerting

Current monitoring:

- scoring job completion alerts;
- scoring job failure alerts;
- unread/read state in the app.

Future monitoring could alert users about:

- upload validation issues;
- watchlist status changes;
- portfolio review deadlines;
- stale data.

Alerts must be user-scoped and avoid leaking tenant data. Current alerts are
in-app only; external delivery is later work.

## Watchlist Assistance

Future assistance may suggest:

- records similar to watchlisted parcels;
- high-risk items to remove;
- records needing more diligence.

This should be advisory only. It must not imply the system is making final
investment decisions.

## County-File Reality Versus Clean API Fantasy

County data is often inconsistent. The product should expect:

- missing fields;
- inconsistent column names;
- malformed rows;
- duplicate parcels;
- strange numeric formats;
- outdated values;
- inconsistent property classifications.

Phase 16 starts addressing this reality through a county import adapter boundary,
not through scraping or provider automation. A county adapter should be explicit,
test-backed, deterministic, and honest about confidence/warnings. Automation
must be built around messy files rather than assuming clean third-party APIs.

## What Belongs Later Versus Now

Now:

- repo foundation;
- auth;
- manual upload;
- first-pass scoring;
- frontend scored-results review;
- watchlist shortlisting.
- portfolio/status tracking.
- comparison workspace and decision notes.
- lightweight comparison decision history.
- explicit user-driven decision handoff.
- internal job plumbing for scoring.
- in-app alerts for scoring job outcomes.
- worker-driven execution for queued scoring jobs.
- minimal scheduler foundation for local task polling.
- source-row enrichment before scoring.
- one opt-in external Census Geocoder enrichment path.
- controlled refresh/reprocessing for user-owned datasets.
- scheduled maintenance scans and policy-gated refresh creation.
- one Maricopa-style county import adapter with generic CSV fallback.
- browser upload for one CSV at a time.
- import readiness summaries for field coverage, warnings, and scoring
  recommendation.
- focused manual mapping repair for critical fields.
- reusable import profiles for future uploads with matching source columns.

Later:

- scheduled ingestion;
- batch upload if product demand justifies it;
- additional county adapters after deterministic mapping tests;
- broader mapping/profile management after current private profile reuse earns
  it;
- user-facing refresh policy controls;
- broader automatic recurring refresh;
- additional external enrichment providers;
- external alert delivery;
- external worker orchestration;
- portfolio automation;
- AI or ML assistance.

Internal jobs, the worker, and scheduled maintenance scans are not full
automation by themselves. They are the execution boundary and policy layer that
later automation can use safely. In-app alerts are visibility records, not
delivery automation.

## Security Expectations

Future automation must include:

- tenant-scoped job records;
- ownership checks;
- idempotency;
- failure states;
- rate limits;
- safe logging;
- no secret leakage;
- no cross-user data mixing.

## Drift Risks

Automation drift risks:

- adding jobs before core workflows exist;
- hiding errors behind background processes;
- introducing AI before deterministic scoring is trusted;
- treating county data as clean;
- treating one county adapter as broad county coverage;
- logging sensitive dataset content;
- making investment recommendations without explainability.

## Update Rules

Update this file when:

- background jobs are introduced;
- job types are added;
- worker execution changes;
- scheduler behavior changes;
- ingestion automation is added;
- scoring changes substantially;
- enrichment is added;
- alerts or portfolio automation become real.
