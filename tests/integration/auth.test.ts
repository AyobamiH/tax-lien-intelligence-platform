import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import { createApp } from "../../apps/api/src/app.js";

const testJwtSecret = "test-auth-secret-that-is-long-enough-for-jwt";

class InMemoryUserStore implements UserStore {
  private readonly usersById = new Map<string, StoredUser>();
  private readonly idsByEmail = new Map<string, string>();

  public async createUser(input: CreateUserInput): Promise<StoredUser> {
    const now = new Date();
    const user: StoredUser = {
      id: crypto.randomUUID(),
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

function createTestContext(): { app: ReturnType<typeof createApp>; store: InMemoryUserStore } {
  const store = new InMemoryUserStore();
  const authService = new AuthService(store, {
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });

  return {
    app: createApp({ authService }),
    store,
  };
}

async function registerUser(app: ReturnType<typeof createApp>): Promise<string> {
  const response = await request(app).post("/auth/register").send({
    email: "owner@example.com",
    password: "StrongPass123",
  });

  return response.body.token as string;
}

describe("auth API", () => {
  it("registers a user, hashes the password, and never returns the password hash", async () => {
    const { app, store } = createTestContext();

    const response = await request(app)
      .post("/auth/register")
      .send({ email: "OWNER@Example.com", password: "StrongPass123" })
      .expect(201);

    expect(response.body).toMatchObject({
      token: expect.any(String),
      user: {
        id: expect.any(String),
        email: "owner@example.com",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");

    const storedUser = await store.findByEmail("owner@example.com");
    expect(storedUser?.passwordHash).toEqual(expect.any(String));
    expect(storedUser?.passwordHash).not.toBe("StrongPass123");
  });

  it("rejects duplicate registration attempts", async () => {
    const { app } = createTestContext();

    await request(app)
      .post("/auth/register")
      .send({ email: "owner@example.com", password: "StrongPass123" })
      .expect(201);

    const response = await request(app)
      .post("/auth/register")
      .send({ email: "OWNER@example.com", password: "StrongPass123" })
      .expect(409);

    expect(response.body).toEqual({
      error: {
        code: "auth_email_already_registered",
        message: "An account already exists for this email.",
      },
    });
  });

  it("logs in with valid credentials", async () => {
    const { app } = createTestContext();

    await request(app)
      .post("/auth/register")
      .send({ email: "owner@example.com", password: "StrongPass123" })
      .expect(201);

    const response = await request(app)
      .post("/auth/login")
      .send({ email: "owner@example.com", password: "StrongPass123" })
      .expect(200);

    expect(response.body).toMatchObject({
      token: expect.any(String),
      user: {
        email: "owner@example.com",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
  });

  it("rejects invalid passwords without revealing account details", async () => {
    const { app } = createTestContext();

    await request(app)
      .post("/auth/register")
      .send({ email: "owner@example.com", password: "StrongPass123" })
      .expect(201);

    const response = await request(app)
      .post("/auth/login")
      .send({ email: "owner@example.com", password: "WrongPass123" })
      .expect(401);

    expect(response.body).toEqual({
      error: {
        code: "auth_invalid_credentials",
        message: "Email or password is incorrect.",
      },
    });
  });

  it("rejects missing or invalid register payloads", async () => {
    const { app } = createTestContext();

    const response = await request(app).post("/auth/register").send({ email: "not-an-email" }).expect(400);

    expect(response.body).toEqual({
      error: {
        code: "validation_failed",
        message: "Request payload is invalid.",
      },
    });
  });

  it("rejects malformed JSON safely", async () => {
    const { app } = createTestContext();

    const response = await request(app)
      .post("/auth/register")
      .set("Content-Type", "application/json")
      .send("{not-json")
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: "invalid_json",
        message: "Request body must be valid JSON.",
      },
    });
  });

  it("rejects /auth/me without a token", async () => {
    const { app } = createTestContext();

    const response = await request(app).get("/auth/me").expect(401);

    expect(response.body).toEqual({
      error: {
        code: "auth_missing_token",
        message: "Authentication token is required.",
      },
    });
  });

  it("returns the authenticated user for /auth/me with a valid token", async () => {
    const { app } = createTestContext();
    const token = await registerUser(app);

    const response = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`).expect(200);

    expect(response.body).toMatchObject({
      user: {
        email: "owner@example.com",
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
  });

  it("rejects malformed authorization headers", async () => {
    const { app } = createTestContext();

    const response = await request(app).get("/auth/me").set("Authorization", "Token abc").expect(401);

    expect(response.body).toEqual({
      error: {
        code: "auth_invalid_header",
        message: "Authorization header must use Bearer token format.",
      },
    });
  });

  it("rejects invalid tokens", async () => {
    const { app } = createTestContext();

    const response = await request(app).get("/auth/me").set("Authorization", "Bearer invalid-token").expect(401);

    expect(response.body).toEqual({
      error: {
        code: "auth_invalid_token",
        message: "Authentication token is invalid.",
      },
    });
  });

  it("rejects expired tokens", async () => {
    const { app } = createTestContext();
    const expiredToken = jwt.sign(
      {
        sub: crypto.randomUUID(),
        email: "owner@example.com",
        type: "access",
      },
      testJwtSecret,
      { expiresIn: -1 },
    );

    const response = await request(app).get("/auth/me").set("Authorization", `Bearer ${expiredToken}`).expect(401);

    expect(response.body).toEqual({
      error: {
        code: "auth_token_expired",
        message: "Authentication token has expired.",
      },
    });
  });
});
