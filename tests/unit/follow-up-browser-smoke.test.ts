// @vitest-environment jsdom
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../apps/web/src/App.js";
import type {
  FollowUpDueState,
  FollowUpResponse,
  FollowUpTargetEntityType,
} from "@tax-lien/types";

const sessionStorageKey = "tax-lien-review-session";
const timestamp = "2026-07-07T12:00:00.000Z";
const evidencePath =
  process.env.FOLLOW_UP_BROWSER_SMOKE_EVIDENCE ?? "/tmp/tax-lien-follow-up-browser-smoke.json";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

describe("follow-up browser lifecycle smoke", () => {
  it("drives follow-up update, complete, and snooze controls through the authenticated browser shell", async () => {
    sessionStorage.setItem(
      sessionStorageKey,
      JSON.stringify({
        token: "test-token",
        user: userPayload(),
      }),
    );

    const scenario = createScenario();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      return jsonResponse(await scenario.handle(url.pathname, init));
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderApp();
    await waitForText("Acme Workspace");

    clickButton("Portfolio (1)");
    await waitForText("SMOKE-001");
    await waitForText("Due today");

    await waitForButtonEnabled("Update");
    clickButton("Update");
    await waitForText("Follow-up saved.");
    await waitForText("Due today");

    clickButton("Complete");
    await waitForText("Follow-up completed.");
    await waitForText("Completed");

    await waitForButtonEnabled("Snooze");
    setInputValue("Snooze to", "2026-07-14");
    clickButton("Snooze");
    await waitForText("Follow-up snoozed.");
    await waitForText("Upcoming");
    await waitForText("Snoozed from");

    const followUpCalls = fetchMock.mock.calls
      .map(([input, init]) => ({ url: new URL(String(input)), init }))
      .filter(({ url }) => url.pathname.startsWith("/follow-ups/portfolio_item/portfolio-1"));

    expect(followUpCalls.map(({ init }) => init?.method ?? "GET")).toEqual([
      "GET",
      "PUT",
      "POST",
      "POST",
    ]);
    expect(
      followUpCalls.every(({ init }) => (init?.headers as Headers | undefined)?.get("Authorization") === "Bearer test-token"),
    ).toBe(true);
    expect(
      followUpCalls.every(({ init }) => (init?.headers as Headers | undefined)?.get("X-Workspace-Id") === "workspace-1"),
    ).toBe(true);
    expect(scenario.followUp?.dueState).toBe("upcoming");
    expect(scenario.followUp?.dueAt).toBe("2026-07-14T12:00:00.000Z");
    expect(scenario.followUp?.lastReminderState).toBe("none");
    expect(scenario.followUp?.previousDueAt).toBe("2026-07-07T12:00:00.000Z");

    const evidence = {
      generatedAt: new Date().toISOString(),
      proofType: "browser-like-jsdom",
      target: "portfolio_item/portfolio-1",
      renderedStates: ["due", "completed", "upcoming"],
      actions: ["update", "complete", "snooze"],
      followUpRequests: followUpCalls.map(({ url, init }) => ({
        method: init?.method ?? "GET",
        path: url.pathname,
        hasAuthorization: (init?.headers as Headers | undefined)?.has("Authorization") ?? false,
        workspaceHeader: (init?.headers as Headers | undefined)?.get("X-Workspace-Id") ?? null,
      })),
      finalDueAt: scenario.followUp?.dueAt,
      finalDueState: scenario.followUp?.dueState,
      finalReminderState: scenario.followUp?.lastReminderState,
      previousDueAt: scenario.followUp?.previousDueAt,
      note: "Synthetic local smoke data only; no production data or secrets.",
    };
    await mkdir(dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
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
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if (document.body.textContent?.includes(text)) {
      return;
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
  throw new Error(`Timed out waiting for text: ${text}\nRendered text: ${document.body.textContent ?? ""}`);
}

async function waitForButtonEnabled(label: string): Promise<void> {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const button = buttonByLabel(label);
    if (!button.disabled) {
      return;
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
  throw new Error(`Timed out waiting for enabled button: ${label}`);
}

function clickButton(label: string): void {
  const button = buttonByLabel(label);
  if (button.disabled) {
    throw new Error(`Button is disabled: ${label}`);
  }
  act(() => {
    button.click();
  });
}

function setInputValue(label: string, value: string): void {
  const input = inputByLabel(label);
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  if (!nativeSetter) {
    throw new Error("Unable to set input value through native setter.");
  }
  act(() => {
    nativeSetter.call(input, value);
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function buttonByLabel(label: string): HTMLButtonElement {
  const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === label);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${label}`);
  }
  return button;
}

function inputByLabel(label: string): HTMLInputElement {
  const labelElement = [...document.querySelectorAll("label")].find((candidate) =>
    candidate.textContent?.trim().startsWith(label),
  );
  const input = labelElement?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Input not found for label: ${label}`);
  }
  return input;
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function createScenario() {
  let followUp: FollowUpResponse | null = followUpPayload({
    dueAt: "2026-07-07T12:00:00.000Z",
    dueState: "due",
    note: "Browser smoke follow-up proof.",
  });

  return {
    get followUp() {
      return followUp;
    },
    async handle(pathname: string, init?: RequestInit): Promise<unknown> {
      const method = init?.method ?? "GET";
      if (pathname === "/auth/me") {
        return { user: userPayload() };
      }
      if (pathname === "/workspaces") {
        return { workspaces: [workspacePayload()], currentWorkspaceId: "workspace-1" };
      }
      if (pathname === "/workspaces/current/members") {
        return { members: [memberPayload()] };
      }
      if (pathname === "/datasets") {
        return { datasets: [] };
      }
      if (pathname === "/watchlist" || pathname === "/comparison") {
        return { items: [] };
      }
      if (pathname === "/portfolio") {
        return { items: [portfolioItemPayload()] };
      }
      if (pathname === "/portfolio/summary") {
        return portfolioSummaryPayload();
      }
      if (pathname === "/alerts") {
        return { alerts: [], unreadCount: 0 };
      }
      if (pathname === "/saved-views") {
        return { views: [], queues: [] };
      }
      if (pathname === "/notification-preferences") {
        return { preferences: notificationPreferencesPayload(), categories: [] };
      }
      if (pathname === "/notification-deliveries") {
        return { deliveries: [], digestBatches: [] };
      }
      if (pathname === "/my-work") {
        return emptyMyWorkPayload();
      }
      if (pathname === "/comments/portfolio_item/portfolio-1") {
        return { comments: [], unreadCount: 0 };
      }
      if (pathname === "/review-checklists/portfolio_item/portfolio-1") {
        return reviewChecklistPayload();
      }
      if (pathname === "/follows/portfolio_item/portfolio-1") {
        return { targetEntityType: "portfolio_item", targetEntityId: "portfolio-1", following: false, followerCount: 0 };
      }
      if (pathname === "/assignments/portfolio_item/portfolio-1") {
        return { targetEntityType: "portfolio_item", targetEntityId: "portfolio-1", assignment: null };
      }
      if (pathname === "/follow-ups/portfolio_item/portfolio-1" && method === "GET") {
        return followUpState(followUp);
      }
      if (pathname === "/follow-ups/portfolio_item/portfolio-1" && method === "PUT") {
        const input = JSON.parse(String(init?.body ?? "{}")) as { dueAt: string; note?: string | null };
        followUp = followUpPayload({
          dueAt: input.dueAt,
          dueState: "due",
          note: input.note ?? undefined,
        });
        return { followUp, changed: true };
      }
      if (pathname === "/follow-ups/portfolio_item/portfolio-1/complete" && method === "POST") {
        followUp = followUpPayload({
          ...followUp,
          dueAt: followUp?.dueAt ?? "2026-07-07T12:00:00.000Z",
          dueState: "completed",
          completedAt: "2026-07-07T13:00:00.000Z",
        });
        return { targetEntityType: "portfolio_item", targetEntityId: "portfolio-1", completed: true, followUp };
      }
      if (pathname === "/follow-ups/portfolio_item/portfolio-1/snooze" && method === "POST") {
        const input = JSON.parse(String(init?.body ?? "{}")) as { dueAt: string; note?: string | null };
        followUp = followUpPayload({
          ...followUp,
          dueAt: input.dueAt,
          dueState: "upcoming",
          note: input.note ?? followUp?.note,
          completedAt: undefined,
          previousDueAt: "2026-07-07T12:00:00.000Z",
          snoozedAt: "2026-07-07T13:10:00.000Z",
          lastReminderState: "none",
        });
        return { followUp, changed: true };
      }

      throw new Error(`Unexpected follow-up smoke request: ${method} ${pathname}`);
    },
  };
}

function followUpState(followUp: FollowUpResponse | null) {
  return {
    targetEntityType: "portfolio_item",
    targetEntityId: "portfolio-1",
    dueState: followUp?.dueState ?? "none",
    followUp,
  };
}

function followUpPayload(input: Partial<FollowUpResponse> & { dueAt: string; dueState: FollowUpDueState }): FollowUpResponse {
  return {
    id: "follow-up-1",
    workspaceId: "workspace-1",
    targetEntityType: "portfolio_item" satisfies FollowUpTargetEntityType,
    targetEntityId: "portfolio-1",
    dueAt: input.dueAt,
    dueState: input.dueState,
    note: input.note,
    createdByUserId: "user-1",
    updatedByUserId: "user-1",
    completedAt: input.completedAt,
    completedByUserId: input.completedAt ? "user-1" : undefined,
    snoozedAt: input.snoozedAt,
    snoozedByUserId: input.snoozedAt ? "user-1" : undefined,
    previousDueAt: input.previousDueAt,
    lastReminderAt: input.lastReminderAt,
    lastReminderState: input.lastReminderState ?? "due",
    createdAt: timestamp,
    updatedAt: "2026-07-07T13:10:00.000Z",
  };
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

function portfolioItemPayload() {
  return {
    id: "portfolio-1",
    datasetId: "dataset-1",
    scoredRecordId: "score-1",
    status: "reviewing",
    statusUpdatedAt: timestamp,
    sourceRowNumber: 1,
    normalizedFields: {
      parcelId: "SMOKE-001",
      lienAmount: 1250,
      estimatedValue: 95000,
      propertyType: "Single family",
      propertyTypeCategory: "residential",
      address: "100 Smoke Test Ave",
    },
    investmentScore: 78,
    riskScore: 24,
    liquidityScore: 63,
    redemptionProbability: 0.61,
    confidenceScore: 82,
    valueCoverageRatio: 76,
    flags: [],
    reasoning: ["Seeded only for browser-like follow-up smoke verification."],
    scoredAt: timestamp,
    trackedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function portfolioSummaryPayload() {
  return {
    totalTrackedItems: 1,
    activeItems: 1,
    readyItems: 0,
    acquiredItems: 0,
    statusCounts: [{ status: "reviewing", count: 1, isActive: true }],
    recentAdditions: [],
    recentStatusChanges: [],
    needsAttention: [],
    generatedAt: timestamp,
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

function emptyMyWorkPayload() {
  return {
    workspaceId: "workspace-1",
    generatedAt: timestamp,
    counts: {
      assigned: 0,
      approvals: 0,
      unreadDiscussions: 0,
      unreadMessages: 0,
      following: 0,
      followUps: 0,
      totalActionable: 0,
    },
    queues: {
      assignments: { count: 0, items: [] },
      approvals: { count: 0, items: [] },
      discussions: { count: 0, unreadCount: 0, items: [] },
      following: { count: 0, items: [] },
      followUps: { count: 0, items: [] },
    },
  };
}

function reviewChecklistPayload() {
  return {
    targetEntityType: "portfolio_item",
    targetEntityId: "portfolio-1",
    template: null,
    checklist: null,
    progress: {
      totalItems: 0,
      completedItems: 0,
      incompleteItems: 0,
      requiredItems: 0,
      completedRequiredItems: 0,
      incompleteRequiredItems: 0,
      optionalItems: 0,
      completedOptionalItems: 0,
      incompleteOptionalItems: 0,
      percentComplete: 100,
      requiredPercentComplete: 100,
      readyForDecision: true,
      status: "ready",
    },
  };
}
