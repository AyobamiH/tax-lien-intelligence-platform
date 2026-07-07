# Mission

## Product Identity

Tax Lien Intelligence Platform is a multi-tenant SaaS for turning county parcel
and tax-lien data into structured, explainable investment decision workflows.

## Who It Serves

The product serves tax lien investors and small teams who need to review messy
county data, preserve decision context, and move promising records through a
repeatable operating workflow without treating spreadsheets as the system of
record.

## Core Mission

Help users and workspaces:

- upload county CSV datasets;
- normalize, validate, and repair weak imports;
- reuse trusted import mappings through profiles;
- enrich records with bounded internal and opt-in external context;
- score records with explainable score, risk, confidence, flags, and reasoning;
- review records in dense operational surfaces;
- move records through watchlist, portfolio, comparison, approval, checklist,
  brief, final-outcome, and retrospective review workflows;
- preserve workspace context through comments, assignments, follows,
  preferences, activity, and role-aware access.

## What The Product Is

This is an operator-grade decision-support system for tax lien and parcel
opportunity review. Its value is disciplined workflow continuity,
explainability, evidence, and trust, not merely displaying uploaded rows.

## What The Product Is Not

This product is not:

- a generic real estate listing site;
- a spreadsheet viewer;
- a chatbot wrapper;
- a guaranteed-return, legal, tax, or financial advice system;
- a foreclosure automation product;
- a marketing-first SaaS with thin product underneath;
- a broad county scraper or public data marketplace.

## Core Workflow

1. A user signs in and selects a workspace.
2. The user uploads a county dataset.
3. The system detects a supported county import shape when possible and falls
   back safely when not.
4. The system reports import quality and scoring readiness.
5. The user repairs key mappings when readiness is weak or blocked.
6. The user can save and reuse mapping knowledge through import profiles.
7. Records are scored and enriched through bounded internal and controlled
   external enrichment paths.
8. The workspace reviews scored records with flags, confidence, reasoning, and
   supporting context.
9. Promising records move through watchlist, portfolio, comparison, approval,
   checklist, decision brief, final outcome, and retrospective review flows.
10. Workspace members preserve context through activity, comments,
    assignments, follows, notification preferences, and role-aware governance.

## Current Strategic Direction

Keep advancing the existing app as the source of truth. Favor incremental
workflow depth, security hardening, verification, and documentation alignment
over speculative redesign or marketing. The next phases should close gaps that
make the product more trustworthy for real operators: stronger import
normalization, safer production posture, richer auditability, and better
end-to-end runtime proof.

## Market-Ready Definition

The product is honestly market-ready only when the repo demonstrates that:

- the app runs locally without hand-waving;
- auth and workspace tenancy are safe;
- upload, repair, profile reuse, scoring, review, and core workflows work
  end-to-end;
- explainable scoring is grounded in available evidence;
- loading, empty, error, and failure states are handled;
- role-aware workspace behavior is covered by tests;
- typecheck, tests, build, and audit pass consistently;
- security posture is credible for private workspace data;
- docs and knowledge-base files match implementation reality;
- no critical workflow depends on imaginary future systems.

## Anti-Goals

- Do not create a replacement repo or scaffold a parallel architecture.
- Do not deploy, publish, migrate, or mutate production without explicit
  approval.
- Do not introduce paid external services casually.
- Do not fake AI, underwriting, legal, tax, financial, or county-sync
  capability.
- Do not prioritize marketing before product truth.
- Do not describe future workflows as implemented capability.

## Current Phase Summary

Verified on 2026-07-07 from code, docs, package scripts, tests, and git
history: the repo is on `main` with phases through Phase 43 implemented in
source and docs. The app includes auth, dataset upload, county adapter
fallback, readiness validation, manual mapping repair, import profiles,
scoring, enrichment, jobs, alerts, notification preferences and delivery
history, watchlist, portfolio, comparison, saved views, workspace access,
activity, comments, assignments, approvals, my-work, follows, review
checklists, workspace policies, decision briefs, final decision outcomes, and
outcome review.

Current security hardening also includes explicit production CORS allowlists and
in-process fixed-window limits for authenticated score/refresh requests, with
bounded workspace activity for rate-limit blocks. Broad county coverage,
standalone parcel/lien models, broad API-wide rate limiting, distributed or
persisted multi-instance rate limiting, enterprise IAM, realtime collaboration,
SMS or push, production deployment proof, and final underwriting remain
unimplemented.
