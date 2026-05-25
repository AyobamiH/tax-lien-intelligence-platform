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
- structured JSON 404 for unknown routes

Documented in:

- `docs/api/health.md`
- `docs/api/auth.md`

There are no upload, dataset, parcel, scoring, or watchlist endpoints yet.

## Shell Versus Real Workflows

Current shell:

- communicates product direction;
- proves React/Vite/Tailwind setup;
- proves build integration;
- provides early visual tone.

Real workflows not present:

- browser-based account registration;
- browser-based login;
- dataset upload;
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
- display user data;
- upload files;
- show persisted records;
- show scoring explanations;
- manage watchlists.

The current API cannot:

- accept uploads;
- parse CSV;
- persist user-owned parcel records;
- score parcels;
- return scored lists;
- manage watchlists.

## Where The Current Surface Could Mislead Contributors

The frontend cards could make future contributors think upload, scoring, and
watchlist workflows already exist. They do not.

The presence of auth dependencies could make contributors think authentication
exists. It does not.

The presence of a scoring package could make contributors think scoring exists.
It does not.

The presence of Mongo connection helpers could make contributors think data
models exist. They do not.

## Security Implications

The current browser surface is low-risk because it has no user-owned workflows
yet. The API now has auth, so security risk shifts toward protecting the token
boundary and using it correctly for future resources. Risk increases sharply when
the repo adds:

- file uploads;
- tenant-owned data;
- scoring explanations;
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
