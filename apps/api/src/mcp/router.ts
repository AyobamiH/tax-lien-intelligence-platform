import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Router, type Request, type Response } from "express";
import * as z from "zod/v4";
import type { AuthService } from "../auth/auth-service.js";
import { ApiError } from "../errors/api-error.js";
import { requireAuth } from "../middleware/auth.js";
import { mcpOAuthChallenge, resolveMcpOAuth } from "../middleware/oauth.js";
import type { OAuthService } from "../oauth/oauth-service.js";
import {
  MCP_TOOL_CONTRACT_VERSION,
  type McpEvidenceServiceContract,
} from "./evidence-service.js";

const workspaceIdSchema = z.string().min(1).max(128).describe("Accessible workspace id from list_workspaces.");
const candidateIdSchema = z.string().min(1).max(128).describe("Stored scored-record id.");
const outputSchema = {
  schemaVersion: z.literal(MCP_TOOL_CONTRACT_VERSION),
  generatedAt: z.iso.datetime(),
  data: z.record(z.string(), z.unknown()),
};

export function createMcpRouter(
  authService: AuthService,
  evidenceService: McpEvidenceServiceContract,
  oauthService: OAuthService | null = null,
): Router {
  const router = Router();
  router.use(oauthService ? resolveMcpOAuth(oauthService) : requireAuth(authService));

  router.post("/", async (request, response) => {
    if (!request.auth && !oauthService) {
      sendProtocolError(response, 401, -32001, "Authentication is required.");
      return;
    }

    const server = createMcpServer(request.auth, evidenceService, oauthService);
    const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true });
    try {
      await server.connect(transport as unknown as Parameters<typeof server.connect>[0]);
      await transport.handleRequest(
        request as unknown as Parameters<typeof transport.handleRequest>[0],
        response,
        request.body,
      );
    } catch {
      if (!response.headersSent) {
        sendProtocolError(response, 500, -32603, "Internal MCP server error.");
      }
    } finally {
      await transport.close();
      await server.close();
    }
  });

  router.get("/", (_request, response) => {
    sendProtocolError(response, 405, -32000, "Method not allowed. Use stateless MCP POST requests.");
  });
  router.delete("/", (_request, response) => {
    sendProtocolError(response, 405, -32000, "Method not allowed. Use stateless MCP POST requests.");
  });

  return router;
}

