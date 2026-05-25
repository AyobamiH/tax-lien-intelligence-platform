import { describe, expect, it } from "vitest";
import {
  assessPropertyType,
  calculateValueCoverage,
  scoreLienCandidate,
} from "../../packages/scoring/src/index.js";

describe("scoring package", () => {
  it("scores a high-quality residential lien with strong reasoning", () => {
    const result = scoreLienCandidate({
      parcelId: "A-100",
      lienAmount: 1_000,
      estimatedValue: 12_000,
      propertyType: "Single-family residential",
      roadAccess: true,
    });

    expect(result.investmentScore).toBeGreaterThanOrEqual(75);
    expect(result.riskScore).toBeLessThanOrEqual(35);
    expect(result.liquidityScore).toBeGreaterThanOrEqual(75);
    expect(result.redemptionProbability).toBeGreaterThanOrEqual(0.7);
    expect(result.valueCoverageRatio).toBe(12);
    expect(result.flags).not.toContain("DO NOT BID");
    expect(result.reasoning.join(" ")).toContain("Very strong value coverage ratio");
  });

  it("caps a lien where known value is below the lien amount", () => {
    const result = scoreLienCandidate({
      parcelId: "A-101",
      lienAmount: 10_000,
      estimatedValue: 8_000,
      propertyType: "Commercial",
      roadAccess: true,
    });

    expect(result.investmentScore).toBeLessThanOrEqual(20);
    expect(result.riskScore).toBeGreaterThanOrEqual(90);
    expect(result.flags).toContain("Value coverage below lien amount");
    expect(result.flags).toContain("DO NOT BID");
    expect(result.reasoning.join(" ")).toContain("lien exceeds the known property value");
  });

  it("penalizes vacant land even when value coverage exists", () => {
    const result = scoreLienCandidate({
      parcelId: "L-200",
      lienAmount: 750,
      estimatedValue: 9_000,
      propertyType: "Vacant land",
    });

    expect(result.investmentScore).toBeLessThan(60);
    expect(result.liquidityScore).toBeLessThan(35);
    expect(result.flags).toContain("Vacant land is high risk");
    expect(result.reasoning.join(" ")).toContain("Vacant land often has weak liquidity");
  });

  it("scores missing core data conservatively and explains uncertainty", () => {
    const result = scoreLienCandidate({
      propertyType: "Residential",
    });

    expect(result.investmentScore).toBeLessThan(60);
    expect(result.confidenceScore).toBeLessThan(50);
    expect(result.flags).toContain("Missing parcel identifier");
    expect(result.flags).toContain("Missing or invalid lien amount");
    expect(result.flags).toContain("Missing or invalid property value");
    expect(result.reasoning.join(" ")).toContain("Data confidence score");
  });

  it("treats no road access as a severe hard-filter risk", () => {
    const result = scoreLienCandidate({
      parcelId: "A-300",
      lienAmount: 500,
      estimatedValue: 20_000,
      propertyType: "Single-family residential",
      roadAccess: false,
    });

    expect(result.investmentScore).toBeLessThanOrEqual(10);
    expect(result.flags).toContain("No road access");
    expect(result.flags).toContain("DO NOT BID");
  });

  it("calculates value coverage and maps property type signals", () => {
    expect(calculateValueCoverage(10_000, 1_000)).toBe(10);
    expect(assessPropertyType("duplex").category).toBe("multifamily");
    expect(assessPropertyType("unknown county code").category).toBe("unknown");
  });

  it("handles extreme value ratios without exceeding score bounds", () => {
    const result = scoreLienCandidate({
      parcelId: "A-999",
      lienAmount: 1,
      estimatedValue: 1_000_000,
      propertyType: "Residential",
      roadAccess: true,
    });

    expect(result.investmentScore).toBeLessThanOrEqual(100);
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.valueCoverageRatio).toBe(1_000_000);
    expect(result.reasoning.join(" ")).toContain("Very strong value coverage ratio");
  });
});
