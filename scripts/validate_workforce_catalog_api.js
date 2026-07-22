const assert = require("node:assert/strict");
const path = require("node:path");

const apiPath = path.resolve(__dirname, "..", "api", "workforce-catalog.js");
const urlKey = ["SUPABASE", "URL"].join("_");
const publicKey = ["SUPABASE", "PUBLISHABLE", "KEY"].join("_");

const packageId = "health-medical-testing-clinic-aurora";
const contentVersion = "0.1.0";
const checksum = "940efb5e8ccb1ce23a078e90b78002218851af1322e815f7e2d8040f1300fa69";
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

const payload = {
  businessProfile: {},
  questions: {},
  services: {},
  operations: {},
  scheduling: {},
  paymentsAndInsurance: {},
  faq: {},
  handoffRules: {},
  scenarios: {},
  agentTemplate: { promptText: "Teste" }
};

const publishedRow = {
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
  payload,
  source_repository: "leon337/predixai-brand",
  source_branch: "ptp-web-2-workforce-k6-questionnaire-r2",
  source_commit_sha: "86a9ce55ec82938fd8c383e6f8227aeb76a06dd9",
  source_pr: 9,
  published_at: "2026-07-22T15:36:32.373607Z",
  updated_at: "2026-07-22T15:36:32.373607Z"
};

const loadHandler = ({ configured }) => {
  delete require.cache[require.resolve(apiPath)];
  if (configured) {
    process.env[urlKey] = "https://example-project.supabase.co";
    process.env[publicKey] = "sb_publishable_test_key_12345678901234567890";
  } else {
    delete process.env[urlKey];
    delete process.env[publicKey];
  }
  return require(apiPath);
};

const makeResponse = () => ({
  headers: {},
  statusCode: 200,
  body: undefined,
  ended: false,
  setHeader(name, value) {
    this.headers[String(name).toLowerCase()] = String(value);
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(value) {
    this.body = value;
    this.ended = true;
    return this;
  },
  end() {
    this.ended = true;
    return this;
  }
});

const call = async (handler, request) => {
  const response = makeResponse();
  await handler(request, response);
  return response;
};

const makeRequest = (overrides = {}) => ({
  method: "GET",
  query: { packageId, contentVersion },
  headers: {},
  ...overrides
});

(async () => {
  const originalFetch = global.fetch;

  try {
    let fetchCalls = 0;
    global.fetch = async (url, options) => {
      fetchCalls += 1;
      assert.match(String(url), /\/rest\/v1\/rpc\/get_published_workforce_catalog$/);
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), {
        p_package_id: packageId,
        p_content_version: contentVersion
      });
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify([publishedRow])
      };
    };

    const primaryHandler = loadHandler({ configured: true });
    const health = await call(primaryHandler, makeRequest({ query: { health: "1" } }));
    assert.equal(health.statusCode, 200);
    assert.equal(health.body.status, "READY");
    assert.equal(health.body.configured, true);
    assert.equal(health.body.fallbackAvailable, true);
    assert.equal(health.body.directBrowserDatabaseAccess, false);

    const primary = await call(primaryHandler, makeRequest());
    assert.equal(primary.statusCode, 200);
    assert.equal(primary.body.packageId, packageId);
    assert.equal(primary.body.contentVersion, contentVersion);
    assert.equal(primary.body.source, "supabase_published_package");
    assert.equal(primary.body.status, "READY");
    assert.equal(primary.body.checksum.value, checksum);
    assert.equal(Object.keys(primary.body.payload).length, 10);
    assert.equal(primary.headers["x-predixai-catalog-source"], "supabase_published_package");
    assert.equal(fetchCalls, 1);

    const head = await call(primaryHandler, makeRequest({ method: "HEAD" }));
    assert.equal(head.statusCode, 200);
    assert.equal(head.ended, true);

    global.fetch = async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ ...publishedRow, checksum_sha256: "0".repeat(64) }])
    });
    const integrityFailure = await call(primaryHandler, makeRequest());
    assert.equal(integrityFailure.statusCode, 409);
    assert.equal(integrityFailure.body.status, "NOT_READY");
    assert.equal(integrityFailure.body.source, "supabase_published_package");
    assert.equal(integrityFailure.body.error, "PACKAGE_INTEGRITY_FAILED");
    assert.equal(integrityFailure.headers["cache-control"], "no-store");

    global.fetch = async () => {
      throw new Error("simulated upstream outage");
    };

    const fallbackHandler = loadHandler({ configured: false });
    const fallback = await call(
      fallbackHandler,
      makeRequest({ headers: { origin: "https://leon337.github.io" } })
    );
    assert.equal(fallback.statusCode, 200);
    assert.equal(fallback.body.source, "github_build_fallback");
    assert.equal(fallback.body.status, "READY");
    assert.equal(fallback.body.checksum.value, checksum);
    assert.equal(Object.keys(fallback.body.payload).length, 10);
    assert.equal(fallback.body.warnings.length, 1);

    const unknown = await call(
      fallbackHandler,
      makeRequest({ query: { packageId: "unknown", contentVersion } })
    );
    assert.equal(unknown.statusCode, 404);
    assert.equal(unknown.body.status, "NOT_READY");
    assert.equal(unknown.body.error, "PACKAGE_NOT_ALLOWED");

    const forbiddenOrigin = await call(
      fallbackHandler,
      makeRequest({ headers: { origin: "https://example.com" } })
    );
    assert.equal(forbiddenOrigin.statusCode, 403);
    assert.equal(forbiddenOrigin.body.error, "ORIGIN_NOT_ALLOWED");

    const invalidMethod = await call(
      fallbackHandler,
      makeRequest({ method: "POST" })
    );
    assert.equal(invalidMethod.statusCode, 405);
    assert.equal(invalidMethod.body.error, "METHOD_NOT_ALLOWED");

    console.log("WORKFORCE_CATALOG_API_TESTS=PASS");
    console.log("PRIMARY_SOURCE=SUPABASE_PUBLISHED_PACKAGE");
    console.log("FALLBACK_SOURCE=GITHUB_BUILD_FALLBACK");
    console.log("INTEGRITY_FAILURE=FAIL_CLOSED_409");
    console.log("REQUIRED_RESPONSE_FIELDS=PASS");
  } finally {
    global.fetch = originalFetch;
    delete process.env[urlKey];
    delete process.env[publicKey];
    delete require.cache[require.resolve(apiPath)];
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
