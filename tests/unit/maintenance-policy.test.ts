import { describe, expect, it } from "vitest";
import {
  createMaintenancePolicy,
  evaluateMaintenancePolicy,
  maintenanceStatusForDataset,
} from "../../apps/api/src/maintenance/maintenance-policy.js";

describe("maintenance policy", () => {
  it("keeps fresh datasets out of scheduled refresh", () => {
    const policy = createMaintenancePolicy({
      autoRefreshEnabled: true,
      maxDatasetsPerRun: 25,
      minRefreshIntervalHours: 24,
      failureSuppressionHours: 24,
    });

    expect(
      evaluateMaintenancePolicy(policy, {
        staleRecordCount: 0,
        hasActiveRefresh: false,
        now: new Date("2026-01-03T00:00:00.000Z"),
      }),
    ).toEqual({
      decision: "not_stale",
      eligibleForPolicyRefresh: false,
      message: "Dataset scoring is currently fresh.",
    });
  });

  it("requires explicit policy enablement before queuing auto-refresh", () => {
    const policy = createMaintenancePolicy({
      autoRefreshEnabled: false,
      maxDatasetsPerRun: 25,
      minRefreshIntervalHours: 24,
      failureSuppressionHours: 24,
    });

    expect(
      evaluateMaintenancePolicy(policy, {
        staleRecordCount: 3,
        hasActiveRefresh: false,
        now: new Date("2026-01-03T00:00:00.000Z"),
      }),
    ).toMatchObject({
      decision: "manual_refresh_only",
      eligibleForPolicyRefresh: false,
    });
  });

  it("blocks policy refresh when work is already active or was handled recently", () => {
    const policy = createMaintenancePolicy({
      autoRefreshEnabled: true,
      maxDatasetsPerRun: 25,
      minRefreshIntervalHours: 24,
      failureSuppressionHours: 24,
    });
    const now = new Date("2026-01-03T00:00:00.000Z");

    expect(
      evaluateMaintenancePolicy(policy, {
        staleRecordCount: 2,
        hasActiveRefresh: true,
        now,
      }).decision,
    ).toBe("active_refresh_exists");
    expect(
      evaluateMaintenancePolicy(policy, {
        staleRecordCount: 2,
        hasActiveRefresh: false,
        latestRefreshCompletedAt: "2026-01-02T12:00:00.000Z",
        now,
      }).decision,
    ).toBe("recent_refresh_suppressed");
    expect(
      evaluateMaintenancePolicy(policy, {
        staleRecordCount: 2,
        hasActiveRefresh: false,
        latestRefreshFailedAt: "2026-01-02T12:00:00.000Z",
        now,
      }).decision,
    ).toBe("recent_failure_suppressed");
  });

  it("marks stale datasets eligible only when policy gates pass", () => {
    const policy = createMaintenancePolicy({
      autoRefreshEnabled: true,
      maxDatasetsPerRun: 25,
      minRefreshIntervalHours: 24,
      failureSuppressionHours: 24,
    });

    expect(
      maintenanceStatusForDataset({
        policy,
        staleRecordCount: 2,
        hasActiveRefresh: false,
        now: new Date("2026-01-03T00:00:00.000Z"),
      }),
    ).toEqual({
      mode: "policy_auto_refresh",
      autoRefreshEnabled: true,
      eligibleForPolicyRefresh: true,
      message: "Dataset is stale and eligible for policy-driven refresh.",
    });
  });
});
