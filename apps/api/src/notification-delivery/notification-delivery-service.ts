import type {
  AlertMetadata,
  AlertType,
  NotificationDeliveryFailureCode,
  NotificationDeliveryHistoryItem,
  NotificationDeliveryHistoryResponse,
  NotificationDeliveryPreparation,
  NotificationDigestBatchResponse,
  NotificationDigestProcessingResult,
} from "@tax-lien/types";
import type { CreateAlertInput, StoredAlert } from "../alerts/alert-store.js";
import type { ApiConfig } from "../config/env.js";
import type { EmailMessage, EmailTransport } from "./email-transport.js";
import type {
  NotificationDigestBatchStore,
  StoredNotificationDigestBatch,
} from "./notification-digest-batch-store.js";
import type {
  CreateNotificationDeliveryInput,
  NotificationDeliveryStore,
  StoredNotificationDelivery,
} from "./notification-delivery-store.js";

export type EmailRecipientResolver = (userId: string) => Promise<string | null>;
export type DigestEligibilityResolver = (userId: string, alertType: AlertType) => Promise<boolean>;

export interface NotificationEmailContent {
  subject: string;
  text: string;
}

interface DigestBatchProcessingOutcome {
  batch: StoredNotificationDigestBatch;
  wasProcessed: boolean;
}

export class NotificationDeliveryService {
  private readonly deliveryStore: NotificationDeliveryStore;
  private readonly emailTransport: EmailTransport;
  private readonly resolveRecipientEmail: EmailRecipientResolver;
  private readonly emailConfig: ApiConfig["email"];
  private readonly digestBatchStore: NotificationDigestBatchStore;
  private readonly isDigestEligible: DigestEligibilityResolver;

