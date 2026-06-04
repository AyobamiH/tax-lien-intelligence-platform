import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type { CreateUserInput, StoredUser, UserStore } from "../../apps/api/src/auth/user-store.js";
import { createApp } from "../../apps/api/src/app.js";
import type {
  ComparisonStore,
  CreateComparisonItemInput,
  CreateComparisonItemResult,
  StoredComparisonItem,
  UpdateComparisonItemInput,
} from "../../apps/api/src/comparison/comparison-store.js";
import type {
  CreatePortfolioItemInput,
  CreatePortfolioItemResult,
  PortfolioStore,
  StoredPortfolioItem,
} from "../../apps/api/src/portfolio/portfolio-store.js";
import { SavedViewService } from "../../apps/api/src/saved-views/saved-view-service.js";
import type {
  SavedViewStore,
  SaveSavedViewInput,
  StoredSavedView,
  UpdateSavedViewInput,
} from "../../apps/api/src/saved-views/saved-view-store.js";
import type { SavedViewFilters, SavedViewSort } from "@tax-lien/types";

const testJwtSecret = "test-saved-view-secret-that-is-long-enough-for-jwt";

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

class InMemorySavedViewStore implements SavedViewStore {
  private readonly viewsById = new Map<string, StoredSavedView>();

  public async createView(input: SaveSavedViewInput): Promise<StoredSavedView> {
    const now = new Date();
    const view: StoredSavedView = {
      id: new mongoose.Types.ObjectId().toString(),
      userId: input.userId,
      surface: input.surface,
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
      filters: input.filters,
      ...(input.sort ? { sort: input.sort } : {}),
      createdAt: now,
      updatedAt: now,
    };
    this.viewsById.set(view.id, view);
    return view;
  }

  public async listViewsForUser(userId: string): Promise<StoredSavedView[]> {
    return [...this.viewsById.values()].filter((view) => view.userId === userId);
  }

  public async findViewByIdForUser(savedViewId: string, userId: string): Promise<StoredSavedView | null> {
    const view = this.viewsById.get(savedViewId);
    return view && view.userId === userId ? view : null;
  }

  public async updateViewForUser(
    savedViewId: string,
    userId: string,
    input: UpdateSavedViewInput,
  ): Promise<StoredSavedView | null> {
    const current = await this.findViewByIdForUser(savedViewId, userId);
    if (!current) {
      return null;
    }
    const updated: StoredSavedView = {
      ...current,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description === null ? {} : input.description !== undefined ? { description: input.description } : {}),
      ...(input.filters !== undefined ? { filters: input.filters as SavedViewFilters } : {}),
      ...(input.sort === null ? {} : input.sort !== undefined ? { sort: input.sort as SavedViewSort } : {}),
      updatedAt: new Date(),
    };
    if (input.description === null) {
      delete updated.description;
    }
    if (input.sort === null) {
      delete updated.sort;
    }
    this.viewsById.set(updated.id, updated);
    return updated;
  }

  public async deleteViewForUser(savedViewId: string, userId: string): Promise<boolean> {
    const current = await this.findViewByIdForUser(savedViewId, userId);
    return current ? this.viewsById.delete(savedViewId) : false;
  }
}

class InMemoryPortfolioStore implements PortfolioStore {
  public readonly items: StoredPortfolioItem[] = [];

  public async createItem(_input: CreatePortfolioItemInput): Promise<CreatePortfolioItemResult> {
    throw new Error("Not needed for saved view tests.");
  }

  public async listItemsForUser(userId: string): Promise<StoredPortfolioItem[]> {
    return this.items.filter((item) => item.userId === userId);
  }

  public async findItemByIdForUser(portfolioItemId: string, userId: string): Promise<StoredPortfolioItem | null> {
    return this.items.find((item) => item.id === portfolioItemId && item.userId === userId) ?? null;
  }

  public async updateStatusForUser(): Promise<StoredPortfolioItem | null> {
    throw new Error("Not needed for saved view tests.");
  }

  public async deleteItemForUser(): Promise<boolean> {
    throw new Error("Not needed for saved view tests.");
  }
}

class InMemoryComparisonStore implements ComparisonStore {
  public readonly items: StoredComparisonItem[] = [];

  public async createItem(_input: CreateComparisonItemInput): Promise<CreateComparisonItemResult> {
    throw new Error("Not needed for saved view tests.");
  }

  public async listItemsForUser(userId: string): Promise<StoredComparisonItem[]> {
    return this.items.filter((item) => item.userId === userId);
  }

  public async findItemByIdForUser(): Promise<StoredComparisonItem | null> {
    throw new Error("Not needed for saved view tests.");
  }

