import { MongoInternalJobStore } from "./internal-job-store.js";
import { InternalJobService } from "./internal-job-service.js";

export function createInternalJobService(): InternalJobService {
  return new InternalJobService(new MongoInternalJobStore());
}
