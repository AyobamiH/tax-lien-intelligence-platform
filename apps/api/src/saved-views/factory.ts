import { MongoComparisonStore } from "../comparison/comparison-store.js";
import { MongoPortfolioStore } from "../portfolio/portfolio-store.js";
import { SavedViewService } from "./saved-view-service.js";
import { MongoSavedViewStore } from "./saved-view-store.js";

export function createSavedViewService(): SavedViewService {
  return new SavedViewService(
    new MongoSavedViewStore(),
    new MongoPortfolioStore(),
    new MongoComparisonStore(),
  );
}
