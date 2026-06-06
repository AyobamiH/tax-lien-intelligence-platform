import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import type { NotificationDeliveryPreparation } from "@tax-lien/types";
import type { StoredAlert } from "../../apps/api/src/alerts/alert-store.js";
import type { ApiConfig } from "../../apps/api/src/config/env.js";
import type { EmailMessage, EmailTransport } from "../../apps/api/src/notification-delivery/email-transport.js";
import { createNotificationDigestTask } from "../../apps/api/src/notification-delivery/digest-scheduler.js";
import {
  buildNotificationEmailContent,
  NotificationDeliveryService,
} from "../../apps/api/src/notification-delivery/notification-delivery-service.js";
import { InMemoryNotificationDeliveryStore } from "../support/in-memory-notification-delivery-store.js";
import { InMemoryNotificationDigestBatchStore } from "../support/in-memory-notification-digest-batch-store.js";
import { InternalScheduler } from "../../apps/api/src/scheduler/internal-scheduler.js";

class FakeEmailTransport implements EmailTransport {
  public readonly providerId = "fake-smtp";
  public readonly messages: EmailMessage[] = [];
  public failWith: Error | null = null;

  public async send(message: EmailMessage): Promise<{ providerMessageId?: string }> {
    this.messages.push(message);
    if (this.failWith) {
      throw this.failWith;
    }

    return { providerMessageId: `fake-message-${this.messages.length}` };
  }
}

