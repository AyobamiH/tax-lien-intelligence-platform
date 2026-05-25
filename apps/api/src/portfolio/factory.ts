import { MongoScoredRecordStore } from "../scoring/scored-record-store.js";
import { MongoWatchlistStore } from "../watchlist/watchlist-store.js";
import { PortfolioService } from "./portfolio-service.js";
import { MongoPortfolioStore } from "./portfolio-store.js";

export function createPortfolioService(): PortfolioService {
  return new PortfolioService(
    new MongoPortfolioStore(),
    new MongoScoredRecordStore(),
    new MongoWatchlistStore(),
  );
}
