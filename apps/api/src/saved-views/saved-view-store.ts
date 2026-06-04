import type { SavedViewDocument } from "@tax-lien/db";
import { SavedViewModel } from "@tax-lien/db";
import type { SavedViewFilters, SavedViewSort, SavedViewSurface } from "@tax-lien/types";

export interface StoredSavedView {
  id: string;
  userId: string;
  surface: SavedViewSurface;
  name: string;
  description?: string;
  filters: SavedViewFilters;
  sort?: SavedViewSort;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveSavedViewInput {
  userId: string;
  surface: SavedViewSurface;
  name: string;
  description?: string;
  filters: SavedViewFilters;
  sort?: SavedViewSort;
}

export interface UpdateSavedViewInput {
  name?: string;
  description?: string | null;
  filters?: SavedViewFilters;
  sort?: SavedViewSort | null;
}

export interface SavedViewStore {
  createView(input: SaveSavedViewInput): Promise<StoredSavedView>;
  listViewsForUser(userId: string): Promise<StoredSavedView[]>;
  findViewByIdForUser(savedViewId: string, userId: string): Promise<StoredSavedView | null>;
  updateViewForUser(savedViewId: string, userId: string, input: UpdateSavedViewInput): Promise<StoredSavedView | null>;
  deleteViewForUser(savedViewId: string, userId: string): Promise<boolean>;
}

export class MongoSavedViewStore implements SavedViewStore {
  public async createView(input: SaveSavedViewInput): Promise<StoredSavedView> {
    const document = await SavedViewModel.create(input);
    return mapSavedView(document);
  }

  public async listViewsForUser(userId: string): Promise<StoredSavedView[]> {
    const documents = await SavedViewModel.find({ userId }).sort({ surface: 1, updatedAt: -1 }).exec();
    return documents.map(mapSavedView);
  }

  public async findViewByIdForUser(savedViewId: string, userId: string): Promise<StoredSavedView | null> {
    const document = await SavedViewModel.findOne({ _id: savedViewId, userId }).exec();
    return document ? mapSavedView(document) : null;
  }

  public async updateViewForUser(
    savedViewId: string,
    userId: string,
    input: UpdateSavedViewInput,
  ): Promise<StoredSavedView | null> {
    const set: Record<string, unknown> = {};
    const unset: Record<string, true> = {};

    if (input.name !== undefined) {
      set.name = input.name;
    }
    if (input.description === null) {
      unset.description = true;
    } else if (input.description !== undefined) {
      set.description = input.description;
    }
    if (input.filters !== undefined) {
      set.filters = input.filters;
    }
    if (input.sort === null) {
      unset.sort = true;
    } else if (input.sort !== undefined) {
      set.sort = input.sort;
    }

    const update = {
      ...(Object.keys(set).length > 0 ? { $set: set } : {}),
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
    };

    const document = await SavedViewModel.findOneAndUpdate({ _id: savedViewId, userId }, update, { new: true }).exec();
    return document ? mapSavedView(document) : null;
  }

  public async deleteViewForUser(savedViewId: string, userId: string): Promise<boolean> {
    const result = await SavedViewModel.deleteOne({ _id: savedViewId, userId }).exec();
    return result.deletedCount === 1;
  }
}

export function mapSavedView(document: SavedViewDocument): StoredSavedView {
  return {
    id: document.id,
    userId: document.userId,
    surface: document.surface,
    name: document.name,
    ...(document.description ? { description: document.description } : {}),
    filters: document.filters,
    ...(document.sort ? { sort: document.sort } : {}),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
