import { describe, expect, it } from "vitest";
import type { EnrichmentAdapter } from "../../apps/api/src/enrichment/enrichment-service.js";
import { EnrichmentService } from "../../apps/api/src/enrichment/enrichment-service.js";
import { SourceFieldInferenceAdapter } from "../../apps/api/src/enrichment/source-field-inference-adapter.js";
import { normalizeDatasetRow } from "../../apps/api/src/scoring/normalization.js";
import type { StoredDatasetSourceRow } from "../../apps/api/src/datasets/dataset-store.js";

describe("enrichment service", () => {
  it("infers scoreable fields from alternate source headers", () => {
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

    const enriched = service.enrichRow(sourceRow, normalized);

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

  it("keeps weak rows conservative and records weak completeness", () => {
    const sourceRow: StoredDatasetSourceRow = {
      rowNumber: 2,
      fields: {
        notes: "unmapped data only",
      },
    };
    const service = new EnrichmentService([new SourceFieldInferenceAdapter()]);

    const enriched = service.enrichRow(sourceRow, normalizeDatasetRow(sourceRow));

    expect(enriched.enrichment.dataQualityScore).toBe(20);
    expect(enriched.enrichment.flags).toContain("Enrichment found weak source-row completeness");
    expect(enriched.normalizedFields.propertyTypeCategory).toBe("unknown");
  });

  it("fails closed when an adapter throws", () => {
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

    const enriched = service.enrichRow(sourceRow, normalizeDatasetRow(sourceRow));

    expect(enriched.enrichment.flags).toContain("Enrichment adapter source_field_inference failed safely");
    expect(enriched.enrichment.reasoning.join(" ")).toContain("could not improve this row");
  });
});
