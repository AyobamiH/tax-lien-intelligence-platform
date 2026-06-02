import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiClientError,
  addComparisonItem,
  applyDatasetImportProfile,
  createDataset,
  handoffComparisonToPortfolio,
  handoffComparisonToWatchlist,
  listComparisonHistory,
  listComparison,
  listImportProfiles,
  removeComparisonItem,
  saveDatasetImportProfile,
  saveDatasetManualMapping,
  updateComparisonItem,
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

  it("calls comparison endpoints with bearer auth and structured payloads", async () => {
    const comparisonItem = {
      id: "comparison-1",
      workspaceId: "default",
      datasetId: "dataset-1",
      scoredRecordId: "score-1",
      sourceType: "watchlist",
      sourceWatchlistItemId: "watch-1",
      decision: "undecided",
      decisionUpdatedAt: "2026-06-01T00:00:00.000Z",
      sourceRowNumber: 2,
      normalizedFields: {
        parcelId: "A-100",
        lienAmount: 1000,
        estimatedValue: 12000,
        propertyTypeCategory: "residential",
      },
      investmentScore: 82,
      riskScore: 18,
      liquidityScore: 70,
      redemptionProbability: 0.8,
      confidenceScore: 88,
      valueCoverageRatio: 12,
      flags: [],
      reasoning: ["Strong value coverage."],
      scoredAt: "2026-06-01T00:00:00.000Z",
      addedAt: "2026-06-01T00:00:00.000Z",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const watchlistItem = {
      id: "watch-1",
      datasetId: "dataset-1",
      scoredRecordId: "score-1",
      sourceRowNumber: 2,
      normalizedFields: comparisonItem.normalizedFields,
      investmentScore: 82,
      riskScore: 18,
      liquidityScore: 70,
      redemptionProbability: 0.8,
      confidenceScore: 88,
      valueCoverageRatio: 12,
      flags: [],
      reasoning: ["Strong value coverage."],
      scoredAt: "2026-06-01T00:00:00.000Z",
      addedAt: "2026-06-01T02:00:00.000Z",
      createdAt: "2026-06-01T02:00:00.000Z",
      updatedAt: "2026-06-01T02:00:00.000Z",
    };
    const portfolioItem = {
      id: "portfolio-1",
      datasetId: "dataset-1",
      scoredRecordId: "score-1",
      sourceWatchlistItemId: "watch-1",
      status: "tracked",
      statusUpdatedAt: "2026-06-01T03:00:00.000Z",
      sourceRowNumber: 2,
      normalizedFields: comparisonItem.normalizedFields,
      investmentScore: 82,
      riskScore: 18,
      liquidityScore: 70,
      redemptionProbability: 0.8,
      confidenceScore: 88,
      valueCoverageRatio: 12,
      flags: [],
      reasoning: ["Strong value coverage."],
      scoredAt: "2026-06-01T00:00:00.000Z",
      trackedAt: "2026-06-01T03:00:00.000Z",
      createdAt: "2026-06-01T03:00:00.000Z",
      updatedAt: "2026-06-01T03:00:00.000Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [comparisonItem] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ item: comparisonItem, alreadyExists: false }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            item: {
              ...comparisonItem,
              decision: "move_forward",
              note: "Verify before bid.",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            events: [
              {
                id: "history-1",
                relatedEntityType: "comparison_item",
                relatedEntityId: "comparison-1",
                eventType: "comparison_decision_changed",
                previousDecision: "undecided",
                newDecision: "move_forward",
                noteSnapshot: "Verify before bid.",
                createdAt: "2026-06-01T01:00:00.000Z",
                updatedAt: "2026-06-01T01:00:00.000Z",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            destination: "watchlist",
            item: watchlistItem,
            alreadyExists: false,
            historyEvent: {
              id: "history-2",
              relatedEntityType: "comparison_item",
              relatedEntityId: "comparison-1",
              eventType: "comparison_handoff_to_watchlist",
              previousDecision: "move_forward",
              newDecision: "move_forward",
              noteSnapshot: "Verify before bid.",
              metadata: {
                targetEntityType: "watchlist_item",
                targetEntityId: "watch-1",
                handoffResult: "created",
              },
              createdAt: "2026-06-01T02:00:00.000Z",
              updatedAt: "2026-06-01T02:00:00.000Z",
            },
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            destination: "portfolio",
            item: portfolioItem,
            alreadyExists: false,
            historyEvent: {
              id: "history-3",
              relatedEntityType: "comparison_item",
              relatedEntityId: "comparison-1",
              eventType: "comparison_handoff_to_portfolio",
              previousDecision: "move_forward",
              newDecision: "move_forward",
              noteSnapshot: "Verify before bid.",
              metadata: {
                targetEntityType: "portfolio_item",
                targetEntityId: "portfolio-1",
                handoffResult: "created",
                portfolioStatus: "tracked",
              },
              createdAt: "2026-06-01T03:00:00.000Z",
              updatedAt: "2026-06-01T03:00:00.000Z",
            },
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ deleted: true, id: "comparison-1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    globalThis.fetch = fetchMock;

    await expect(listComparison("test-token")).resolves.toEqual({ items: [comparisonItem] });
    await expect(addComparisonItem("test-token", { watchlistItemId: "watch-1" })).resolves.toMatchObject({
      alreadyExists: false,
    });
    await expect(
      updateComparisonItem("test-token", "comparison-1", {
        decision: "move_forward",
        note: "Verify before bid.",
      }),
    ).resolves.toMatchObject({ item: { decision: "move_forward", note: "Verify before bid." } });
    await expect(listComparisonHistory("test-token", "comparison-1")).resolves.toMatchObject({
      events: [{ eventType: "comparison_decision_changed", noteSnapshot: "Verify before bid." }],
    });
    await expect(handoffComparisonToWatchlist("test-token", "comparison-1")).resolves.toMatchObject({
      destination: "watchlist",
      item: { id: "watch-1" },
      historyEvent: { eventType: "comparison_handoff_to_watchlist" },
    });
    await expect(handoffComparisonToPortfolio("test-token", "comparison-1", { status: "tracked" })).resolves.toMatchObject({
      destination: "portfolio",
      item: { id: "portfolio-1" },
      historyEvent: { eventType: "comparison_handoff_to_portfolio" },
    });
    await expect(removeComparisonItem("test-token", "comparison-1")).resolves.toEqual({
      deleted: true,
      id: "comparison-1",
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:4000/comparison",
      "http://localhost:4000/comparison",
      "http://localhost:4000/comparison/comparison-1",
      "http://localhost:4000/comparison/comparison-1/history",
      "http://localhost:4000/comparison/comparison-1/handoff/watchlist",
      "http://localhost:4000/comparison/comparison-1/handoff/portfolio",
      "http://localhost:4000/comparison/comparison-1",
    ]);
    expect(fetchMock.mock.calls.map(([, init]) => (init?.headers as Headers).get("Authorization"))).toEqual([
      "Bearer test-token",
      "Bearer test-token",
      "Bearer test-token",
      "Bearer test-token",
      "Bearer test-token",
      "Bearer test-token",
      "Bearer test-token",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual({ watchlistItemId: "watch-1" });
    expect(JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string)).toEqual({
      decision: "move_forward",
      note: "Verify before bid.",
    });
    expect(fetchMock.mock.calls[4]?.[1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[5]?.[1]?.method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[5]?.[1]?.body as string)).toEqual({ status: "tracked" });
    expect(fetchMock.mock.calls[6]?.[1]?.method).toBe("DELETE");
  });
});
