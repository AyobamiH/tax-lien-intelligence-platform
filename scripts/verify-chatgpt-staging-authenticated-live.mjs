import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  OAuthAuthorizationCodeModel,
  OAuthRefreshTokenModel,
  OAuthRevokedAccessTokenModel,
  UserModel,
  WorkspaceMembershipModel,
  WorkspaceModel,
  connectMongo,
  disconnectMongo,
} from "../packages/db/dist/index.js";

const origin = requireCanonicalOrigin(process.env.STAGING_ORIGIN);
const mongoUri = requireSecret("MONGODB_URI");
const signingSecret = requireSecret("MCP_OAUTH_SIGNING_SECRET");
const receiptPath = resolve(
  process.env.AUTHENTICATED_LIVE_RECEIPT_PATH ??
    "artifacts/chatgpt-staging-authenticated-live-receipt.json",
);
const clientId = "https://chatgpt.com/oauth/client.json";
const redirectUri = "https://chatgpt.com/connector_platform_oauth_redirect";
const resource = `${origin}/mcp`;
const scope = "tax_lien:read";
const expectedTools = [
  "list_workspaces",
  "list_datasets",
  "list_dataset_candidates",
  "get_candidate_evidence",
  "compare_candidates",
  "get_decision_brief",
];
const checks = [];
const fixtureTag = `p47-live-${randomUUID()}`;
const password = `P47-${randomBytes(24).toString("base64url")}9a`;
const fixture = { userIds: [], workspaceIds: [], tokenIds: [] };

