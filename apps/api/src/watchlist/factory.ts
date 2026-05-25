import { MongoScoredRecordStore } from "../scoring/scored-record-store.js";
import { WatchlistService } from "./watchlist-service.js";
import { MongoWatchlistStore } from "./watchlist-store.js";

export function createWatchlistService(): WatchlistService {
  return new WatchlistService(new MongoWatchlistStore(), new MongoScoredRecordStore());
}
