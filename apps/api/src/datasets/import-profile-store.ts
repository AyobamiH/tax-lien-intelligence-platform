import type { ImportProfileDocument } from "@tax-lien/db";
import { ImportProfileModel } from "@tax-lien/db";
import type {
  DatasetImportAdapterId,
  ImportProfileApplicabilitySummary,
  ImportProfileMappingRule,
} from "@tax-lien/types";

export interface StoredImportProfile {
  id: string;
  userId: string;
  name: string;
  sourceLabel?: string;
  adapterId: DatasetImportAdapterId;
  adapterName: string;
  mappings: ImportProfileMappingRule[];
  applicability: ImportProfileApplicabilitySummary;
  createdFromDatasetId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateImportProfileInput {
  userId: string;
  name: string;
  sourceLabel?: string;
  adapterId: DatasetImportAdapterId;
  adapterName: string;
  mappings: ImportProfileMappingRule[];
  applicability: ImportProfileApplicabilitySummary;
  createdFromDatasetId?: string;
}

export interface ImportProfileStore {
  createProfile(input: CreateImportProfileInput): Promise<StoredImportProfile>;
  listProfiles(userId: string): Promise<StoredImportProfile[]>;
  findProfileByIdForUser(profileId: string, userId: string): Promise<StoredImportProfile | null>;
}

export class NoopImportProfileStore implements ImportProfileStore {
  public async createProfile(): Promise<StoredImportProfile> {
    throw new Error("Import profile store is not configured.");
  }

  public async listProfiles(): Promise<StoredImportProfile[]> {
    return [];
  }

  public async findProfileByIdForUser(): Promise<StoredImportProfile | null> {
    return null;
  }
}

export class MongoImportProfileStore implements ImportProfileStore {
  public async createProfile(input: CreateImportProfileInput): Promise<StoredImportProfile> {
    const document = await ImportProfileModel.create(input);
    return mapImportProfile(document);
  }

  public async listProfiles(userId: string): Promise<StoredImportProfile[]> {
    const documents = await ImportProfileModel.find({ userId }).sort({ updatedAt: -1 }).exec();
    return documents.map(mapImportProfile);
  }

  public async findProfileByIdForUser(profileId: string, userId: string): Promise<StoredImportProfile | null> {
    const document = await ImportProfileModel.findOne({ _id: profileId, userId }).exec();
    return document ? mapImportProfile(document) : null;
  }
}

function mapImportProfile(document: ImportProfileDocument): StoredImportProfile {
  const profile: StoredImportProfile = {
    id: document.id,
    userId: document.userId,
    name: document.name,
    adapterId: document.adapterId,
    adapterName: document.adapterName,
    mappings: document.mappings.map((mapping) => ({
      targetField: mapping.targetField,
      sourceColumn: mapping.sourceColumn,
    })),
    applicability: {
      headerSignature: document.applicability.headerSignature,
      sourceColumns: document.applicability.sourceColumns,
      adapterId: document.applicability.adapterId,
      columnCount: document.applicability.columnCount,
    },
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };

  if (document.sourceLabel) {
    profile.sourceLabel = document.sourceLabel;
  }

  if (document.createdFromDatasetId) {
    profile.createdFromDatasetId = document.createdFromDatasetId;
  }

  return profile;
}
