import { describe, expect, it } from "vitest";
import { InternalScheduler } from "../../apps/api/src/scheduler/internal-scheduler.js";

describe("internal scheduler", () => {
  it("runs due tasks and waits until the next interval before running again", async () => {
    const scheduler = new InternalScheduler();
    const runs: string[] = [];
    const now = new Date("2026-05-26T00:00:00.000Z");

    scheduler.register(
      {
        id: "maintenance",
        intervalMs: 60_000,
        runImmediately: true,
        run: async () => {
          runs.push("maintenance");
        },
      },
      now,
    );

    expect(await scheduler.runDueTasks(now)).toEqual([
      {
        taskId: "maintenance",
        status: "completed",
      },
    ]);
    expect(await scheduler.runDueTasks(new Date(now.getTime() + 30_000))).toEqual([]);
    expect(await scheduler.runDueTasks(new Date(now.getTime() + 60_000))).toEqual([
      {
        taskId: "maintenance",
        status: "completed",
      },
    ]);
    expect(runs).toEqual(["maintenance", "maintenance"]);
  });

  it("records safe failed task results", async () => {
    const scheduler = new InternalScheduler();
    const now = new Date("2026-05-26T00:00:00.000Z");

    scheduler.register(
      {
        id: "failing-task",
        intervalMs: 60_000,
        runImmediately: true,
        run: async () => {
          throw new Error("Maintenance task failed.");
        },
      },
      now,
    );

    expect(await scheduler.runDueTasks(now)).toEqual([
      {
        taskId: "failing-task",
        status: "failed",
        error: {
          code: "scheduled_task_failed",
          message: "Maintenance task failed.",
        },
      },
    ]);
  });

  it("rejects duplicate task registration", () => {
    const scheduler = new InternalScheduler();
    const task = {
      id: "maintenance",
      intervalMs: 60_000,
      run: async () => undefined,
    };

    scheduler.register(task);
    expect(() => scheduler.register(task)).toThrow("Scheduled task already registered");
  });
});
