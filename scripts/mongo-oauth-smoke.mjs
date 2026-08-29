#!/usr/bin/env node
import {
  OAuthAuthorizationCodeModel,
  OAuthRefreshTokenModel,
  OAuthRevokedAccessTokenModel,
  connectMongo,
  disconnectMongo,
} from "@tax-lien/db";
import { MongoOAuthStore } from "../apps/api/dist/oauth/oauth-store.js";

const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/tax_lien_platform";
const smokeDbName =
  process.env.MONGO_OAUTH_SMOKE_DB_NAME ?? `tax_lien_oauth_smoke_${process.pid}_${Date.now()}`;
const now = new Date();
const expiresAt = new Date(now.getTime() + 60_000);

async function main() {
  await connectMongo({ uri: mongoUri, dbName: smokeDbName, serverSelectionTimeoutMs: 10_000 });
  try {
    const store = new MongoOAuthStore();
    await store.createAuthorizationCode({
      codeHash: "a".repeat(64),
      userId: "oauth-smoke-user",
      email: "oauth-smoke@example.invalid",
      clientId: "https://chatgpt.com/oauth/client.json",
      redirectUri: "https://chatgpt.com/connector_platform_oauth_redirect",
      codeChallenge: "b".repeat(43),
      resource: "https://staging.example.invalid/mcp",
      scopes: ["tax_lien:read"],
      expiresAt,
    });
    assertEqual((await store.findAuthorizationCode("a".repeat(64)))?.userId, "oauth-smoke-user", "code round trip");
    assertEqual(await store.consumeAuthorizationCode("a".repeat(64), now), true, "first code consume");
    assertEqual(await store.consumeAuthorizationCode("a".repeat(64), now), false, "code replay rejection");

    const familyId = "oauth-smoke-family";
    await store.createRefreshToken({
      tokenHash: "c".repeat(64),
      familyId,
      userId: "oauth-smoke-user",
      email: "oauth-smoke@example.invalid",
      clientId: "https://chatgpt.com/oauth/client.json",
      resource: "https://staging.example.invalid/mcp",
      scopes: ["tax_lien:read"],
      expiresAt,
    });
    await store.createRefreshToken({
      tokenHash: "d".repeat(64),
      familyId,
      userId: "oauth-smoke-user",
      email: "oauth-smoke@example.invalid",
      clientId: "https://chatgpt.com/oauth/client.json",
      resource: "https://staging.example.invalid/mcp",
      scopes: ["tax_lien:read"],
      expiresAt,
    });
    assertEqual(await store.consumeRefreshToken("c".repeat(64), now), true, "first refresh consume");
    assertEqual(await store.consumeRefreshToken("c".repeat(64), now), false, "refresh replay rejection");
    await store.revokeRefreshTokenFamily(familyId, now);
    assertPresent((await store.findRefreshToken("d".repeat(64)))?.revokedAt, "refresh family revocation");
    assertEqual(await store.consumeRefreshToken("d".repeat(64), now), false, "revoked rotation rejection");

    await store.revokeAccessToken("oauth-smoke-jti", expiresAt, now);
    assertEqual(await store.isAccessTokenRevoked("oauth-smoke-jti"), true, "access denylist round trip");

    assertEqual(await OAuthAuthorizationCodeModel.countDocuments(), 1, "authorization-code document count");
    assertEqual(await OAuthRefreshTokenModel.countDocuments(), 2, "refresh-token document count");
    assertEqual(await OAuthRevokedAccessTokenModel.countDocuments(), 1, "access-revocation document count");
    console.log(`mongo oauth smoke passed: db=${smokeDbName} atomicCode=true familyRevoked=true accessRevoked=true`);
  } finally {
    await OAuthAuthorizationCodeModel.db.dropDatabase();
    await disconnectMongo();
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

function assertPresent(actual, label) {
  if (!actual) throw new Error(`${label}: expected value to be present`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`mongo oauth smoke failed: ${message}`);
  process.exit(1);
});