describe("notification delivery service", () => {
  it("sends immediate email for delivery-eligible alerts and records outbox success", async () => {
    const store = new InMemoryNotificationDeliveryStore();
    const transport = new FakeEmailTransport();
    const service = createService(store, transport, () => Promise.resolve("owner@example.com"));
    const alert = buildAlert();

    const delivery = await service.processAlertDelivery(alert, buildPreparation("delivery_immediate"));

    expect(delivery).toMatchObject({
      alertId: alert.id,
      userId: alert.userId,
      status: "sent",
      channel: "email",
      recipientEmail: "owner@example.com",
      attempts: 1,
      provider: "fake-smtp",
      providerMessageId: "fake-message-1",
    });
    expect(transport.messages).toHaveLength(1);
    expect(transport.messages[0]).toMatchObject({
      to: { address: "owner@example.com" },
      from: { address: "alerts@example.com", name: "Tax Lien Intelligence Platform" },
      subject: "Scoring failed",
    });
    expect(transport.messages[0]?.text).toContain("This is a product alert");
  });

  it("records preference-suppressed alerts without a provider attempt", async () => {
    const store = new InMemoryNotificationDeliveryStore();
    const transport = new FakeEmailTransport();
    const service = createService(store, transport, () => Promise.resolve("owner@example.com"));

    const delivery = await service.recordSuppressed(
      {
        userId: "owner-1",
        type: "scoring_job_completed",
        severity: "info",
        message: "Scoring completed.",
        relatedEntityType: "dataset",
        relatedEntityId: "dataset-1",
        metadata: { jobId: "job-1", datasetId: "dataset-1", scoredRecordCount: 12, requestKind: "score" },
      },
      buildPreparation("suppressed", "scoring_job_completed"),
    );

    expect(delivery).toMatchObject({
      sourceKey: "job:job-1:scoring_job_completed",
      status: "suppressed",
      attempts: 0,
    });
    expect(transport.messages).toHaveLength(0);
  });

  it("records provider_disabled when email config is incomplete", async () => {
    const store = new InMemoryNotificationDeliveryStore();
    const transport = new FakeEmailTransport();
    const service = createService(store, transport, () => Promise.resolve("owner@example.com"), disabledEmailConfig());

    const delivery = await service.processAlertDelivery(buildAlert(), buildPreparation("delivery_immediate"));

    expect(delivery).toMatchObject({
      status: "provider_disabled",
      failureCode: "provider_disabled",
      attempts: 0,
    });
    expect(transport.messages).toHaveLength(0);
  });

  it("records provider failures without losing the outbox entry", async () => {
    const store = new InMemoryNotificationDeliveryStore();
    const transport = new FakeEmailTransport();
    transport.failWith = new Error("provider refused message");
    const service = createService(store, transport, () => Promise.resolve("owner@example.com"));

    const delivery = await service.processAlertDelivery(buildAlert(), buildPreparation("delivery_immediate"));

    expect(delivery).toMatchObject({
      status: "failed",
      failureCode: "provider_error",
      failureReason: "provider refused message",
      attempts: 1,
    });
    expect(transport.messages).toHaveLength(1);
    expect(store.listAll()).toHaveLength(1);
  });

  it("avoids duplicate sends for the same alert source", async () => {
    const store = new InMemoryNotificationDeliveryStore();
    const transport = new FakeEmailTransport();
    const service = createService(store, transport, () => Promise.resolve("owner@example.com"));
    const alert = buildAlert();
    const preparation = buildPreparation("delivery_immediate");

    const firstDelivery = await service.processAlertDelivery(alert, preparation);
    const secondDelivery = await service.processAlertDelivery(alert, preparation);

    expect(firstDelivery.id).toBe(secondDelivery.id);
    expect(firstDelivery.status).toBe("sent");
    expect(secondDelivery.status).toBe("sent");
    expect(transport.messages).toHaveLength(1);
  });

  it("groups digest-ready deliveries by user without sending immediate email", async () => {
    const store = new InMemoryNotificationDeliveryStore();
    const transport = new FakeEmailTransport();
    const service = createService(store, transport, () => Promise.resolve("owner@example.com"));
    const ownerAlertOne = buildAlert({ type: "scoring_job_completed", severity: "info", userId: "owner-1" });
    const ownerAlertTwo = buildAlert({ type: "scoring_job_completed", severity: "info", userId: "owner-1" });
    const otherAlert = buildAlert({ type: "scoring_job_completed", severity: "info", userId: "owner-2" });
    const preparation = buildPreparation("delivery_digest", "scoring_job_completed");

    await service.processAlertDelivery(ownerAlertOne, preparation);
    await service.processAlertDelivery(ownerAlertTwo, preparation);
    await service.processAlertDelivery(otherAlert, preparation);

    const digestReady = await service.listDigestReadyForUser("owner-1");

    expect(digestReady).toHaveLength(2);
    expect(digestReady.every((delivery) => delivery.status === "digest_ready")).toBe(true);
    expect(digestReady.every((delivery) => delivery.userId === "owner-1")).toBe(true);
    expect(transport.messages).toHaveLength(0);
  });

  it("resolves the recipient from the alert owner only", async () => {
    const store = new InMemoryNotificationDeliveryStore();
    const transport = new FakeEmailTransport();
    const requestedUserIds: string[] = [];
    const service = createService(store, transport, (userId) => {
      requestedUserIds.push(userId);
      return Promise.resolve(userId === "owner-1" ? "owner@example.com" : "other@example.com");
    });

    const delivery = await service.processAlertDelivery(
      buildAlert({ userId: "owner-1" }),
      buildPreparation("delivery_immediate"),
    );

    expect(requestedUserIds).toEqual(["owner-1"]);
    expect(delivery.recipientEmail).toBe("owner@example.com");
    expect(transport.messages[0]?.to.address).toBe("owner@example.com");
  });

  it("generates bounded product-alert email content", () => {
    const content = buildNotificationEmailContent({
      alert: buildAlert(),
      preparation: buildPreparation("delivery_immediate"),
      appBaseUrl: "https://app.example.com",
    });

    expect(content.subject).toBe("Scoring failed");
    expect(content.text).toContain("Dataset: dataset-1");
    expect(content.text).toContain("Request: Refresh");
    expect(content.text).toContain("Open workspace: https://app.example.com");
    expect(content.text).toContain("not a marketing message");
  });

  it("processes digest-ready alerts as one scheduled batch", async () => {
    const store = new InMemoryNotificationDeliveryStore();
    const batchStore = new InMemoryNotificationDigestBatchStore();
    const transport = new FakeEmailTransport();
    const service = createService(
      store,
      transport,
      () => Promise.resolve("owner@example.com"),
      enabledEmailConfig(),
      batchStore,
    );
    const preparation = buildPreparation("delivery_digest", "scoring_job_completed");

    await service.processAlertDelivery(
      buildAlert({ userId: "owner-1", type: "scoring_job_completed", severity: "info" }),
      preparation,
    );
    await service.processAlertDelivery(
      buildAlert({ userId: "owner-1", type: "scoring_job_completed", severity: "info" }),
      preparation,
    );

    const now = new Date("2026-06-06T12:00:00.000Z");
    const result = await service.processDigestQueue(now);

    expect(result).toMatchObject({
      usersConsidered: 1,
      batchesCreated: 1,
      batchesSent: 1,
      batchesFailed: 0,
    });
    expect(transport.messages).toHaveLength(1);
    expect(transport.messages[0]?.subject).toBe("2 updates in your tax lien workspace");
    expect(transport.messages[0]?.text).toContain("Your scheduled product-alert digest includes 2 events.");
    expect(transport.messages[0]?.text).toContain("enabled for digest email");
    const deliveries = store.listAll();
    expect(deliveries.every((delivery) => delivery.status === "sent")).toBe(true);
    expect(deliveries.every((delivery) => Boolean(delivery.digestBatchId))).toBe(true);
    expect(batchStore.listAll()).toEqual([
      expect.objectContaining({
        status: "sent",
        itemCount: 2,
        attempts: 1,
      }),
    ]);
  });

  it("suppresses claimed digest items when current preferences no longer allow them", async () => {
    const store = new InMemoryNotificationDeliveryStore();
    const batchStore = new InMemoryNotificationDigestBatchStore();
    const transport = new FakeEmailTransport();
    const service = createService(
      store,
      transport,
      () => Promise.resolve("owner@example.com"),
      enabledEmailConfig(),
      batchStore,
      () => Promise.resolve(false),
    );

    await service.processAlertDelivery(
      buildAlert({ type: "scoring_job_completed", severity: "info" }),
      buildPreparation("delivery_digest", "scoring_job_completed"),
    );
    const result = await service.processDigestQueue(new Date("2026-06-06T12:00:00.000Z"));

    expect(result.batchesSuppressed).toBe(1);
    expect(store.listAll()[0]).toMatchObject({ status: "suppressed", attempts: 0 });
    expect(batchStore.listAll()[0]).toMatchObject({ status: "suppressed", itemCount: 0 });
    expect(transport.messages).toHaveLength(0);
  });

  it("does not send a digest batch twice in the same processing window", async () => {
    const store = new InMemoryNotificationDeliveryStore();
    const batchStore = new InMemoryNotificationDigestBatchStore();
    const transport = new FakeEmailTransport();
    const service = createService(
      store,
      transport,
      () => Promise.resolve("owner@example.com"),
      enabledEmailConfig(),
      batchStore,
    );
    await service.processAlertDelivery(
      buildAlert({ type: "scoring_job_completed", severity: "info" }),
      buildPreparation("delivery_digest", "scoring_job_completed"),
    );
    const now = new Date("2026-06-06T12:00:00.000Z");

    await service.processDigestQueue(now);
    await service.processDigestQueue(now);

    expect(transport.messages).toHaveLength(1);
    expect(batchStore.listAll()).toHaveLength(1);
  });

  it("records provider-disabled digest outcomes without attempting transport", async () => {
    const store = new InMemoryNotificationDeliveryStore();
    const batchStore = new InMemoryNotificationDigestBatchStore();
    const transport = new FakeEmailTransport();
    const service = createService(
      store,
      transport,
      () => Promise.resolve("owner@example.com"),
      disabledEmailConfig(),
      batchStore,
    );
    await service.processAlertDelivery(
      buildAlert({ type: "scoring_job_completed", severity: "info" }),
      buildPreparation("delivery_digest", "scoring_job_completed"),
    );

    const result = await service.processDigestQueue(new Date("2026-06-06T12:00:00.000Z"));

    expect(result.providerDisabledBatches).toBe(1);
    expect(store.listAll()[0]).toMatchObject({
      status: "provider_disabled",
      failureCode: "provider_disabled",
    });
    expect(batchStore.listAll()[0]).toMatchObject({
      status: "provider_disabled",
      failureCode: "provider_disabled",
    });
    expect(transport.messages).toHaveLength(0);
  });

  it("records digest provider failures on both batch and included deliveries", async () => {
    const store = new InMemoryNotificationDeliveryStore();
    const batchStore = new InMemoryNotificationDigestBatchStore();
    const transport = new FakeEmailTransport();
    transport.failWith = new Error("unsafe provider detail");
    const service = createService(
      store,
      transport,
      () => Promise.resolve("owner@example.com"),
      enabledEmailConfig(),
      batchStore,
    );
    await service.processAlertDelivery(
      buildAlert({ type: "scoring_job_completed", severity: "info" }),
      buildPreparation("delivery_digest", "scoring_job_completed"),
    );

    const result = await service.processDigestQueue(new Date("2026-06-06T12:00:00.000Z"));
    const history = await service.getDeliveryHistory("owner-1");

    expect(result.batchesFailed).toBe(1);
    expect(store.listAll()[0]).toMatchObject({ status: "failed", attempts: 1, failureCode: "provider_error" });
    expect(batchStore.listAll()[0]).toMatchObject({ status: "failed", attempts: 1, failureCode: "provider_error" });
    expect(history.deliveries[0]?.failureMessage).toBe(
      "Email delivery could not be completed by the configured provider.",
    );
    expect(JSON.stringify(history)).not.toContain("unsafe provider detail");
  });

  it("runs digest processing through the internal scheduler cadence", async () => {
    const store = new InMemoryNotificationDeliveryStore();
    const batchStore = new InMemoryNotificationDigestBatchStore();
    const transport = new FakeEmailTransport();
    const config = enabledEmailConfig();
    const service = createService(
      store,
      transport,
      () => Promise.resolve("owner@example.com"),
      config,
      batchStore,
    );
    await service.processAlertDelivery(
      buildAlert({ type: "scoring_job_completed", severity: "info" }),
      buildPreparation("delivery_digest", "scoring_job_completed"),
    );
    const scheduler = new InternalScheduler();
    const registeredAt = new Date("2026-06-06T00:00:00.000Z");
    scheduler.register(createNotificationDigestTask(service, config.digest.processingIntervalMs), registeredAt);

    expect(await scheduler.runDueTasks(registeredAt)).toEqual([]);
    expect(
      await scheduler.runDueTasks(new Date(registeredAt.getTime() + config.digest.processingIntervalMs)),
    ).toEqual([{ taskId: "notification-digest-processing", status: "completed" }]);
    expect(transport.messages).toHaveLength(1);
  });
});

