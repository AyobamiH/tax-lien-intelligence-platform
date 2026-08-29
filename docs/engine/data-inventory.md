# Maricopa Data Source Inventory

Last reviewed: 2026-08-29

## Decision

No reviewed external source is approved for production ingestion or model
training yet. The engine must continue to abstain from model-backed redemption,
valuation, and liquidity outputs.

This is not a failure to find public web pages. It is a data-integrity result:
public visibility is different from permission to reuse data commercially, and
a current parcel status is different from a dated outcome label.

The enforcement record is
[`data-source-inventory.json`](data-source-inventory.json). Run
`npm run validate:data-inventory` after every inventory change. The validator
prevents an agent from marking a source approved unless authority, schema,
cadence, record observation time, and commercial terms are all verified. It
also prevents a source from entering model training without verified event and
censoring fields.

## Findings

| Source | Useful evidence | Verified limits | Decision |
| --- | --- | --- | --- |
| Arizona Legislature Title 42 | Dated legal context for rule packs | No parcel or certificate outcomes | Reference only |
| Assessor Secured Master | 39 sampled parcel, deed, sale, and valuation fields; public bulk ZIP; twice-monthly stated cadence | Current tax year only; no record observation time or redemption fields; commercial and training permission not explicit; owner and mailing data present | Blocked |
| County Lien and Delinquent Parcels GIS | Current delinquent and unsold parcel layers; APN, address, deed, and source links | Terms require written authorization for external use and prohibit commercial use except under agreement; no published cadence, history, or redemption events | Blocked |
| Treasurer Tax Lien Web | Official authenticated certificate-holder account surface | Schema, export mechanism, history, timestamps, integration contract, and permitted uses not verified | Blocked |
| Maricopa RealAuction surface | Candidate sale-cycle venue | Current county authority, stable export, history, and reuse terms not verified; an auction list is not a later redemption label | Blocked |
| Tenant CSV upload | Real tenant-provided evidence in the current platform | User upload does not prove issuing authority, completeness, as-of time, license, or outcome integrity | Evidence only |

## Real Artifact Sample

The current Assessor Secured Master ArcGIS item was downloaded and inspected on
2026-08-29 rather than inferred from a search result.

- item publisher: Maricopa County Assessor's Office;
- item modified time: `2026-08-17T16:06:49Z`;
- archive size: 108,739,337 bytes;
- archive digest:
  `sha256:1ad15f30f5e4c974bc001d627eae6324ca01ff43286ab50541e819760af09023`;
- contents: five pipe-delimited book-series files and a PDF field
  specification;
- sampled data-file date: 2026-08-17;
- specification revision: 2023-02-02;
- declared coverage: current tax year;
- declared cadence: twice monthly;
- sampled schema: 39 fields, including parcel identity, owner and mailing
  fields, situs address, deed data, full cash and limited property values,
  property-use data, construction attributes, sale price, and sale date.

The artifact has no certificate identifier, tax-lien sale date, redemption
date, terminal non-redemption event, or observed-through field. It can become a
feature source only after terms and privacy review, and only when joined to a
separately authorized outcome source using time-safe entity resolution.

## GIS Restriction

The official county GIS application resolves to ArcGIS item
`bd50c51b89054238bfadf69e91b421c9` and feature service item
`163c3c4186c94202aea725800bb0368b`. Metadata sampling verified two relevant
query layers:

- `Unsold Lien Parcels`;
- `Delinquent Tax Parcels`.

Both expose APN, address, deed, Assessor link, Treasurer link, and geometry
metadata. Neither exposes certificate sale, redemption, terminal-event, or
record observation dates. The item terms say external use requires written
authorization and commercial intent, resale, or distribution is prohibited
except under a sublicensing agreement. Therefore the platform must not scrape,
copy, redistribute, or train on this source without written county approval.

