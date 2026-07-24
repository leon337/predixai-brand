const fs = require("node:fs");
const path = require("node:path");

const PACKAGE_ID = "health-medical-testing-clinic-aurora";
const CONTENT_VERSION = "0.1.0";
const CHECKSUM = "940efb5e8ccb1ce23a078e90b78002218851af1322e815f7e2d8040f1300fa69";
const componentBase = path.join(
  process.cwd(),
  "data",
  "employee-simulations",
  "health",
  "medical-testing-clinic"
);
const EXPECTED_INVENTORY = Object.freeze({
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
});

const clean = (value, maxLength) => {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected === undefined || selected === null ? "" : String(selected).trim().slice(0, maxLength);
};
const header = (request, name) => {
  const value = request.headers?.[name];
  return Array.isArray(value) ? value[0] : String(value || "");
};
const readJson = (filename) => JSON.parse(fs.readFileSync(path.join(componentBase, filename), "utf8"));
const readText = (filename) => fs.readFileSync(path.join(componentBase, filename), "utf8");

const validSafetyContract = (manifest) => {
  const safety = manifest?.safetyInvariants;
  const gate = manifest?.publicationGate;
  return safety?.administrativeOnly === true &&
    safety?.realCustomerDataAllowed === false &&
    safety?.realPatientDataAllowed === false &&
    safety?.realRecordAccessAllowed === false &&
    safety?.realBookingAllowed === false &&
    safety?.realPaymentAllowed === false &&
    safety?.clinicalAdviceAllowed === false &&
    safety?.resultInterpretationAllowed === false &&
    gate?.serviceRoleInBrowserAllowed === false &&
    gate?.directBrowserWriteAllowed === false;
};

const validInventory = (actual) => actual &&
  typeof actual === "object" &&
  !Array.isArray(actual) &&
  Object.entries(EXPECTED_INVENTORY).every(([key, expected]) => Number(actual[key]) === expected);

const buildDocument = () => {
  const evidence = readJson("publication-evidence.json");
  const manifest = readJson("master-package.json");
  const payload = {
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
  };

  if (evidence.packageId !== PACKAGE_ID || evidence.contentVersion !== CONTENT_VERSION) throw new Error("FALLBACK_IDENTITY_MISMATCH");
  if (evidence.validation?.checksumMatch !== true || evidence.supabase?.checksumSha256 !== CHECKSUM) throw new Error("FALLBACK_CHECKSUM_EVIDENCE_INVALID");
  if (!validInventory(evidence.inventory) || !validSafetyContract(manifest)) throw new Error("FALLBACK_CONTRACT_INVALID");
  if (Object.keys(payload).length !== 10) throw new Error("FALLBACK_COMPONENTS_MISSING");

  return {
    packageId: PACKAGE_ID,
    contentVersion: CONTENT_VERSION,
    source: "github_build_fallback",
    status: "READY",
    payload,
    checksum: { algorithm: "sha256", value: CHECKSUM, verifiedAtPublication: true },
    manifest,
    inventory: evidence.inventory,
    provenance: {
      repository: evidence.source.repository,
      branch: evidence.source.branch,
      commitSha: evidence.source.commitSha,
      pullRequest: evidence.source.pullRequest,
      publishedAt: evidence.supabase.publishedAt
    },
    warnings: ["SUPABASE_UNAVAILABLE_USING_VERSIONED_BUILD_FALLBACK"]
  };
};

module.exports = async function fallbackHandler(request, response) {
  const packageId = clean(request.query?.packageId, 120) || PACKAGE_ID;
  const contentVersion = clean(request.query?.contentVersion, 30) || CONTENT_VERSION;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (`${packageId}@${contentVersion}` !== `${PACKAGE_ID}@${CONTENT_VERSION}`) {
    response.setHeader("Cache-Control", "no-store");
    return response.status(404).json({ packageId, contentVersion, source: "none", status: "NOT_READY", payload: null, checksum: null, error: "PACKAGE_NOT_ALLOWED" });
  }

  try {
    const document = buildDocument();
    const etag = `"sha256-${document.checksum.value}"`;
    response.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    response.setHeader("ETag", etag);
    response.setHeader("X-PredixAI-Catalog-Source", document.source);
    if (header(request, "if-none-match") === etag) return response.status(304).end();
    if (request.method === "HEAD") return response.status(200).end();
    return response.status(200).json(document);
  } catch (error) {
    console.error(`WORKFORCE_CATALOG_FALLBACK_ERROR=${error instanceof Error ? error.message : "unknown"}`);
    response.setHeader("Cache-Control", "no-store");
    return response.status(503).json({ packageId, contentVersion, source: "none", status: "NOT_READY", payload: null, checksum: null, error: "CATALOG_UNAVAILABLE" });
  }
};
