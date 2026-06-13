# Master Product KB

## What This File Governs

This file governs product identity and direction for the Tax Lien Intelligence
Platform. It explains what the SaaS is trying to become, what it is not, and how
future features should be judged against the product purpose.

It does not govern exact API schemas, implementation details, or UI component
choices. Those belong in the repo, API docs, frontend direction KB, backend
direction KB, and shared contract KB.

## Current Product Identity

The Tax Lien Intelligence Platform is intended to be a multi-tenant SaaS that
turns county parcel and tax lien datasets into structured investment decisions.

The product is not yet fully implemented. The current repo now includes the
baseline, auth foundation, dataset upload foundation, first-pass scoring
foundation, frontend scored-results review surface, watchlist decision workflow,
portfolio/status tracking foundation, automation-ready internal job plumbing,
in-app alerts/monitoring foundation, and a background worker/scheduler
groundwork layer. Phase 11 adds internal source-row enrichment before scoring.
Phase 14 adds controlled dataset refresh/reprocessing on top of the job and
enrichment foundations. Phase 15 adds bounded scheduled maintenance groundwork
with explicit refresh policy gates. Phase 16 adds the first county import
adapter boundary with one Maricopa-style CSV adapter and generic fallback. Phase
17 adds authenticated browser upload for manual CSV imports. Phase 18 adds
import validation/readiness guidance before users rely on scores. Phase 19 adds
focused manual mapping repair for weak or blocked imports. Phase 20 adds
tenant-owned reusable import profiles so repeated upload shapes can reuse known
mapping repairs deterministically. Phase 21 adds a side-by-side comparison
workspace with lightweight decision notes. Phase 22 adds lightweight decision
history for comparison decision/note changes. Phase 23 adds explicit decision
handoff from comparison into watchlist and portfolio. Phase 24 adds an
operational portfolio dashboard with status distribution, recent activity, and
needs-attention summaries. Phase 25 adds tenant-owned saved views and practical
attention queues for returning to reusable operational work slices. Phase 26
adds tenant-owned notification preferences and delivery-ready classification
for current scoring alerts. Phase 27 adds the first email delivery foundation
for supported product alerts with env-driven SMTP config, outbox tracking, and
digest-ready grouping. Phase 28 adds bounded scheduled digest processing,
tenant-owned digest batch records, send-time preference checks, and an
authenticated delivery history surface.
Phase 29 adds the first company-ready workspace layer with persistent
memberships, minimal owner/admin/member roles, shared operating-data access,
and a lightweight workspace management surface. It is not a full collaboration
suite.
Phase 30 adds a focused workspace activity feed so members can see meaningful
recent shared actions, who performed them, when they occurred, and where to
continue. It is not chat or compliance-grade audit tooling.
Phase 31 adds bounded, entity-linked workspace comments on datasets,
comparison items, watchlist items, and portfolio items. It is a plain-text
context layer, not chat, rich text, mentions, or realtime communication.
Phase 32 adds per-member unread discussion attention and low-noise comment
alerts through existing personal preferences and delivery infrastructure. It
does not add a team inbox, realtime chat, push/SMS, or AI collaboration.
Phase 33 adds one current responsible workspace member on datasets, comparison
items, watchlist items, and portfolio items, plus a personal assigned-to-me
queue. It is responsibility signaling, not task management.
Phase 35 makes the shared workspace governable with owner-only role changes,
role-aware member deactivation, protected ownership, explicit restricted
states, and owner/admin-only assignment changes. It is permission hardening,
not enterprise IAM.
The product identity is visible through the README, package description,
architecture docs, and frontend review/watchlist/portfolio/comparison surfaces.

Current evidence:

- the README describes a production-grade multi-tenant SaaS for county parcel and
  tax lien data;
- the root package describes scoring tax lien and parcel datasets;
- the frontend lets signed-in users upload a CSV and see import/fallback
  results and readiness guidance;
- the frontend lets signed-in users repair critical field mappings when an
  import is not ready;
- the frontend review surface lets signed-in users inspect scored records,
  flags, and reasoning;
- the watchlist surface lets signed-in users keep and compare scored records;
- the portfolio surface lets signed-in users track active decisions with
  simple status and review status distribution, recent changes, and
  needs-attention signals;
- the comparison surface lets signed-in users compare selected records side by
  side, mark lightweight decisions, save bounded notes, and inspect recent
  decision/note history;
- decision handoff lets signed-in users deliberately send compared records into
  watchlist or portfolio while preserving saved rationale in history;
- internal job records and the worker path make scoring execution explicit
  without adding external automation;
- controlled refresh lets users deliberately rerun scoring/enrichment without
  creating autonomous automation;
- scheduled maintenance can surface stale scoring state and, when explicitly
  enabled by server policy, queue distinguishable policy refresh work;
- the county import adapter boundary can improve mapping for one
  Maricopa-style CSV shape without claiming broad county coverage;
