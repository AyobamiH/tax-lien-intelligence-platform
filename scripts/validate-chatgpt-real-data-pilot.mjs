import fs from "node:fs";

const workflowPath = ".github/workflows/chatgpt-real-data-pilot.yml";
const runnerPath = "scripts/ingestion/chatgpt-real-data-pilot.mjs";
const integrationTestPath = "scripts/test-chatgpt-real-data-pilot-integration.mjs";
const inventoryPath = "docs/engine/data-source-inventory.json";

const workflow = fs.readFileSync(workflowPath, "utf8");
const runner = fs.readFileSync(runnerPath, "utf8");
const integrationTest = fs.readFileSync(integrationTestPath, "utf8");
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));

const failures = [];
const requireText = (condition, message) => {
  if (!condition) failures.push(message);
};

requireText(/on:\s*\n\s*workflow_dispatch:/u.test(workflow), "real-data pilot must be workflow_dispatch only");
requireText(!/\n\s*push:/u.test(workflow), "real-data pilot must not have a push trigger");
requireText(!/\n\s*schedule:/u.test(workflow), "real-data pilot must not have a schedule trigger");
requireText(/permissions:\s*\n\s*contents: read/u.test(workflow), "real-data pilot GitHub token must be contents:read only");
requireText(/environment: chatgpt-real-data-pilot/u.test(workflow), "real-data pilot must use the protected chatgpt-real-data-pilot environment");
requireText(/image: mongo:8\.0/u.test(workflow), "real-data pilot must provide disposable Mongo for synthetic integration tests");
requireText(/persist-credentials: false/u.test(workflow), "real-data pilot checkout must not persist credentials");
requireText(/npm ci --ignore-scripts/u.test(workflow), "real-data pilot install must disable lifecycle scripts");
requireText(/CHATGPT_PILOT_DATA_B64: \$\{\{ secrets\.CHATGPT_PILOT_DATA_B64 \}\}/u.test(workflow), "pilot CSV must enter through a protected secret, not the repository");
requireText(/PILOT_TRAINING_PERMITTED: "false"/u.test(workflow), "pilot workflow must hard-code training as prohibited");
requireText(/rights_basis:/u.test(workflow) && /written_authorization/u.test(workflow), "pilot workflow must capture the rights basis explicitly");
requireText(/Archive sanitized pilot receipt only/u.test(workflow), "pilot workflow must archive only the sanitized receipt");
requireText(!/artifacts\/.*\.csv/iu.test(workflow), "pilot workflow must not archive CSV data");
requireText(!/curl\s|wget\s/iu.test(workflow), "pilot workflow must not fetch data from an unreviewed remote URL");

for (const confirmation of [
  "owner_identity_confirmed",
  "rights_confirmed",
  "pii_minimization_confirmed",
  "no_training_confirmed",
]) {
  requireText(workflow.includes(`${confirmation}:`), `missing ${confirmation} workflow ceremony`);
}

requireText(runner.includes("PILOT_MAX_RAW_BYTES = 32 * 1024"), "pilot input must have a small byte bound");
requireText(runner.includes("PILOT_MAX_ROWS = 250"), "pilot input must have a bounded row count");
requireText(runner.includes('dbName: "tax_lien_chatgpt_staging"'), "pilot must target the dedicated staging database");
requireText(runner.includes("validateInventorySource"), "pilot runtime must validate the selected inventory source");
requireText(runner.includes('decision === "blocked" && manifest.rightsBasis !== "written_authorization"'), "blocked inventory sources must require written authorization");
requireText(runner.includes("directIdentifierFragments"), "pilot must minimize direct identifiers before persistence");
requireText(runner.includes("not-county-authority"), "pilot provenance must preserve the user-upload authority limitation");
requireText(runner.includes("createDatasetService"), "pilot must reuse the existing dataset service");
requireText(runner.includes("createScoringService"), "pilot must reuse the existing scoring service");
requireText(runner.includes('INTELLIGENCE_SERVICE_ENABLED: "false"'), "pilot scoring must not imply calibrated/versioned intelligence during the pre-model evaluation");
requireText(runner.includes("credentialsStored: false"), "pilot receipt must declare credential non-retention");
requireText(runner.includes("rawRowsStored: false"), "pilot receipt must declare raw-row non-retention");
requireText(runner.includes("modelTrainingPermitted: false"), "pilot receipt must declare model training prohibited");
requireText(runner.includes("label.length > 120"), "pilot source label must respect the persisted dataset contract");
requireText(!runner.includes("...process.env"), "pilot scoring worker must not inherit the source dataset or unrelated secrets");
requireText(runner.includes("buildScoringWorkerEnvironment"), "pilot scoring worker must use an explicit environment allowlist");
requireText(runner.includes("_id: input.jobId"), "pilot must verify the exact scoring job instead of a latest-job heuristic");
requireText(runner.includes("worker.status === 0") && runner.includes("waitForScoringJob"), "pilot must tolerate the deployed worker winning the scoring claim race and still verify terminal state");
requireText(runner.includes("verifyPilotJobSummary") && runner.includes("intelligenceNotConfiguredCount"), "pilot must prove the exact job used deterministic pre-model evaluation");
requireText(integrationTest.includes("dropDatabase"), "pilot boundary must include a disposable Mongo integration test");
requireText(integrationTest.includes('new Set(["127.0.0.1", "localhost"])'), "pilot integration test must refuse non-local MongoDB targets");
requireText(integrationTest.includes("idempotent rerun must retain exactly one dataset"), "pilot integration test must prove exact dataset reuse");
requireText(integrationTest.includes("exact completed-job evidence"), "pilot integration test must prove exact completed scoring-job evidence on reuse");
requireText(integrationTest.includes("must discard"), "pilot integration test must prove identifier minimization after persistence");

const userUpload = inventory.sources?.find((source) => source.id === "platform-user-upload");
requireText(Boolean(userUpload), "data-source inventory must contain platform-user-upload");
requireText(userUpload?.productionDecision?.status === "evidence_only", "platform-user-upload must remain evidence_only");
requireText(userUpload?.terms?.status === "conditional", "platform-user-upload terms must remain conditional");
requireText(inventory.policies?.userUploadsMayEstablishOfficialAuthority === false, "user uploads must never establish official authority");

if (failures.length > 0) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("ChatGPT protected real-data pilot boundary validated.");
