import type {
  DatasetImportConfidence,
  DatasetImportProfileApplicationSummary,
  DatasetManualMappingSummary,
  ImportProfileApplicabilitySummary,
  ImportProfileMappingRule,
} from "@tax-lien/types";
import type { StoredImportProfile } from "./import-profile-store.js";
import { buildManualMappingSummary, type ManualMappingValues } from "./manual-mapping.js";

export interface ImportProfileMatch {
  profile: StoredImportProfile;
  confidence: DatasetImportConfidence;
  matchedMappings: number;
  totalMappings: number;
  resolvedMappings: ImportProfileMappingRule[];
  canAutoApply: boolean;
}

export function emptyImportProfileApplication(): DatasetImportProfileApplicationSummary {
  return {
    status: "none",
    matchedMappings: 0,
    totalMappings: 0,
    message: "No reusable import profile was applied.",
  };
}

export function buildHeaderSignature(headers: string[]): string[] {
  return [...new Set(headers.map(normalizeProfileHeader).filter(Boolean))].sort();
}

export function buildImportProfileApplicability(input: {
  headers: string[];
  adapterId: ImportProfileApplicabilitySummary["adapterId"];
  mappings: ImportProfileMappingRule[];
}): ImportProfileApplicabilitySummary {
  return {
    headerSignature: buildHeaderSignature(input.headers),
    sourceColumns: [...new Set(input.mappings.map((mapping) => normalizeProfileHeader(mapping.sourceColumn)))].sort(),
    adapterId: input.adapterId,
    columnCount: input.headers.length,
  };
}

export function findBestImportProfileMatch(
  profiles: StoredImportProfile[],
  headers: string[],
): ImportProfileMatch | null {
  const matches = profiles
    .map((profile) => evaluateImportProfileMatch(profile, headers))
    .filter((match): match is ImportProfileMatch => match !== null)
    .sort(compareMatches);

  return matches[0] ?? null;
}

export function evaluateImportProfileMatch(
  profile: StoredImportProfile,
  headers: string[],
): ImportProfileMatch | null {
  const totalMappings = profile.mappings.length;
  if (totalMappings === 0) {
    return null;
  }

  const headerLookup = buildUniqueHeaderLookup(headers);
  const resolvedMappings = profile.mappings.flatMap<ImportProfileMappingRule>((mapping) => {
    const header = headerLookup.get(normalizeProfileHeader(mapping.sourceColumn));
    return header ? [{ targetField: mapping.targetField, sourceColumn: header }] : [];
  });

  if (resolvedMappings.length !== totalMappings) {
    return null;
  }

  const datasetSignature = new Set(buildHeaderSignature(headers));
  const profileSignature = profile.applicability.headerSignature;
  const signatureContained =
    profileSignature.length > 0 && profileSignature.every((header) => datasetSignature.has(header));
  const confidence: DatasetImportConfidence = signatureContained ? "high" : "medium";

  return {
    profile,
    confidence,
    matchedMappings: resolvedMappings.length,
    totalMappings,
    resolvedMappings,
    canAutoApply: signatureContained,
  };
}

export function manualMappingFromProfileMatch(match: ImportProfileMatch, timestamp: Date): DatasetManualMappingSummary {
  const mappingValues: ManualMappingValues = {};
  for (const mapping of match.resolvedMappings) {
    mappingValues[mapping.targetField] = mapping.sourceColumn;
  }

  return buildManualMappingSummary(mappingValues, timestamp, "import_profile");
}

export function importProfileApplicationFromMatch(
  match: ImportProfileMatch,
  status: "suggested" | "auto_applied" | "user_applied",
  timestamp: Date,
): DatasetImportProfileApplicationSummary {
  const applied = status === "auto_applied" || status === "user_applied";
  const action = status === "suggested"
    ? "suggested"
    : status === "auto_applied"
      ? "applied automatically"
      : "applied by user confirmation";

  return {
    status,
    profileId: match.profile.id,
    profileName: match.profile.name,
    confidence: match.confidence,
    matchedMappings: match.matchedMappings,
    totalMappings: match.totalMappings,
    ...(applied ? { appliedAt: timestamp.toISOString() } : {}),
    message: `Import profile "${match.profile.name}" was ${action} using ${match.matchedMappings}/${match.totalMappings} mapped column(s).`,
  };
}

function buildUniqueHeaderLookup(headers: string[]): Map<string, string> {
  const counts = new Map<string, number>();
  const firstHeader = new Map<string, string>();

  for (const header of headers) {
    const normalized = normalizeProfileHeader(header);
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    if (!firstHeader.has(normalized)) {
      firstHeader.set(normalized, header);
    }
  }

  const lookup = new Map<string, string>();
  for (const [normalized, count] of counts.entries()) {
    if (count === 1) {
      const header = firstHeader.get(normalized);
      if (header) {
        lookup.set(normalized, header);
      }
    }
  }

  return lookup;
}

function compareMatches(left: ImportProfileMatch, right: ImportProfileMatch): number {
  if (left.canAutoApply !== right.canAutoApply) {
    return left.canAutoApply ? -1 : 1;
  }

  if (left.matchedMappings !== right.matchedMappings) {
    return right.matchedMappings - left.matchedMappings;
  }

  return right.profile.updatedAt.getTime() - left.profile.updatedAt.getTime();
}

function normalizeProfileHeader(header: string): string {
  return header.trim().toLowerCase().replaceAll(/[_\s-]+/g, " ");
}
