export interface CensusGeocoderClientConfig {
  baseUrl: string;
  benchmark: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

export interface CensusGeocoderMatchedAddress {
  matchedAddress: string;
  latitude: number;
  longitude: number;
  benchmark: string;
}

export type CensusGeocoderLookupResult =
  | {
      status: "matched";
      match: CensusGeocoderMatchedAddress;
    }
  | {
      status: "no_match" | "failed" | "timeout";
      message: string;
    };

export interface CensusGeocoderClient {
  geocodeAddress(address: string): Promise<CensusGeocoderLookupResult>;
}

export class HttpCensusGeocoderClient implements CensusGeocoderClient {
  private readonly baseUrl: string;
  private readonly benchmark: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  public constructor(config: CensusGeocoderClientConfig) {
    this.baseUrl = config.baseUrl;
    this.benchmark = config.benchmark;
    this.timeoutMs = config.timeoutMs;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  public async geocodeAddress(address: string): Promise<CensusGeocoderLookupResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const url = new URL("/geocoder/locations/onelineaddress", this.baseUrl);
      url.searchParams.set("address", address);
      url.searchParams.set("benchmark", this.benchmark);
      url.searchParams.set("format", "json");

      const response = await this.fetchImpl(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          accept: "application/json",
        },
      });

      if (!response.ok) {
        return {
          status: "failed",
          message: "Census Geocoder returned an unavailable response.",
        };
      }

      return parseCensusGeocoderResponse((await response.json()) as unknown, this.benchmark);
    } catch (error) {
      if (isAbortError(error)) {
        return {
          status: "timeout",
          message: "Census Geocoder request timed out.",
        };
      }

      return {
        status: "failed",
        message: "Census Geocoder request failed.",
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function parseCensusGeocoderResponse(body: unknown, benchmark: string): CensusGeocoderLookupResult {
  if (!isRecord(body) || !isRecord(body.result) || !Array.isArray(body.result.addressMatches)) {
    return {
      status: "failed",
      message: "Census Geocoder returned an unexpected response shape.",
    };
  }

  const match = body.result.addressMatches.find(isRecord);
  if (!match) {
    return {
      status: "no_match",
      message: "Census Geocoder did not find a usable address match.",
    };
  }

  const matchedAddress = readString(match, "matchedAddress");
  const coordinates = isRecord(match.coordinates) ? match.coordinates : undefined;
  const longitude = readNumber(coordinates, "x");
  const latitude = readNumber(coordinates, "y");

  if (!matchedAddress || latitude === undefined || longitude === undefined) {
    return {
      status: "failed",
      message: "Census Geocoder match was missing normalized location fields.",
    };
  }

  return {
    status: "matched",
    match: {
      matchedAddress: matchedAddress.slice(0, 255),
      latitude,
      longitude,
      benchmark,
    },
  };
}

function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === "AbortError";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readNumber(record: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = record?.[key];
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}
