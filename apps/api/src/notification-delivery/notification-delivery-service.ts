import type { AlertMetadata, NotificationDeliveryPreparation } from "@tax-lien/types";
import type { CreateAlertInput, StoredAlert } from "../alerts/alert-store.js";
import type { ApiConfig } from "../config/env.js";
import type { EmailMessage, EmailTransport } from "./email-transport.js";
import type {
  CreateNotificationDeliveryInput,
  NotificationDeliveryStore,
  StoredNotificationDelivery,
} from "./notification-delivery-store.js";

export type EmailRecipientResolver = (userId: string) => Promise<string | null>;

export interface NotificationEmailContent {
  subject: string;
  text: string;
}

export class NotificationDeliveryService {
  private readonly deliveryStore: NotificationDeliveryStore;
  private readonly emailTransport: EmailTransport;
  private readonly resolveRecipientEmail: EmailRecipientResolver;
  private readonly emailConfig: ApiConfig["email"];

  public constructor(
    deliveryStore: NotificationDeliveryStore,
    emailTransport: EmailTransport,
    resolveRecipientEmail: EmailRecipientResolver,
    emailConfig: ApiConfig["email"],
  ) {
    this.deliveryStore = deliveryStore;
    this.emailTransport = emailTransport;
    this.resolveRecipientEmail = resolveRecipientEmail;
    this.emailConfig = emailConfig;
  }

  public async recordSuppressed(
    input: CreateAlertInput,
    preparation: NotificationDeliveryPreparation,
  ): Promise<StoredNotificationDelivery> {
    return this.deliveryStore.createDeliveryOnce({
      ...baseDeliveryInputFromAlertInput(input, preparation),
      sourceKey: deliverySourceKeyForSuppressedInput(input),
      status: "suppressed",
    });
  }

  public async processAlertDelivery(
    alert: StoredAlert,
    preparation: NotificationDeliveryPreparation,
  ): Promise<StoredNotificationDelivery> {
    const source = {
      userId: alert.userId,
      sourceKey: deliverySourceKeyForAlert(alert),
      channel: "email" as const,
    };
    const existing = await this.deliveryStore.findBySource(source);
    if (existing) {
      return existing;
    }

    if (preparation.deliveryState === "in_app_only") {
      return this.deliveryStore.createDeliveryOnce({
        ...baseDeliveryInputFromStoredAlert(alert, preparation),
        sourceKey: source.sourceKey,
        status: "in_app_only",
      });
    }

    if (preparation.deliveryState === "delivery_digest") {
      return this.deliveryStore.createDeliveryOnce({
        ...baseDeliveryInputFromStoredAlert(alert, preparation),
        sourceKey: source.sourceKey,
        status: "digest_ready",
      });
    }

    if (preparation.deliveryState !== "delivery_immediate") {
      return this.deliveryStore.createDeliveryOnce({
        ...baseDeliveryInputFromStoredAlert(alert, preparation),
        sourceKey: source.sourceKey,
        status: "suppressed",
      });
    }

    if (!this.emailConfig.enabled || !this.emailConfig.fromAddress) {
      return this.deliveryStore.createDeliveryOnce({
        ...baseDeliveryInputFromStoredAlert(alert, preparation),
        sourceKey: source.sourceKey,
        status: "provider_disabled",
        provider: this.emailTransport.providerId,
        failureCode: "provider_disabled",
        failureReason: "Email delivery is disabled until SMTP host and sender env config are provided.",
      });
    }

    const recipientEmail = await this.resolveRecipientEmail(alert.userId);
    if (!recipientEmail) {
      return this.deliveryStore.createDeliveryOnce({
        ...baseDeliveryInputFromStoredAlert(alert, preparation),
        sourceKey: source.sourceKey,
        status: "failed",
        provider: this.emailTransport.providerId,
        failureCode: "recipient_missing",
        failureReason: "No email recipient could be resolved for the alert owner.",
      });
    }

    const pendingDelivery = await this.deliveryStore.createDeliveryOnce({
      ...baseDeliveryInputFromStoredAlert(alert, preparation),
      sourceKey: source.sourceKey,
      status: "pending",
      recipientEmail,
      provider: this.emailTransport.providerId,
    });

    if (pendingDelivery.status !== "pending" || pendingDelivery.attempts > 0) {
      return pendingDelivery;
    }

    const attemptedAt = new Date();
    try {
      const content = buildNotificationEmailContent({
        alert,
        preparation,
        ...(this.emailConfig.appBaseUrl ? { appBaseUrl: this.emailConfig.appBaseUrl } : {}),
      });
      const result = await this.emailTransport.send({
        to: { address: recipientEmail },
        from: {
          address: this.emailConfig.fromAddress,
          name: this.emailConfig.fromName,
        },
        ...(this.emailConfig.replyTo ? { replyTo: { address: this.emailConfig.replyTo } } : {}),
        subject: content.subject,
        text: content.text,
      });

      return this.deliveryStore.updateDelivery(pendingDelivery.id, {
        status: "sent",
        attempts: 1,
        lastAttemptAt: attemptedAt,
        sentAt: new Date(),
        ...(result.providerMessageId ? { providerMessageId: result.providerMessageId } : {}),
      });
    } catch (error) {
      return this.deliveryStore.updateDelivery(pendingDelivery.id, {
        status: "failed",
        attempts: 1,
        lastAttemptAt: attemptedAt,
        failureCode: "provider_error",
        failureReason: boundedFailureReason(error),
      });
    }
  }

  public async listDigestReadyForUser(userId: string): Promise<StoredNotificationDelivery[]> {
    return this.deliveryStore.listDigestReadyForUser(userId);
  }
}

