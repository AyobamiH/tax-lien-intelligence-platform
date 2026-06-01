import type { DatasetMaintenanceStatus, MaintenanceDecision } from "@tax-lien/types";

export interface MaintenancePolicy {
  autoRefreshEnabled: boolean;
  maxDatasetsPerRun: number;
  minRefreshIntervalHours: number;
  failureSuppressionHours: number;
}

export interface MaintenancePolicyConfig {
  autoRefreshEnabled: boolean;
  maxDatasetsPerRun: number;
  minRefreshIntervalHours: number;
  failureSuppressionHours: number;
}

export interface MaintenancePolicyEvaluationInput {
  staleRecordCount: number;
  hasActiveRefresh: boolean;
  latestRefreshCompletedAt?: string;
  latestRefreshFailedAt?: string;
  now: Date;
}

export interface MaintenancePolicyEvaluation {
  decision: MaintenanceDecision;
  eligibleForPolicyRefresh: boolean;
  message: string;
}

const hoursToMs = 60 * 60 * 1000;

export function createMaintenancePolicy(config: MaintenancePolicyConfig): MaintenancePolicy {
  return {
    autoRefreshEnabled: config.autoRefreshEnabled,
    maxDatasetsPerRun: Math.max(1, Math.min(Math.floor(config.maxDatasetsPerRun), 250)),
    minRefreshIntervalHours: Math.max(1, Math.min(Math.floor(config.minRefreshIntervalHours), 720)),
    failureSuppressionHours: Math.max(1, Math.min(Math.floor(config.failureSuppressionHours), 720)),
  };
}

export function evaluateMaintenancePolicy(
  policy: MaintenancePolicy,
  input: MaintenancePolicyEvaluationInput,
): MaintenancePolicyEvaluation {
  if (input.staleRecordCount <= 0) {
    return {
      decision: "not_stale",
      eligibleForPolicyRefresh: false,
      message: "Dataset scoring is currently fresh.",
    };
  }

  if (input.hasActiveRefresh) {
    return {
      decision: "active_refresh_exists",
      eligibleForPolicyRefresh: false,
      message: "A scoring or refresh job is already queued or running for this dataset.",
    };
  }

  if (isWithinWindow(input.latestRefreshFailedAt, input.now, policy.failureSuppressionHours)) {
    return {
      decision: "recent_failure_suppressed",
      eligibleForPolicyRefresh: false,
      message: "Scheduled refresh is suppressed after a recent failed policy refresh.",
    };
  }

  if (isWithinWindow(input.latestRefreshCompletedAt, input.now, policy.minRefreshIntervalHours)) {
    return {
      decision: "recent_refresh_suppressed",
      eligibleForPolicyRefresh: false,
      message: "Scheduled refresh is suppressed because this dataset refreshed recently.",
    };
  }

  if (!policy.autoRefreshEnabled) {
    return {
      decision: "manual_refresh_only",
      eligibleForPolicyRefresh: false,
      message: "Dataset is stale, but policy allows manual refresh only.",
    };
  }

  return {
    decision: "policy_refresh_queued",
    eligibleForPolicyRefresh: true,
    message: "Dataset is stale and eligible for policy-driven refresh.",
  };
}

export function maintenanceStatusForDataset(input: {
  policy: MaintenancePolicy;
  staleRecordCount: number;
  hasActiveRefresh: boolean;
  latestRefreshCompletedAt?: string;
  latestRefreshFailedAt?: string;
  now: Date;
}): DatasetMaintenanceStatus {
  const evaluation = evaluateMaintenancePolicy(input.policy, {
    staleRecordCount: input.staleRecordCount,
    hasActiveRefresh: input.hasActiveRefresh,
    ...(input.latestRefreshCompletedAt ? { latestRefreshCompletedAt: input.latestRefreshCompletedAt } : {}),
    ...(input.latestRefreshFailedAt ? { latestRefreshFailedAt: input.latestRefreshFailedAt } : {}),
    now: input.now,
  });

  return {
    mode: input.policy.autoRefreshEnabled ? "policy_auto_refresh" : "manual_refresh_only",
    autoRefreshEnabled: input.policy.autoRefreshEnabled,
    eligibleForPolicyRefresh: evaluation.eligibleForPolicyRefresh,
    message: evaluation.message,
  };
}

function isWithinWindow(value: string | undefined, now: Date, hours: number): boolean {
  if (!value) {
    return false;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && now.getTime() - parsed < hours * hoursToMs;
}
