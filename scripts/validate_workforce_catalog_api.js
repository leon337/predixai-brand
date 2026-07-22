const assert = require("node:assert/strict");

process.env[["SUPABASE", "URL"].join("_")] = "https://example-project.supabase.co";
process.env[["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_")] = "test-only-server-secret-without-real-credentials";

const handler = require("../api/workforce-catalog.js");

const checksum = "940efb5e8ccb1ce23a078e90b78002218851af1322e815f7e2d8040f1300fa69";
const packageId = "health-medical-testing-clinic-aurora";
const contentVersion = "0.1.0";

const inventory = {
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
};

const row = {
  package_id: packageId,
  content_version: contentVersion,
  status: "published",
  fictional: true,
  checksum_sha256: checksum,
  manifest: {
    packageId,
    contentVersion,
    review: { approved: true },
    safetyInvariants: {
      administrativeOnly: true,
      realCustomerDataAllowed: false,
      realPatientDataAllowed: false,
      realRecordAccessAllowed: false,
      realBookingAllowed: false,
      realPaymentAllowed: false,
      clinicalAdviceAllowed: false,
      resultInterpretationAllowed: false
    },
    publicationGate: {
      packageChecksum: checksum,
      serviceRoleInBrowserAllowed: false,
      directBrowserWriteAllowed: false
    }
  },
  inventory,
  payload: { businessProfile: { fictional: true } },
  source_repository: "leon337/predixai-brand",
  source_branch: "ptp-web-2-workforce-k6-questionnaire-r2",
  source_commit_sha: "86a9ce55ec82938fd8c383e6f8227aeb76a06dd9",
  source_pr: 9,
  published_at: "2026-07-22T15:36:32.373607Z",
  updated_at: "2026-07-22T15:36:32.373607Z"
};

const makeResponse = () => ({
  headers: {},
  statusCode: 200,
  body: undefined,
  ended: false,
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(value) {
    this.body = value;
    return this;
  },
  end() {
    this.ended = true;
    return this;
  }
});

const makeRequest = (overrides = {}) => ({
  method: "GET",
  query: { packageId, contentVersion },
  headers: {},
  ...overrides
});

const call = async (request) => {
  const response = makeResponse();
  await handler(request, response);
  return response;
};

(async () => {
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify([row])
    };
  };

  const health = await call(makeRequest({ query: { health: "1" } }));
  assert.equal(health.statusCode, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.configured, true);
  assert.equal(health.body.directBrowserDatabaseAccess, false);

  const success = await call(makeRequest());
  assert.equal(success.statusCode, 200);
  assert.equal(success.body.ok, true);
  assert.equal(success.body.data.packageId, packageId);
  assert.equal(success.body.data.contentVersion, contentVersion);
  assert.equal(success.body.data.checksumSha256, checksum);
  assert.equal(success.body.data.status, "READY");
  assert.equal(fetchCalls, 1);

  const head = await call(makeRequest({ method: "HEAD" }));
  assert.equal(head.statusCode, 200);
  assert.equal(head.ended, true);

  const unknown = await call(makeRequest({ query: { packageId: "unknown", contentVersion } }));
  assert.equal(unknown.statusCode, 404);
  assert.equal(unknown.body.error, "PACKAGE_NOT_ALLOWED");

  const forbiddenOrigin = await call(makeRequest({ headers: { origin: "https://example.com" } }));
  assert.equal(forbiddenOrigin.statusCode, 403);
  assert.equal(forbiddenOrigin.body.error, "ORIGIN_NOT_ALLOWED");

  const invalidMethod = await call(makeRequest({ method: "POST" }));
  assert.equal(invalidMethod.statusCode, 405);
  assert.equal(invalidMethod.body.error, "METHOD_NOT_ALLOWED");

  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify([{ ...row, checksum_sha256: "0".repeat(64) }])
  });
  const integrityFailure = await call(makeRequest());
  assert.equal(integrityFailure.statusCode, 409);
  assert.equal(integrityFailure.body.error, "PACKAGE_INTEGRITY_FAILED");

  console.log("WORKFORCE_CATALOG_API_TESTS=PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