  public constructor(
    deliveryStore: NotificationDeliveryStore,
    emailTransport: EmailTransport,
    resolveRecipientEmail: EmailRecipientResolver,
    emailConfig: ApiConfig["email"],
    digestBatchStore: NotificationDigestBatchStore,
    isDigestEligible: DigestEligibilityResolver,
  ) {
    this.deliveryStore = deliveryStore;
    this.emailTransport = emailTransport;
    this.resolveRecipientEmail = resolveRecipientEmail;
    this.emailConfig = emailConfig;
    this.digestBatchStore = digestBatchStore;
    this.isDigestEligible = isDigestEligible;
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

  public async processDigestQueue(now = new Date()): Promise<NotificationDigestProcessingResult> {
    const windowKey = digestWindowKey(now, this.emailConfig.digest.processingIntervalMs);
    const userIds = await this.deliveryStore.listDigestReadyUserIds(this.emailConfig.digest.maxUsersPerRun);
    const result: NotificationDigestProcessingResult = {
      windowKey,
      usersConsidered: userIds.length,
      batchesCreated: 0,
      batchesSent: 0,
      batchesFailed: 0,
      batchesSuppressed: 0,
      providerDisabledBatches: 0,
    };

    for (const userId of userIds) {
      const outcome = await this.processDigestForUser(userId, windowKey, now);
      if (!outcome.wasProcessed) {
        continue;
      }

      result.batchesCreated += 1;
      switch (outcome.batch.status) {
        case "sent":
          result.batchesSent += 1;
          break;
        case "failed":
          result.batchesFailed += 1;
          break;
        case "suppressed":
          result.batchesSuppressed += 1;
          break;
        case "provider_disabled":
          result.providerDisabledBatches += 1;
          break;
        default:
          break;
      }
    }

    return result;
  }

  public async getDeliveryHistory(userId: string): Promise<NotificationDeliveryHistoryResponse> {
    const [deliveries, digestBatches] = await Promise.all([
      this.deliveryStore.listHistoryForUser(userId, 100),
      this.digestBatchStore.listHistoryForUser(userId, 30),
    ]);

    return {
      deliveries: deliveries.map(toDeliveryHistoryItem),
      digestBatches: digestBatches.map(toDigestBatchResponse),
    };
  }

  private async processDigestForUser(
    userId: string,
    windowKey: string,
    now: Date,
  ): Promise<DigestBatchProcessingOutcome> {
    const existingBatch = await this.digestBatchStore.createBatchOnce({ userId, windowKey });
    const batch = await this.digestBatchStore.claimBatchForProcessing(existingBatch.id, now);
    if (!batch) {
      return { batch: existingBatch, wasProcessed: false };
    }

    const claimed = await this.deliveryStore.claimDigestReadyForBatch(
      userId,
      batch.id,
      this.emailConfig.digest.maxItemsPerBatch,
      now,
    );
    if (claimed.length === 0) {
      return {
        batch: await this.digestBatchStore.updateBatch(batch.id, {
          status: "empty",
          itemCount: 0,
        }),
        wasProcessed: true,
      };
    }

    const eligibility = await Promise.all(
      claimed.map(async (delivery) => ({
        delivery,
        eligible: await this.isDigestEligible(userId, delivery.alertType),
      })),
    );
    const suppressed = eligibility.filter((candidate) => !candidate.eligible).map((candidate) => candidate.delivery);
    const eligible = eligibility.filter((candidate) => candidate.eligible).map((candidate) => candidate.delivery);

    await this.deliveryStore.updateDeliveries(
      suppressed.map((delivery) => delivery.id),
      {
        status: "suppressed",
        failureReason: "Digest delivery was suppressed because current notification preferences no longer allow it.",
      },
    );

    if (eligible.length === 0) {
      return {
        batch: await this.digestBatchStore.updateBatch(batch.id, {
          status: "suppressed",
          itemCount: 0,
          failureReason: "All digest items were suppressed by current notification preferences.",
        }),
        wasProcessed: true,
      };
    }

    if (!this.emailConfig.enabled || !this.emailConfig.fromAddress) {
      await this.deliveryStore.updateDeliveries(
        eligible.map((delivery) => delivery.id),
        {
          status: "provider_disabled",
          provider: this.emailTransport.providerId,
          failureCode: "provider_disabled",
          failureReason: "Email delivery is disabled until SMTP host and sender env config are provided.",
        },
      );
      return {
        batch: await this.digestBatchStore.updateBatch(batch.id, {
          status: "provider_disabled",
          itemCount: eligible.length,
          provider: this.emailTransport.providerId,
          failureCode: "provider_disabled",
          failureReason: "Email delivery is disabled until SMTP host and sender env config are provided.",
        }),
        wasProcessed: true,
      };
    }

    const recipientEmail = await this.resolveRecipientEmail(userId);
    if (!recipientEmail) {
      await this.deliveryStore.updateDeliveries(
        eligible.map((delivery) => delivery.id),
        {
          status: "failed",
          provider: this.emailTransport.providerId,
          failureCode: "recipient_missing",
          failureReason: "No email recipient could be resolved for the alert owner.",
        },
      );
      return {
        batch: await this.digestBatchStore.updateBatch(batch.id, {
          status: "failed",
          itemCount: eligible.length,
          provider: this.emailTransport.providerId,
          failureCode: "recipient_missing",
          failureReason: "No email recipient could be resolved for the alert owner.",
        }),
        wasProcessed: true,
      };
    }

    const content = buildNotificationDigestEmailContent({
      deliveries: eligible,
      ...(this.emailConfig.appBaseUrl ? { appBaseUrl: this.emailConfig.appBaseUrl } : {}),
    });
    const attemptedAt = new Date();
    await this.digestBatchStore.updateBatch(batch.id, {
      itemCount: eligible.length,
      subject: content.subject,
      provider: this.emailTransport.providerId,
      attempts: 1,
    });

    try {
      const sendResult = await this.emailTransport.send({
        to: { address: recipientEmail },
        from: {
          address: this.emailConfig.fromAddress,
          name: this.emailConfig.fromName,
        },
        ...(this.emailConfig.replyTo ? { replyTo: { address: this.emailConfig.replyTo } } : {}),
        subject: content.subject,
        text: content.text,
      });
      const sentAt = new Date();
      await this.deliveryStore.updateDeliveries(
        eligible.map((delivery) => delivery.id),
        {
          status: "sent",
          recipientEmail,
          provider: this.emailTransport.providerId,
          attempts: 1,
          lastAttemptAt: attemptedAt,
          sentAt,
          ...(sendResult.providerMessageId ? { providerMessageId: sendResult.providerMessageId } : {}),
        },
      );

      return {
        batch: await this.digestBatchStore.updateBatch(batch.id, {
          status: "sent",
          sentAt,
          ...(sendResult.providerMessageId ? { providerMessageId: sendResult.providerMessageId } : {}),
        }),
        wasProcessed: true,
      };
    } catch (error) {
      const failureReason = boundedFailureReason(error);
      await this.deliveryStore.updateDeliveries(
        eligible.map((delivery) => delivery.id),
        {
          status: "failed",
          provider: this.emailTransport.providerId,
          attempts: 1,
          lastAttemptAt: attemptedAt,
          failureCode: "provider_error",
          failureReason,
        },
      );

      return {
        batch: await this.digestBatchStore.updateBatch(batch.id, {
          status: "failed",
          failureCode: "provider_error",
          failureReason,
        }),
        wasProcessed: true,
      };
    }
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
    ...(metadata.workspaceId ? [`Workspace: ${metadata.workspaceId}`] : []),
    ...(input.alert.relatedEntityType && input.alert.relatedEntityId
      ? [`Record: ${relatedEntityLabel(input.alert.relatedEntityType)} ${input.alert.relatedEntityId}`]
      : []),
    ...(input.appBaseUrl ? ["", `Open workspace: ${input.appBaseUrl}`] : []),
    "",
    "This is a product alert for your tax lien review workspace, not a marketing message.",
  ];

  return {
    subject: payload?.subject ?? alertTypeLabel(input.alert.type),
    text: lines.join("\n"),
  };
}

export function buildNotificationDigestEmailContent(input: {
  deliveries: StoredNotificationDelivery[];
  appBaseUrl?: string;
}): NotificationEmailContent {
  const itemCount = input.deliveries.length;
  const lines = [
    "Tax Lien Intelligence Platform",
    "",
    `Your scheduled product-alert digest includes ${itemCount} ${itemCount === 1 ? "event" : "events"}.`,
    "",
    ...input.deliveries.flatMap((delivery, index) => [
      `${index + 1}. ${delivery.subject ?? alertTypeLabel(delivery.alertType)}`,
      `   ${delivery.summary ?? "A product alert is ready for review."}`,
      ...(delivery.metadata?.datasetId ? [`   Dataset: ${delivery.metadata.datasetId}`] : []),
      ...(delivery.metadata?.jobId ? [`   Job: ${delivery.metadata.jobId}`] : []),
      ...(delivery.metadata?.workspaceId ? [`   Workspace: ${delivery.metadata.workspaceId}`] : []),
      ...(delivery.relatedEntityType && delivery.relatedEntityId
        ? [`   Record: ${relatedEntityLabel(delivery.relatedEntityType)} ${delivery.relatedEntityId}`]
        : []),
      "",
    ]),
    "You are receiving this digest because these alert categories are enabled for digest email in your notification preferences.",
    ...(input.appBaseUrl ? ["", `Open workspace: ${input.appBaseUrl}`] : []),
    "",
    "This is a product alert for your tax lien review workspace, not a marketing message.",
  ];

  return {
    subject: `${itemCount} ${itemCount === 1 ? "update" : "updates"} in your tax lien workspace`,
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
  if (input.metadata?.commentId) {
    return `comment:${input.metadata.commentId}:${input.userId}:${input.type}`;
  }
  if (input.metadata?.assignmentId) {
    return `assignment:${input.metadata.assignmentId}:${input.userId}:${input.type}`;
  }
  if (input.metadata?.followEventId) {
    return `follow:${input.metadata.followEventId}:${input.userId}:${input.type}`;
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
    ...(metadata?.workspaceId ? { workspaceId: metadata.workspaceId } : {}),
    ...(metadata?.commentId ? { commentId: metadata.commentId } : {}),
    ...(metadata?.commentActorUserId ? { commentActorUserId: metadata.commentActorUserId } : {}),
    ...(metadata?.commentActorEmail ? { commentActorEmail: metadata.commentActorEmail } : {}),
    ...(metadata?.assignmentId ? { assignmentId: metadata.assignmentId } : {}),
    ...(metadata?.assignmentActorUserId ? { assignmentActorUserId: metadata.assignmentActorUserId } : {}),
    ...(metadata?.assignmentActorEmail ? { assignmentActorEmail: metadata.assignmentActorEmail } : {}),
    ...(metadata?.followEventId ? { followEventId: metadata.followEventId } : {}),
    ...(metadata?.followChangeType ? { followChangeType: metadata.followChangeType } : {}),
    ...(metadata?.followActorUserId ? { followActorUserId: metadata.followActorUserId } : {}),
    ...(metadata?.followActorEmail ? { followActorEmail: metadata.followActorEmail } : {}),
    ...(metadata?.followUpId ? { followUpId: metadata.followUpId } : {}),
    ...(metadata?.followUpDueAt ? { followUpDueAt: metadata.followUpDueAt } : {}),
    ...(metadata?.followUpDueState ? { followUpDueState: metadata.followUpDueState } : {}),
  };
}

function alertTypeLabel(alertType: StoredAlert["type"]): string {
  switch (alertType) {
    case "scoring_job_completed":
      return "Scoring completed";
    case "scoring_job_failed":
      return "Scoring failed";
    case "workspace_comment_added":
      return "New workspace discussion";
    case "workspace_item_assigned":
      return "Workspace item assigned";
    case "followed_item_changed":
      return "Followed item updated";
    case "follow_up_due":
      return "Follow-up due";
  }
}

function relatedEntityLabel(entityType: NonNullable<StoredAlert["relatedEntityType"]>): string {
  switch (entityType) {
    case "dataset":
      return "Dataset";
    case "job":
      return "Job";
    case "comparison_item":
      return "Comparison item";
    case "watchlist_item":
      return "Watchlist item";
    case "portfolio_item":
      return "Portfolio item";
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

function digestWindowKey(now: Date, intervalMs: number): string {
  return new Date(Math.floor(now.getTime() / intervalMs) * intervalMs).toISOString();
}

function toDeliveryHistoryItem(delivery: StoredNotificationDelivery): NotificationDeliveryHistoryItem {
  const failureMessage = safeDeliveryFailureMessage(delivery.status, delivery.failureCode);
  return {
    id: delivery.id,
    alertType: delivery.alertType,
    channel: delivery.channel,
    status: delivery.status,
    deliveryMode: delivery.deliveryMode,
    cadence: delivery.cadence,
    ...(delivery.subject ? { subject: delivery.subject } : {}),
    ...(delivery.summary ? { summary: delivery.summary } : {}),
    ...(delivery.relatedEntityType ? { relatedEntityType: delivery.relatedEntityType } : {}),
    ...(delivery.relatedEntityId ? { relatedEntityId: delivery.relatedEntityId } : {}),
    ...(delivery.digestBatchId ? { digestBatchId: delivery.digestBatchId } : {}),
    attempts: delivery.attempts,
    ...(delivery.failureCode ? { failureCode: delivery.failureCode } : {}),
    ...(failureMessage ? { failureMessage } : {}),
    preparedAt: delivery.preparedAt.toISOString(),
    ...(delivery.sentAt ? { sentAt: delivery.sentAt.toISOString() } : {}),
    updatedAt: delivery.updatedAt.toISOString(),
  };
}

function toDigestBatchResponse(batch: StoredNotificationDigestBatch): NotificationDigestBatchResponse {
  const failureMessage = safeBatchFailureMessage(batch.status, batch.failureCode);
  return {
    id: batch.id,
    status: batch.status,
    itemCount: batch.itemCount,
    ...(batch.subject ? { subject: batch.subject } : {}),
    attempts: batch.attempts,
    ...(batch.failureCode ? { failureCode: batch.failureCode } : {}),
    ...(failureMessage ? { failureMessage } : {}),
    ...(batch.sentAt ? { sentAt: batch.sentAt.toISOString() } : {}),
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

function safeDeliveryFailureMessage(
  status: StoredNotificationDelivery["status"],
  failureCode: NotificationDeliveryFailureCode | undefined,
): string | undefined {
  if (status === "suppressed") {
    return "Delivery was suppressed by your current notification preferences.";
  }

  return safeFailureCodeMessage(failureCode);
}

function safeBatchFailureMessage(
  status: StoredNotificationDigestBatch["status"],
  failureCode: NotificationDeliveryFailureCode | undefined,
): string | undefined {
  if (status === "suppressed") {
    return "This digest was suppressed because no included alert remained eligible.";
  }

  return safeFailureCodeMessage(failureCode);
}

function safeFailureCodeMessage(failureCode: NotificationDeliveryFailureCode | undefined): string | undefined {
  switch (failureCode) {
    case "provider_disabled":
      return "Email delivery is unavailable because the provider is not configured.";
    case "recipient_missing":
      return "Email delivery could not resolve a recipient for this account.";
    case "provider_error":
      return "Email delivery could not be completed by the configured provider.";
    default:
      return undefined;
  }
}