try {
  await connectMongo({ uri: mongoUri, dbName: "tax_lien_chatgpt_staging", serverSelectionTimeoutMs: 15_000 });
  await cleanupStaleFixtureWorkspaces();
  const principals = await seedFixture();

  const owner = await authorize(principals.owner);
  pass("pkce_authorization_code_exchange");

  const replay = await tokenRequest({
    grant_type: "authorization_code",
    code: owner.code,
    code_verifier: owner.verifier,
    client_id: clientId,
    redirect_uri: redirectUri,
    resource,
  });
  assert(replay.response.status === 400 && replay.body?.error === "invalid_grant", "authorization code replay did not fail closed");
  pass("authorization_code_replay");

  const tools = await mcp(owner.tokens.access_token, "tools/list", {});
  const inventory = tools?.result?.tools ?? [];
  assert(
    JSON.stringify(inventory.map((tool) => tool.name)) === JSON.stringify(expectedTools),
    "deployed tool inventory drifted",
  );
  for (const tool of inventory) {
    assert(tool.annotations?.readOnlyHint === true, `${tool.name} is not read-only`);
    assert(tool.annotations?.destructiveHint === false, `${tool.name} claims destructive behavior`);
    assert(tool.annotations?.idempotentHint === true, `${tool.name} is not idempotent`);
    assert(tool.annotations?.openWorldHint === false, `${tool.name} claims open-world behavior`);
    assert(!/(?:bid|buy|purchase|approve|write|delete|update|legal)/iu.test(tool.name), "forbidden tool name deployed");
  }
  pass("exact_read_only_tool_inventory");

  await assertWorkspaceView(owner.tokens.access_token, principals.workspaceOne.id, "owner", "owner_workspace_isolation");
  const admin = await authorize(principals.admin);
  await assertWorkspaceView(admin.tokens.access_token, principals.workspaceOne.id, "admin", "admin_workspace_isolation");
  const member = await authorize(principals.member);
  await assertWorkspaceView(member.tokens.access_token, principals.workspaceOne.id, "member", "member_workspace_isolation");
  const denied = await authorize(principals.denied);
  const deniedView = await callTool(denied.tokens.access_token, "list_workspaces", {});
  assert(deniedView?.data?.workspaces?.length === 1, "denied principal workspace count drifted");
  assert(
    deniedView.data.workspaces[0]?.id === principals.workspaceDenied.id &&
      deniedView.data.workspaces[0]?.role === "owner" &&
      deniedView.data.workspaces[0]?.id !== principals.workspaceOne.id,
    "denied principal received the target workspace",
  );
  const deniedTarget = await mcp(denied.tokens.access_token, "tools/call", {
    name: "list_datasets",
    arguments: { workspaceId: principals.workspaceOne.id },
  });
  assert(deniedTarget?.result?.isError === true, "denied principal accessed the target workspace");
  pass("denied_workspace_isolation");

  const crossWorkspace = await mcp(member.tokens.access_token, "tools/call", {
    name: "list_datasets",
    arguments: { workspaceId: principals.workspaceTwo.id },
  });
  assert(crossWorkspace?.result?.isError === true, "cross-workspace request did not fail closed");
  assert(crossWorkspace?.result?.structuredContent === undefined, "cross-workspace request disclosed structured data");
  pass("cross_workspace_denial");

  const rotated = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: owner.tokens.refresh_token,
    client_id: clientId,
    resource,
  });
  assert(rotated.response.status === 200 && typeof rotated.body?.refresh_token === "string", "refresh rotation failed");
  rememberTokenId(rotated.body?.access_token);
  const oldReplay = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: owner.tokens.refresh_token,
    client_id: clientId,
    resource,
  });
  const familyRevoked = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: rotated.body.refresh_token,
    client_id: clientId,
    resource,
  });
  assert(oldReplay.response.status === 400 && familyRevoked.response.status === 400, "refresh replay did not revoke the family");
  pass("refresh_rotation_and_replay");

  const revokedResponse = await fetch(`${origin}/oauth/revoke`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form({ token: owner.tokens.access_token, client_id: clientId }),
    signal: AbortSignal.timeout(30_000),
  });
  assert(revokedResponse.status === 200, "access-token revocation failed");
  const revokedMcp = await rawMcp(owner.tokens.access_token, "tools/list", {});
  assert(revokedMcp.response.status === 401 && revokedMcp.body?.error?.code === "oauth_token_revoked", "revoked access token remained active");
  pass("access_token_revocation");

  const expiredTokenId = randomUUID();
  fixture.tokenIds.push(expiredTokenId);
  const expiredToken = jwt.sign(
    {
      sub: principals.owner.id,
      email: principals.owner.email,
      type: "mcp_access",
      client_id: clientId,
      scope,
      jti: expiredTokenId,
    },
    signingSecret,
    { algorithm: "HS256", issuer: origin, audience: resource, expiresIn: -1 },
  );
  const expiredMcp = await rawMcp(expiredToken, "tools/list", {});
  assert(expiredMcp.response.status === 401 && expiredMcp.body?.error?.code === "oauth_token_expired", "expired token did not fail closed");
  pass("expired_access_token");

  const badRedirect = await fetch(
    `${origin}/oauth/authorize?${form({
      response_type: "code",
      client_id: clientId,
      redirect_uri: "https://attacker.example/callback",
      code_challenge: challenge(randomVerifier()),
      code_challenge_method: "S256",
      resource,
      scope,
      state: randomUUID(),
    })}`,
    { redirect: "manual", signal: AbortSignal.timeout(30_000) },
  );
  assert(badRedirect.status === 400, "unregistered redirect was accepted");
  pass("exact_redirect_allowlist");

  const receipt = {
    schemaVersion: "1.0.0",
    receiptKind: "chatgpt_private_staging_authenticated_boundary",
    status: "passed",
    observedAt: new Date().toISOString(),
    origin,
    source: {
      repository: process.env.GITHUB_REPOSITORY
        ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
        : "https://github.com/AyobamiH/tax-lien-intelligence-platform",
      revision: process.env.LIVE_SOURCE_REVISION ?? null,
      workflowRun: process.env.LIVE_WORKFLOW_RUN_URL ?? null,
    },
    fixturePolicy: {
      classification: "ephemeral_test_fixture",
      representedAsUserCountyModelOrDeploymentEvidence: false,
      removedAfterVerification: true,
      fixtureIdentifiersStored: false,
    },
    checks,
    toolInventory: expectedTools,
    permissions: { readOnly: true, writes: false, bidding: false, purchases: false, legalConclusions: false },
    evidencePolicy: {
      responseBodiesStored: false,
      credentialsStored: false,
      authorizationCodesStored: false,
      tokensStored: false,
      emailsStored: false,
      workspaceIdentifiersStored: false,
      payloadsStored: false,
    },
    remainingGates: [
      "private ChatGPT connection with a dedicated real staging user",
      "evidence citation, unknown, heuristic, and prompt-injection cases using approved real staging data",
      "live log-redaction inspection",
      "rollback and recovery",
    ],
  };
  await mkdir(dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  console.log(`Authenticated live staging verification passed: ${checks.length} checks; ephemeral fixture removed.`);
} catch (error) {
  console.error(
    error instanceof Error && error.name === "AuthenticatedLiveVerificationError"
      ? error.message
      : "Authenticated live staging verification failed safely.",
  );
  process.exitCode = 1;
} finally {
  await cleanupFixture();
  await disconnectMongo();
}

