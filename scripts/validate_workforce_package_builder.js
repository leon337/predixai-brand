const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const packageBase = path.join(root, "data", "employee-simulations", "health", "medical-testing-clinic");
const checksum = "940efb5e8ccb1ce23a078e90b78002218851af1322e815f7e2d8040f1300fa69";

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(packageBase, name), "utf8"));
const readText = (name) => fs.readFileSync(path.join(packageBase, name), "utf8");
const clone = (value) => JSON.parse(JSON.stringify(value));
const assert = (condition, code) => { if (!condition) throw new Error(code); };

const data = new Map();
global.window = global;
global.crypto = crypto.webcrypto;
global.location = {
  hostname: "localhost",
  search: "?package=health-medical-testing-clinic-aurora",
  href: "http://localhost/funcionario-ia-gratis/?package=health-medical-testing-clinic-aurora",
  pathname: "/funcionario-ia-gratis/",
  hash: ""
};
global.history = { state: null, replaceState() {} };
global.sessionStorage = {
  setItem: (key, value) => data.set(key, String(value)),
  getItem: (key) => data.has(key) ? data.get(key) : null,
  removeItem: (key) => data.delete(key)
};

require(path.join(root, "assets/js/journey-contracts.js"));
require(path.join(root, "assets/js/workforce-package-client.js"));
require(path.join(root, "assets/js/workforce-package-adapter.js"));
require(path.join(root, "assets/js/workforce-package-bootstrap.js"));
require(path.join(root, "assets/js/state-store.js"));
require(path.join(root, "assets/js/workforce-package-state.js"));
require(path.join(root, "assets/js/prompt-generator.js"));

const manifest = readJson("master-package.json");
manifest.publicationGate.packageChecksum = checksum;
const document = {
  packageId: "health-medical-testing-clinic-aurora",
  contentVersion: "0.1.0",
  source: "supabase_published_package",
  status: "READY",
  checksum: { algorithm: "sha256", value: checksum, verifiedAtPublication: true },
  manifest,
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
  warnings: []
};

const client = global.PredixWorkforcePackageClient;
const adapter = global.PredixWorkforcePackageAdapter;
const runtime = global.PredixWorkforcePackageRuntime;
client.validateDocument(document);
runtime.document = document;
runtime.status = "READY";
runtime.source = document.source;
runtime.warnings = [];

require(path.join(root, "assets/js/workforce-package-prompt.js"));

const genericCatalog = JSON.parse(fs.readFileSync(path.join(root, "assets", "data", "ai-employees.json"), "utf8"));
const catalog = adapter.adaptCatalog(genericCatalog, document);
assert(catalog.employees.length === genericCatalog.employees.length + 1, "PACKAGE_EMPLOYEE_COUNT_INVALID");
assert(catalog.employees.some((item) => item.id === "atendente-clinica-aurora"), "PACKAGE_EMPLOYEE_MISSING");
assert(catalog.workforcePackage.packageId === document.packageId, "PACKAGE_CATALOG_CONTEXT_MISSING");

const C = global.PredixJourneyContracts;
const G = global.PredixPromptGenerator;
let state = C.createInitialState();
state.configuration.employeeId = "atendente-clinica-aurora";
state.configuration.mandatoryControls = genericCatalog.mandatoryControls.map((item) => item.label);
state.packageContext = {
  mode: "package",
  packageId: document.packageId,
  contentVersion: document.contentVersion,
  source: document.source,
  checksum,
  status: "READY",
  warnings: []
};
runtime.customization = { answerModes: {}, answers: {}, omittedOptionalFields: [], updatedAt: null };
state.packageCustomization = clone(runtime.customization);

