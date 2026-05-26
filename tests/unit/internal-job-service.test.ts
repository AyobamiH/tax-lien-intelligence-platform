import { describe, expect, it } from "vitest";
import { ApiError } from "../../apps/api/src/errors/api-error.js";
import { InternalJobService } from "../../apps/api/src/jobs/internal-job-service.js";
import { InMemoryInternalJobStore } from "../support/in-memory-internal-job-store.js";

describe("internal job service", () => {
  it("enqueues and claims one queued job at a time", async () => {
    const jobStore = new InMemoryInternalJobStore();
    const service = new InternalJobService(jobStore);

    const queued = await service.enqueue({
      userId: "user-1",
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: "dataset-1",
    });

    expect(queued).toMatchObject({
      status: "queued",
      type: "dataset_scoring",
      targetEntityId: "dataset-1",
    });

    const claimed = await service.claimNextJob();
    const secondClaim = await service.claimNextJob();

    expect(claimed).toMatchObject({
      id: queued.id,
      status: "running",
      startedAt: expect.any(Date),
    });
    expect(secondClaim).toBeNull();
  });

  it("persists queued, running, and completed lifecycle state", async () => {
    const jobStore = new InMemoryInternalJobStore();
    const service = new InternalJobService(jobStore);

    const execution = await service.execute({
      userId: "user-1",
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: "dataset-1",
      run: async () => ({ scoredRecordCount: 3 }),
      summarize: (result) => ({ scoredRecordCount: result.scoredRecordCount }),
    });

    expect(execution.result.scoredRecordCount).toBe(3);
    expect(execution.job).toMatchObject({
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: "dataset-1",
      status: "completed",
      summary: {
        scoredRecordCount: 3,
      },
    });
    expect(execution.job.startedAt).toEqual(expect.any(String));
    expect(execution.job.completedAt).toEqual(expect.any(String));
    expect(execution.job.error).toBeUndefined();
  });

  it("persists failed lifecycle state with safe API error metadata", async () => {
    const jobStore = new InMemoryInternalJobStore();
    const service = new InternalJobService(jobStore);

    await expect(
      service.execute({
        userId: "user-1",
        type: "dataset_scoring",
        targetEntityType: "dataset",
        targetEntityId: "dataset-1",
        run: async () => {
          throw new ApiError(400, "score_no_source_rows", "Dataset does not contain scoreable source rows.");
        },
        summarize: () => ({ scoredRecordCount: 0 }),
      }),
    ).rejects.toMatchObject({
      code: "score_no_source_rows",
    });

    const failedJob = jobStore.listJobsForUser("user-1")[0];
    expect(failedJob).toMatchObject({
      status: "failed",
      error: {
        code: "score_no_source_rows",
        message: "Dataset does not contain scoreable source rows.",
      },
    });
    expect(failedJob?.failedAt).toBeInstanceOf(Date);
  });

  it("sanitizes unexpected job errors before persistence", async () => {
    const jobStore = new InMemoryInternalJobStore();
    const service = new InternalJobService(jobStore);

    await expect(
      service.execute({
        userId: "user-1",
        type: "dataset_scoring",
        targetEntityType: "dataset",
        targetEntityId: "dataset-1",
        run: async () => {
          throw new Error("database internals should not be stored as user-visible metadata");
        },
        summarize: () => ({ scoredRecordCount: 0 }),
      }),
    ).rejects.toThrow("database internals");

    expect(jobStore.listJobsForUser("user-1")[0]?.error).toEqual({
      code: "job_execution_failed",
      message: "Job execution failed.",
    });
  });
});