  public async updateItemForUser(_comparisonItemId: string, _userId: string, _input: UpdateComparisonItemInput): Promise<StoredComparisonItem | null> {
    throw new Error("Not needed for saved view tests.");
  }

  public async deleteItemForUser(): Promise<boolean> {
    throw new Error("Not needed for saved view tests.");
  }
}

function createTestContext() {
  const userStore = new InMemoryUserStore();
  const portfolioStore = new InMemoryPortfolioStore();
  const comparisonStore = new InMemoryComparisonStore();
  const savedViewService = new SavedViewService(new InMemorySavedViewStore(), portfolioStore, comparisonStore);
  const authService = new AuthService(userStore, {
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });

  return {
    app: createApp({ authService, savedViewService }),
    portfolioStore,
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

function portfolioItem(userId: string, overrides: Partial<StoredPortfolioItem>): StoredPortfolioItem {
  const now = new Date("2026-06-01T00:00:00.000Z");
  return {
    id: new mongoose.Types.ObjectId().toString(),
    userId,
    datasetId: new mongoose.Types.ObjectId().toString(),
    scoredRecordId: new mongoose.Types.ObjectId().toString(),
    status: "tracked",
    statusUpdatedAt: now,
    sourceRowNumber: 2,
    normalizedFields: {
      parcelId: "A-100",
      lienAmount: 1000,
      estimatedValue: 12000,
      propertyTypeCategory: "residential",
    },
    score: {
      investmentScore: 80,
      riskScore: 20,
      liquidityScore: 75,
      redemptionProbability: 0.82,
      confidenceScore: 90,
      valueCoverageRatio: 12,
      flags: [],
      reasoning: ["Strong value coverage."],
    },
    scoredAt: now,
    trackedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("saved views API", () => {
  it("creates, lists, and applies a tenant-owned portfolio saved view", async () => {
    const { app, portfolioStore } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const other = await registerUser(app, "other@example.com");
    const ownerReady = portfolioItem(owner.userId, { status: "ready" });
    portfolioStore.items.push(ownerReady, portfolioItem(owner.userId, { status: "tracked" }), portfolioItem(other.userId, { status: "ready" }));

    const createResponse = await request(app)
      .post("/saved-views")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        surface: "portfolio",
        name: "Ready portfolio",
        filters: { statuses: ["ready"] },
        sort: { key: "tracked_at", direction: "desc" },
      })
      .expect(201);

    const listResponse = await request(app).get("/saved-views").set("Authorization", `Bearer ${owner.token}`).expect(200);
    const applyResponse = await request(app)
      .get(`/saved-views/${createResponse.body.view.id as string}/apply`)
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(listResponse.body.views).toHaveLength(1);
    expect(listResponse.body.queues).toEqual(expect.arrayContaining([expect.objectContaining({ id: "portfolio-needs-attention" })]));
    expect(applyResponse.body).toMatchObject({
      surface: "portfolio",
      view: { name: "Ready portfolio" },
      items: [expect.objectContaining({ id: ownerReady.id, status: "ready" })],
      summary: { totalTrackedItems: 1 },
    });
    expect(JSON.stringify(applyResponse.body)).not.toContain(other.userId);
  });

  it("rejects invalid saved view criteria and protects cross-user access", async () => {
    const { app } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const other = await registerUser(app, "other@example.com");

    await request(app)
      .post("/saved-views")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        surface: "portfolio",
        name: "Unsafe",
        filters: { rawSql: "status = ready" },
      })
      .expect(400);

    const createResponse = await request(app)
      .post("/saved-views")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        surface: "portfolio",
        name: "Tracked only",
        filters: { statuses: ["tracked"] },
      })
      .expect(201);

    await request(app)
      .get(`/saved-views/${createResponse.body.view.id as string}/apply`)
      .set("Authorization", `Bearer ${other.token}`)
      .expect(404);
    await request(app).get("/saved-views").expect(401);
  });

  it("applies the built-in portfolio attention queue from current portfolio data", async () => {
    const { app, portfolioStore } = createTestContext();
    const owner = await registerUser(app, "owner@example.com");
    const reviewItem = portfolioItem(owner.userId, {
      status: "reviewing",
      score: {
        investmentScore: 62,
        riskScore: 50,
        liquidityScore: 40,
        redemptionProbability: 0.5,
        confidenceScore: 55,
        flags: ["Missing estimated value"],
        reasoning: ["Weak context."],
      },
    });
    portfolioStore.items.push(reviewItem, portfolioItem(owner.userId, { status: "closed" }));

    const response = await request(app)
      .get("/saved-views/portfolio-needs-attention/apply")
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({ id: reviewItem.id, status: "reviewing" });
    expect(response.body.view.filters).toEqual({ queue: "needs_attention" });
  });
});