Arizona Revised Statutes section 39-121.03 also requires a requester to state a
commercial purpose when requesting public-record reproductions and allows the
custodian to set commercial-purpose charges. Any acquisition request for this
product must state the intended commercial use accurately.

## Outcome Label Gap

A real redemption model needs a longitudinal certificate cohort, not a list of
parcels that happen to be delinquent today. At minimum, one training unit needs:

- jurisdiction identifier;
- certificate identifier;
- APN;
- tax-lien sale date;
- redemption event date when redeemed;
- dated terminal non-redemption event when applicable;
- `observed_through` for every still-open certificate;
- purchase-time feature observation timestamps.

An absent redemption record is not a negative label. It is right-censored at a
verified observation date. Treating current unsold or delinquent membership as
historical non-redemption would introduce label error and time leakage.

No reviewed source provides these fields together with verified commercial
model-training rights. `P47-070-trained-models` therefore remains blocked.

## Draft Dataset Card

Dataset ID: `maricopa-redemption-training-corpus-v0`

Status: blocked; no dataset or model artifact has been created.

Intended task: estimate time to redemption for a legally identified
certificate, with right censoring and separately represented terminal events.

Unit of analysis: one certificate of purchase for one parcel and sale date.

Temporal policy: features must be observed no later than the prediction
`as_of` time. Evaluation must use later sale cohorts as an out-of-time holdout.

Leakage controls:

- no post-sale payment or redemption field in purchase-time features;
- no current-state field used as a historical label without a snapshot time;
- no future deed or court event in pre-event features;
- no duplicate certificate across train and holdout;
- no silent many-to-one collapse when certificate and parcel identities differ.

Privacy controls required before acquisition:

- minimize owner and mailing fields;
- document purpose and lawful permitted use;
- isolate raw access from product-serving access;
- define retention, correction, deletion, and dataset-withdrawal procedures;
- record immutable source manifests, timestamps, and checksums.

## Unblocking Path

1. Submit an accurate commercial-purpose records request or negotiate a data
   agreement with the Assessor, Treasurer, and Enterprise Technology
   custodians as applicable.
2. Request a supported certificate lifecycle export containing identifiers,
   sale dates, redemption dates, terminal events, and observation dates.
3. Obtain written terms for commercial product use, retention, derived
   features, model training, evaluation, and permitted redistribution.
4. Build an immutable raw-artifact manifest and time-aware certificate-to-APN
   resolution report.
5. Run coverage, duplication, missingness, temporal leakage, and censoring
   checks before creating a training dataset version.
6. Keep model signals unavailable until an out-of-time evaluation and model
   card pass the later promotion gate.

## Verified Sources

- [Maricopa GIS Mapping Applications](https://www.maricopa.gov/3942/GIS-Mapping-Applications)
- [Lien and Delinquent Parcels application](https://gis.maricopa.gov/TSR/liendelinquentparcel/index.html)
- [Lien and Delinquent Parcels ArcGIS item metadata](https://www.arcgis.com/sharing/rest/content/items/bd50c51b89054238bfadf69e91b421c9)
- [Lien and Delinquent Parcels feature-service metadata](https://www.arcgis.com/sharing/rest/content/items/163c3c4186c94202aea725800bb0368b)
- [Assessor Data Downloads](https://www.mcassessor.maricopa.gov/page/data_sales/)
- [Secured Master ArcGIS item metadata](https://www.arcgis.com/sharing/rest/content/items/936bbba512bf4c368618cc6e79e64668)
- [Official county property-tax link](https://www.maricopa.gov/4131/Pay)
- [Treasurer Tax Lien Web](https://treasurer.maricopa.gov/TaxLien)
- [Arizona commercial public-record use statute](https://www.azleg.gov/ars/39/00121-03.htm)
- [Arizona redemption timing statute](https://www.azleg.gov/ars/42/18152.htm)
- [Arizona foreclosure timing statute](https://www.azleg.gov/ars/42/18201.htm)