async function seedFixture() {
  const roles = ["owner", "admin", "member", "denied", "otherOwner"];
  const hash = await bcrypt.hash(password, 12);
  const created = await UserModel.create(
    roles.map((role) => ({ email: `${fixtureTag}-${role}@example.invalid`, passwordHash: hash })),
  );
  const users = Object.fromEntries(roles.map((role, index) => [role, created[index]]));
  fixture.userIds.push(...created.map((user) => user.id));

  const [workspaceOne, workspaceTwo, workspaceDenied] = await WorkspaceModel.create([
    { name: `[P47 TEST] ${fixtureTag} one`, ownerUserId: users.owner.id },
    { name: `[P47 TEST] ${fixtureTag} two`, ownerUserId: users.otherOwner.id },
    { name: `[P47 TEST] ${fixtureTag} denied`, ownerUserId: users.denied.id },
  ]);
  fixture.workspaceIds.push(workspaceOne.id, workspaceTwo.id, workspaceDenied.id);
  const now = new Date();
  await WorkspaceMembershipModel.create([
    membership(workspaceOne.id, users.owner.id, "owner", users.owner.id, true, now),
    membership(workspaceOne.id, users.admin.id, "admin", users.owner.id, true, now),
    membership(workspaceOne.id, users.member.id, "member", users.owner.id, true, now),
    membership(workspaceTwo.id, users.otherOwner.id, "owner", users.otherOwner.id, true, now),
    membership(workspaceDenied.id, users.denied.id, "owner", users.denied.id, true, now),
  ]);
  return {
    owner: principal(users.owner),
    admin: principal(users.admin),
    member: principal(users.member),
    denied: principal(users.denied),
    workspaceOne: { id: workspaceOne.id },
    workspaceTwo: { id: workspaceTwo.id },
    workspaceDenied: { id: workspaceDenied.id },
  };
}

function membership(workspaceId, userId, role, addedByUserId, isDefault, joinedAt) {
  return { workspaceId, userId, role, status: "active", isDefault, addedByUserId, joinedAt };
}

function principal(user) {
  return { id: user.id, email: user.email, password };
}

async function authorize(principal) {
  const verifier = randomVerifier();
  const state = randomUUID();
  const response = await fetch(`${origin}/oauth/authorize`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: challenge(verifier),
      code_challenge_method: "S256",
      resource,
      scope,
      state,
      email: principal.email,
      password: principal.password,
      decision: "allow",
    }),
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  });
  assert(response.status === 303, "authorization did not return a callback");
  const callback = new URL(response.headers.get("location"));
  assert(callback.origin === "https://chatgpt.com", "authorization callback origin drifted");
  assert(callback.searchParams.get("state") === state && callback.searchParams.get("iss") === origin, "callback binding drifted");
  const code = callback.searchParams.get("code");
  assert(code, "authorization callback omitted the code");
  const token = await tokenRequest({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    client_id: clientId,
    redirect_uri: redirectUri,
    resource,
  });
  assert(token.response.status === 200, "authorization-code exchange failed");
  assert(token.body?.token_type === "Bearer" && token.body?.expires_in === 900 && token.body?.scope === scope, "token response drifted");
  rememberTokenId(token.body.access_token);
  return { verifier, code, tokens: token.body };
}

