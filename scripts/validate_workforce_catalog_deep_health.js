const assert = require("node:assert/strict");
const path = require("node:path");

const apiPath = path.resolve(__dirname, "..", "api", "workforce-catalog-deep-health.js");
const urlKey = ["SUPABASE", "URL"].join("_");
const publicKey = ["SUPABASE", "PUBLISHABLE", "KEY"].join("_");
const checksum = "940efb5e8ccb1ce23a078e90b78002218851af1322e815f7e2d8040f1300fa69";
const packageId = "health-medical-testing-clinic-aurora";
const contentVersion = "0.1.0";

process.env[urlKey] = "https://example-project.supabase.co";
process.env[publicKey] = "sb_publishable_test_key_12345678901234567890";

const handler = require(apiPath);

const response = () => ({
  headers: {}, statusCode: 200, body: null, ended: false,
  setHeader(name, value) { this.headers[String(name).toLowerCase()] = String(value); },
  status(code) { this.statusCode = code; return this; },
  json(value) { this.body = value; this.ended = true; return this; },
  end() { this.ended = true; return this; }
});

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
  inventory: {
    servicesCategories: 4, services: 12, units: 2, channels: 4, faqItems: 24,
    handoffPriorities: 4, handoffQueues: 9, handoffLifecycleStates: 8,
    testScenarios: 24, promptSections: 13
  },
  payload: {
    businessProfile: {}, questions: {}, services: {}, operations: {}, scheduling: {},
    paymentsAndInsurance: {}, faq: {}, handoffRules: {}, scenarios: {}, agentTemplate: {}
  }
};

(async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async () => ({ ok: true, text: async () => JSON.stringify([row]) });
    const res = response();
    await handler({ method: "GET", headers: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, "READY");
    assert.equal(res.body.configured, true);
    assert.equal(res.body.source, "supabase_published_package");
    assert.equal(res.body.checksumSha256, checksum);
    assert.equal(res.body.payloadComponents, 10);
    assert.deepEqual(res.body.warnings, []);
    assert.equal(res.body.directBrowserDatabaseAccess, false);

    global.fetch = async () => ({ ok: true, text: async () => JSON.stringify([{ ...row, checksum_sha256: "0".repeat(64) }]) });
    const bad = response();
    await handler({ method: "GET", headers: {} }, bad);
    assert.equal(bad.statusCode, 409);
    assert.equal(bad.body.status, "NOT_READY");
    assert.equal(bad.body.error, "PACKAGE_INTEGRITY_FAILED");

    console.log("WORKFORCE_CATALOG_DEEP_HEALTH_TESTS=PASS");
  } finally {
    global.fetch = originalFetch;
    delete process.env[urlKey];
    delete process.env[publicKey];
  }
})().catch((error) => { console.error(error); process.exit(1); });
