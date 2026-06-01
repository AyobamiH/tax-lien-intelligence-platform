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
17 adds authenticated browser upload for manual CSV imports.
The product identity is visible through the README, package description,
architecture docs, and frontend review/watchlist/portfolio surfaces.

Current evidence:

- the README describes a production-grade multi-tenant SaaS for county parcel and
  tax lien data;
- the root package describes scoring tax lien and parcel datasets;
- the frontend lets signed-in users upload a CSV and see import/fallback
  results;
- the frontend review surface lets signed-in users inspect scored records,
  flags, and reasoning;
- the watchlist surface lets signed-in users keep and compare scored records;
- the portfolio surface lets signed-in users track active decisions with
  simple status;
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
- in-app alerts make scoring job outcomes visible without adding delivery
  automation;
- architecture docs say every future user-owned document must include `userId`.

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
5. dataset/source rows are stored under that user's tenant boundary;
6. the scoring engine evaluates opportunity quality and risk;
7. the user reviews scored rows with explanations and warnings;
8. the user adds promising items to a watchlist;
9. the user tracks decisions over time;
10. the user sees important scoring outcomes in an in-app alert surface;
11. the user can deliberately refresh stale or weak scoring/enrichment state.
12. the system can identify stale scored datasets for bounded maintenance
    review without becoming an unlimited automation product.

This loop is partially implemented. Auth, dataset upload APIs, internal source
row storage, first-pass score APIs, browser score review, watchlist
shortlisting, portfolio/status tracking, internal job plumbing, in-app alerts,
worker-driven scoring execution, source-row enrichment, and controlled refresh
exist. Bounded scheduled maintenance groundwork now exists. One
Maricopa-style county import adapter exists. Browser CSV upload, broad county
upload now exists. Broad county coverage, live county sync, external alert
delivery, user-facing scheduler policy controls, broader automatic refresh, and
richer automation remain future direction.

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
- internal source rows are stored for scoring;
- first-pass explainable scoring exists through API routes;
- frontend review of scored results exists;
- watchlist shortlisting exists;
- portfolio/status tracking exists;
- scoring execution is recorded through internal jobs and processed by the
  worker path;
- scoring now uses internal source-row enrichment before final score generation;
- scoring can use opt-in Census Geocoder enrichment for safe address/location
  context;
- enrichment now records adapter outcomes, fallback state, and freshness for
  future reprocessing readiness;
- controlled refresh/reprocessing now exists for user-owned datasets;
- one Maricopa-style county import adapter now exists for safer upload-time
  mapping of common county headers;
- scoring job outcomes create in-app alerts;
- no standalone parcel/lien schema;
- no final investment decision, auction, or accounting workflow.

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
- multi-role enterprise admin before single-tenant user workflows are secure.

## Long-Term Direction

Long-term direction may include:

- richer scoring models;
- historical redemption data;
- external data enrichment providers;
- geographic demand signals;
- watchlist monitoring;
- portfolio analytics;
- external alert delivery;
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
