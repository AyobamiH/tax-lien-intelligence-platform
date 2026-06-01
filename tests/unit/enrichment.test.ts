import { describe, expect, it } from "vitest";
import type { EnrichmentAdapter } from "../../apps/api/src/enrichment/enrichment-service.js";
import {
  createDefaultEnrichmentService,
  EnrichmentService,
  evaluateEnrichmentFreshness,
} from "../../apps/api/src/enrichment/enrichment-service.js";
import { CensusGeocoderAddressAdapter } from "../../apps/api/src/enrichment/census-geocoder-adapter.js";
import {
  HttpCensusGeocoderClient,
  type CensusGeocoderClient,
} from "../../apps/api/src/enrichment/census-geocoder-client.js";
import { SourceFieldInferenceAdapter } from "../../apps/api/src/enrichment/source-field-inference-adapter.js";
import { normalizeDatasetRow } from "../../apps/api/src/scoring/normalization.js";
import type { StoredDatasetSourceRow } from "../../apps/api/src/datasets/dataset-store.js";

describe("enrichment service", () => {
  it("infers scoreable fields from alternate source headers", async () => {
    const sourceRow: StoredDatasetSourceRow = {
      rowNumber: 1,
      fields: {
        account_number: "A-100",
        tax_due: "1,000",
        total_assessed_value: "12,000",
        use_description: "Single family residence",
        situs_street: "10 Main St",
        situs_city: "Austin",
        situs_state: "TX",
        situs_zip: "78701",
      },
    };
    const normalized = normalizeDatasetRow(sourceRow);
    const service = new EnrichmentService([new SourceFieldInferenceAdapter()]);

    const enriched = await service.enrichRow(sourceRow, normalized);

    expect(enriched.normalizedFields).toMatchObject({
      parcelId: "A-100",
      lienAmount: 1000,
      estimatedValue: 12000,
      propertyType: "Single family residence",
      propertyTypeCategory: "residential",
      address: "10 Main St Austin, TX 78701",
    });
    expect(enriched.scoreableRecord).toMatchObject({
      parcelId: "A-100",
      lienAmount: 1000,
      estimatedValue: 12000,
      propertyType: "Single family residence",
    });
    expect(enriched.enrichment.dataQualityScore).toBe(100);
    expect(enriched.enrichment.signals.map((signal) => signal.field)).toEqual(
      expect.arrayContaining(["parcelId", "lienAmount", "estimatedValue", "propertyType", "address", "dataQuality"]),
    );
    expect(enriched.enrichment.reasoning.join(" ")).toContain("Enrichment inferred property type");
  });

  it("records orchestration order and freshness metadata", async () => {
    const sourceRow: StoredDatasetSourceRow = {
      rowNumber: 1,
      fields: {
        account_number: "A-110",
        tax_due: "1,000",
        total_assessed_value: "12,000",
        use_description: "Single family residence",
      },
    };
    const service = new EnrichmentService([new SourceFieldInferenceAdapter()], {
      freshnessWindowDays: 10,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      sourceVersion: "test-source-version",
    });

    const enriched = await service.enrichRow(sourceRow, normalizeDatasetRow(sourceRow));

    expect(enriched.enrichment.orchestrationVersion).toBe("enrichment-orchestration-v1");
    expect(enriched.enrichment.adapterOutcomes).toEqual([
      {
        adapterId: "source_field_inference",
        stage: "internal",
        status: "success",
        message: "Adapter completed successfully.",
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(enriched.enrichment.freshness).toEqual({
      status: "fresh",
      enrichedAt: "2026-01-01T00:00:00.000Z",
      staleAt: "2026-01-11T00:00:00.000Z",
      reprocessAfter: "2026-01-11T00:00:00.000Z",
      reprocessEligible: false,
      sourceVersion: "test-source-version",
    });

    expect(evaluateEnrichmentFreshness(enriched.enrichment.freshness, new Date("2026-01-12T00:00:00.000Z"))).toMatchObject({
      status: "stale",
      reprocessEligible: true,
    });
  });

  it("keeps weak rows conservative and records weak completeness", async () => {
    const sourceRow: StoredDatasetSourceRow = {
      rowNumber: 2,
      fields: {
        notes: "unmapped data only",
      },
    };
    const service = new EnrichmentService([new SourceFieldInferenceAdapter()]);

    const enriched = await service.enrichRow(sourceRow, normalizeDatasetRow(sourceRow));

    expect(enriched.enrichment.dataQualityScore).toBe(20);
    expect(enriched.enrichment.flags).toContain("Enrichment found weak source-row completeness");
    expect(enriched.normalizedFields.propertyTypeCategory).toBe("unknown");
  });

  it("fails closed when an adapter throws", async () => {
    const throwingAdapter: EnrichmentAdapter = {
      id: "source_field_inference",
      enrich: () => {
        throw new Error("boom");
      },
    };
    const sourceRow: StoredDatasetSourceRow = {
      rowNumber: 3,
      fields: {
        parcel_id: "A-300",
      },
    };
    const service = new EnrichmentService([throwingAdapter]);

    const enriched = await service.enrichRow(sourceRow, normalizeDatasetRow(sourceRow));

    expect(enriched.enrichment.flags).toContain("Enrichment adapter source_field_inference failed safely");
    expect(enriched.enrichment.adapterOutcomes[0]).toMatchObject({
      adapterId: "source_field_inference",
      stage: "internal",
      status: "failed",
    });
    expect(enriched.enrichment.reasoning.join(" ")).toContain("could not improve this row");
  });

  it("records safe external Census geocoder matches without raw provider payloads", async () => {
    const geocoderClient: CensusGeocoderClient = {
      geocodeAddress: async () => ({
        status: "matched",
        match: {
          matchedAddress: "10 MAIN ST, AUSTIN, TX, 78701",
          latitude: 30.2672,
          longitude: -97.7431,
          benchmark: "Public_AR_Current",
        },
      }),
    };
    const sourceRow: StoredDatasetSourceRow = {
      rowNumber: 1,
      fields: {
        parcel_id: "A-400",
        address: "10 Main St Austin TX 78701",
      },
    };
    const service = new EnrichmentService([
      new SourceFieldInferenceAdapter(),
      new CensusGeocoderAddressAdapter(geocoderClient, {
        maxRowsPerJob: 10,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    ]);

    const enriched = await service.enrichRow(sourceRow, normalizeDatasetRow(sourceRow));

    expect(enriched.enrichment.adapters).toEqual(["source_field_inference", "census_geocoder"]);
    expect(enriched.enrichment.adapterOutcomes.map((outcome) => outcome.status)).toEqual(["success", "success"]);
    expect(enriched.enrichment.externalResults).toEqual([
      {
        adapterId: "census_geocoder",
        provider: "us_census_geocoder",
        status: "matched",
        confidence: "medium",
        message: "Census Geocoder matched and normalized the address.",
        normalizedAddress: "10 MAIN ST, AUSTIN, TX, 78701",
        latitude: 30.2672,
        longitude: -97.7431,
        benchmark: "Public_AR_Current",
        enrichedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(JSON.stringify(enriched.enrichment)).not.toContain("addressMatches");
    expect(enriched.enrichment.reasoning.join(" ")).toContain("External Census Geocoder matched");
  });

  it("maps Census Geocoder provider responses into safe client results", async () => {
    let requestedUrl = "";
    const client = new HttpCensusGeocoderClient({
      baseUrl: "https://geocoding.geo.census.gov",
      benchmark: "Public_AR_Current",
      timeoutMs: 3000,
      fetchImpl: async (input) => {
        requestedUrl = input.toString();
        return new Response(
          JSON.stringify({
            result: {
              addressMatches: [
                {
                  matchedAddress: "10 MAIN ST, AUSTIN, TX, 78701",
                  coordinates: {
                    x: -97.7431,
                    y: 30.2672,
                  },
                },
              ],
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      },
    });

    const result = await client.geocodeAddress("10 Main St Austin TX 78701");

    expect(requestedUrl).toContain("/geocoder/locations/onelineaddress");
    expect(requestedUrl).toContain("benchmark=Public_AR_Current");
    expect(result).toEqual({
      status: "matched",
      match: {
        matchedAddress: "10 MAIN ST, AUSTIN, TX, 78701",
        latitude: 30.2672,
        longitude: -97.7431,
        benchmark: "Public_AR_Current",
      },
    });
  });

  it("maps malformed Census Geocoder responses to safe failures", async () => {
    const client = new HttpCensusGeocoderClient({
      baseUrl: "https://geocoding.geo.census.gov",
      benchmark: "Public_AR_Current",
      timeoutMs: 3000,
      fetchImpl: async () =>
        new Response(JSON.stringify({ result: { addressMatches: [{ matchedAddress: "missing coordinates" }] } }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
    });

    const result = await client.geocodeAddress("10 Main St Austin TX 78701");

    expect(result).toEqual({
      status: "failed",
      message: "Census Geocoder match was missing normalized location fields.",
    });
  });

  it("handles weak external geocoder responses conservatively", async () => {
    const geocoderClient: CensusGeocoderClient = {
      geocodeAddress: async () => ({
        status: "no_match",
        message: "No match",
      }),
    };
    const sourceRow: StoredDatasetSourceRow = {
      rowNumber: 1,
      fields: {
        parcel_id: "A-401",
        address: "Unmatched address",
      },
    };
    const service = new EnrichmentService([
      new SourceFieldInferenceAdapter(),
      new CensusGeocoderAddressAdapter(geocoderClient, {
        maxRowsPerJob: 10,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    ]);

    const enriched = await service.enrichRow(sourceRow, normalizeDatasetRow(sourceRow));

    expect(enriched.enrichment.externalResults?.[0]).toMatchObject({
      adapterId: "census_geocoder",
      provider: "us_census_geocoder",
      status: "no_match",
      confidence: "low",
    });
    expect(enriched.enrichment.adapterOutcomes[1]).toMatchObject({
      adapterId: "census_geocoder",
      stage: "external",
      status: "partial",
    });
    expect(enriched.enrichment.flags).toContain("External geocoder did not match address");
  });

  it("records external geocoder timeout as a safe failure", async () => {
    const geocoderClient: CensusGeocoderClient = {
      geocodeAddress: async () => ({
        status: "timeout",
        message: "Timeout",
      }),
    };
    const sourceRow: StoredDatasetSourceRow = {
      rowNumber: 1,
      fields: {
        parcel_id: "A-402",
        address: "10 Main St Austin TX 78701",
      },
    };
    const service = new EnrichmentService([
      new SourceFieldInferenceAdapter(),
      new CensusGeocoderAddressAdapter(geocoderClient, {
        maxRowsPerJob: 10,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    ]);

    const enriched = await service.enrichRow(sourceRow, normalizeDatasetRow(sourceRow));

    expect(enriched.enrichment.externalResults?.[0]).toMatchObject({
      status: "timeout",
      message: "External geocoder timed out before returning usable location context.",
    });
    expect(enriched.enrichment.adapterOutcomes[1]).toMatchObject({
      adapterId: "census_geocoder",
      stage: "external",
      status: "failed",
    });
    expect(enriched.enrichment.flags).toContain("External geocoder unavailable");
  });

  it("skips external geocoding when the configured row limit is reached", async () => {
    let callCount = 0;
    const geocoderClient: CensusGeocoderClient = {
      geocodeAddress: async () => {
        callCount += 1;
        return {
          status: "failed",
          message: "Should not be called",
        };
      },
    };
    const sourceRow: StoredDatasetSourceRow = {
      rowNumber: 50,
      fields: {
        parcel_id: "A-403",
        address: "10 Main St Austin TX 78701",
      },
    };
    const service = new EnrichmentService([
      new SourceFieldInferenceAdapter(),
      new CensusGeocoderAddressAdapter(geocoderClient, {
        maxRowsPerJob: 10,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    ]);

    const enriched = await service.enrichRow(sourceRow, normalizeDatasetRow(sourceRow));

    expect(callCount).toBe(0);
    expect(enriched.enrichment.externalResults?.[0]).toMatchObject({
      status: "skipped",
      message: "External geocoding skipped by configured per-job row limit.",
    });
    expect(enriched.enrichment.adapterOutcomes[1]).toMatchObject({
      adapterId: "census_geocoder",
      stage: "external",
      status: "skipped",
    });
  });

  it("records disabled external geocoding as deliberate fallback when configured off", async () => {
    const sourceRow: StoredDatasetSourceRow = {
      rowNumber: 1,
      fields: {
        parcel_id: "A-404",
        address: "10 Main St Austin TX 78701",
      },
    };
    const service = createDefaultEnrichmentService({
      censusGeocoder: {
        enabled: false,
        baseUrl: "https://geocoding.geo.census.gov",
        benchmark: "Public_AR_Current",
        timeoutMs: 3000,
        maxRowsPerJob: 25,
      },
      freshnessWindowDays: 30,
    });

    const enriched = await service.enrichRow(sourceRow, normalizeDatasetRow(sourceRow));

    expect(enriched.enrichment.adapters).toEqual(["source_field_inference"]);
    expect(enriched.enrichment.adapterOutcomes.map((outcome) => outcome.status)).toEqual(["success", "skipped"]);
    expect(enriched.enrichment.externalResults?.[0]).toMatchObject({
      adapterId: "census_geocoder",
      provider: "us_census_geocoder",
      status: "skipped",
      message: "Census Geocoder enrichment is disabled by configuration.",
    });
    expect(enriched.enrichment.freshness.sourceVersion).toBe("source_field_inference@1+census_geocoder@disabled");
  });
});
