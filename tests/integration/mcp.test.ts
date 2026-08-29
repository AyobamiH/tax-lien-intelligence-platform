import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
import { AuthService } from "../../apps/api/src/auth/auth-service.js";
import type {
  CreateUserInput,
  StoredUser,
  UserStore,
} from "../../apps/api/src/auth/user-store.js";
import type { McpEvidenceServiceContract } from "../../apps/api/src/mcp/evidence-service.js";

const testJwtSecret = "test-mcp-secret-that-is-long-enough-for-jwt";
const mcpHeaders = {
  Accept: "application/json, text/event-stream",
  "Content-Type": "application/json",
};

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

class CapturingEvidenceService implements McpEvidenceServiceContract {
  public lastPrincipalUserId?: string;

  public async listWorkspaces(principal: { userId: string }): Promise<Record<string, unknown>> {
    this.lastPrincipalUserId = principal.userId;
    return {
      currentWorkspaceId: "workspace-1",
      workspaces: [{ id: "workspace-1", name: "Review room", role: "owner" }],
    };
  }

  public async listDatasets(): Promise<Record<string, unknown>> {
    return { datasets: [] };
  }

  public async listDatasetCandidates(): Promise<Record<string, unknown>> {
    return { candidates: [] };
  }

  public async getCandidateEvidence(): Promise<Record<string, unknown>> {
    return { candidate: null };
  }

  public async compareCandidates(): Promise<Record<string, unknown>> {
    return { candidates: [] };
  }

  public async getDecisionBrief(): Promise<Record<string, unknown>> {
    return { brief: null };
  }
}

describe("authenticated MCP interface", () => {
  it("rejects unauthenticated protocol requests", async () => {
    const response = await request(createApp())
      .post("/mcp")
      .set(mcpHeaders)
      .send(initializeRequest(1))
      .expect(401);

    expect(response.body.error.code).toBe("auth_missing_token");
  });

  it("advertises only read-only evidence tools with accurate annotations", async () => {
    const fixture = await createFixture();
    const response = await mcpRequest(fixture.app, fixture.token, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });

    expect(response.status).toBe(200);
    expect(response.body.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      "list_workspaces",
      "list_datasets",
      "list_dataset_candidates",
      "get_candidate_evidence",
      "compare_candidates",
      "get_decision_brief",
    ]);
    for (const tool of response.body.result.tools) {
      expect(tool.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      });
      expect(tool.name).not.toMatch(/bid|buy|approve|write|delete|update/iu);
    }
  });

  it("passes only the authenticated principal into a tool and returns structured evidence", async () => {
    const fixture = await createFixture();
    const response = await mcpRequest(fixture.app, fixture.token, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "list_workspaces", arguments: {} },
    });

    expect(response.status).toBe(200);
    expect(response.body.result.isError).not.toBe(true);
    expect(response.body.result.structuredContent).toMatchObject({
      schemaVersion: "1.0.0",
      data: { currentWorkspaceId: "workspace-1" },
    });
    expect(fixture.evidenceService.lastPrincipalUserId).toBe(fixture.userId);
  });

  it("rejects invalid tool input before calling application services", async () => {
    const fixture = await createFixture();
    const response = await mcpRequest(fixture.app, fixture.token, {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "compare_candidates",
        arguments: { workspaceId: "workspace-1", candidateIds: ["only-one"] },
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.result.isError).toBe(true);
  });
});

async function createFixture(): Promise<{
  app: ReturnType<typeof createApp>;
  token: string;
  userId: string;
  evidenceService: CapturingEvidenceService;
}> {
  const userStore = new InMemoryUserStore();
  const authService = new AuthService(userStore, {
    jwtSecret: testJwtSecret,
    jwtExpiresIn: "1h",
    passwordSaltRounds: 4,
  });
  const evidenceService = new CapturingEvidenceService();
  const app = createApp({ authService, mcpEvidenceService: evidenceService });
  const registration = await request(app).post("/auth/register").send({
    email: "mcp-user@example.com",
    password: "StrongPassword123!",
  });
  return {
    app,
    token: registration.body.token,
    userId: registration.body.user.id,
    evidenceService,
  };
}

async function mcpRequest(
  app: ReturnType<typeof createApp>,
  token: string,
  body: Record<string, unknown>,
) {
  return request(app)
    .post("/mcp")
    .set(mcpHeaders)
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}

function initializeRequest(id: number): Record<string, unknown> {
  return {
    jsonrpc: "2.0",
    id,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "tax-lien-mcp-test", version: "1.0.0" },
    },
  };
}
