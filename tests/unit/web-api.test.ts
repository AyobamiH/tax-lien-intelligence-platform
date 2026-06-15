import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiClientError,
  addWorkspaceMember,
  addComparisonItem,
  approveApprovalRequest,
  applySavedView,
  applyDatasetImportProfile,
  cancelApprovalRequest,
  createApprovalRequest,
  createSavedView,
  createWorkspaceComment,
  clearWorkspaceAssignment,
  createDataset,
  deactivateWorkspaceMember,
  followEntity,
  getFollowState,
  getMyWork,
  getReviewChecklistState,
  getNotificationPreferences,
  getWorkspaceAssignment,
  getPortfolioSummary,
  handoffComparisonToPortfolio,
  handoffComparisonToWatchlist,
  listComparisonHistory,
  listComparison,
  listImportProfiles,
  listNotificationDeliveryHistory,
  listSavedViews,
  listWorkspaceMembers,
  listWorkspaceActivity,
  listWorkspaceComments,
  listAssignedToMe,
  listApprovalRequests,
  listFollows,
  listReviewChecklistTemplates,
  listWorkspaces,
  markWorkspaceDiscussionRead,
  removeComparisonItem,
  rejectApprovalRequest,
  deleteWorkspaceComment,
  saveDatasetImportProfile,
  saveDatasetManualMapping,
  setActiveWorkspaceId,
  updateComparisonItem,
  updateNotificationPreferences,
  updateReviewChecklistItem,
  updateWorkspaceMemberRole,
  updateWorkspaceAssignment,
  upsertReviewChecklistTemplate,
  unfollowEntity,
} from "../../apps/web/src/api.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  setActiveWorkspaceId(null);
  vi.restoreAllMocks();
});

