import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AlertService } from "../../apps/api/src/alerts/alert-service.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import { createApp } from "../../apps/api/src/app.js";
import { InMemoryAlertStore } from "../support/in-memory-alert-store.js";

const testJwtSecret = "test-alerts-secret-that-is-long-enough-for-jwt";

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

function createTestContext(): {
  app: ReturnType<typeof createApp>;
  alertService: AlertService;
} {
  const userStore = new InMemoryUserStore();
  const alertService = new AlertService(new InMemoryAlertStore());
  const authService = new AuthService(userStore, {
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });

  return {
    app: createApp({ authService, alertService }),
    alertService,
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

describe("alerts API", () => {
  it("rejects unauthenticated alert access", async () => {
    const { app } = createTestContext();

    const response = await request(app).get("/alerts").expect(401);

    expect(response.body.error.code).toBe("auth_missing_token");
  });

  it("lists current-user alerts and marks a single alert read", async () => {
    const { app, alertService } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const alert = await alertService.createAlert({
      userId: owner.userId,
      type: "scoring_job_completed",
      severity: "info",
      message: "Scoring completed. 2 records are ready for review.",
      relatedEntityType: "dataset",
      relatedEntityId: new mongoose.Types.ObjectId().toString(),
    });

    const listResponse = await request(app).get("/alerts").set("Authorization", `Bearer ${owner.token}`).expect(200);
    expect(listResponse.body).toMatchObject({
      unreadCount: 1,
      alerts: [
        {
          id: alert.id,
          type: "scoring_job_completed",
          status: "unread",
        },
      ],
    });

    const readResponse = await request(app)
      .patch(`/alerts/${alert.id}/read`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);
    expect(readResponse.body.alert).toMatchObject({
      id: alert.id,
      status: "read",
      readAt: expect.any(String),
    });
  });

  it("marks all current-user alerts read without affecting other tenants", async () => {
    const { app, alertService } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const other = await registerUser(app, "other@example.com");
    await alertService.createAlert({
      userId: owner.userId,
      type: "scoring_job_completed",
      severity: "info",
      message: "Scoring completed. 1 records are ready for review.",
    });
    await alertService.createAlert({
      userId: owner.userId,
      type: "scoring_job_failed",
      severity: "error",
      message: "Scoring failed. The scoring job needs attention.",
    });
    await alertService.createAlert({
      userId: other.userId,
      type: "scoring_job_completed",
      severity: "info",
      message: "Scoring completed. 1 records are ready for review.",
    });

    const response = await request(app).patch("/alerts/read-all").set("Authorization", `Bearer ${owner.token}`).expect(200);
    expect(response.body.updatedCount).toBe(2);

    const ownerList = await request(app).get("/alerts").set("Authorization", `Bearer ${owner.token}`).expect(200);
    const otherList = await request(app).get("/alerts").set("Authorization", `Bearer ${other.token}`).expect(200);
    expect(ownerList.body.unreadCount).toBe(0);
    expect(otherList.body.unreadCount).toBe(1);
  });

  it("blocks cross-user alert acknowledgement and rejects invalid ids", async () => {
    const { app, alertService } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const other = await registerUser(app, "other@example.com");
    const alert = await alertService.createAlert({
      userId: owner.userId,
      type: "scoring_job_failed",
      severity: "error",
      message: "Scoring failed. The scoring job needs attention.",
    });

    const crossUser = await request(app)
      .patch(`/alerts/${alert.id}/read`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);
    expect(crossUser.body.error.code).toBe("alert_not_found");

    const invalid = await request(app)
      .patch("/alerts/not-a-valid-id/read")
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(400);
    expect(invalid.body.error.code).toBe("alert_invalid_id");
  });
});
