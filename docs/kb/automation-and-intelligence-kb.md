# Automation And Intelligence KB

## What This File Governs

This file governs how automation and intelligence should be understood in this
product. It explains what belongs later, what should remain manual first, and how
automation should support the core SaaS rather than become a separate product.

## Current Reality

Current implementation:

- no automation;
- no background jobs;
- no AI;
- no ingestion pipeline;
- first-pass deterministic scoring engine exists;
- frontend review of scored records exists;
- watchlist shortlisting exists;
- no alerts;
- no portfolio monitoring.

The current repo establishes the monorepo, auth, dataset foundation, first-pass
scoring foundation, manual review surface, and watchlist shortlist. Automation
is still intentionally absent.

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
9. then automation.

Automation before reliable manual workflows risks making errors faster and less
visible.

## Ingestion Automation

Future ingestion automation may include:

- repeat upload templates;
- county-specific mapping profiles;
- scheduled import reminders;
- validation presets.

It should not begin before CSV upload and validation are solid.

## Enrichment Automation

Future enrichment may include:

- property type improvement;
- location quality hints;
- value confidence scoring;
- public record linking;
- geographic indicators.

Enrichment must label source and confidence. It must not silently overwrite user
or source data without traceability.

## Scoring And Reasoning Automation

Scoring is the first intelligence layer, but it should be deterministic and
explainable before any machine-learning or AI layer is considered.

The scoring package should expose:

- scores;
- flags;
- reasoning;
- confidence warnings.

## Monitoring And Alerting

Future monitoring could alert users about:

- upload validation issues;
- watchlist status changes;
- portfolio review deadlines;
- stale data.

Alerts must be user-scoped and avoid leaking tenant data.

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

Automation must be built around this messy reality rather than assuming clean
third-party APIs.

## What Belongs Later Versus Now

Now:

- repo foundation;
- auth;
- manual upload;
- first-pass scoring;
- frontend scored-results review;
- watchlist shortlisting.

Later:

- portfolio;
- scheduled ingestion;
- enrichment;
- alerts;
- portfolio automation;
- AI or ML assistance.

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
- logging sensitive dataset content;
- making investment recommendations without explainability.

## Update Rules

Update this file when:

- background jobs are introduced;
- ingestion automation is added;
- scoring changes substantially;
- enrichment is added;
- alerts or portfolio automation become real.