- internal enrichment improves uploaded-row interpretation without claiming
  external verification;
- in-app alerts make scoring job outcomes visible, and supported product alerts
  can send immediate email when preferences and SMTP config allow it;
- supported digest alerts can be grouped into bounded scheduled email batches,
  with owner-safe delivery and batch history in the app;
- workspace members can deliberately share the core review/decision operating
  context with role-aware access while personal notification/settings data
  remains private.
- workspace members can review bounded operational activity across datasets,
  decisions, portfolio status, and membership without exposing notes or raw
  system internals.
- workspace members can discuss specific shared records with visible actor and
  timestamp context without leaving the product.
- workspace members can see bounded unread discussion state and receive at most
  one alert per unread cycle without exposing comment text in notifications.
- workspace members can assign current responsibility for supported records and
  return to their own bounded assignment queue.
- workspace owners/admins can manage active access within explicit role limits,
  while members can see who is present and which administration actions are
  intentionally restricted.

## What This SaaS Is

This is a decision-support platform for tax lien and parcel opportunity review.
The system should help users move from raw county data to a more disciplined
shortlist of opportunities.

The intended product loop is:

1. a user signs in;
2. the user uploads a county parcel or lien dataset;
3. the system parses and validates the dataset;
4. the system applies a deterministic county adapter when explicit headers
   match, or falls back to generic CSV handling;
5. the system reports import readiness and scoring suitability;
6. the user can repair critical field mappings when the import is weak or
   blocked;
7. dataset/source rows are stored under the selected workspace boundary;
8. the scoring engine evaluates opportunity quality and risk;
9. the user reviews scored rows with explanations and warnings;
10. the user adds promising items to a watchlist;
11. the user tracks decisions over time;
12. the user compares selected candidates side by side and records a short
    decision note;
13. the user sees important scoring outcomes in an in-app alert surface;
14. the user can deliberately refresh stale or weak scoring/enrichment state.
15. the system can identify stale scored datasets for bounded maintenance
    review without becoming an unlimited automation product.

This loop is partially implemented. Auth, dataset upload APIs, internal source
row storage, first-pass score APIs, browser score review, watchlist
shortlisting, portfolio/status tracking, internal job plumbing, in-app alerts,
worker-driven scoring execution, source-row enrichment, and controlled refresh
exist. Bounded scheduled maintenance groundwork now exists. One
Maricopa-style county import adapter exists. Browser CSV upload and import
readiness guidance now exist. Focused manual field mapping repair now exists.
Reusable import profiles, comparison, the workspace-access foundation, activity,
contextual comments, bounded discussion attention, and current responsibility
assignments now exist. Role-aware workspace administration and permission
hardening now exist. Broad county
coverage, live county sync, full spreadsheet editing, realtime chat, rich-text
collaboration, compliance audit tooling, ML mapping suggestions, SMS/push alert delivery, user-facing
scheduler policy controls, broader automatic refresh, advanced digest
scheduling/templates/retries, and richer automation remain future direction.

## What This SaaS Is Not

This product is not:

- a guaranteed investment return engine;
- a legal, tax, or financial advice system;
- a foreclosure automation product;
- a scraper-first automation platform;
- an AI-first product;
- a single-user desktop script;
- a generic spreadsheet viewer;
- a county data marketplace;
- a replacement for due diligence.

Future copy and UI must avoid implying that the software can guarantee profit,
eliminate diligence, or make investment decisions on behalf of the user.

## Category And Positioning

Category direction:

- tax lien intelligence;
- parcel dataset analysis;
- underwriting support;
- investment decision workflow;
- multi-tenant SaaS for operators.

Positioning direction:

The platform should feel like an operator-grade underwriting workspace. It should
help users inspect noisy public data, understand risk, and prioritize the liens
or parcels worth deeper review.

It should not feel like a speculative trading game, a flashy AI toy, or a
marketing site pretending to be a product.

## Target Users

Likely target users:

- tax lien investors;
- small real-estate investment operators;
- analysts reviewing county parcel data;
- teams managing lien opportunity pipelines;
- individual investors who need structure and discipline.

This is inferred from product docs and repo naming. No implemented persona system
or onboarding flow exists yet.

## Value Proposition

The intended value proposition is:

- reduce manual spreadsheet chaos;
- identify safer, higher-quality opportunities faster;
- explain why an opportunity scores well or poorly;
- separate investable-looking records from risky or incomplete records;
- preserve user decisions in a repeatable workflow.

The value is decision quality, not just speed.

## Core User Loop

Future core loop:

1. Upload dataset.
2. Validate and normalize rows.
3. Store tenant-owned parcel/lien records.
4. Score each opportunity.
5. Show score, risk, liquidity, redemption likelihood, flags, and reasoning.
6. Let the user filter, inspect, and shortlist.
7. Persist watchlist and decisions.
8. Let the user return later and continue from saved state.

Current implementation:

- dataset upload endpoint and browser upload form exist for authenticated
  manual CSV metadata and validation;
- import readiness summaries exist for field coverage, warnings, and scoring
  recommendation guidance;
- focused manual mapping repair exists for critical field targets;
- reusable import profiles exist for private deterministic mapping reuse;
- internal source rows are stored for scoring;
- first-pass explainable scoring exists through API routes;
- frontend review of scored results exists;
- watchlist shortlisting exists;
- portfolio/status tracking exists;
- portfolio dashboard summaries exist for operational review;
- saved views exist for private reusable portfolio/comparison filters and
  built-in attention queues;
- notification preferences exist for scoring, workspace-discussion, and
  workspace-assignment alert types;
- env-driven immediate email delivery exists for supported product alerts when
  SMTP config is complete;
- side-by-side comparison with lightweight decision notes and decision history
  exists;
- explicit comparison-to-watchlist/portfolio handoff exists;
- scoring execution is recorded through internal jobs and processed by the
  worker path;
- scoring now uses internal source-row enrichment before final score generation;
- scoring can use opt-in Census Geocoder enrichment for safe address/location
  context;
- enrichment now records adapter outcomes, fallback state, and freshness for
  future reprocessing readiness;
- controlled refresh/reprocessing now exists for workspace-shared datasets;
- one Maricopa-style county import adapter now exists for safer upload-time
  mapping of common county headers;
- scoring job outcomes create in-app alerts;
- peer comments create bounded personal alerts and per-thread unread counts;
- direct assignment creates a bounded alert for the new assignee and meaningful
  responsibility activity;
- no standalone parcel/lien schema;
- no chat, rich-text/realtime comments, shared editing, task status/due dates,
  approval
  collaboration, final
  investment decision, auction, or accounting workflow.
- workspace activity exists as a bounded shared-awareness feed, not an
  immutable audit trail.

## Trust Philosophy

This product must earn trust by showing its work.

Tax lien investing involves downside risk. The platform should make risk visible
instead of hiding it behind a single score. Every score should eventually include
reasoning and warnings that a user can inspect.

Trust requires:

- clear data provenance;
- transparent scoring factors;
- warnings for missing or low-confidence data;
- strong tenant isolation;
- plain explanations;
- no fake precision;
- no unsupported claims.

## Why Explainability Matters

Explainability is central because users are making investment decisions. A score
without reasoning can encourage blind trust.

The eventual scoring system should explain:

- why value coverage is strong or weak;
- why a property type helps or hurts the score;
- whether access/usability creates hard risk;
- how missing data reduces confidence;
- why redemption likelihood is estimated high or low;
- why liquidity may be strong or weak.

Current implementation truth: the scoring package now produces first-pass,
rule-based scores, flags, and reasoning. It is intentionally conservative and
not a final institutional underwriting model.

## Why This Is A Decision-Support System

The product should help users make better decisions. It should not make final
investment decisions for them.

The system can rank, flag, explain, and organize. It should not imply that a
parcel is safe to bid without independent due diligence.

Decision-support wording is safer and more accurate than autonomous-investment
wording.

## Product Principles

- Current truth over aspirational claims.
- Tenant isolation before user-owned workflows.
- Manual-first before automation.
- Explainability before ranking polish.
- Data validation before scoring.
- Security and trust boundaries before public growth.
- Small complete phases over large partial systems.
- Tests and docs with every feature.

## Non-Goals

Near-term non-goals:

- AI recommendations;
- automatic bidding;
- foreclosure workflow;
- county API marketplace;
- portfolio analytics before basic portfolio status tracking earns them;
- broad automation before ingestion and scoring are reliable;
- external automation before internal job boundaries are safe;
- custom enterprise administration before the minimal workspace roles are
  proven secure;
- SSO/SAML, SCIM, custom roles, or policy packs before a separately justified
  enterprise IAM phase.

## Long-Term Direction

Long-term direction may include:

- richer scoring models;
- historical redemption data;
- external data enrichment providers;
- geographic demand signals;
- watchlist monitoring;
- portfolio analytics;
- SMS/push alert delivery;
- richer digest scheduling, templates, and explicit retry policy;
- automation for recurring county files;
- team workflows;
- audit trails.

These are future directions. They should be introduced only after auth,
multi-tenancy, ingestion, scoring, watchlist, and portfolio foundations are real.

## Drift Risks

The biggest product drift risks are:

- describing future workflows as current capability;
- overbuilding automation before core data quality exists;
- building UI pages that are not backed by APIs;
- treating scoring as a simple formula instead of explainable underwriting;
- weakening tenant isolation to move faster;
- using investment hype language instead of decision-support language.

## Update Rules

Update this file when:

- product scope changes;
- a phase graduates from future direction to implemented capability;
- product positioning changes;
- new non-goals are decided;
- trust or explainability principles change.

When updating, keep current implementation and future direction clearly separated.
