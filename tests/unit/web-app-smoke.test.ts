// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../apps/web/src/App.js";

const sessionStorageKey = "tax-lien-review-session";
const timestamp = "2026-07-07T08:55:00.000Z";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }
  root = null;
  container?.remove();
  container = null;
  window.history.replaceState(null, "", "/");
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("web app browser smoke", () => {
  it("renders the unauthenticated browser shell without a blank root", async () => {
    await renderApp();

    expect(document.body.textContent).toContain("Tax Lien Intelligence Platform");
    expect(document.body.textContent).toContain("Review scored lien opportunities with visible reasoning.");
    expect(document.querySelector("form")).not.toBeNull();
    expect(document.querySelector("#root")?.textContent?.trim()).not.toBe("");
  });

  it("boots the authenticated operator shell in a DOM and loads current workspace context", async () => {
    sessionStorage.setItem(
      sessionStorageKey,
      JSON.stringify({
        token: "test-token",
        user: userPayload(),
      }),
    );
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      return jsonResponse(payloadFor(url.pathname));
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderApp();
    await waitForText("Acme Workspace");
    await waitForText("You are caught up in this workspace.");

    expect(document.body.textContent).toContain("Dataset Review");
    expect(document.body.textContent).toContain("My work");
    expect(document.body.textContent).toContain("Datasets");
    expect(document.body.textContent).toContain("Watchlist (0)");
    expect(document.querySelector("#root")?.textContent?.trim()).not.toBe("");
    expect(fetchMock).toHaveBeenCalled();
    expect(
      fetchMock.mock.calls.some(([, init]) => (init?.headers as Headers | undefined)?.get("Authorization") === "Bearer test-token"),
    ).toBe(true);
  });
});

async function renderApp(): Promise<void> {
  container = document.createElement("div");
  container.id = "root";
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(createElement(App));
  });
}

async function waitForText(text: string): Promise<void> {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    if (document.body.textContent?.includes(text)) {
      return;
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
  throw new Error(`Timed out waiting for text: ${text}`);
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function payloadFor(pathname: string): unknown {
  switch (pathname) {
    case "/auth/me":
      return { user: userPayload() };
    case "/workspaces":
      return { workspaces: [workspacePayload()], currentWorkspaceId: "workspace-1" };
    case "/workspaces/current/members":
      return { members: [memberPayload()] };
    case "/datasets":
      return { datasets: [] };
    case "/watchlist":
    case "/portfolio":
    case "/comparison":
      return { items: [] };
    case "/portfolio/summary":
      return { totals: {}, statuses: [], attention: [] };
    case "/alerts":
      return { alerts: [], unreadCount: 0 };
    case "/saved-views":
      return { views: [], queues: [] };
    case "/notification-preferences":
      return { preferences: notificationPreferencesPayload(), categories: [] };
    case "/notification-deliveries":
      return { deliveries: [], digestBatches: [] };
    case "/my-work":
      return {
        workspaceId: "workspace-1",
        generatedAt: timestamp,
        counts: {
          assigned: 0,
          approvals: 0,
          unreadDiscussions: 0,
          unreadMessages: 0,
          following: 0,
          totalActionable: 0,
        },
        queues: {
          assignments: { count: 0, items: [] },
          approvals: { count: 0, items: [] },
          discussions: { count: 0, unreadCount: 0, items: [] },
          following: { count: 0, items: [] },
        },
      };
    default:
      throw new Error(`Unexpected smoke request: ${pathname}`);
  }
}

function userPayload() {
  return {
    id: "user-1",
    email: "operator@example.com",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function workspacePayload() {
  return {
    id: "workspace-1",
    name: "Acme Workspace",
    role: "owner",
    isDefault: true,
    memberCount: 1,
    permissions: {
      canReadSharedData: true,
      canManageSharedData: true,
      canManageMembers: true,
      canRemoveMembers: true,
      canManageRoles: true,
      canRequestApprovals: true,
      canReviewApprovals: true,
      canExecuteSensitiveActions: true,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function memberPayload() {
  return {
    id: "member-1",
    userId: "user-1",
    email: "operator@example.com",
    role: "owner",
    status: "active",
    isDefault: true,
    joinedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function notificationPreferencesPayload() {
  return {
    id: "preferences-1",
    rules: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