async function tokenRequest(values) {
  const response = await fetch(`${origin}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form(values),
    signal: AbortSignal.timeout(30_000),
  });
  return { response, body: await response.json() };
}

async function assertWorkspaceView(token, workspaceId, role, name) {
  const data = await callTool(token, "list_workspaces", {});
  assert(data?.data?.workspaces?.length === 1, `${role} workspace count drifted`);
  assert(data.data.workspaces[0]?.id === workspaceId && data.data.workspaces[0]?.role === role, `${role} workspace isolation drifted`);
  pass(name);
}

async function callTool(token, name, args) {
  const response = await mcp(token, "tools/call", { name, arguments: args });
  assert(response?.result?.isError !== true, `${name} returned an error`);
  return response?.result?.structuredContent;
}

async function mcp(token, method, params) {
  const result = await rawMcp(token, method, params);
  assert(result.response.status === 200, `${method} returned ${result.response.status}`);
  return result.body;
}

async function rawMcp(token, method, params) {
  const response = await fetch(`${origin}/mcp`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: randomUUID(), method, params }),
    signal: AbortSignal.timeout(30_000),
  });
  return { response, body: await response.json() };
}

async function cleanupFixture() {
  if (fixture.userIds.length === 0) return;
  const ownedWorkspaces = await WorkspaceModel.find({ ownerUserId: { $in: fixture.userIds } })
    .select({ _id: 1 })
    .exec();
  const workspaceIds = [...new Set([...fixture.workspaceIds, ...ownedWorkspaces.map((workspace) => workspace.id)])];
  await Promise.all([
    OAuthAuthorizationCodeModel.deleteMany({ userId: { $in: fixture.userIds } }).exec(),
    OAuthRefreshTokenModel.deleteMany({ userId: { $in: fixture.userIds } }).exec(),
    OAuthRevokedAccessTokenModel.deleteMany({ tokenId: { $in: fixture.tokenIds } }).exec(),
    WorkspaceMembershipModel.deleteMany({
      $or: [
        { workspaceId: { $in: workspaceIds } },
        { userId: { $in: fixture.userIds } },
        { addedByUserId: { $in: fixture.userIds } },
      ],
    }).exec(),
    WorkspaceModel.deleteMany({ _id: { $in: workspaceIds }, ownerUserId: { $in: fixture.userIds } }).exec(),
    UserModel.deleteMany({ _id: { $in: fixture.userIds } }).exec(),
  ]);
}

async function cleanupStaleFixtureWorkspaces() {
  const stale = await WorkspaceModel.find({
    name: /^P47 Live [A-Fa-f0-9 ]+ Denied Workspace$/,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  })
    .select({ _id: 1, ownerUserId: 1 })
    .exec();
  const orphaned = [];
  for (const workspace of stale) {
    if (!(await UserModel.exists({ _id: workspace.ownerUserId }))) orphaned.push(workspace.id);
  }
  if (orphaned.length === 0) return;
  await WorkspaceMembershipModel.deleteMany({ workspaceId: { $in: orphaned } }).exec();
  await WorkspaceModel.deleteMany({ _id: { $in: orphaned } }).exec();
  console.log(`Removed ${orphaned.length} stale ephemeral fixture workspace(s).`);
}

function rememberTokenId(token) {
  const decoded = jwt.decode(token);
  if (decoded && typeof decoded !== "string" && typeof decoded.jti === "string") fixture.tokenIds.push(decoded.jti);
}

function form(values) {
  return new URLSearchParams(Object.entries(values).map(([key, value]) => [key, String(value)])).toString();
}

function randomVerifier() {
  return randomBytes(48).toString("base64url");
}

function challenge(verifier) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function pass(name) {
  checks.push({ name, status: "passed" });
}

function requireSecret(name) {
  const value = process.env[name];
  assert(typeof value === "string" && value.length > 0, `${name} is required`);
  return value;
}

function requireCanonicalOrigin(value) {
  assert(typeof value === "string" && value.length > 0, "STAGING_ORIGIN is required");
  const url = new URL(value);
  assert(url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash, "STAGING_ORIGIN must be an HTTPS origin");
  assert(
    /^tax-lien-chatgpt-staging\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.workers\.dev$/i.test(url.hostname),
    "STAGING_ORIGIN must be the stable named workers.dev deployment",
  );
  return url.origin;
}

function assert(condition, message) {
  if (!condition) {
    const error = new Error(`Authenticated live staging verification failed: ${message}`);
    error.name = "AuthenticatedLiveVerificationError";
    throw error;
  }
}
