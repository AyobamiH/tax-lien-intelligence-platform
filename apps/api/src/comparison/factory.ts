import { MongoPortfolioStore } from "../portfolio/portfolio-store.js";
import { MongoScoredRecordStore } from "../scoring/scored-record-store.js";
import { MongoWatchlistStore } from "../watchlist/watchlist-store.js";
import { ComparisonService } from "./comparison-service.js";
import { MongoComparisonStore } from "./comparison-store.js";

export function createComparisonService(): ComparisonService {
  return new ComparisonService(
    new MongoComparisonStore(),
    new MongoScoredRecordStore(),
    new MongoWatchlistStore(),
    new MongoPortfolioStore(),
  );
}
