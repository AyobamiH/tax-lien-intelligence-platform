import type { ComparisonService } from "../comparison/comparison-service.js";
import { MongoDecisionOutcomeStore } from "../decision-outcomes/decision-outcome-store.js";
import { OutcomeReviewService } from "./outcome-review-service.js";

export function createOutcomeReviewService(
  comparisonService: ComparisonService,
): OutcomeReviewService {
  return new OutcomeReviewService(
    new MongoDecisionOutcomeStore(),
    comparisonService,
  );
}
