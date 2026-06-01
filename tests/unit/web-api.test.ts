import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, createDataset } from "../../apps/web/src/api.js";

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
});
