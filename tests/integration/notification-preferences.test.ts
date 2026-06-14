import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AlertService } from "../../apps/api/src/alerts/alert-service.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import { createApp } from "../../apps/api/src/app.js";
import type { ApiConfig } from "../../apps/api/src/config/env.js";
import type { EmailMessage, EmailTransport } from "../../apps/api/src/notification-delivery/email-transport.js";
import { InMemoryNotificationDigestBatchStore } from "../support/in-memory-notification-digest-batch-store.js";
import { NotificationDeliveryService } from "../../apps/api/src/notification-delivery/notification-delivery-service.js";
import { NotificationPreferenceService } from "../../apps/api/src/notification-preferences/notification-preference-service.js";
import type {
  NotificationPreferenceStore,
  SaveNotificationPreferencesInput,
  StoredNotificationPreferences,
} from "../../apps/api/src/notification-preferences/notification-preference-store.js";
import type { NotificationPreferenceRule } from "@tax-lien/types";
import { InMemoryAlertStore } from "../support/in-memory-alert-store.js";
import { InMemoryNotificationDeliveryStore } from "../support/in-memory-notification-delivery-store.js";

const testJwtSecret = "test-notification-preferences-secret-long-enough";

class InMemoryUserStore implements UserStore {
  private readonly usersById = new Map<string, StoredUser>();
  private readonly idsByEmail = new Map<string, string>();

  public async createUser(input: CreateUserInput): Promise<StoredUser> {
    const now = new Date();
    const user: StoredUser = {
      id: new mongoose.Types.ObjectId().toString(),
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    this.usersById.set(user.id, user);
    this.idsByEmail.set(user.email, user.id);
    return user;
  }

  public async findByEmail(email: string): Promise<StoredUser | null> {
    const id = this.idsByEmail.get(email);
    return id ? (this.usersById.get(id) ?? null) : null;
  }

  public async findById(id: string): Promise<StoredUser | null> {
    return this.usersById.get(id) ?? null;
  }
}

class InMemoryNotificationPreferenceStore implements NotificationPreferenceStore {
  private readonly preferencesByUserId = new Map<string, StoredNotificationPreferences>();

  public async findForUser(userId: string): Promise<StoredNotificationPreferences | null> {
    return this.preferencesByUserId.get(userId) ?? null;
  }

  public async upsertForUser(input: SaveNotificationPreferencesInput): Promise<StoredNotificationPreferences> {
    const now = new Date();
    const current = this.preferencesByUserId.get(input.userId);
    const preferences: StoredNotificationPreferences = {
      id: current?.id ?? new mongoose.Types.ObjectId().toString(),
      userId: input.userId,
      rules: input.rules,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
    this.preferencesByUserId.set(input.userId, preferences);
    return preferences;
  }
}

class FakeEmailTransport implements EmailTransport {
  public readonly providerId = "fake-smtp";
  public readonly messages: EmailMessage[] = [];

