#!/usr/bin/env node
import { createServer } from "node:http";
import mongoose from "mongoose";
import {
  AlertModel,
  PortfolioItemModel,
  connectMongo,
  disconnectMongo,
} from "@tax-lien/db";
import { createApp } from "../apps/api/dist/app.js";
import { createAlertService } from "../apps/api/dist/alerts/factory.js";
import { createFollowUpService } from "../apps/api/dist/follow-ups/factory.js";

const defaultMongoUri = "mongodb://127.0.0.1:27017/tax_lien_platform";
const mongoUri = process.env.MONGODB_URI ?? defaultMongoUri;
const smokeDbName =
  process.env.MONGO_FOLLOW_UP_SMOKE_DB_NAME ?? `tax_lien_follow_up_smoke_${process.pid}_${Date.now()}`;
const now = new Date();

async function main() {
  await connectMongo({
    uri: mongoUri,
    dbName: smokeDbName,
    serverSelectionTimeoutMs: 5000,
  });

  const server = await listen(createApp());

  try {
    const baseUrl = localUrl(server);
    const owner = await register(baseUrl, "mongo-follow-up-owner@example.invalid");
    const workspaceId = await currentWorkspaceId(baseUrl, owner.token);
    const targetId = await seedPortfolioItem(owner.userId);

    const dueAt = new Date(now.getTime() - 60_000).toISOString();
    const created = await fetchJson(`${baseUrl}/follow-ups/portfolio_item/${targetId}`, {
      method: "PUT",
      headers: authHeaders(owner.token, workspaceId),
      body: JSON.stringify({ dueAt, note: "Mongo smoke due follow-up." }),
    });
    assertEqual(created.followUp?.dueState, "due", "created follow-up due state");
    assertEqual(created.followUp?.targetEntityId, targetId, "created follow-up target");

    const queue = await fetchJson(`${baseUrl}/follow-ups/queue`, {
      headers: authHeaders(owner.token, workspaceId),
    });
    assertEqual(queue.counts?.total, 1, "follow-up queue total before reminder scan");
    assertEqual(queue.items?.[0]?.id, created.followUp.id, "follow-up queue item id");

    const followUpService = createFollowUpService(createAlertService());
    const firstReminder = await followUpService.runReminderScan(now);
    assertEqual(firstReminder.remindersCreated, 1, "first reminder scan created count");
    assertEqual(firstReminder.suppressed, 0, "first reminder scan suppressed count");

    const secondReminder = await followUpService.runReminderScan(now);
    assertEqual(secondReminder.remindersCreated, 0, "repeat reminder scan created count");
    assertEqual(secondReminder.suppressed, 1, "repeat reminder scan suppressed count");

    const alertCount = await AlertModel.countDocuments({
      userId: owner.userId,
      type: "follow_up_due",
      relatedEntityType: "portfolio_item",
      relatedEntityId: targetId,
    }).exec();
    assertEqual(alertCount, 1, "follow_up_due alert count");

    const cleared = await fetchJson(`${baseUrl}/follow-ups/portfolio_item/${targetId}`, {
      method: "DELETE",
      headers: authHeaders(owner.token, workspaceId),
    });
    assertEqual(cleared.cleared, true, "follow-up cleared flag");

    const afterClear = await followUpService.runReminderScan(now);
    assertEqual(afterClear.scanned, 0, "reminder scan after clear");

    const emptyQueue = await fetchJson(`${baseUrl}/follow-ups/queue`, {
      headers: authHeaders(owner.token, workspaceId),
    });
    assertEqual(emptyQueue.counts?.total, 0, "follow-up queue total after clear");

    console.log(
      `mongo follow-up smoke passed: db=${smokeDbName} workspace=${workspaceId} target=${targetId} reminderAlerts=${alertCount}`,
    );
  } finally {
    await close(server);
    await mongoose.connection.dropDatabase();
    await disconnectMongo();
  }
}

async function seedPortfolioItem(userId) {
  const id = new mongoose.Types.ObjectId();
  const createdAt = new Date(now.getTime() - 3_600_000);
  await PortfolioItemModel.create({
    _id: id,
    userId,
    datasetId: new mongoose.Types.ObjectId().toString(),
    scoredRecordId: new mongoose.Types.ObjectId().toString(),
    status: "reviewing",
    statusUpdatedAt: createdAt,
    sourceRowNumber: 1,
    normalizedFields: {
      parcelId: "SMOKE-001",
      lienAmount: 1250,
      estimatedValue: 95000,
      propertyType: "Single family",
      propertyTypeCategory: "residential",
      address: "100 Smoke Test Ave",
    },
    score: {
      investmentScore: 78,
      riskScore: 24,
      liquidityScore: 63,
      redemptionProbability: 0.61,
      confidenceScore: 82,
      valueCoverageRatio: 76,
      flags: [],
      reasoning: ["Seeded only for Mongo-backed follow-up smoke verification."],
    },
    scoredAt: createdAt,
    trackedAt: createdAt,
  });
  return id.toString();
}

async function register(baseUrl, email) {
  const response = await fetchJson(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "StrongPass123" }),
  });
  return {
    token: response.token,
    userId: response.user?.id,
  };
}

async function currentWorkspaceId(baseUrl, token) {
  const response = await fetchJson(`${baseUrl}/workspaces/current`, {
    headers: authHeaders(token),
  });
  return response.workspace?.id;
}

function authHeaders(token, workspaceId) {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
  };
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${init?.method ?? "GET"} ${url} failed with ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server);
    });
    server.once("error", reject);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function localUrl(server) {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("server did not expose a TCP address");
  }
  return `http://127.0.0.1:${address.port}`;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`mongo follow-up smoke failed: ${message}`);
  process.exit(1);
});