function createService(
  store: InMemoryNotificationDeliveryStore,
  transport: FakeEmailTransport,
  resolveRecipientEmail: (userId: string) => Promise<string | null>,
  config: ApiConfig["email"] = enabledEmailConfig(),
  batchStore: InMemoryNotificationDigestBatchStore = new InMemoryNotificationDigestBatchStore(),
  isDigestEligible: (userId: string, alertType: StoredAlert["type"]) => Promise<boolean> = () =>
    Promise.resolve(true),
): NotificationDeliveryService {
  return new NotificationDeliveryService(
    store,
    transport,
    resolveRecipientEmail,
    config,
    batchStore,
    isDigestEligible,
  );
}

function buildAlert(overrides: Partial<StoredAlert> = {}): StoredAlert {
  const now = new Date("2026-06-05T12:00:00.000Z");
  return {
    id: new mongoose.Types.ObjectId().toString(),
    userId: "owner-1",
    type: "scoring_job_failed",
    severity: "error",
    status: "unread",
    message: "Refresh failed. Worker failed safely.",
    relatedEntityType: "dataset",
    relatedEntityId: "dataset-1",
    metadata: { jobId: "job-1", datasetId: "dataset-1", errorCode: "worker_failed", requestKind: "refresh" },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildPreparation(
  deliveryState: NotificationDeliveryPreparation["deliveryState"],
  alertType: StoredAlert["type"] = "scoring_job_failed",
): NotificationDeliveryPreparation {
  const deliveryMode = deliveryState === "in_app_only" ? "in_app_only" : "delivery_eligible";
  const cadence = deliveryState === "delivery_digest" ? "digest" : "immediate";
  return {
    alertType,
    deliveryState,
    deliveryMode,
    cadence,
    eligibleForDelivery: deliveryMode === "delivery_eligible",
    preparedAt: "2026-06-05T12:00:00.000Z",
    ...(deliveryState === "suppressed"
      ? {}
      : {
          payload: {
            subject: alertType === "scoring_job_failed" ? "Scoring failed" : "Scoring completed",
            summary:
              alertType === "scoring_job_failed"
                ? "Refresh failed. Worker failed safely."
                : "Scoring completed. 12 records are ready for review.",
            relatedEntityType: "dataset",
            relatedEntityId: "dataset-1",
            metadata: {
              jobId: "job-1",
              datasetId: "dataset-1",
              ...(alertType === "scoring_job_completed" ? { scoredRecordCount: 12 } : { errorCode: "worker_failed" }),
              requestKind: alertType === "scoring_job_completed" ? "score" : "refresh",
            },
          },
        }),
  };
}

function enabledEmailConfig(): ApiConfig["email"] {
  return {
    enabled: true,
    provider: "smtp",
    fromAddress: "alerts@example.com",
    fromName: "Tax Lien Intelligence Platform",
    replyTo: "support@example.com",
    appBaseUrl: "https://app.example.com",
    smtp: {
      host: "smtp.example.com",
      port: 465,
      secure: true,
      connectionTimeoutMs: 1000,
    },
    digest: {
      processingIntervalMs: 86_400_000,
      maxUsersPerRun: 100,
      maxItemsPerBatch: 50,
    },
  };
}

function disabledEmailConfig(): ApiConfig["email"] {
  return {
    enabled: false,
    provider: "smtp",
    fromName: "Tax Lien Intelligence Platform",
    smtp: {
      port: 465,
      secure: true,
      connectionTimeoutMs: 1000,
    },
    digest: {
      processingIntervalMs: 86_400_000,
      maxUsersPerRun: 100,
      maxItemsPerBatch: 50,
    },
  };
}
