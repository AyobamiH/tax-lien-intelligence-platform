import type {
  AlertMetadata,
  AlertRelatedEntityType,
  AlertSeverity,
  AlertType,
  NotificationCadence,
  NotificationDeliveryMode,
  NotificationDeliveryPreparation,
  NotificationPreferenceCategory,
  NotificationPreferenceRule,
  NotificationPreferencesDetailResponse,
  NotificationPreferencesResponse,
  UpdateNotificationPreferencesRequest,
  UpdateNotificationPreferencesResponse,
} from "@tax-lien/types";
import { ApiError } from "../errors/api-error.js";
import type { CreateAlertInput } from "../alerts/alert-store.js";
import type {
  NotificationPreferenceStore,
  StoredNotificationPreferences,
} from "./notification-preference-store.js";

export const notificationAlertTypes = ["scoring_job_completed", "scoring_job_failed"] as const;
export const notificationDeliveryModes = ["in_app_only", "delivery_eligible"] as const;
export const notificationCadences = ["immediate", "digest"] as const;

export interface NotificationPreparationResult {
  suppressed: boolean;
  preparation: NotificationDeliveryPreparation;
}

const notificationCategories: NotificationPreferenceCategory[] = [
  {
    alertType: "scoring_job_completed",
    label: "Scoring completed",
    description: "Dataset scoring or refresh finished and records are ready for review.",
    supportsDelivery: true,
    supportsDigest: true,
    defaultRule: {
      alertType: "scoring_job_completed",
      enabled: true,
      deliveryMode: "in_app_only",
      cadence: "digest",
    },
  },
  {
    alertType: "scoring_job_failed",
    label: "Scoring failed",
    description: "A scoring or refresh job failed and may need operator attention.",
    supportsDelivery: true,
    supportsDigest: true,
    defaultRule: {
      alertType: "scoring_job_failed",
      enabled: true,
      deliveryMode: "delivery_eligible",
      cadence: "immediate",
    },
  },
];

export class NotificationPreferenceService {
  private readonly notificationPreferenceStore: NotificationPreferenceStore;

  public constructor(notificationPreferenceStore: NotificationPreferenceStore) {
    this.notificationPreferenceStore = notificationPreferenceStore;
  }

  public async getPreferences(userId: string): Promise<NotificationPreferencesDetailResponse> {
    const preferences = await this.findOrCreatePreferences(userId);
    return {
      preferences: toNotificationPreferencesResponse(preferences),
      categories: notificationCategories,
    };
  }

  public async updatePreferences(
    userId: string,
    input: UpdateNotificationPreferencesRequest,
  ): Promise<UpdateNotificationPreferencesResponse> {
    const rules = normalizePreferenceRules(input.rules);
    const preferences = await this.notificationPreferenceStore.upsertForUser({
      userId,
      rules,
    });

    return {
      preferences: toNotificationPreferencesResponse(preferences),
      categories: notificationCategories,
    };
  }

  public async prepareAlertForDelivery(input: CreateAlertInput): Promise<NotificationPreparationResult> {
    const preferences = await this.findOrCreatePreferences(input.userId);
    const rule = preferences.rules.find((candidate) => candidate.alertType === input.type) ?? defaultRuleFor(input.type);
    const preparedAt = new Date().toISOString();

    if (!rule.enabled) {
      return {
        suppressed: true,
        preparation: {
          alertType: input.type,
          deliveryState: "suppressed",
          deliveryMode: rule.deliveryMode,
          cadence: rule.cadence,
          eligibleForDelivery: false,
          preparedAt,
        },
      };
    }

    const deliveryState =
      rule.deliveryMode === "in_app_only"
        ? "in_app_only"
        : rule.cadence === "immediate"
          ? "delivery_immediate"
          : "delivery_digest";

    return {
      suppressed: false,
      preparation: {
        alertType: input.type,
        deliveryState,
        deliveryMode: rule.deliveryMode,
        cadence: rule.cadence,
        eligibleForDelivery: rule.deliveryMode === "delivery_eligible",
        preparedAt,
        payload: buildProviderAgnosticPayload(input),
      },
    };
  }

  public async isDigestDeliveryEnabled(userId: string, alertType: AlertType): Promise<boolean> {
    const preferences = await this.findOrCreatePreferences(userId);
    const rule = preferences.rules.find((candidate) => candidate.alertType === alertType) ?? defaultRuleFor(alertType);
    return rule.enabled && rule.deliveryMode === "delivery_eligible" && rule.cadence === "digest";
  }

  private async findOrCreatePreferences(userId: string): Promise<StoredNotificationPreferences> {
    const existing = await this.notificationPreferenceStore.findForUser(userId);
    if (existing) {
      return mergeWithDefaultRules(existing);
    }

    return this.notificationPreferenceStore.upsertForUser({
      userId,
      rules: defaultNotificationRules(),
    });
  }
}

