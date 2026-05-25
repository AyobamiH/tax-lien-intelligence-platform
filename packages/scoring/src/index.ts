export const SCORING_PACKAGE_VERSION = "0.2.0";

export type PropertyTypeCategory = "residential" | "multifamily" | "commercial" | "land" | "unknown";
export type LocationQuality = "urban" | "suburban" | "rural" | "remote" | "unknown";

export interface ScoreableRecord {
  parcelId?: string;
  lienAmount?: number;
  estimatedValue?: number;
  propertyType?: string;
  roadAccess?: boolean;
  buildable?: boolean;
  utilitiesAvailable?: boolean;
  locationQuality?: LocationQuality;
}

export interface PropertyTypeAssessment {
  category: PropertyTypeCategory;
  score: number;
  flags: string[];
  reasoning: string[];
}

export interface ScoringResult {
  investmentScore: number;
  riskScore: number;
  liquidityScore: number;
  redemptionProbability: number;
  confidenceScore: number;
  valueCoverageRatio?: number;
  flags: string[];
  reasoning: string[];
}

export interface ScoringWeights {
  valueCoverage: number;
  propertyType: number;
  access: number;
  liquidity: number;
  redemption: number;
  confidence: number;
}

export const defaultScoringWeights: ScoringWeights = {
  valueCoverage: 0.35,
  propertyType: 0.2,
  access: 0.15,
  liquidity: 0.15,
  redemption: 0.1,
  confidence: 0.05,
};

export function calculateValueCoverage(estimatedValue: number | undefined, lienAmount: number | undefined): number | undefined {
  if (!isPositiveFiniteNumber(estimatedValue) || !isPositiveFiniteNumber(lienAmount)) {
    return undefined;
  }

  return estimatedValue / lienAmount;
}

export function assessPropertyType(propertyType: string | undefined): PropertyTypeAssessment {
  const normalized = propertyType?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return {
      category: "unknown",
      score: 20,
      flags: ["Unknown property type", "DO NOT BID without property type verification"],
      reasoning: ["Property type is missing, so the record is scored conservatively."],
    };
  }

  if (containsAny(normalized, ["single family", "single-family", "residential", "sfr", "home", "house"])) {
    return {
      category: "residential",
      score: 88,
      flags: [],
      reasoning: ["Residential property type usually has stronger resale and redemption signals."],
    };
  }

  if (containsAny(normalized, ["multi family", "multi-family", "duplex", "triplex", "fourplex", "apartment"])) {
    return {
      category: "multifamily",
      score: 84,
      flags: [],
      reasoning: ["Multi-family property type can support strong liquidity when other data is sound."],
    };
  }

  if (containsAny(normalized, ["commercial", "retail", "office", "industrial", "warehouse"])) {
    return {
      category: "commercial",
      score: 62,
      flags: ["Commercial property requires additional market diligence"],
      reasoning: ["Commercial property can be viable but needs stronger due diligence than residential liens."],
    };
  }

  if (containsAny(normalized, ["vacant", "land", "lot", "acre", "agricultural", "desert"])) {
    return {
      category: "land",
      score: 18,
      flags: ["Vacant land is high risk", "Land requires road, utility, and buildability verification"],
      reasoning: ["Vacant land often has weak liquidity and uncertain practical use without enrichment data."],
    };
  }

  return {
    category: "unknown",
    score: 25,
    flags: ["Unknown property type", "DO NOT BID without property type verification"],
    reasoning: [`Property type "${propertyType}" could not be mapped to a supported category.`],
  };
}

