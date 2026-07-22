const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const base = path.join(root, "data", "employee-simulations", "health", "medical-testing-clinic");
const checksum = "940efb5e8ccb1ce23a078e90b78002218851af1322e815f7e2d8040f1300fa69";

process.env.SUPABASE_URL = "https://preview-test.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_preview_test_key_1234567890";
process.env.VERCEL_ENV = "preview";

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(base, name), "utf8"));
const readText = (name) => fs.readFileSync(path.join(base, name), "utf8");
const clone = (value) => JSON.parse(JSON.stringify(value));
const assert = (condition, code) => { if (!condition) throw new Error(code); };

const manifest = readJson("master-package.json");
const row = {
  package_id: "health-medical-testing-clinic-aurora",
  content_version: "0.1.0",
  status: "published",
  fictional: true,
  manifest,
  payload: {
    businessProfile: readJson("business-profile.json"),
    questions: readJson("questions-and-suggested-answers.json"),
    services: readJson("services-catalog.json"),
    operations: readJson("units-hours-channels.json"),
    scheduling: readJson("scheduling-cancellations.json"),
    paymentsAndInsurance: readJson("payments-insurance.json"),
    faq: readJson("faq.json"),
    handoffRules: readJson("human-handoff.json"),
    scenarios: readJson("scenarios-and-expected-responses.json"),
    agentTemplate: { promptText: readText("operational-prompt.md") }
  },
  inventory: {
    servicesCategories: 4,
    services: 12,
    units: 2,
    channels: 4,
    faqItems: 24,
    handoffPriorities: 4,
    handoffQueues: 9,
    handoffLifecycleStates: 8,
    testScenarios: 24,
    promptSections: 13
  },
  checksum_sha256: checksum,
  source_repository: "leon337/predixai-brand",
  source_branch: "ptp-web-2-workforce-k6-questionnaire-r2",
  source_commit_sha: "fixture",
  source_pr: 9,
  published_at: "2026-07-22T15:36:32.373607Z",
  updated_at: "2026-07-22T15:42:03.904114Z"
};

const originalFetch = global.fetch;
let upstreamRows = [row];
global.fetch = async () => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(upstreamRows)
});

const handler = require(path.join(root, "api", "workforce-catalog-v2.js"));

const invoke = async (method = "GET", query = {}) => {
  const headers = {};
  let statusCode = 200;
  let body = null;
  let ended = false;
  const request = { method, query, headers: {} };
  const response = {
    setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
    status(code) { statusCode = code; return this; },
    json(value) { body = value; ended = true; return this; },
    end() { ended = true; return this; }
  };
  await handler(request, response);
  return { statusCode, body, headers, ended };
};

const query = {
  packageId: "health-medical-testing-clinic-aurora",
  contentVersion: "0.1.0"
};

(async () => {
  const result = await invoke("GET", query);
  assert(result.statusCode === 200, `API_STATUS_${result.statusCode}`);
  assert(result.body?.status === "READY", "API_NOT_READY");
  assert(result.body?.source === "supabase_published_package", "API_SOURCE_INVALID");
  assert(result.body?.checksum?.value === checksum, "API_CHECKSUM_INVALID");
  assert(Object.keys(result.body?.payload || {}).length === 10, "API_PAYLOAD_COMPONENT_COUNT_INVALID");
  assert(result.headers["x-predixai-catalog-source"] === "supabase_published_package", "API_SOURCE_HEADER_INVALID");

  const head = await invoke("HEAD", query);
  assert(head.statusCode === 200 && head.body === null && head.ended, "API_HEAD_INVALID");

  const serialized = clone(row);
  serialized.fictional = "true";
  serialized.manifest = JSON.stringify(serialized.manifest);
  serialized.payload = JSON.stringify(serialized.payload);
  serialized.inventory = JSON.stringify(Object.fromEntries(Object.entries(serialized.inventory).map(([key, value]) => [key, String(value)])));
  upstreamRows = [serialized];
  const normalized = await invoke("GET", query);
  assert(normalized.statusCode === 200, `API_SERIALIZED_STATUS_${normalized.statusCode}`);
  assert(normalized.body?.status === "READY", "API_SERIALIZED_NOT_READY");
  assert(normalized.body?.checksum?.value === checksum, "API_SERIALIZED_CHECKSUM_INVALID");

  const tampered = clone(row);
  tampered.checksum_sha256 = "0".repeat(64);
  upstreamRows = [tampered];
  const blocked = await invoke("GET", query);
  assert(blocked.statusCode === 409, "API_TAMPER_NOT_BLOCKED");
  assert(blocked.body?.error === "PACKAGE_INTEGRITY_FAILED", "API_TAMPER_ERROR_INVALID");
  assert(blocked.body?.failedChecks?.includes("checksum"), "API_PREVIEW_DIAGNOSTIC_MISSING");

  console.log("K7_8_2A_14_API_SUPABASE_DOCUMENT=PASS");
  console.log("K7_8_2A_14_API_RPC_SERIALIZATION_NORMALIZATION=PASS");
  console.log("K7_8_2A_14_API_INVENTORY_VALIDATION=PASS");
  console.log("K7_8_2A_14_API_HEAD=PASS");
  console.log("K7_8_2A_14_API_FAIL_CLOSED=PASS");
  console.log("K7_8_2A_14_API_PREVIEW_DIAGNOSTIC=PASS");
})().catch((error) => {
  console.error(`K7_8_2A_14_API_CONTRACT=FAIL:${error.message}`);
  process.exitCode = 1;
}).finally(() => {
  global.fetch = originalFetch;
});
