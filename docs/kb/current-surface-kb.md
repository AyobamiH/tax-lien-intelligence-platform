# Current Surface KB

## What This File Governs

This file governs the visible and callable product surface that exists today. It
prevents future contributors from mistaking planned flows for implemented flows.

It does not define long-term page design or API schemas. Use frontend, backend,
and shared contract KBs for those.

## Current User-Visible Web Surface

The current web surface is a single React shell rendered by `apps/web/src/main.tsx`.

It shows:

- product label: Tax Lien Intelligence Platform;
- headline about turning county parcel data into structured investment decisions;
- copy explaining Phase 1 baseline;
- three non-functional cards:
  - Upload datasets;
  - Score liens;
  - Build a watchlist.

These cards are direction signals, not working workflows.

## Current API Surface

The current API surface is minimal:

- `GET /healthz`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /datasets`
- `GET /datasets`
- `GET /datasets/:datasetId`
- `POST /datasets/:datasetId/score`
- `GET /datasets/:datasetId/scores`
- structured JSON 404 for unknown routes

Documented in:

- `docs/api/health.md`
- `docs/api/auth.md`
- `docs/api/datasets.md`
- `docs/api/scoring.md`

There are no watchlist endpoints yet. There is no standalone parcel API yet.

## Shell Versus Real Workflows

Current shell:

- communicates product direction;
- proves React/Vite/Tailwind setup;
- proves build integration;
- provides early visual tone.

Real workflows not present:

- browser-based account registration;
- browser-based login;
- browser-based dataset upload;
- data table;
- score review;
- filtering;
- watchlist;
- portfolio tracking;
- settings.

## Current Visual Signals

Current visual signals:

- restrained color palette;
- product-oriented copy;
- simple card grid;
- no marketing-heavy hero graphics;
- operator-like language around decisions.

The visual system is early. It should not be treated as a complete design system.

## Current Limitations

The current frontend cannot:

- call real product APIs beyond future configuration expectations;
- authenticate users;
- upload datasets through the browser;
- display user data;
- upload files;
- show persisted records;
- show scoring explanations in the browser;
- manage watchlists.

The current API cannot:

- provide a standalone parcel/lien row API;
- persist user-owned parcel records;
- manage frontend-visible score review state;
- manage watchlists.

## Where The Current Surface Could Mislead Contributors

The frontend cards could make future contributors think upload, scoring, and
watchlist workflows already exist. They do not.

The presence of API auth could make contributors think browser auth screens
exist. They do not.

The presence of scoring endpoints could make contributors think the browser has
a scoring workflow. It does not yet.

The presence of a dataset model could make contributors think full parcel
ingestion exists. It does not.

## Security Implications

The current browser surface is low-risk because it still has no user-owned
browser workflows. The API now has auth and dataset upload, so security risk
shifts toward protecting the token boundary, upload boundary, and tenant-owned
dataset queries. Risk increases further when the repo adds:

- frontend score review workflows;
- watchlists;
- portfolio records.

Future current-surface updates must record both visible functionality and trust
boundaries.

## Update Rules

Update this file whenever:

- a new page becomes user-visible;
- a new API route is added;
- a shell element becomes a real workflow;
- auth/protected routes are introduced;
- current limitations change.
