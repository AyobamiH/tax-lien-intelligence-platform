import type { ScheduledTask } from "../scheduler/internal-scheduler.js";
import type { FollowUpService } from "./follow-up-service.js";

export function createFollowUpReminderTask(
  followUpService: FollowUpService,
  intervalMs: number,
): ScheduledTask {
  return {
    id: "follow-up-reminder-scan",
    intervalMs,
    runImmediately: true,
    run: async ({ now }) => {
      await followUpService.runReminderScan(now);
    },
  };
}
