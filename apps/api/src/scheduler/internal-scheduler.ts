export interface ScheduledTaskContext {
  now: Date;
}

export interface ScheduledTask {
  id: string;
  intervalMs: number;
  run: (context: ScheduledTaskContext) => Promise<void>;
  runImmediately?: boolean;
}

export type ScheduledTaskRunStatus = "completed" | "failed" | "skipped";

export interface ScheduledTaskRunResult {
  taskId: string;
  status: ScheduledTaskRunStatus;
  error?: {
    code: string;
    message: string;
  };
}

interface RegisteredScheduledTask {
  task: ScheduledTask;
  nextRunAt: Date;
  isRunning: boolean;
}

export class InternalScheduler {
  private readonly tasksById = new Map<string, RegisteredScheduledTask>();
  private timer: NodeJS.Timeout | undefined;

  public register(task: ScheduledTask, now = new Date()): void {
    if (this.tasksById.has(task.id)) {
      throw new Error(`Scheduled task already registered: ${task.id}`);
    }

    if (!Number.isInteger(task.intervalMs) || task.intervalMs <= 0) {
      throw new Error(`Scheduled task interval must be a positive integer: ${task.id}`);
    }

    this.tasksById.set(task.id, {
      task,
      nextRunAt: task.runImmediately ? now : new Date(now.getTime() + task.intervalMs),
      isRunning: false,
    });
  }

  public async runDueTasks(now = new Date()): Promise<ScheduledTaskRunResult[]> {
    const results: ScheduledTaskRunResult[] = [];

    for (const registered of this.tasksById.values()) {
      if (registered.nextRunAt.getTime() > now.getTime()) {
        continue;
      }

      if (registered.isRunning) {
        results.push({
          taskId: registered.task.id,
          status: "skipped",
        });
        continue;
      }

      registered.isRunning = true;
      try {
        await registered.task.run({ now });
        results.push({
          taskId: registered.task.id,
          status: "completed",
        });
      } catch (error: unknown) {
        results.push({
          taskId: registered.task.id,
          status: "failed",
          error: safeSchedulerError(error),
        });
      } finally {
        registered.isRunning = false;
        registered.nextRunAt = new Date(now.getTime() + registered.task.intervalMs);
      }
    }

    return results;
  }

  public start(tickIntervalMs: number): void {
    if (this.timer) {
      return;
    }

    if (!Number.isInteger(tickIntervalMs) || tickIntervalMs <= 0) {
      throw new Error("Scheduler tick interval must be a positive integer.");
    }

    this.timer = setInterval(() => {
      void this.runDueTasks();
    }, tickIntervalMs);
  }

  public stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = undefined;
  }
}

function safeSchedulerError(error: unknown): { code: string; message: string } {
  if (error instanceof Error) {
    return {
      code: "scheduled_task_failed",
      message: error.message,
    };
  }

  return {
    code: "scheduled_task_failed",
    message: "Scheduled task failed.",
  };
}