export function evaluateAccess(record: ScoreableRecord): { score: number; flags: string[]; reasoning: string[] } {
  const flags: string[] = [];
  const reasoning: string[] = [];

  if (record.roadAccess === false) {
    return {
      score: 0,
      flags: ["No road access", "DO NOT BID"],
      reasoning: ["No road access is a severe usability risk for lien investment."],
    };
  }

  if (record.buildable === false) {
    flags.push("Property may not be buildable");
    reasoning.push("Buildability is marked negative, reducing practical exit value.");
  }

  if (record.utilitiesAvailable === false) {
    flags.push("Utilities unavailable or unconfirmed");
    reasoning.push("Missing utilities can reduce liquidity and exit potential.");
  }

  if (record.roadAccess === true) {
    reasoning.push("Road access is present, supporting basic usability.");
  } else {
    flags.push("Road access not confirmed");
    reasoning.push("Road access is not present in the uploaded data, reducing confidence.");
  }

  const penalty = (record.buildable === false ? 25 : 0) + (record.utilitiesAvailable === false ? 15 : 0);
  const baseScore = record.roadAccess === true ? 90 : 68;

  return {
    score: clamp(baseScore - penalty, 0, 100),
    flags,
    reasoning,
  };
}

export function computeLocationScore(locationQuality: LocationQuality | undefined): number {
  switch (locationQuality ?? "unknown") {
    case "urban":
      return 88;
    case "suburban":
      return 82;
    case "rural":
      return 55;
    case "remote":
      return 25;
    case "unknown":
      return 50;
  }
}

export function estimateRedemptionProbability(record: ScoreableRecord): number {
  const valueCoverage = calculateValueCoverage(record.estimatedValue, record.lienAmount);
  const propertyType = assessPropertyType(record.propertyType);
  let probability = 0.45;

  if (propertyType.category === "residential" || propertyType.category === "multifamily") {
    probability += 0.2;
  }

  if (propertyType.category === "land") {
    probability -= 0.2;
  }

  if (valueCoverage !== undefined) {
    if (valueCoverage >= 10) {
      probability += 0.15;
    } else if (valueCoverage >= 3) {
      probability += 0.1;
    } else if (valueCoverage < 1.5) {
      probability -= 0.15;
    }
  }

  if (record.roadAccess === false) {
    probability -= 0.25;
  }

  return roundToTwo(clamp(probability, 0.05, 0.95));
}

export function computeLiquidity(record: ScoreableRecord): number {
  const propertyType = assessPropertyType(record.propertyType);
  const locationScore = computeLocationScore(record.locationQuality);
  let typeLiquidity = 35;

  if (propertyType.category === "residential") {
    typeLiquidity = 86;
  } else if (propertyType.category === "multifamily") {
    typeLiquidity = 82;
  } else if (propertyType.category === "commercial") {
    typeLiquidity = 58;
  } else if (propertyType.category === "land") {
    typeLiquidity = 18;
  }

  if (record.roadAccess === false) {
    typeLiquidity = 5;
  }

  return clamp(Math.round(typeLiquidity * 0.7 + locationScore * 0.3), 0, 100);
}

export function scoreLienCandidate(record: ScoreableRecord, weights: ScoringWeights = defaultScoringWeights): ScoringResult {
  const flags: string[] = [];
  const reasoning: string[] = [];
  const propertyType = assessPropertyType(record.propertyType);
  const access = evaluateAccess(record);
  const valueCoverageRatio = calculateValueCoverage(record.estimatedValue, record.lienAmount);
  const valueCoverageScore = scoreValueCoverage(valueCoverageRatio);
  const liquidityScore = computeLiquidity(record);
  const redemptionProbability = estimateRedemptionProbability(record);
  const confidenceScore = computeConfidence(record);

  flags.push(...propertyType.flags, ...access.flags);
  reasoning.push(...propertyType.reasoning, ...access.reasoning);

  if (!record.parcelId) {
    flags.push("Missing parcel identifier");
    reasoning.push("The uploaded row does not contain a clear parcel identifier.");
  }

  if (!isPositiveFiniteNumber(record.lienAmount)) {
    flags.push("Missing or invalid lien amount");
    reasoning.push("Lien amount is missing or invalid, so the investment score is conservative.");
  }

  if (!isPositiveFiniteNumber(record.estimatedValue)) {
    flags.push("Missing or invalid property value");
    reasoning.push("Property value is missing or invalid, reducing safety-margin confidence.");
  }

  if (valueCoverageRatio !== undefined) {
    reasoning.push(valueCoverageReason(valueCoverageRatio));
    if (valueCoverageRatio < 1) {
      flags.push("Value coverage below lien amount", "DO NOT BID");
    } else if (valueCoverageRatio < 1.5) {
      flags.push("Thin value coverage");
    }
  }

  const rawInvestmentScore =
    valueCoverageScore * weights.valueCoverage +
    propertyType.score * weights.propertyType +
    access.score * weights.access +
    liquidityScore * weights.liquidity +
    redemptionProbability * 100 * weights.redemption +
    confidenceScore * weights.confidence;

  const cappedInvestmentScore = applyHardCaps(rawInvestmentScore, {
    valueCoverageRatio,
    propertyTypeCategory: propertyType.category,
    noRoadAccess: record.roadAccess === false,
  });
  const investmentScore = clamp(Math.round(cappedInvestmentScore), 0, 100);
  const riskScore = clamp(Math.round(100 - investmentScore + riskPenalty(flags)), 0, 100);

  reasoning.push(`Data confidence score is ${confidenceScore}/100 based on available core fields.`);
  reasoning.push(`Estimated redemption probability is ${Math.round(redemptionProbability * 100)}%.`);
  reasoning.push(`Estimated liquidity score is ${liquidityScore}/100.`);

  return {
    investmentScore,
    riskScore,
    liquidityScore,
    redemptionProbability,
    confidenceScore,
    ...(valueCoverageRatio !== undefined ? { valueCoverageRatio: roundToTwo(valueCoverageRatio) } : {}),
    flags: uniqueStrings(flags),
    reasoning: uniqueStrings(reasoning),
  };
}

