import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiClientError,
  applyDatasetImportProfile,
  createDataset,
  listImportProfiles,
  saveDatasetImportProfile,
  saveDatasetManualMapping,
} from "../../apps/web/src/api.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("web API client", () => {
  it("uploads datasets with multipart form data and bearer auth", async () => {
    const responsePayload = {
      dataset: {
        id: "dataset-1",
        originalFilename: "maricopa.csv",
        sourceType: "manual_csv",
        sourceLabel: "Maricopa sale",
        status: "validated",
        rowCount: 1,
        columnCount: 5,
        headers: ["APN", "Total Due"],
        validationSummary: {
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          warnings: [],
          errors: [],
        },
        importSummary: {
          adapterMatched: true,
          adapterId: "maricopa_tax_lien_v1",
          adapterName: "Maricopa-style tax lien CSV",
          source: "county_adapter",
          confidence: "high",
          fallbackUsed: false,
          mappedFields: ["parcel_id", "lien_amount"],
          warnings: [],
        },
        readinessSummary: {
          status: "ready",
          score: 90,
          scoringRecommended: true,
          fieldCoverage: [
            {
              field: "parcel_id",
              label: "Parcel identifier",
              presentRows: 1,
              totalRows: 1,
              coveragePercent: 100,
              importance: "important",
            },
            {
              field: "lien_amount",
              label: "Lien amount",
              presentRows: 1,
              totalRows: 1,
              coveragePercent: 100,
              importance: "required",
            },
          ],
          issues: [],
          guidance: ["Import quality is strong enough for scoring review."],
        },
        manualMapping: {
          mappings: [],
        },
        importProfile: {
          status: "none",
          matchedMappings: 0,
          totalMappings: 0,
          message: "No reusable import profile was applied.",
        },
        uploadedAt: "2026-06-01T00:00:00.000Z",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    };
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(responsePayload), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;

    const file = new File(["APN,Total Due\n123-45-678,100"], "maricopa.csv", { type: "text/csv" });
    const result = await createDataset("test-token", { file, sourceLabel: " Maricopa sale " });

    expect(result).toEqual(responsePayload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/datasets");
    expect(init.method).toBe("POST");
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer test-token");
    expect(headers.has("Content-Type")).toBe(false);
    expect(init.body).toBeInstanceOf(FormData);
    const body = init.body as FormData;
    expect(body.get("sourceLabel")).toBe("Maricopa sale");
    expect(body.get("file")).toBeInstanceOf(File);
  });

  it("returns safe API errors for rejected uploads", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "dataset_upload_too_large",
            message: "CSV upload cannot exceed 1 MiB.",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const file = new File(["x".repeat(10)], "oversized.csv", { type: "text/csv" });

    await expect(createDataset("test-token", { file })).rejects.toMatchObject<ApiClientError>({
      status: 400,
      code: "dataset_upload_too_large",
      message: "CSV upload cannot exceed 1 MiB.",
    });
  });

  it("saves manual dataset mappings with bearer auth", async () => {
    const responsePayload = {
      dataset: {
        id: "dataset-1",
        originalFilename: "county.csv",
        sourceType: "manual_csv",
        status: "validated",
        rowCount: 1,
        columnCount: 2,
        headers: ["Tax Balance", "County Value"],
        validationSummary: {
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          warnings: [],
          errors: [],
        },
        importSummary: {
          adapterMatched: false,
          adapterId: "generic_csv",
          adapterName: "Generic CSV normalization",
          source: "generic_csv",
          confidence: "low",
          fallbackUsed: true,
          mappedFields: [],
          warnings: [],
        },
        readinessSummary: {
          status: "partial",
          score: 55,
          scoringRecommended: true,
          fieldCoverage: [],
          issues: [],
          guidance: [],
        },
        manualMapping: {
          updatedAt: "2026-06-01T00:00:00.000Z",
          mappings: [
            {
              targetField: "lien_amount",
              sourceColumn: "Tax Balance",
              source: "manual",
              updatedAt: "2026-06-01T00:00:00.000Z",
            },
          ],
        },
        importProfile: {
          status: "none",
          matchedMappings: 0,
          totalMappings: 0,
          message: "No reusable import profile was applied.",
        },
        uploadedAt: "2026-06-01T00:00:00.000Z",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      availableColumns: ["Tax Balance", "County Value"],
      manualMapping: {
        updatedAt: "2026-06-01T00:00:00.000Z",
        mappings: [
          {
            targetField: "lien_amount",
            sourceColumn: "Tax Balance",
            source: "manual",
            updatedAt: "2026-06-01T00:00:00.000Z",
          },
        ],
      },
    };
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;

    const result = await saveDatasetManualMapping("test-token", "dataset-1", {
      mappings: {
        lien_amount: "Tax Balance",
        estimated_value: "County Value",
      },
    });

    expect(result).toEqual(responsePayload);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/datasets/dataset-1/mapping");
    expect(init.method).toBe("PATCH");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer test-token");
    expect(JSON.parse(init.body as string)).toEqual({
      mappings: {
        lien_amount: "Tax Balance",
        estimated_value: "County Value",
      },
    });
  });

  it("calls import profile endpoints with bearer auth", async () => {
    const profile = {
      id: "profile-1",
      name: "County import",
      adapterId: "generic_csv",
      adapterName: "Generic CSV normalization",
      mappings: [{ targetField: "lien_amount", sourceColumn: "Tax Balance" }],
      applicability: {
        headerSignature: ["county value", "tax balance"],
        sourceColumns: ["tax balance"],
        adapterId: "generic_csv",
        columnCount: 2,
      },
      createdFromDatasetId: "dataset-1",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ profiles: [profile] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ profile }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            dataset: {
              id: "dataset-1",
              originalFilename: "county.csv",
              sourceType: "manual_csv",
              status: "validated",
              rowCount: 1,
              columnCount: 2,
              headers: ["Tax Balance", "County Value"],
              validationSummary: { totalRows: 1, validRows: 1, invalidRows: 0, warnings: [], errors: [] },
              importSummary: {
                adapterMatched: false,
                adapterId: "generic_csv",
                adapterName: "Generic CSV normalization",
                source: "generic_csv",
                confidence: "low",
                fallbackUsed: true,
                mappedFields: [],
                warnings: [],
              },
              readinessSummary: {
                status: "partial",
                score: 55,
                scoringRecommended: true,
                fieldCoverage: [],
                issues: [],
                guidance: [],
              },
              manualMapping: {
                mappings: [
                  {
                    targetField: "lien_amount",
                    sourceColumn: "Tax Balance",
                    source: "import_profile",
                    updatedAt: "2026-06-01T00:00:00.000Z",
                  },
                ],
              },
              importProfile: {
                status: "user_applied",
                profileId: "profile-1",
                profileName: "County import",
                confidence: "medium",
                matchedMappings: 1,
                totalMappings: 1,
                message: "Import profile was applied.",
                appliedAt: "2026-06-01T00:00:00.000Z",
              },
              uploadedAt: "2026-06-01T00:00:00.000Z",
              createdAt: "2026-06-01T00:00:00.000Z",
              updatedAt: "2026-06-01T00:00:00.000Z",
            },
            appliedProfile: profile,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    globalThis.fetch = fetchMock;

    await expect(listImportProfiles("test-token")).resolves.toEqual({ profiles: [profile] });
    await expect(saveDatasetImportProfile("test-token", "dataset-1", { name: "County import" })).resolves.toEqual({
      profile,
    });
    await expect(applyDatasetImportProfile("test-token", "dataset-1", { profileId: "profile-1" })).resolves.toMatchObject({
      appliedProfile: profile,
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:4000/datasets/import-profiles",
      "http://localhost:4000/datasets/dataset-1/import-profile",
      "http://localhost:4000/datasets/dataset-1/import-profile/apply",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual({ name: "County import" });
    expect(JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string)).toEqual({ profileId: "profile-1" });
    expect((fetchMock.mock.calls[2]?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer test-token");
  });
});
