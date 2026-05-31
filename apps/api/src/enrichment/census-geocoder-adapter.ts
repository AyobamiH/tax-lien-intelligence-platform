import type { EnrichmentSignal, ExternalEnrichmentResult } from "@tax-lien/types";
import type { EnrichmentAdapter, EnrichmentAdapterInput, EnrichmentAdapterResult } from "./enrichment-service.js";
import type { CensusGeocoderClient, CensusGeocoderLookupResult } from "./census-geocoder-client.js";

export interface CensusGeocoderAddressAdapterOptions {
  maxRowsPerJob: number;
  now?: () => Date;
}

export class CensusGeocoderAddressAdapter implements EnrichmentAdapter {
  public readonly id = "census_geocoder" as const;

  private readonly client: CensusGeocoderClient;
  private readonly maxRowsPerJob: number;
  private readonly now: () => Date;

  public constructor(client: CensusGeocoderClient, options: CensusGeocoderAddressAdapterOptions) {
    this.client = client;
    this.maxRowsPerJob = options.maxRowsPerJob;
    this.now = options.now ?? (() => new Date());
  }

  public async enrich(input: EnrichmentAdapterInput): Promise<EnrichmentAdapterResult> {
    const address = input.normalizedFields.address?.trim();
    const enrichedAt = this.now().toISOString();

    if (!address) {
      return this.skippedResult("No normalized address was available for external geocoding.", enrichedAt);
    }

    if (this.maxRowsPerJob <= 0 || input.sourceRow.rowNumber > this.maxRowsPerJob) {
      return this.skippedResult("External geocoding skipped by configured per-job row limit.", enrichedAt);
    }

    const result = await this.client.geocodeAddress(address.slice(0, 255));
    return this.toEnrichmentResult(result, enrichedAt);
  }

  private toEnrichmentResult(result: CensusGeocoderLookupResult, enrichedAt: string): EnrichmentAdapterResult {
    if (result.status === "matched") {
      const externalResult: ExternalEnrichmentResult = {
        adapterId: this.id,
        provider: "us_census_geocoder",
        status: "matched",
        confidence: "medium",
        message: "Census Geocoder matched and normalized the address.",
        normalizedAddress: result.match.matchedAddress,
        latitude: result.match.latitude,
        longitude: result.match.longitude,
        benchmark: result.match.benchmark,
        enrichedAt,
      };

      return {
        inferredFields: {
          address: result.match.matchedAddress,
        },
        externalResults: [externalResult],
        signals: [
          signal("externalLocation", "medium", "External geocoder returned normalized location context."),
          signal("address", "medium", "Address was normalized by the external geocoder."),
        ],
        flags: [],
        reasoning: [`External Census Geocoder matched the address as ${result.match.matchedAddress}.`],
      };
    }

    const status = result.status;
    const message =
      status === "timeout"
        ? "External geocoder timed out before returning usable location context."
        : status === "no_match"
          ? "External geocoder could not match the address."
          : "External geocoder failed safely without changing scoring inputs.";

    return {
      inferredFields: {},
      externalResults: [
        {
          adapterId: this.id,
          provider: "us_census_geocoder",
          status,
          confidence: "low",
          message,
          enrichedAt,
        },
      ],
      signals: [signal("externalLocation", "low", message)],
      flags: status === "no_match" ? ["External geocoder did not match address"] : ["External geocoder unavailable"],
      reasoning: [message],
    };
  }

  private skippedResult(message: string, enrichedAt: string): EnrichmentAdapterResult {
    return {
      inferredFields: {},
      externalResults: [
        {
          adapterId: this.id,
          provider: "us_census_geocoder",
          status: "skipped",
          confidence: "low",
          message,
          enrichedAt,
        },
      ],
      signals: [signal("externalLocation", "low", message)],
      flags: [],
      reasoning: [message],
    };
  }
}

function signal(field: EnrichmentSignal["field"], confidence: EnrichmentSignal["confidence"], message: string): EnrichmentSignal {
  return {
    adapterId: "census_geocoder",
    field,
    confidence,
    message,
  };
}