function scoreValueCoverage(valueCoverageRatio: number | undefined): number {
  if (valueCoverageRatio === undefined) {
    return 25;
  }

  if (valueCoverageRatio < 1) {
    return 0;
  }

  if (valueCoverageRatio < 1.5) {
    return 15;
  }

  if (valueCoverageRatio < 3) {
    return 45;
  }

  if (valueCoverageRatio <= 10) {
    return 82;
  }

  return 96;
}

function valueCoverageReason(valueCoverageRatio: number): string {
  const rounded = roundToTwo(valueCoverageRatio);
  if (valueCoverageRatio < 1) {
    return `Value coverage ratio is ${rounded}x, meaning the lien exceeds the known property value.`;
  }

  if (valueCoverageRatio < 1.5) {
    return `Value coverage ratio is thin at ${rounded}x.`;
  }

  if (valueCoverageRatio < 3) {
    return `Value coverage ratio is moderate at ${rounded}x.`;
  }

  if (valueCoverageRatio <= 10) {
    return `Strong value coverage ratio (${rounded}x) supports lien safety margin.`;
  }

  return `Very strong value coverage ratio (${rounded}x) indicates a large safety margin.`;
}

function computeConfidence(record: ScoreableRecord): number {
  let score = 25;

  if (record.parcelId) {
    score += 15;
  }

  if (isPositiveFiniteNumber(record.lienAmount)) {
    score += 25;
  }

  if (isPositiveFiniteNumber(record.estimatedValue)) {
    score += 25;
  }

  if (record.propertyType?.trim()) {
    score += 10;
  }

  return clamp(score, 0, 100);
}

function applyHardCaps(
  score: number,
  input: { valueCoverageRatio: number | undefined; propertyTypeCategory: PropertyTypeCategory; noRoadAccess: boolean },
): number {
  if (input.noRoadAccess) {
    return Math.min(score, 10);
  }

  if (input.valueCoverageRatio !== undefined && input.valueCoverageRatio < 1) {
    return Math.min(score, 20);
  }

  if (input.propertyTypeCategory === "unknown") {
    return Math.min(score, 35);
  }

  if (input.propertyTypeCategory === "land") {
    return Math.min(score, 55);
  }

  return score;
}

function riskPenalty(flags: string[]): number {
  let penalty = 0;
  if (flags.includes("DO NOT BID")) {
    penalty += 20;
  }

  penalty += flags.filter((flag) => flag.toLowerCase().includes("missing")).length * 5;
  penalty += flags.filter((flag) => flag.toLowerCase().includes("unknown")).length * 4;

  return penalty;
}

function containsAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function isPositiveFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
