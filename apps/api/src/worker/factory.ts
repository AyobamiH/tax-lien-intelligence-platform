import { createAlertService } from "../alerts/factory.js";
import { createInternalJobService } from "../jobs/factory.js";
import { createScoringService } from "../scoring/factory.js";
import { WorkerJobProcessor } from "./worker-job-processor.js";

export function createWorkerJobProcessor(): WorkerJobProcessor {
  const alertService = createAlertService();
  const internalJobService = createInternalJobService(alertService);
  const scoringService = createScoringService(internalJobService);

  return new WorkerJobProcessor(internalJobService, scoringService);
}