export function buildNotificationEmailContent(input: {
  alert: Pick<StoredAlert, "type" | "message" | "relatedEntityType" | "relatedEntityId" | "metadata">;
  preparation: NotificationDeliveryPreparation;
  appBaseUrl?: string;
}): NotificationEmailContent {
  const payload = input.preparation.payload;
  const metadata = payload?.metadata ?? input.alert.metadata ?? {};
  const lines = [
    "Tax Lien Intelligence Platform",
    "",
    payload?.summary ?? input.alert.message,
    "",
    `Alert: ${alertTypeLabel(input.alert.type)}`,
    ...(metadata.datasetId ? [`Dataset: ${metadata.datasetId}`] : []),
    ...(metadata.jobId ? [`Job: ${metadata.jobId}`] : []),
    ...(metadata.requestKind ? [`Request: ${requestKindLabel(metadata.requestKind)}`] : []),
    ...(metadata.scoredRecordCount !== undefined ? [`Records scored: ${metadata.scoredRecordCount}`] : []),
    ...(metadata.errorCode ? [`Error code: ${metadata.errorCode}`] : []),
    ...(input.appBaseUrl ? ["", `Open workspace: ${input.appBaseUrl}`] : []),
    "",
    "This is a product alert for your tax lien review workspace, not a marketing message.",
  ];

  return {
    subject: payload?.subject ?? alertTypeLabel(input.alert.type),
    text: lines.join("\n"),
  };
}

function baseDeliveryInputFromStoredAlert(
  alert: StoredAlert,
  preparation: NotificationDeliveryPreparation,
): Omit<CreateNotificationDeliveryInput, "sourceKey" | "status"> {
  const payload = preparation.payload;
  return {
    userId: alert.userId,
    alertId: alert.id,
    alertType: alert.type,
    channel: "email",
    deliveryMode: preparation.deliveryMode,
    cadence: preparation.cadence,
    ...(payload?.subject ? { subject: payload.subject } : { subject: alertTypeLabel(alert.type) }),
    ...(payload?.summary ? { summary: payload.summary } : { summary: alert.message }),
    ...(payload?.relatedEntityType
      ? { relatedEntityType: payload.relatedEntityType }
      : alert.relatedEntityType
        ? { relatedEntityType: alert.relatedEntityType }
        : {}),
    ...(payload?.relatedEntityId
      ? { relatedEntityId: payload.relatedEntityId }
      : alert.relatedEntityId
        ? { relatedEntityId: alert.relatedEntityId }
        : {}),
    metadata: sanitizeDeliveryMetadata(payload?.metadata ?? alert.metadata),
    preparedAt: new Date(preparation.preparedAt),
  };
}

function baseDeliveryInputFromAlertInput(
  input: CreateAlertInput,
  preparation: NotificationDeliveryPreparation,
): Omit<CreateNotificationDeliveryInput, "sourceKey" | "status"> {
  const payload = preparation.payload;
  return {
    userId: input.userId,
    alertType: input.type,
    channel: "email",
    deliveryMode: preparation.deliveryMode,
    cadence: preparation.cadence,
    ...(payload?.subject ? { subject: payload.subject } : { subject: alertTypeLabel(input.type) }),
    ...(payload?.summary ? { summary: payload.summary } : { summary: input.message }),
    ...(payload?.relatedEntityType
      ? { relatedEntityType: payload.relatedEntityType }
      : input.relatedEntityType
        ? { relatedEntityType: input.relatedEntityType }
        : {}),
    ...(payload?.relatedEntityId
      ? { relatedEntityId: payload.relatedEntityId }
      : input.relatedEntityId
        ? { relatedEntityId: input.relatedEntityId }
        : {}),
    metadata: sanitizeDeliveryMetadata(payload?.metadata ?? input.metadata),
    preparedAt: new Date(preparation.preparedAt),
  };
}

function deliverySourceKeyForAlert(alert: StoredAlert): string {
  return `alert:${alert.id}`;
}

function deliverySourceKeyForSuppressedInput(input: CreateAlertInput): string {
  if (input.metadata?.jobId) {
    return `job:${input.metadata.jobId}:${input.type}`;
  }

  return `input:${input.userId}:${input.type}:${input.relatedEntityType ?? "none"}:${input.relatedEntityId ?? "none"}`;
}

function sanitizeDeliveryMetadata(metadata: AlertMetadata | undefined): AlertMetadata {
  return {
    ...(metadata?.jobId ? { jobId: metadata.jobId } : {}),
    ...(metadata?.datasetId ? { datasetId: metadata.datasetId } : {}),
    ...(metadata?.scoredRecordCount !== undefined ? { scoredRecordCount: metadata.scoredRecordCount } : {}),
    ...(metadata?.errorCode ? { errorCode: metadata.errorCode } : {}),
    ...(metadata?.requestKind ? { requestKind: metadata.requestKind } : {}),
  };
}

function alertTypeLabel(alertType: StoredAlert["type"]): string {
  switch (alertType) {
    case "scoring_job_completed":
      return "Scoring completed";
    case "scoring_job_failed":
      return "Scoring failed";
  }
}

function requestKindLabel(requestKind: NonNullable<AlertMetadata["requestKind"]>): string {
  switch (requestKind) {
    case "policy_refresh":
      return "Scheduled refresh";
    case "maintenance_scan":
      return "Maintenance scan";
    case "refresh":
      return "Refresh";
    case "score":
      return "Scoring";
  }
}

function boundedFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : "Email provider failed.";
  return message.slice(0, 500);
}
