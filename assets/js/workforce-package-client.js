(() => {
  "use strict";

  const PACKAGE_ID = "health-medical-testing-clinic-aurora";
  const CONTENT_VERSION = "0.1.0";
  const CHECKSUM_SHA256 = "940efb5e8ccb1ce23a078e90b78002218851af1322e815f7e2d8040f1300fa69";
  const REQUIRED_COMPONENTS = Object.freeze([
    "businessProfile",
    "questions",
    "services",
    "operations",
    "scheduling",
    "paymentsAndInsurance",
    "faq",
    "handoffRules",
    "scenarios",
    "agentTemplate"
  ]);
  const ALLOWED_SOURCES = new Set(["supabase_published_package", "github_build_fallback"]);
  const PACKAGE_QUERY_VALUES = new Set([PACKAGE_ID, "clinic-aurora"]);

  const runtime = globalThis.PredixWorkforcePackageRuntime || {
    active: false,
    selectedPackageId: null,
    document: null,
    status: "NOT_SELECTED",
    source: "none",
    warnings: [],
    error: null,
    customization: null
  };

  const params = new URLSearchParams(globalThis.location?.search || "");
  const selectedValue = params.get("package");
  runtime.active = PACKAGE_QUERY_VALUES.has(selectedValue);
  runtime.selectedPackageId = runtime.active ? PACKAGE_ID : null;
  runtime.status = runtime.active ? "SELECTED" : "NOT_SELECTED";
  globalThis.PredixWorkforcePackageRuntime = runtime;

  const endpoint = () => {
    const isPages = globalThis.location?.hostname === "leon337.github.io";
    const base = isPages ? "https://predixai-brand.vercel.app" : "";
    const query = new URLSearchParams({ packageId: PACKAGE_ID, contentVersion: CONTENT_VERSION });
    const previewShareToken = params.get("_vercel_share");
    if (previewShareToken) query.set("_vercel_share", previewShareToken);
    return `${base}/api/workforce-catalog?${query.toString()}`;
  };

  const normalizeFailureCode = (value, fallback) => {
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 240);
    if (value && typeof value === "object") {
      for (const candidate of [value.code, value.message, value.error, value.reason]) {
        if (typeof candidate === "string" && candidate.trim()) return candidate.trim().slice(0, 240);
      }
      try {
        const serialized = JSON.stringify(value);
        if (serialized && serialized !== "{}") return `PACKAGE_REMOTE_ERROR:${serialized.slice(0, 200)}`;
      } catch {
        // Mantém o fallback seguro abaixo.
      }
    }
    return fallback;
  };

  const fail = (code) => {
    const normalizedCode = normalizeFailureCode(code, "PACKAGE_LOAD_FAILED");
    const error = new Error(normalizedCode);
    error.code = normalizedCode;
    throw error;
  };

  const validateDocument = (document) => {
    if (!document || typeof document !== "object" || Array.isArray(document)) fail("PACKAGE_DOCUMENT_INVALID");
    if (document.packageId !== PACKAGE_ID || document.contentVersion !== CONTENT_VERSION) fail("PACKAGE_IDENTITY_MISMATCH");
    if (document.status !== "READY") fail("PACKAGE_NOT_READY");
    if (!ALLOWED_SOURCES.has(document.source)) fail("PACKAGE_SOURCE_NOT_ALLOWED");
    if (document.checksum?.algorithm !== "sha256" || document.checksum?.value !== CHECKSUM_SHA256) fail("PACKAGE_CHECKSUM_MISMATCH");
    if (document.manifest?.packageId !== PACKAGE_ID || document.manifest?.contentVersion !== CONTENT_VERSION) fail("PACKAGE_MANIFEST_IDENTITY_MISMATCH");
    const manifestChecksum = document.manifest?.publicationGate?.packageChecksum;
    if (manifestChecksum && manifestChecksum !== CHECKSUM_SHA256) fail("PACKAGE_MANIFEST_CHECKSUM_MISMATCH");
    if (document.manifest?.safetyInvariants?.realCustomerDataAllowed !== false) fail("PACKAGE_REAL_DATA_GUARD_MISSING");
    if (document.manifest?.publicationGate?.serviceRoleInBrowserAllowed !== false) fail("PACKAGE_BROWSER_SECRET_GUARD_MISSING");
    if (!document.payload || typeof document.payload !== "object" || Array.isArray(document.payload)) fail("PACKAGE_PAYLOAD_INVALID");
    const missing = REQUIRED_COMPONENTS.filter((key) => !(key in document.payload));
    if (missing.length) fail(`PACKAGE_COMPONENTS_MISSING:${missing.join(",")}`);
    if (Object.keys(document.payload).length !== REQUIRED_COMPONENTS.length) fail("PACKAGE_COMPONENT_COUNT_INVALID");
    if (typeof document.payload.agentTemplate?.promptText !== "string" || !document.payload.agentTemplate.promptText.trim()) fail("PACKAGE_PROMPT_MISSING");
    if (!Array.isArray(document.payload.questions?.sections) || document.payload.questions.sections.length < 1) fail("PACKAGE_QUESTIONNAIRE_MISSING");
    if (!Array.isArray(document.payload.scenarios?.scenarios) || document.payload.scenarios.scenarios.length < 1) fail("PACKAGE_SCENARIOS_MISSING");
    if (document.source === "github_build_fallback" && !document.warnings?.includes("SUPABASE_UNAVAILABLE_USING_VERSIONED_BUILD_FALLBACK")) {
      fail("PACKAGE_FALLBACK_WARNING_MISSING");
    }
    return document;
  };

  const loadPackage = async (fetchImpl = globalThis.fetch) => {
    if (typeof fetchImpl !== "function") fail("PACKAGE_FETCH_UNAVAILABLE");
    runtime.status = "LOADING";
    runtime.error = null;

    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? globalThis.setTimeout(() => controller.abort(), 10000) : null;

    try {
      const response = await fetchImpl(endpoint(), {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        signal: controller?.signal
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) fail(normalizeFailureCode(body?.error ?? body, `PACKAGE_HTTP_${response.status}`));
      const document = validateDocument(body);
      runtime.document = document;
      runtime.status = "READY";
      runtime.source = document.source;
      runtime.warnings = Array.isArray(document.warnings) ? [...document.warnings] : [];
      return document;
    } catch (error) {
      runtime.document = null;
      runtime.status = "NOT_READY";
      runtime.source = "none";
      runtime.warnings = [];
      runtime.error = error instanceof Error ? error.message : normalizeFailureCode(error, "PACKAGE_LOAD_FAILED");
      throw error;
    } finally {
      if (timer) globalThis.clearTimeout(timer);
    }
  };

  globalThis.PredixWorkforcePackageClient = Object.freeze({
    PACKAGE_ID,
    CONTENT_VERSION,
    CHECKSUM_SHA256,
    REQUIRED_COMPONENTS,
    ALLOWED_SOURCES,
    endpoint,
    normalizeFailureCode,
    validateDocument,
    loadPackage
  });
})();
