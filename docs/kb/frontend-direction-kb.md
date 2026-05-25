# Frontend Direction KB

## What This File Governs

This file governs frontend direction: the intended role of the web app, future
page responsibilities, design tone, and UI drift risks.

It does not claim those pages exist today. The current frontend is a single
Phase 1 shell.

## Current Frontend Reality

Current implementation:

- React 19;
- Vite;
- TypeScript;
- Tailwind;
- one shell screen in `apps/web/src/main.tsx`;
- no router;
- no API integration;
- no auth views;
- no upload flow;
- no table;
- no watchlist UI.

## Intended Frontend Role

The frontend should become the operator workspace for reviewing tax lien and
parcel opportunities.

Its job is to:

- make noisy data understandable;
- show validation errors clearly;
- expose scores and reasoning;
- help users filter and inspect records;
- preserve watchlist and decision context;
- communicate risk without hype;
- keep tenant-owned data private to the signed-in user.

## Future Page Inventory

Future page direction:

- marketing/home page;
- register/login pages;
- authenticated dashboard;
- dataset upload page;
- dataset detail page;
- scored parcels table;
- parcel detail drawer/page;
- watchlist page;
- future portfolio page;
- account/settings page.

These pages are future direction. They are not implemented today.

## Page Responsibilities

Future dashboard:

- summarize recent uploads;
- show scoring progress and dataset health;
- show watchlist count and important warnings;
- avoid fake metrics before real data exists.

Future upload page:

- accept CSV files;
- explain required columns;
- show validation errors;
- prevent upload confusion;
- never claim data was scored before backend confirms it.

Future scored table:

- show parcel identity, lien amount, estimated value, scores, flags, and status;
- support filtering and sorting;
- make risk visible;
- allow drill-down into reasoning.

Future watchlist:

- show user-selected opportunities;
- preserve why the user shortlisted the item;
- support review, notes, and decision status later.

## Design Tone

The product should feel:

- calm;
- dense enough for operators;
- trustworthy;
- practical;
- clear under data-heavy conditions.

It should not feel:

- like a toy dashboard;
- like a speculative trading app;
- like an AI magic demo;
- like a generic SaaS landing page replacing the real product.

## Density And Trust Principles

Tax lien review is data work. The UI should favor structured tables, clear
filters, stable layouts, readable numbers, and inspectable reasoning.

Large decorative layouts should not displace operational workflows.

Trust is created through:

- clear source labels;
- visible validation status;
- transparent scoring factors;
- consistent error states;
- no hidden magic;
- no claims that the system has not earned.

## Reasoning Visibility

Scores should eventually be accompanied by:

- flags;
- reasoning bullets;
- confidence warnings;
- missing-data indicators;
- hard disqualification messages.

The frontend must not reduce complex underwriting to a single unexplained badge.

## Loading, Empty, And Error States

Every future workflow should include:

- loading state;
- empty state;
- validation error state;
- network error state;
- permission/auth error state;
- upload failure state where relevant.

Empty states should guide the next action without pretending data exists.

## Lovable And Design Tool Constraints

If future design tooling such as Lovable is used, it must stay constrained by
repo truth:

- do not invent pages that do not have implementation priority;
- do not add mock data as if it were real;
- do not imply scoring exists before the backend scoring package exists;
- do not bypass shared API contracts;
- do not change product positioning away from decision support.

Design exploration is allowed, but production UI must be backed by real product
contracts.

## Security Expectations For Frontend Work

Future frontend work must:

- never trust client-side tenancy filtering as authorization;
- avoid exposing tokens or secrets;
- avoid storing sensitive data in local storage unless explicitly approved;
- handle auth errors cleanly;
- avoid rendering unescaped uploaded data;
- avoid leaking another user's records through cache or state reuse;
- avoid displaying internal server stack traces.

## What Must Not Be Overbuilt Too Early

Do not build:

- portfolio UI before watchlists exist;
- automation dashboards before ingestion/scoring exists;
- admin consoles before user auth and tenancy are hardened;
- advanced filters before baseline table workflows exist;
- AI interfaces before deterministic scoring is credible.

## Drift Risks

Frontend drift risks:

- making marketing copy outrun product truth;
- building mock screens that look real;
- creating UI-only scoring concepts not backed by `packages/scoring`;
- using local-only data instead of API contracts;
- ignoring error/empty states until late;
- weakening security by relying on hidden buttons instead of backend checks.

## Update Rules

Update this file when:

- frontend routing is introduced;
- a new page becomes real;
- design tone changes;
- app navigation changes;
- auth or data display boundaries change;
- future pages graduate to implemented surface.