function createMcpServer(
  principal: Request["auth"],
  evidenceService: McpEvidenceServiceContract,
  oauthService: OAuthService | null,
): McpServer {
  const server = new McpServer(
    { name: "tax-lien-intelligence", version: MCP_TOOL_CONTRACT_VERSION },
    {
      instructions:
        "Use these read-only tools for evidence-grounded tax-lien review. Cite returned citation ids, preserve unknowns, label legacy heuristics, and never invent bid or legal advice.",
    },
  );
  const annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  } as const;
  const securitySchemes = oauthService
    ? [{ type: "oauth2", scopes: [oauthService.config.scope] }]
    : undefined;
  const toolMeta = securitySchemes ? { securitySchemes } : undefined;

  server.registerTool(
    "list_workspaces",
    {
      title: "List accessible workspaces",
      description: "List only the workspaces available to the authenticated user.",
      inputSchema: {},
      outputSchema,
      annotations,
      ...(toolMeta ? { _meta: toolMeta } : {}),
    },
    async () =>
      authorizedToolResult("list_workspaces", principal, oauthService, (authenticatedPrincipal) =>
        evidenceService.listWorkspaces(authenticatedPrincipal),
      ),
  );

  server.registerTool(
    "list_datasets",
    {
      title: "List workspace datasets",
      description: "List evidence datasets in one authorized workspace, including readiness issues.",
      inputSchema: { workspaceId: workspaceIdSchema },
      outputSchema,
      annotations,
      ...(toolMeta ? { _meta: toolMeta } : {}),
    },
    async ({ workspaceId }) =>
      authorizedToolResult("list_datasets", principal, oauthService, (authenticatedPrincipal) =>
        evidenceService.listDatasets(authenticatedPrincipal, workspaceId),
      ),
  );

  server.registerTool(
    "list_dataset_candidates",
    {
      title: "List dataset candidates",
      description:
        "Return a bounded page of stored candidate evidence. Values are not ranked and legacy heuristics are labeled.",
      inputSchema: {
        workspaceId: workspaceIdSchema,
        datasetId: z.string().min(1).max(128),
        offset: z.number().int().min(0).max(100_000).default(0),
        limit: z.number().int().min(1).max(50).default(20),
      },
      outputSchema,
      annotations,
      ...(toolMeta ? { _meta: toolMeta } : {}),
    },
    async ({ workspaceId, datasetId, offset, limit }) =>
      authorizedToolResult("list_dataset_candidates", principal, oauthService, (authenticatedPrincipal) =>
        evidenceService.listDatasetCandidates(
          authenticatedPrincipal,
          workspaceId,
          datasetId,
          offset,
          limit,
        ),
      ),
  );

  server.registerTool(
    "get_candidate_evidence",
    {
      title: "Get candidate evidence",
      description:
        "Get cited stored facts, labeled inferences, versioned engine output, limitations, and unknowns for one authorized candidate.",
      inputSchema: { workspaceId: workspaceIdSchema, candidateId: candidateIdSchema },
      outputSchema,
      annotations,
      ...(toolMeta ? { _meta: toolMeta } : {}),
    },
    async ({ workspaceId, candidateId }) =>
      authorizedToolResult("get_candidate_evidence", principal, oauthService, (authenticatedPrincipal) =>
        evidenceService.getCandidateEvidence(authenticatedPrincipal, workspaceId, candidateId),
      ),
  );

  server.registerTool(
    "compare_candidates",
    {
      title: "Compare candidate evidence",
      description:
        "Place two to ten authorized candidates side by side without ranking or producing a bid recommendation.",
      inputSchema: {
        workspaceId: workspaceIdSchema,
        candidateIds: z.array(candidateIdSchema).min(2).max(10),
      },
      outputSchema,
      annotations,
      ...(toolMeta ? { _meta: toolMeta } : {}),
    },
    async ({ workspaceId, candidateIds }) =>
      authorizedToolResult("compare_candidates", principal, oauthService, (authenticatedPrincipal) =>
        evidenceService.compareCandidates(authenticatedPrincipal, workspaceId, candidateIds),
      ),
  );

  server.registerTool(
    "get_decision_brief",
    {
      title: "Get decision brief evidence",
      description:
        "Return a privacy-reduced evidence pack and memo outline for an authorized comparison item. This tool does not write or approve decisions.",
      inputSchema: {
        workspaceId: workspaceIdSchema,
        comparisonItemId: z.string().min(1).max(128),
      },
      outputSchema,
      annotations,
      ...(toolMeta ? { _meta: toolMeta } : {}),
    },
    async ({ workspaceId, comparisonItemId }) =>
      authorizedToolResult("get_decision_brief", principal, oauthService, (authenticatedPrincipal) =>
        evidenceService.getDecisionBrief(authenticatedPrincipal, workspaceId, comparisonItemId),
      ),
  );

  return server;
}

function authorizedToolResult(
  tool: string,
  principal: Request["auth"],
  oauthService: OAuthService | null,
  operation: (principal: NonNullable<Request["auth"]>) => Promise<Record<string, unknown>>,
) {
  if (!principal) {
    if (!oauthService) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: "Authentication is required." }],
      };
    }
    return {
      isError: true,
      content: [{ type: "text" as const, text: "Authentication is required to use this tool." }],
      _meta: {
        "mcp/www_authenticate": [mcpOAuthChallenge(oauthService, { includeError: true })],
      },
    };
  }
  return toolResult(tool, () => operation(principal));
}

async function toolResult(
  tool: string,
  operation: () => Promise<Record<string, unknown>>,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}> {
  try {
    const payload = {
      schemaVersion: MCP_TOOL_CONTRACT_VERSION,
      generatedAt: new Date().toISOString(),
      data: await operation(),
    };
    return {
      structuredContent: payload,
      content: [{ type: "text", text: JSON.stringify(payload) }],
    };
  } catch (error) {
    const safe = safeToolError(error);
    return {
      isError: true,
      content: [{ type: "text", text: JSON.stringify({ tool, error: safe }) }],
    };
  }
}

function safeToolError(error: unknown): { code: string; message: string } {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message };
  }
  return { code: "mcp_tool_failed", message: "The evidence tool could not complete the request." };
}

function sendProtocolError(
  response: Response,
  status: number,
  code: number,
  message: string,
): void {
  response.status(status).json({
    jsonrpc: "2.0",
    error: { code, message },
    id: null,
  });
}