(async () => {
  const golden = await G.generatePromptArtifact({ catalog, state });
  assert(golden.content === document.payload.agentTemplate.promptText.trim(), "DEFAULT_PROMPT_GOLDEN_MISMATCH");
  assert(golden.packageChecksum === checksum, "PROMPT_PACKAGE_CHECKSUM_MISSING");

  runtime.customization = {
    answerModes: { company_display_name: "edit_suggested" },
    answers: { company_display_name: "Clínica Aurora Laboratório Fictício" },
    omittedOptionalFields: [],
    updatedAt: new Date().toISOString()
  };
  state.packageCustomization = clone(runtime.customization);
  const edited = await G.generatePromptArtifact({ catalog, state });
  assert(edited.content.includes("## 14. Personalizações autorizadas nesta sessão"), "EDITED_PROMPT_SECTION_MISSING");
  assert(edited.content.includes("Clínica Aurora Laboratório Fictício"), "EDITED_PROMPT_VALUE_MISSING");

  const firstRequired = adapter.flattenQuestions(document).find((item) => item.required);
  runtime.customization = {
    answerModes: { [firstRequired.id]: "do_not_include" },
    answers: {},
    omittedOptionalFields: [firstRequired.id],
    updatedAt: new Date().toISOString()
  };
  let requiredBlocked = false;
  try {
    await G.generatePromptArtifact({ catalog, state });
  } catch (error) {
    requiredBlocked = error.message === "REQUIRED_PACKAGE_QUESTION_OMITTED";
  }
  assert(requiredBlocked, "REQUIRED_QUESTION_OMISSION_NOT_BLOCKED");

  const fallback = clone(document);
  fallback.source = "github_build_fallback";
  fallback.warnings = ["SUPABASE_UNAVAILABLE_USING_VERSIONED_BUILD_FALLBACK"];
  client.validateDocument(fallback);
  fallback.warnings = [];
  let fallbackWarningBlocked = false;
  try { client.validateDocument(fallback); } catch (error) { fallbackWarningBlocked = error.message === "PACKAGE_FALLBACK_WARNING_MISSING"; }
  assert(fallbackWarningBlocked, "FALLBACK_WARNING_NOT_ENFORCED");

  const tampered = clone(document);
  tampered.checksum.value = "0".repeat(64);
  let checksumBlocked = false;
  try { client.validateDocument(tampered); } catch (error) { checksumBlocked = error.message === "PACKAGE_CHECKSUM_MISMATCH"; }
  assert(checksumBlocked, "PACKAGE_CHECKSUM_TAMPER_NOT_BLOCKED");

  runtime.customization = { answerModes: {}, answers: {}, omittedOptionalFields: [], updatedAt: null };
  const Store = global.PredixSessionStateStore.SessionStateStore;
  const store = new Store(global.sessionStorage);
  const saveResult = store.save(state);
  assert(saveResult.ok, "PACKAGE_SESSION_SAVE_FAILED");
  const loaded = store.load();
  assert(loaded.packageContext.packageId === document.packageId, "PACKAGE_CONTEXT_NOT_PERSISTED");
  assert(loaded.packageCustomization && typeof loaded.packageCustomization === "object", "PACKAGE_CUSTOMIZATION_NOT_PERSISTED");

  const html = fs.readFileSync(path.join(root, "funcionario-ia-gratis", "index.html"), "utf8");
  const orderedScripts = [
    "journey-contracts.js",
    "workforce-package-client.js",
    "workforce-package-adapter.js",
    "workforce-package-bootstrap.js",
    "state-store.js",
    "workforce-package-state.js",
    "prompt-generator.js",
    "workforce-package-prompt.js",
    "employee-builder.js",
    "workforce-package-ui.js"
  ];
  let last = -1;
  for (const script of orderedScripts) {
    const index = html.indexOf(script);
    assert(index > last, `PACKAGE_SCRIPT_ORDER_INVALID:${script}`);
    last = index;
  }

  const browserFiles = [
    "assets/js/workforce-package-client.js",
    "assets/js/workforce-package-adapter.js",
    "assets/js/workforce-package-bootstrap.js",
    "assets/js/workforce-package-state.js",
    "assets/js/workforce-package-prompt.js",
    "assets/js/workforce-package-ui.js"
  ].map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  assert(!/SUPABASE_SERVICE_ROLE|sb_secret_|service_role/i.test(browserFiles), "ADMIN_CREDENTIAL_MARKER_IN_BROWSER_CODE");
  assert(!/\.supabase\.co/i.test(browserFiles), "DIRECT_SUPABASE_BROWSER_ACCESS_DETECTED");

  console.log("K7_8_2A_14_PACKAGE_DOCUMENT=PASS");
  console.log("K7_8_2A_14_GENERIC_CATALOG_PRESERVED=PASS");
  console.log("K7_8_2A_14_DEFAULT_PROMPT_GOLDEN=PASS");
  console.log("K7_8_2A_14_EDITED_PROMPT=PASS");
  console.log("K7_8_2A_14_REQUIRED_QUESTION_GUARD=PASS");
  console.log("K7_8_2A_14_FALLBACK_WARNING=PASS");
  console.log("K7_8_2A_14_CHECKSUM_FAIL_CLOSED=PASS");
  console.log("K7_8_2A_14_SESSION_STORAGE=PASS");
  console.log("K7_8_2A_14_NO_DIRECT_SUPABASE_BROWSER_ACCESS=PASS");
})().catch((error) => {
  console.error(`K7_8_2A_14_VALIDATION=FAIL:${error.message}`);
  process.exit(1);
});
