import type { WorkspaceCommentEntityType } from "@tax-lien/types";
import type { ComparisonStore } from "../comparison/comparison-store.js";
import type { DatasetStore } from "../datasets/dataset-store.js";
import type { PortfolioStore } from "../portfolio/portfolio-store.js";
import type { WatchlistStore } from "../watchlist/watchlist-store.js";

export interface WorkspaceCommentTargetAccess {
  canAccess(
    entityType: WorkspaceCommentEntityType,
    entityId: string,
    tenantUserId: string,
  ): Promise<boolean>;
}

export class StoreBackedWorkspaceCommentTargetAccess implements WorkspaceCommentTargetAccess {
  public constructor(
    private readonly datasetStore: DatasetStore,
    private readonly comparisonStore: ComparisonStore,
    private readonly watchlistStore: WatchlistStore,
    private readonly portfolioStore: PortfolioStore,
  ) {}

  public async canAccess(
    entityType: WorkspaceCommentEntityType,
    entityId: string,
    tenantUserId: string,
  ): Promise<boolean> {
    switch (entityType) {
      case "dataset":
        return Boolean(await this.datasetStore.findDatasetByIdForUser(entityId, tenantUserId));
      case "comparison_item":
        return Boolean(await this.comparisonStore.findItemByIdForUser(entityId, tenantUserId));
      case "watchlist_item":
        return Boolean(await this.watchlistStore.findItemByIdForUser(entityId, tenantUserId));
      case "portfolio_item":
        return Boolean(await this.portfolioStore.findItemByIdForUser(entityId, tenantUserId));
    }
  }
}