  public async send(message: EmailMessage): Promise<{ providerMessageId?: string }> {
    this.messages.push(message);
    return { providerMessageId: `fake-message-${this.messages.length}` };
  }
}

function createTestContext() {
  const userStore = new InMemoryUserStore();
  const notificationPreferenceService = new NotificationPreferenceService(new InMemoryNotificationPreferenceStore());
  const notificationDeliveryStore = new InMemoryNotificationDeliveryStore();
  const notificationDigestBatchStore = new InMemoryNotificationDigestBatchStore();
  const emailTransport = new FakeEmailTransport();
  const notificationDeliveryService = new NotificationDeliveryService(
    notificationDeliveryStore,
    emailTransport,
    async (userId) => {
      const user = await userStore.findById(userId);
      return user?.email ?? null;
    },
    enabledEmailConfig(),
    notificationDigestBatchStore,
    (userId, alertType) => notificationPreferenceService.isDigestDeliveryEnabled(userId, alertType),
  );
  const alertStore = new InMemoryAlertStore();
  const alertService = new AlertService(alertStore, notificationPreferenceService, notificationDeliveryService);
  const authService = new AuthService(userStore, {
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });

  return {
    app: createApp({ authService, alertService, notificationPreferenceService, notificationDeliveryService }),
    alertService,
    notificationDeliveryStore,
    notificationDigestBatchStore,
    emailTransport,
  };
}

async function registerUser(app: ReturnType<typeof createApp>, email: string): Promise<{ token: string; userId: string }> {
  const response = await request(app).post("/auth/register").send({
    email,
    password: "StrongPass123",
  });

  return {
    token: response.body.token as string,
    userId: response.body.user.id as string,
  };
}

function rulesWithCompletedDisabled(): NotificationPreferenceRule[] {
  return [
    {
      alertType: "scoring_job_completed",
      enabled: false,
      deliveryMode: "in_app_only",
      cadence: "digest",
    },
    {
      alertType: "scoring_job_failed",
      enabled: true,
      deliveryMode: "delivery_eligible",
      cadence: "immediate",
    },
  ];
}

describe("notification preferences API", () => {
  it("retrieves default preferences for the authenticated user", async () => {
    const { app } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");

    const response = await request(app)
      .get("/notification-preferences")
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(response.body.preferences).toMatchObject({
      id: expect.any(String),
      rules: [
        { alertType: "scoring_job_completed", enabled: true, deliveryMode: "in_app_only", cadence: "digest" },
        { alertType: "scoring_job_failed", enabled: true, deliveryMode: "delivery_eligible", cadence: "immediate" },
        { alertType: "workspace_comment_added", enabled: true, deliveryMode: "in_app_only", cadence: "digest" },
        { alertType: "workspace_item_assigned", enabled: true, deliveryMode: "in_app_only", cadence: "digest" },
        { alertType: "followed_item_changed", enabled: true, deliveryMode: "in_app_only", cadence: "digest" },
      ],
    });
    expect(response.body.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ alertType: "scoring_job_completed", supportsDelivery: true }),
        expect.objectContaining({ alertType: "scoring_job_failed", supportsDigest: true }),
        expect.objectContaining({ alertType: "workspace_comment_added", supportsDelivery: true }),
        expect.objectContaining({ alertType: "workspace_item_assigned", supportsDelivery: true }),
        expect.objectContaining({ alertType: "followed_item_changed", supportsDelivery: true }),
      ]),
    );
    expect(JSON.stringify(response.body)).not.toContain(owner.userId);
  });

  it("updates valid preferences and rejects invalid payloads", async () => {
    const { app } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");

    const update = await request(app)
      .patch("/notification-preferences")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ rules: rulesWithCompletedDisabled() })
      .expect(200);

    expect(update.body.preferences.rules[0]).toMatchObject({
      alertType: "scoring_job_completed",
      enabled: false,
    });

    await request(app)
      .patch("/notification-preferences")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        rules: [
          {
            alertType: "made_up_alert",
            enabled: true,
            deliveryMode: "delivery_eligible",
            cadence: "immediate",
          },
        ],
      })
      .expect(400);
    await request(app).get("/notification-preferences").expect(401);
  });

  it("applies preferences when classifying job alerts for delivery", async () => {
    const { app, alertService, notificationDeliveryStore, emailTransport } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");

    await request(app)
      .patch("/notification-preferences")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ rules: rulesWithCompletedDisabled() })
      .expect(200);

    await alertService.recordJobCompleted({
      id: new mongoose.Types.ObjectId().toString(),
      userId: owner.userId,
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: new mongoose.Types.ObjectId().toString(),
      requestKind: "score",
      status: "completed",
      summary: { scoredRecordCount: 3 },
    });
    await alertService.recordJobFailed({
      id: new mongoose.Types.ObjectId().toString(),
      userId: owner.userId,
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: new mongoose.Types.ObjectId().toString(),
      requestKind: "refresh",
      status: "failed",
      error: { code: "worker_failed", message: "Worker failed safely." },
    });

    const response = await request(app).get("/alerts").set("Authorization", `Bearer ${owner.token}`).expect(200);

    expect(response.body.alerts).toHaveLength(1);
    expect(response.body.alerts[0]).toMatchObject({
      type: "scoring_job_failed",
      deliveryPreparation: {
        deliveryState: "delivery_immediate",
        eligibleForDelivery: true,
        payload: {
          subject: "Scoring failed",
          metadata: {
            errorCode: "worker_failed",
            requestKind: "refresh",
          },
        },
      },
    });

    expect(notificationDeliveryStore.listAll()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceKey: expect.stringContaining("scoring_job_completed"),
          status: "suppressed",
          attempts: 0,
        }),
        expect.objectContaining({
          alertId: response.body.alerts[0].id,
          status: "sent",
          recipientEmail: "owner@example.com",
          attempts: 1,
        }),
      ]),
    );
    expect(emailTransport.messages).toHaveLength(1);
  });

  it("routes discussion alerts through digest preferences without exposing comment text", async () => {
    const { app, alertService, notificationDeliveryStore, emailTransport } = createTestContext();
    const member = await registerUser(app, "member@example.com");
    const workspaceId = new mongoose.Types.ObjectId().toString();
    const entityId = new mongoose.Types.ObjectId().toString();
    const commentId = new mongoose.Types.ObjectId().toString();

    await request(app)
      .patch("/notification-preferences")
      .set("Authorization", `Bearer ${member.token}`)
      .send({
        rules: [
          {
            alertType: "scoring_job_completed",
            enabled: true,
            deliveryMode: "in_app_only",
            cadence: "digest",
          },
          {
            alertType: "scoring_job_failed",
            enabled: true,
            deliveryMode: "delivery_eligible",
            cadence: "immediate",
          },
          {
            alertType: "workspace_comment_added",
            enabled: true,
            deliveryMode: "delivery_eligible",
            cadence: "digest",
          },
        ],
      })
      .expect(200);

    await alertService.recordWorkspaceCommentAdded({
      recipientUserId: member.userId,
      workspaceId,
      actorUserId: new mongoose.Types.ObjectId().toString(),
      actorEmail: "owner@example.com",
      relatedEntityType: "portfolio_item",
      relatedEntityId: entityId,
      commentId,
    });

    const alerts = await request(app)
      .get("/alerts")
      .set("Authorization", `Bearer ${member.token}`)
      .expect(200);
    expect(alerts.body.alerts[0]).toMatchObject({
      type: "workspace_comment_added",
      relatedEntityType: "portfolio_item",
      relatedEntityId: entityId,
      deliveryPreparation: {
        deliveryState: "delivery_digest",
        payload: {
          subject: "New workspace discussion",
          metadata: {
            workspaceId,
            commentId,
            commentActorEmail: "owner@example.com",
          },
        },
      },
    });
    expect(notificationDeliveryStore.listAll()).toEqual([
      expect.objectContaining({
        alertType: "workspace_comment_added",
        status: "digest_ready",
        cadence: "digest",
      }),
    ]);
    expect(JSON.stringify(alerts.body)).not.toContain("private comment body");
    expect(emailTransport.messages).toHaveLength(0);
  });

  it("routes assignment alerts through the assignee preference without exposing record content", async () => {
    const { app, alertService, notificationDeliveryStore, emailTransport } = createTestContext();
    const member = await registerUser(app, "member@example.com");
    const workspaceId = new mongoose.Types.ObjectId().toString();
    const entityId = new mongoose.Types.ObjectId().toString();
    const assignmentId = new mongoose.Types.ObjectId().toString();

    await request(app)
      .patch("/notification-preferences")
      .set("Authorization", `Bearer ${member.token}`)
      .send({
        rules: [
          {
            alertType: "workspace_item_assigned",
            enabled: true,
            deliveryMode: "delivery_eligible",
            cadence: "digest",
          },
        ],
      })
      .expect(200);

    await alertService.recordWorkspaceItemAssigned({
      recipientUserId: member.userId,
      workspaceId,
      actorUserId: new mongoose.Types.ObjectId().toString(),
      actorEmail: "owner@example.com",
      relatedEntityType: "comparison_item",
      relatedEntityId: entityId,
      assignmentId,
    });

    const alerts = await request(app)
      .get("/alerts")
      .set("Authorization", `Bearer ${member.token}`)
      .expect(200);
    expect(alerts.body.alerts[0]).toMatchObject({
      type: "workspace_item_assigned",
      relatedEntityType: "comparison_item",
      relatedEntityId: entityId,
      deliveryPreparation: {
        deliveryState: "delivery_digest",
        payload: {
          subject: "Workspace item assigned",
          metadata: {
            workspaceId,
            assignmentId,
            assignmentActorEmail: "owner@example.com",
          },
        },
      },
    });
    expect(notificationDeliveryStore.listAll()).toEqual([
      expect.objectContaining({
        alertType: "workspace_item_assigned",
        status: "digest_ready",
        cadence: "digest",
      }),
    ]);
    expect(JSON.stringify(alerts.body)).not.toContain("record content");
    expect(emailTransport.messages).toHaveLength(0);
  });

  it("keeps followed-item alerts bounded and preference-aware", async () => {
    const { app, alertService, notificationDeliveryStore, emailTransport } = createTestContext();
    const member = await registerUser(app, "member@example.com");
    const workspaceId = new mongoose.Types.ObjectId().toString();
    const entityId = new mongoose.Types.ObjectId().toString();
    const followEventId = new mongoose.Types.ObjectId().toString();
    const actorUserId = new mongoose.Types.ObjectId().toString();

    await request(app)
      .patch("/notification-preferences")
      .set("Authorization", `Bearer ${member.token}`)
      .send({
        rules: [
          {
            alertType: "followed_item_changed",
            enabled: true,
            deliveryMode: "delivery_eligible",
            cadence: "digest",
          },
        ],
      })
      .expect(200);

    await alertService.recordFollowedItemChanged({
      recipientUserId: member.userId,
      workspaceId,
      actorUserId,
      actorEmail: "owner@example.com",
      relatedEntityType: "portfolio_item",
      relatedEntityId: entityId,
      followEventId,
      changeType: "portfolio_status_changed",
    });

    const alerts = await request(app)
      .get("/alerts")
      .set("Authorization", `Bearer ${member.token}`)
      .expect(200);
    expect(alerts.body.alerts[0]).toMatchObject({
      type: "followed_item_changed",
      relatedEntityType: "portfolio_item",
      relatedEntityId: entityId,
      deliveryPreparation: {
        deliveryState: "delivery_digest",
        payload: {
          subject: "Followed item updated",
          metadata: {
            workspaceId,
            followEventId,
            followChangeType: "portfolio_status_changed",
            followActorEmail: "owner@example.com",
          },
        },
      },
    });
    expect(notificationDeliveryStore.listAll()).toEqual([
      expect.objectContaining({
        alertType: "followed_item_changed",
        status: "digest_ready",
        cadence: "digest",
      }),
    ]);
    expect(JSON.stringify(alerts.body)).not.toContain("status details");
    expect(emailTransport.messages).toHaveLength(0);
  });

  it("returns owner-scoped delivery history without recipient or raw provider details", async () => {
    const { app, alertService } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const other = await registerUser(app, "other@example.com");

    await alertService.recordJobFailed({
      id: new mongoose.Types.ObjectId().toString(),
      userId: owner.userId,
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: new mongoose.Types.ObjectId().toString(),
      requestKind: "refresh",
      status: "failed",
      error: { code: "owner_failure", message: "Owner job failed safely." },
    });
    await alertService.recordJobFailed({
      id: new mongoose.Types.ObjectId().toString(),
      userId: other.userId,
      type: "dataset_scoring",
      targetEntityType: "dataset",
      targetEntityId: new mongoose.Types.ObjectId().toString(),
      requestKind: "refresh",
      status: "failed",
      error: { code: "other_failure", message: "Other job failed safely." },
    });

    const response = await request(app)
      .get("/notification-deliveries")
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(response.body.deliveries).toHaveLength(1);
    expect(response.body.deliveries[0]).toMatchObject({
      alertType: "scoring_job_failed",
      status: "sent",
      cadence: "immediate",
    });
    expect(response.body.digestBatches).toEqual([]);
    expect(JSON.stringify(response.body)).not.toContain("other_failure");
    expect(JSON.stringify(response.body)).not.toContain("owner@example.com");
    expect(JSON.stringify(response.body)).not.toContain("providerMessageId");
    expect(JSON.stringify(response.body)).not.toContain("failureReason");

    const emptyOwner = await registerUser(app, "empty@example.com");
    const emptyResponse = await request(app)
      .get("/notification-deliveries")
      .set("Authorization", `Bearer ${emptyOwner.token}`)
      .expect(200);
    expect(emptyResponse.body).toEqual({ deliveries: [], digestBatches: [] });

    await request(app).get("/notification-deliveries").expect(401);
  });
});

function enabledEmailConfig(): ApiConfig["email"] {
  return {
    enabled: true,
    provider: "smtp",
    fromAddress: "alerts@example.com",
    fromName: "Tax Lien Intelligence Platform",
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