export function toNotificationPreferencesResponse(
  preferences: StoredNotificationPreferences,
): NotificationPreferencesResponse {
  return {
    id: preferences.id,
    rules: mergeRulesWithDefaults(preferences.rules),
    createdAt: preferences.createdAt.toISOString(),
    updatedAt: preferences.updatedAt.toISOString(),
  };
}

function normalizePreferenceRules(rules: NotificationPreferenceRule[]): NotificationPreferenceRule[] {
  if (!Array.isArray(rules) || rules.length === 0 || rules.length > notificationAlertTypes.length) {
    throw new ApiError(400, "notification_preferences_invalid_rules", "Notification preference rules are invalid.");
  }

  const seenAlertTypes = new Set<AlertType>();
  const normalizedRules = rules.map((rule) => {
    const alertType = assertAlertType(rule.alertType);
    if (seenAlertTypes.has(alertType)) {
      throw new ApiError(400, "notification_preferences_duplicate_rule", "Notification preference rule is duplicated.");
    }
    seenAlertTypes.add(alertType);

    return {
      alertType,
      enabled: assertBoolean(rule.enabled),
      deliveryMode: assertDeliveryMode(rule.deliveryMode),
      cadence: assertCadence(rule.cadence),
    };
  });

  return mergeRulesWithDefaults(normalizedRules);
}

function mergeWithDefaultRules(preferences: StoredNotificationPreferences): StoredNotificationPreferences {
  return {
    ...preferences,
    rules: mergeRulesWithDefaults(preferences.rules),
  };
}

function mergeRulesWithDefaults(rules: NotificationPreferenceRule[]): NotificationPreferenceRule[] {
  const byType = new Map(rules.map((rule) => [rule.alertType, rule]));
  return defaultNotificationRules().map((defaultRule) => byType.get(defaultRule.alertType) ?? defaultRule);
}

function defaultNotificationRules(): NotificationPreferenceRule[] {
  return notificationCategories.map((category) => ({ ...category.defaultRule }));
}

function defaultRuleFor(alertType: AlertType): NotificationPreferenceRule {
  return defaultNotificationRules().find((rule) => rule.alertType === alertType) as NotificationPreferenceRule;
}

function buildProviderAgnosticPayload(input: CreateAlertInput): NonNullable<NotificationDeliveryPreparation["payload"]> {
  return {
    subject: notificationSubject(input.type, input.severity),
    summary: input.message,
    ...(input.relatedEntityType ? { relatedEntityType: input.relatedEntityType as AlertRelatedEntityType } : {}),
    ...(input.relatedEntityId ? { relatedEntityId: input.relatedEntityId } : {}),
    metadata: sanitizeAlertMetadata(input.metadata),
  };
}

function notificationSubject(alertType: AlertType, severity: AlertSeverity): string {
  switch (alertType) {
    case "scoring_job_completed":
      return "Scoring completed";
    case "scoring_job_failed":
      return severity === "error" ? "Scoring failed" : "Scoring needs review";
  }
}

function sanitizeAlertMetadata(metadata: AlertMetadata | undefined): NonNullable<NotificationDeliveryPreparation["payload"]>["metadata"] {
  return {
    ...(metadata?.jobId ? { jobId: metadata.jobId } : {}),
    ...(metadata?.datasetId ? { datasetId: metadata.datasetId } : {}),
    ...(metadata?.scoredRecordCount !== undefined ? { scoredRecordCount: metadata.scoredRecordCount } : {}),
    ...(metadata?.errorCode ? { errorCode: metadata.errorCode } : {}),
    ...(metadata?.requestKind ? { requestKind: metadata.requestKind } : {}),
  };
}

function assertAlertType(alertType: string): AlertType {
  if (!notificationAlertTypes.includes(alertType as AlertType)) {
    throw new ApiError(400, "notification_preferences_invalid_alert_type", "Notification alert type is invalid.");
  }

  return alertType as AlertType;
}

function assertDeliveryMode(deliveryMode: string): NotificationDeliveryMode {
  if (!notificationDeliveryModes.includes(deliveryMode as NotificationDeliveryMode)) {
    throw new ApiError(400, "notification_preferences_invalid_delivery_mode", "Notification delivery mode is invalid.");
  }

  return deliveryMode as NotificationDeliveryMode;
}

function assertCadence(cadence: string): NotificationCadence {
  if (!notificationCadences.includes(cadence as NotificationCadence)) {
    throw new ApiError(400, "notification_preferences_invalid_cadence", "Notification cadence is invalid.");
  }

  return cadence as NotificationCadence;
}

function assertBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new ApiError(400, "notification_preferences_invalid_enabled", "Notification enabled flag is invalid.");
  }

  return value;
}
