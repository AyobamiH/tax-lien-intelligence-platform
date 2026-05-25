import type { JobAlertSink } from "../alerts/alert-service.js";
import { MongoInternalJobStore } from "./internal-job-store.js";
import { InternalJobService } from "./internal-job-service.js";

export function createInternalJobService(alertSink?: JobAlertSink): InternalJobService {
  return new InternalJobService(new MongoInternalJobStore(), alertSink);
}
