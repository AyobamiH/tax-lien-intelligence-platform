import { createAlertService } from "../alerts/factory.js";
import { createInternalJobService } from "../jobs/factory.js";
import { createMaintenanceService } from "../maintenance/factory.js";
import { createScoringService } from "../scoring/factory.js";
import { WorkerJobProcessor } from "./worker-job-processor.js";

export function createWorkerJobProcessor(): WorkerJobProcessor {
  const alertService = createAlertService();
  const internalJobService = createInternalJobService(alertService);
  const scoringService = createScoringService(internalJobService);
  const maintenanceService = createMaintenanceService(internalJobService);

  return new WorkerJobProcessor(internalJobService, scoringService, maintenanceService);
}
