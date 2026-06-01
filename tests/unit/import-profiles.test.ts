import { describe, expect, it } from "vitest";
import {
  buildHeaderSignature,
  buildImportProfileApplicability,
  evaluateImportProfileMatch,
  findBestImportProfileMatch,
  importProfileApplicationFromMatch,
  manualMappingFromProfileMatch,
} from "../../apps/api/src/datasets/import-profiles.js";
import type { StoredImportProfile } from "../../apps/api/src/datasets/import-profile-store.js";

function storedProfile(overrides: Partial<StoredImportProfile> = {}): StoredImportProfile {
  const now = new Date("2026-06-01T00:00:00.000Z");
  const mappings = [
    { targetField: "parcel_id" as const, sourceColumn: "Property Number" },
    { targetField: "lien_amount" as const, sourceColumn: "Tax Balance" },
    { targetField: "estimated_value" as const, sourceColumn: "County Value" },
  ];

  return {
    id: "profile-1",
    userId: "user-1",
    name: "County profile",
    adapterId: "generic_csv",
    adapterName: "Generic CSV normalization",
    mappings,
    applicability: buildImportProfileApplicability({
      headers: ["Property Number", "Tax Balance", "County Value", "Unused Column"],
      adapterId: "generic_csv",
      mappings,
    }),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("import profile helpers", () => {
  it("builds deterministic normalized header signatures", () => {
    expect(buildHeaderSignature([" Tax Balance ", "County_Value", "Property-Number", "tax balance"])).toEqual([
      "county value",
      "property number",
      "tax balance",
    ]);
  });

  it("auto-applies only when the saved header signature is contained", () => {
    const profile = storedProfile();
    const match = evaluateImportProfileMatch(profile, [
      "Property Number",
      "Tax Balance",
      "County Value",
      "Unused Column",
      "Later Extra",
    ]);

    expect(match).toMatchObject({
      confidence: "high",
      matchedMappings: 3,
      totalMappings: 3,
      canAutoApply: true,
    });

    const manualMapping = manualMappingFromProfileMatch(match!, new Date("2026-06-01T12:00:00.000Z"));
    expect(manualMapping.mappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetField: "lien_amount",
          sourceColumn: "Tax Balance",
          source: "import_profile",
        }),
      ]),
    );
  });

  it("suggests but does not auto-apply when mapped columns match but source shape changed", () => {
    const profile = storedProfile();
    const match = evaluateImportProfileMatch(profile, ["Property Number", "Tax Balance", "County Value"]);

    expect(match).toMatchObject({
      confidence: "medium",
      matchedMappings: 3,
      totalMappings: 3,
      canAutoApply: false,
    });

    expect(importProfileApplicationFromMatch(match!, "suggested", new Date("2026-06-01T12:00:00.000Z"))).toMatchObject({
      status: "suggested",
      profileId: "profile-1",
      profileName: "County profile",
      confidence: "medium",
      matchedMappings: 3,
      totalMappings: 3,
    });
  });

  it("rejects partial or ambiguous header matches to avoid false-positive reuse", () => {
    expect(evaluateImportProfileMatch(storedProfile(), ["Property Number", "Tax Balance", "Assessed Total"])).toBeNull();
    expect(evaluateImportProfileMatch(storedProfile(), ["Property Number", "Tax Balance", "County Value", "County-Value"])).toBeNull();
  });

  it("prefers auto-applicable and more recent profiles", () => {
    const olderAuto = storedProfile({ id: "older", updatedAt: new Date("2026-06-01T00:00:00.000Z") });
    const newerSuggested = storedProfile({
      id: "suggested",
      updatedAt: new Date("2026-06-02T00:00:00.000Z"),
      applicability: buildImportProfileApplicability({
        headers: ["Property Number", "Tax Balance", "County Value", "Unused Column"],
        adapterId: "generic_csv",
        mappings: storedProfile().mappings,
      }),
    });

    expect(findBestImportProfileMatch([newerSuggested, olderAuto], [
      "Property Number",
      "Tax Balance",
      "County Value",
      "Unused Column",
    ])?.profile.id).toBe("suggested");
  });
});