describe("web API client", () => {
  it("loads workspace context and sends the selected workspace on authenticated requests", async () => {
    const responses = [
      {
        workspaces: [
          {
            id: "workspace-1",
            name: "Acme Workspace",
            role: "admin",
            isDefault: true,
            memberCount: 2,
            permissions: {
              canReadSharedData: true,
              canManageSharedData: true,
              canManageMembers: true,
              canManageRoles: false,
            },
            createdAt: "2026-06-11T00:00:00.000Z",
            updatedAt: "2026-06-11T00:00:00.000Z",
          },
        ],
        currentWorkspaceId: "workspace-1",
      },
      { members: [] },
    ];
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(responses.shift()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;

    const list = await listWorkspaces("test-token");
    setActiveWorkspaceId(list.currentWorkspaceId);
    await listWorkspaceMembers("test-token");

    const firstHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    const secondHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Headers;
    expect(firstHeaders.get("X-Workspace-Id")).toBeNull();
    expect(secondHeaders.get("X-Workspace-Id")).toBe("workspace-1");
  });

  it("adds, updates, and deactivates workspace members through the selected workspace", async () => {
    const payloads = [
      { member: { id: "membership-1", email: "member@example.com", role: "member", status: "active" } },
      { member: { id: "membership-1", email: "member@example.com", role: "admin", status: "active" } },
      { member: { id: "membership-1", email: "member@example.com", role: "admin", status: "inactive" } },
    ];
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(payloads.shift()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;
    setActiveWorkspaceId("workspace-1");

    await addWorkspaceMember("test-token", "member@example.com", "member");
    await updateWorkspaceMemberRole("test-token", "membership-1", "admin");
    await deactivateWorkspaceMember("test-token", "membership-1");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:4000/workspaces/current/members",
      "http://localhost:4000/workspaces/current/members/membership-1",
      "http://localhost:4000/workspaces/current/members/membership-1",
    ]);
    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual(["POST", "PATCH", "DELETE"]);
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ email: "member@example.com", role: "member" }),
    );
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ role: "admin" }));
    for (const [, init] of fetchMock.mock.calls) {
      const headers = init?.headers as Headers;
      expect(headers.get("X-Workspace-Id")).toBe("workspace-1");
    }
  });

  it("loads filtered workspace activity inside the selected workspace", async () => {
    const responsePayload = {
      activities: [
        {
          id: "activity-1",
          workspaceId: "workspace-1",
          actor: { userId: "user-1", email: "owner@example.com" },
          category: "data",
          eventType: "dataset_uploaded",
          relatedEntityType: "dataset",
          relatedEntityId: "dataset-1",
          summary: "Uploaded dataset June sale.",
          metadata: { datasetId: "dataset-1", datasetName: "June sale" },
          occurredAt: "2026-06-11T12:00:00.000Z",
        },
      ],
    };
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;
    setActiveWorkspaceId("workspace-1");

    const result = await listWorkspaceActivity("test-token", "data");

    expect(result).toEqual(responsePayload);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/workspaces/current/activity?category=data");
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer test-token");
    expect(headers.get("X-Workspace-Id")).toBe("workspace-1");
  });

  it("lists, creates, and deletes comments inside the selected workspace", async () => {
    const payloads = [
      {
        comments: [],
        attention: {
          workspaceId: "workspace-1",
          relatedEntityType: "dataset",
          relatedEntityId: "dataset-1",
          unreadCount: 1,
          hasUnread: true,
        },
      },
      {
        comment: {
          id: "comment-1",
          workspaceId: "workspace-1",
          author: { userId: "user-1", email: "owner@example.com" },
          relatedEntityType: "dataset",
          relatedEntityId: "dataset-1",
          body: "Review the missing values.",
          canDelete: true,
          createdAt: "2026-06-12T10:00:00.000Z",
          updatedAt: "2026-06-12T10:00:00.000Z",
        },
        attention: {
          workspaceId: "workspace-1",
          relatedEntityType: "dataset",
          relatedEntityId: "dataset-1",
          unreadCount: 0,
          hasUnread: false,
        },
      },
      {
        attention: {
          workspaceId: "workspace-1",
          relatedEntityType: "dataset",
          relatedEntityId: "dataset-1",
          unreadCount: 0,
          hasUnread: false,
        },
      },
      { id: "comment-1", deleted: true },
    ];
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(payloads.shift()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;
    setActiveWorkspaceId("workspace-1");

    await listWorkspaceComments("test-token", "dataset", "dataset-1");
    await createWorkspaceComment("test-token", "dataset", "dataset-1", "Review the missing values.");
    await markWorkspaceDiscussionRead("test-token", "dataset", "dataset-1");
    await deleteWorkspaceComment("test-token", "comment-1");

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:4000/comments/dataset/dataset-1",
      "http://localhost:4000/comments/dataset/dataset-1",
      "http://localhost:4000/comments/dataset/dataset-1/read",
      "http://localhost:4000/comments/comment-1",
    ]);
    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual(["GET", "POST", "PATCH", "DELETE"]);
    for (const [, init] of fetchMock.mock.calls) {
      const headers = init?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer test-token");
      expect(headers.get("X-Workspace-Id")).toBe("workspace-1");
    }
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ body: "Review the missing values." }));
  });

  it("loads, changes, clears, and lists workspace assignments", async () => {
    const payloads = [
      { assignment: null },
      {
        assignment: {
          id: "assignment-1",
          workspaceId: "workspace-1",
          relatedEntityType: "dataset",
          relatedEntityId: "dataset-1",
          assignee: { userId: "user-2", email: "member@example.com" },
          assignedBy: { userId: "user-1", email: "owner@example.com" },
          assignedAt: "2026-06-12T10:00:00.000Z",
          updatedAt: "2026-06-12T10:00:00.000Z",
        },
        changed: true,
      },
      { relatedEntityType: "dataset", relatedEntityId: "dataset-1", cleared: true },
      { assignments: [] },
    ];
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(payloads.shift()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;
    setActiveWorkspaceId("workspace-1");

    await getWorkspaceAssignment("test-token", "dataset", "dataset-1");
    await updateWorkspaceAssignment("test-token", "dataset", "dataset-1", "user-2");
    await clearWorkspaceAssignment("test-token", "dataset", "dataset-1");
    await listAssignedToMe("test-token");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:4000/assignments/dataset/dataset-1",
      "http://localhost:4000/assignments/dataset/dataset-1",
      "http://localhost:4000/assignments/dataset/dataset-1",
      "http://localhost:4000/assignments/mine",
    ]);
    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual([
      "GET",
      "PATCH",
      "DELETE",
      "GET",
    ]);
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(
      JSON.stringify({ assigneeUserId: "user-2" }),
    );
    for (const [, init] of fetchMock.mock.calls) {
      const headers = init?.headers as Headers;
      expect(headers.get("X-Workspace-Id")).toBe("workspace-1");
    }
  });

  it("lists, creates, reviews, and cancels workspace approval requests", async () => {
    const approval = {
      id: "approval-1",
      workspaceId: "workspace-1",
      targetEntityType: "comparison_item",
      targetEntityId: "comparison-1",
      requestedAction: "comparison_handoff_to_portfolio",
      status: "pending",
      requester: { userId: "user-2", email: "member@example.com", role: "member" },
      requestNote: "Ready for tracked diligence.",
      canReview: true,
      canCancel: false,
      createdAt: "2026-06-13T10:00:00.000Z",
      updatedAt: "2026-06-13T10:00:00.000Z",
    };
    const payloads = [
      { approvals: [approval] },
      { approval, alreadyPending: false },
      { approval: { ...approval, status: "approved" } },
      { approval: { ...approval, status: "rejected" } },
      { approval: { ...approval, status: "cancelled" } },
    ];
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(payloads.shift()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;
    setActiveWorkspaceId("workspace-1");

    await listApprovalRequests("test-token", {
      status: "pending",
      targetEntityType: "comparison_item",
      targetEntityId: "comparison-1",
    });
    await createApprovalRequest("test-token", "comparison-1", "Ready for tracked diligence.");
    await approveApprovalRequest("test-token", "approval-1", "Approved for tracking.");
    await rejectApprovalRequest("test-token", "approval-1", "Verify the county source date.");
    await cancelApprovalRequest("test-token", "approval-1");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:4000/approvals?status=pending&targetEntityType=comparison_item&targetEntityId=comparison-1",
      "http://localhost:4000/approvals",
      "http://localhost:4000/approvals/approval-1/approve",
      "http://localhost:4000/approvals/approval-1/reject",
      "http://localhost:4000/approvals/approval-1/cancel",
    ]);
    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual([
      "GET",
      "POST",
      "POST",
      "POST",
      "POST",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual({
      targetEntityType: "comparison_item",
      targetEntityId: "comparison-1",
      requestedAction: "comparison_handoff_to_portfolio",
      requestNote: "Ready for tracked diligence.",
    });
    expect(JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string)).toEqual({
      responseNote: "Approved for tracking.",
    });
    expect(JSON.parse(fetchMock.mock.calls[3]?.[1]?.body as string)).toEqual({
      responseNote: "Verify the county source date.",
    });
    for (const [, init] of fetchMock.mock.calls) {
      const headers = init?.headers as Headers;
      expect(headers.get("X-Workspace-Id")).toBe("workspace-1");
    }
  });

  it("loads the selected workspace my-work aggregation", async () => {
    const payload = {
      workspaceId: "workspace-1",
      generatedAt: "2026-06-14T10:00:00.000Z",
      counts: {
        assigned: 1,
        approvals: 0,
        unreadDiscussions: 1,
        unreadMessages: 2,
        following: 1,
        totalActionable: 2,
      },
      queues: {
        assignments: { count: 1, items: [] },
        approvals: { count: 0, items: [] },
        discussions: { count: 1, unreadCount: 2, items: [] },
        following: { count: 1, items: [] },
      },
    };
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;
    setActiveWorkspaceId("workspace-1");

    await expect(getMyWork("test-token")).resolves.toEqual(payload);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/my-work");
    expect(init.method).toBe("GET");
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer test-token");
    expect(headers.get("X-Workspace-Id")).toBe("workspace-1");
  });

  it("loads and toggles workspace-scoped follow state", async () => {
    const subscription = {
      id: "follow-1",
      workspaceId: "workspace-1",
      targetEntityType: "portfolio_item",
      targetEntityId: "portfolio-1",
      followedAt: "2026-06-14T10:00:00.000Z",
    };
    const payloads = [
      { follows: [subscription] },
      {
        targetEntityType: "portfolio_item",
        targetEntityId: "portfolio-1",
        following: false,
        followerCount: 1,
      },
      {
        targetEntityType: "portfolio_item",
        targetEntityId: "portfolio-1",
        following: true,
        followerCount: 2,
        subscription,
        alreadyFollowing: false,
      },
      {
        targetEntityType: "portfolio_item",
        targetEntityId: "portfolio-1",
        unfollowed: true,
        followerCount: 1,
      },
    ];
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(payloads.shift()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;
    setActiveWorkspaceId("workspace-1");

    await listFollows("test-token");
    await getFollowState("test-token", "portfolio_item", "portfolio-1");
    await followEntity("test-token", "portfolio_item", "portfolio-1");
    await unfollowEntity("test-token", "portfolio_item", "portfolio-1");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:4000/follows",
      "http://localhost:4000/follows/portfolio_item/portfolio-1",
      "http://localhost:4000/follows/portfolio_item/portfolio-1",
      "http://localhost:4000/follows/portfolio_item/portfolio-1",
    ]);
    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual([
      "GET",
      "GET",
      "PUT",
      "DELETE",
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      const headers = init?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer test-token");
      expect(headers.get("X-Workspace-Id")).toBe("workspace-1");
    }
  });

  it("loads, manages, and completes workspace review checklists", async () => {
    const template = {
      id: "template-1",
      workspaceId: "workspace-1",
      targetEntityType: "comparison_item",
      name: "Comparison diligence",
      active: true,
      version: 1,
      items: [
        {
          id: "item-1",
          label: "Verify parcel identity",
          required: true,
          position: 0,
        },
      ],
      createdAt: "2026-06-14T10:00:00.000Z",
      updatedAt: "2026-06-14T10:00:00.000Z",
    };
    const state = {
      targetEntityType: "comparison_item",
      targetEntityId: "comparison-1",
      template,
      checklist: {
        id: "checklist-1",
        workspaceId: "workspace-1",
        targetEntityType: "comparison_item",
        targetEntityId: "comparison-1",
        templateId: template.id,
        templateName: template.name,
        templateVersion: 1,
        items: [{ ...template.items[0], completed: false }],
        createdAt: "2026-06-14T10:00:00.000Z",
        updatedAt: "2026-06-14T10:00:00.000Z",
      },
      progress: {
        status: "not_started",
        totalItems: 1,
        completedItems: 0,
        incompleteItems: 1,
        requiredItems: 1,
        completedRequiredItems: 0,
        incompleteRequiredItems: 1,
        allRequiredComplete: false,
      },
    };
    const payloads = [
      { templates: [template] },
      { template },
      state,
      { state },
    ];
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(payloads.shift()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;
    setActiveWorkspaceId("workspace-1");

    await listReviewChecklistTemplates("test-token");
    await upsertReviewChecklistTemplate("test-token", "comparison_item", {
      name: "Comparison diligence",
      active: true,
      items: [{ label: "Verify parcel identity", required: true }],
    });
    await getReviewChecklistState(
      "test-token",
      "comparison_item",
      "comparison-1",
    );
    await updateReviewChecklistItem(
      "test-token",
      "comparison_item",
      "comparison-1",
      "item-1",
      true,
    );

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:4000/review-checklists/templates",
      "http://localhost:4000/review-checklists/templates/comparison_item",
      "http://localhost:4000/review-checklists/comparison_item/comparison-1",
      "http://localhost:4000/review-checklists/comparison_item/comparison-1/items/item-1",
    ]);
    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual([
      "GET",
      "PUT",
      "GET",
      "PATCH",
    ]);
    expect(fetchMock.mock.calls[3]?.[1]?.body).toBe(
      JSON.stringify({ completed: true }),
    );
  });

  it("uploads datasets with multipart form data and bearer auth", async () => {
    const responsePayload = {
      dataset: {
        id: "dataset-1",
        originalFilename: "maricopa.csv",
        sourceType: "manual_csv",
        sourceLabel: "Maricopa sale",
        status: "validated",
        rowCount: 1,
        columnCount: 5,
        headers: ["APN", "Total Due"],
        validationSummary: {
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          warnings: [],
          errors: [],
        },
        importSummary: {
          adapterMatched: true,
          adapterId: "maricopa_tax_lien_v1",
          adapterName: "Maricopa-style tax lien CSV",
          source: "county_adapter",
          confidence: "high",
          fallbackUsed: false,
          mappedFields: ["parcel_id", "lien_amount"],
          warnings: [],
        },
        readinessSummary: {
          status: "ready",
          score: 90,
          scoringRecommended: true,
          fieldCoverage: [
            {
              field: "parcel_id",
              label: "Parcel identifier",
              presentRows: 1,
              totalRows: 1,
              coveragePercent: 100,
              importance: "important",
            },
            {
              field: "lien_amount",
              label: "Lien amount",
              presentRows: 1,
              totalRows: 1,
              coveragePercent: 100,
              importance: "required",
            },
          ],
          issues: [],
          guidance: ["Import quality is strong enough for scoring review."],
        },
        manualMapping: {
          mappings: [],
        },
        importProfile: {
          status: "none",
          matchedMappings: 0,
          totalMappings: 0,
          message: "No reusable import profile was applied.",
        },
        uploadedAt: "2026-06-01T00:00:00.000Z",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    };
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(responsePayload), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;

    const file = new File(["APN,Total Due\n123-45-678,100"], "maricopa.csv", { type: "text/csv" });
    const result = await createDataset("test-token", { file, sourceLabel: " Maricopa sale " });

    expect(result).toEqual(responsePayload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/datasets");
    expect(init.method).toBe("POST");
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer test-token");
    expect(headers.has("Content-Type")).toBe(false);
    expect(init.body).toBeInstanceOf(FormData);
    const body = init.body as FormData;
    expect(body.get("sourceLabel")).toBe("Maricopa sale");
    expect(body.get("file")).toBeInstanceOf(File);
  });

  it("returns safe API errors for rejected uploads", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "dataset_upload_too_large",
            message: "CSV upload cannot exceed 1 MiB.",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const file = new File(["x".repeat(10)], "oversized.csv", { type: "text/csv" });

    await expect(createDataset("test-token", { file })).rejects.toMatchObject<ApiClientError>({
      status: 400,
      code: "dataset_upload_too_large",
      message: "CSV upload cannot exceed 1 MiB.",
    });
  });

  it("saves manual dataset mappings with bearer auth", async () => {
    const responsePayload = {
      dataset: {
        id: "dataset-1",
        originalFilename: "county.csv",
        sourceType: "manual_csv",
        status: "validated",
        rowCount: 1,
        columnCount: 2,
        headers: ["Tax Balance", "County Value"],
        validationSummary: {
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          warnings: [],
          errors: [],
        },
        importSummary: {
          adapterMatched: false,
          adapterId: "generic_csv",
          adapterName: "Generic CSV normalization",
          source: "generic_csv",
          confidence: "low",
          fallbackUsed: true,
          mappedFields: [],
          warnings: [],
        },
        readinessSummary: {
          status: "partial",
          score: 55,
          scoringRecommended: true,
          fieldCoverage: [],
          issues: [],
          guidance: [],
        },
        manualMapping: {
          updatedAt: "2026-06-01T00:00:00.000Z",
          mappings: [
            {
              targetField: "lien_amount",
              sourceColumn: "Tax Balance",
              source: "manual",
              updatedAt: "2026-06-01T00:00:00.000Z",
            },
          ],
        },
        importProfile: {
          status: "none",
          matchedMappings: 0,
          totalMappings: 0,
          message: "No reusable import profile was applied.",
        },
        uploadedAt: "2026-06-01T00:00:00.000Z",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      availableColumns: ["Tax Balance", "County Value"],
      manualMapping: {
        updatedAt: "2026-06-01T00:00:00.000Z",
        mappings: [
          {
            targetField: "lien_amount",
            sourceColumn: "Tax Balance",
            source: "manual",
            updatedAt: "2026-06-01T00:00:00.000Z",
          },
        ],
      },
    };
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;

    const result = await saveDatasetManualMapping("test-token", "dataset-1", {
      mappings: {
        lien_amount: "Tax Balance",
        estimated_value: "County Value",
      },
    });

    expect(result).toEqual(responsePayload);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/datasets/dataset-1/mapping");
    expect(init.method).toBe("PATCH");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer test-token");
    expect(JSON.parse(init.body as string)).toEqual({
      mappings: {
        lien_amount: "Tax Balance",
        estimated_value: "County Value",
      },
    });
  });

  it("calls import profile endpoints with bearer auth", async () => {
    const profile = {
      id: "profile-1",
      name: "County import",
      adapterId: "generic_csv",
      adapterName: "Generic CSV normalization",
      mappings: [{ targetField: "lien_amount", sourceColumn: "Tax Balance" }],
      applicability: {
        headerSignature: ["county value", "tax balance"],
        sourceColumns: ["tax balance"],
        adapterId: "generic_csv",
        columnCount: 2,
      },
      createdFromDatasetId: "dataset-1",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ profiles: [profile] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ profile }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            dataset: {
              id: "dataset-1",
              originalFilename: "county.csv",
              sourceType: "manual_csv",
              status: "validated",
              rowCount: 1,
              columnCount: 2,
              headers: ["Tax Balance", "County Value"],
              validationSummary: { totalRows: 1, validRows: 1, invalidRows: 0, warnings: [], errors: [] },
              importSummary: {
                adapterMatched: false,
                adapterId: "generic_csv",
                adapterName: "Generic CSV normalization",
                source: "generic_csv",
                confidence: "low",
                fallbackUsed: true,
                mappedFields: [],
                warnings: [],
              },
              readinessSummary: {
                status: "partial",
                score: 55,
                scoringRecommended: true,
                fieldCoverage: [],
                issues: [],
                guidance: [],
              },
              manualMapping: {
                mappings: [
                  {
                    targetField: "lien_amount",
                    sourceColumn: "Tax Balance",
                    source: "import_profile",
                    updatedAt: "2026-06-01T00:00:00.000Z",
                  },
                ],
              },
              importProfile: {
                status: "user_applied",
                profileId: "profile-1",
                profileName: "County import",
                confidence: "medium",
                matchedMappings: 1,
                totalMappings: 1,
                message: "Import profile was applied.",
                appliedAt: "2026-06-01T00:00:00.000Z",
              },
              uploadedAt: "2026-06-01T00:00:00.000Z",
              createdAt: "2026-06-01T00:00:00.000Z",
              updatedAt: "2026-06-01T00:00:00.000Z",
            },
            appliedProfile: profile,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    globalThis.fetch = fetchMock;

    await expect(listImportProfiles("test-token")).resolves.toEqual({ profiles: [profile] });
    await expect(saveDatasetImportProfile("test-token", "dataset-1", { name: "County import" })).resolves.toEqual({
      profile,
    });
    await expect(applyDatasetImportProfile("test-token", "dataset-1", { profileId: "profile-1" })).resolves.toMatchObject({
      appliedProfile: profile,
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:4000/datasets/import-profiles",
      "http://localhost:4000/datasets/dataset-1/import-profile",
      "http://localhost:4000/datasets/dataset-1/import-profile/apply",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual({ name: "County import" });
    expect(JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string)).toEqual({ profileId: "profile-1" });
    expect((fetchMock.mock.calls[2]?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("fetches portfolio summaries with bearer auth", async () => {
    const responsePayload = {
      totalTrackedItems: 1,
      activeItems: 1,
      readyItems: 0,
      acquiredItems: 0,
      statusCounts: [
        { status: "tracked", count: 1, isActive: true },
        { status: "reviewing", count: 0, isActive: true },
        { status: "ready", count: 0, isActive: true },
        { status: "acquired", count: 0, isActive: true },
        { status: "closed", count: 0, isActive: false },
        { status: "discarded", count: 0, isActive: false },
      ],
      recentAdditions: [],
      recentStatusChanges: [],
      needsAttention: [],
      generatedAt: "2026-06-01T00:00:00.000Z",
    };
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;

    await expect(getPortfolioSummary("test-token")).resolves.toEqual(responsePayload);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/portfolio/summary");
    expect(init.method).toBe("GET");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("calls notification preference endpoints with bearer auth and structured payloads", async () => {
    const responsePayload = {
      preferences: {
        id: "prefs-1",
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
        ],
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      categories: [],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(responsePayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(responsePayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    globalThis.fetch = fetchMock;

    await expect(getNotificationPreferences("test-token")).resolves.toEqual(responsePayload);
    await expect(
      updateNotificationPreferences("test-token", { rules: responsePayload.preferences.rules }),
    ).resolves.toEqual(responsePayload);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:4000/notification-preferences");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://localhost:4000/notification-preferences");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("PATCH");
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ rules: responsePayload.preferences.rules }));
    expect((fetchMock.mock.calls[1]?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("retrieves notification delivery history with bearer auth", async () => {
    const responsePayload = {
      deliveries: [
        {
          id: "delivery-1",
          alertType: "scoring_job_failed",
          channel: "email",
          status: "sent",
          deliveryMode: "delivery_eligible",
          cadence: "immediate",
          subject: "Scoring failed",
          summary: "Refresh failed safely.",
          attempts: 1,
          preparedAt: "2026-06-06T00:00:00.000Z",
          sentAt: "2026-06-06T00:01:00.000Z",
          updatedAt: "2026-06-06T00:01:00.000Z",
        },
      ],
      digestBatches: [],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;

    await expect(listNotificationDeliveryHistory("test-token")).resolves.toEqual(responsePayload);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:4000/notification-deliveries");
    expect((fetchMock.mock.calls[0]?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("calls saved-view endpoints with bearer auth and structured payloads", async () => {
    const view = {
      id: "view-1",
      surface: "portfolio",
      name: "Ready review",
      filters: { statuses: ["ready"] },
      sort: { key: "tracked_at", direction: "desc" },
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ views: [view], queues: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ view }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ view, surface: "portfolio", items: [], summary: { totalTrackedItems: 0 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    globalThis.fetch = fetchMock;

    await expect(listSavedViews("test-token")).resolves.toEqual({ views: [view], queues: [] });
    await expect(
      createSavedView("test-token", {
        surface: "portfolio",
        name: "Ready review",
        filters: { statuses: ["ready"] },
        sort: { key: "tracked_at", direction: "desc" },
      }),
    ).resolves.toEqual({ view });
    await expect(applySavedView("test-token", "view-1")).resolves.toMatchObject({ surface: "portfolio" });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:4000/saved-views");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://localhost:4000/saved-views");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(
      JSON.stringify({
        surface: "portfolio",
        name: "Ready review",
        filters: { statuses: ["ready"] },
        sort: { key: "tracked_at", direction: "desc" },
      }),
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe("http://localhost:4000/saved-views/view-1/apply");
    expect((fetchMock.mock.calls[2]?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("calls comparison endpoints with bearer auth and structured payloads", async () => {
    const comparisonItem = {
      id: "comparison-1",
      workspaceId: "default",
      datasetId: "dataset-1",
      scoredRecordId: "score-1",
      sourceType: "watchlist",
      sourceWatchlistItemId: "watch-1",
      decision: "undecided",
      decisionUpdatedAt: "2026-06-01T00:00:00.000Z",
      sourceRowNumber: 2,
      normalizedFields: {
        parcelId: "A-100",
        lienAmount: 1000,
        estimatedValue: 12000,
        propertyTypeCategory: "residential",
      },
      investmentScore: 82,
      riskScore: 18,
      liquidityScore: 70,
      redemptionProbability: 0.8,
      confidenceScore: 88,
      valueCoverageRatio: 12,
      flags: [],
      reasoning: ["Strong value coverage."],
      scoredAt: "2026-06-01T00:00:00.000Z",
      addedAt: "2026-06-01T00:00:00.000Z",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const watchlistItem = {
      id: "watch-1",
      datasetId: "dataset-1",
      scoredRecordId: "score-1",
      sourceRowNumber: 2,
      normalizedFields: comparisonItem.normalizedFields,
      investmentScore: 82,
      riskScore: 18,
      liquidityScore: 70,
      redemptionProbability: 0.8,
      confidenceScore: 88,
      valueCoverageRatio: 12,
      flags: [],
      reasoning: ["Strong value coverage."],
      scoredAt: "2026-06-01T00:00:00.000Z",
      addedAt: "2026-06-01T02:00:00.000Z",
      createdAt: "2026-06-01T02:00:00.000Z",
      updatedAt: "2026-06-01T02:00:00.000Z",
    };
    const portfolioItem = {
      id: "portfolio-1",
      datasetId: "dataset-1",
      scoredRecordId: "score-1",
      sourceWatchlistItemId: "watch-1",
      status: "tracked",
      statusUpdatedAt: "2026-06-01T03:00:00.000Z",
      sourceRowNumber: 2,
      normalizedFields: comparisonItem.normalizedFields,
      investmentScore: 82,
      riskScore: 18,
      liquidityScore: 70,
      redemptionProbability: 0.8,
      confidenceScore: 88,
      valueCoverageRatio: 12,
      flags: [],
      reasoning: ["Strong value coverage."],
      scoredAt: "2026-06-01T00:00:00.000Z",
      trackedAt: "2026-06-01T03:00:00.000Z",
      createdAt: "2026-06-01T03:00:00.000Z",
      updatedAt: "2026-06-01T03:00:00.000Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [comparisonItem] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ item: comparisonItem, alreadyExists: false }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            item: {
              ...comparisonItem,
              decision: "move_forward",
              note: "Verify before bid.",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            events: [
              {
                id: "history-1",
                relatedEntityType: "comparison_item",
                relatedEntityId: "comparison-1",
                eventType: "comparison_decision_changed",
                previousDecision: "undecided",
                newDecision: "move_forward",
                noteSnapshot: "Verify before bid.",
                createdAt: "2026-06-01T01:00:00.000Z",
                updatedAt: "2026-06-01T01:00:00.000Z",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            destination: "watchlist",
            item: watchlistItem,
            alreadyExists: false,
            historyEvent: {
              id: "history-2",
              relatedEntityType: "comparison_item",
              relatedEntityId: "comparison-1",
              eventType: "comparison_handoff_to_watchlist",
              previousDecision: "move_forward",
              newDecision: "move_forward",
              noteSnapshot: "Verify before bid.",
              metadata: {
                targetEntityType: "watchlist_item",
                targetEntityId: "watch-1",
                handoffResult: "created",
              },
              createdAt: "2026-06-01T02:00:00.000Z",
              updatedAt: "2026-06-01T02:00:00.000Z",
            },
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            destination: "portfolio",
            item: portfolioItem,
            alreadyExists: false,
            historyEvent: {
              id: "history-3",
              relatedEntityType: "comparison_item",
              relatedEntityId: "comparison-1",
              eventType: "comparison_handoff_to_portfolio",
              previousDecision: "move_forward",
              newDecision: "move_forward",
              noteSnapshot: "Verify before bid.",
              metadata: {
                targetEntityType: "portfolio_item",
                targetEntityId: "portfolio-1",
                handoffResult: "created",
                portfolioStatus: "tracked",
              },
              createdAt: "2026-06-01T03:00:00.000Z",
              updatedAt: "2026-06-01T03:00:00.000Z",
            },
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ deleted: true, id: "comparison-1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    globalThis.fetch = fetchMock;

    await expect(listComparison("test-token")).resolves.toEqual({ items: [comparisonItem] });
    await expect(addComparisonItem("test-token", { watchlistItemId: "watch-1" })).resolves.toMatchObject({
      alreadyExists: false,
    });
    await expect(
      updateComparisonItem("test-token", "comparison-1", {
        decision: "move_forward",
        note: "Verify before bid.",
      }),
    ).resolves.toMatchObject({ item: { decision: "move_forward", note: "Verify before bid." } });
    await expect(listComparisonHistory("test-token", "comparison-1")).resolves.toMatchObject({
      events: [{ eventType: "comparison_decision_changed", noteSnapshot: "Verify before bid." }],
    });
    await expect(handoffComparisonToWatchlist("test-token", "comparison-1")).resolves.toMatchObject({
      destination: "watchlist",
      item: { id: "watch-1" },
      historyEvent: { eventType: "comparison_handoff_to_watchlist" },
    });
    await expect(handoffComparisonToPortfolio("test-token", "comparison-1", { status: "tracked" })).resolves.toMatchObject({
      destination: "portfolio",
      item: { id: "portfolio-1" },
      historyEvent: { eventType: "comparison_handoff_to_portfolio" },
    });
    await expect(removeComparisonItem("test-token", "comparison-1")).resolves.toEqual({
      deleted: true,
      id: "comparison-1",
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:4000/comparison",
      "http://localhost:4000/comparison",
      "http://localhost:4000/comparison/comparison-1",
      "http://localhost:4000/comparison/comparison-1/history",
      "http://localhost:4000/comparison/comparison-1/handoff/watchlist",
      "http://localhost:4000/comparison/comparison-1/handoff/portfolio",
      "http://localhost:4000/comparison/comparison-1",
    ]);
    expect(fetchMock.mock.calls.map(([, init]) => (init?.headers as Headers).get("Authorization"))).toEqual([
      "Bearer test-token",
      "Bearer test-token",
      "Bearer test-token",
      "Bearer test-token",
      "Bearer test-token",
      "Bearer test-token",
      "Bearer test-token",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual({ watchlistItemId: "watch-1" });
    expect(JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string)).toEqual({
      decision: "move_forward",
      note: "Verify before bid.",
    });
    expect(fetchMock.mock.calls[4]?.[1]?.method).toBe("POST");
    expect(fetchMock.mock.calls[5]?.[1]?.method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[5]?.[1]?.body as string)).toEqual({ status: "tracked" });
    expect(fetchMock.mock.calls[6]?.[1]?.method).toBe("DELETE");
  });
});
