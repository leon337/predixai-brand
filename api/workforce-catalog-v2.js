const legacyHandler = require("./workforce-catalog.js");

const serviceUrl = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const publicToken = String(process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(serviceUrl) && publicToken.length >= 20;
const UPSTREAM_TIMEOUT_MS = 8000;
const PACKAGE_ID = "health-medical-testing-clinic-aurora";
const CONTENT_VERSION = "0.1.0";
const EXPECTED_CHECKSUM = "940efb5e8ccb1ce23a078e90b78002218851af1322e815f7e2d8040f1300fa69";
const REQUIRED_PAYLOAD_KEYS = Object.freeze([
  "businessProfile", "questions", "services", "operations", "scheduling",
  "paymentsAndInsurance", "faq", "handoffRules", "scenarios", "agentTemplate"
]);
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

const parseObject = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const strictBoolean = (value) => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
};

const allowedOrigin = (request) => {
  const raw = header(request, "origin") || header(request, "referer");
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" && !new Set(["localhost", "127.0.0.1"]).has(host)) return false;
    if (host === "predixai-brand.vercel.app" || host.endsWith(".vercel.app")) return url.origin;
    if (host === "leon337.github.io" || host === "localhost" || host === "127.0.0.1") return url.origin;
    return false;
  } catch {
    return false;
  }
};

const supabaseHeaders = () => {
  const headers = {
    apikey: publicToken,
    "content-type": "application/json",
    Accept: "application/json",
    "x-client-info": "predixai-brand-workforce-catalog/2.3"
  };
  if (!publicToken.startsWith("sb_publishable_")) headers.Authorization = `Bearer ${publicToken}`;
  return headers;
};

const normalizeRow = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return {
    ...raw,
    fictional: strictBoolean(raw.fictional),
    manifest: parseObject(raw.manifest),
    payload: parseObject(raw.payload),
    inventory: parseObject(raw.inventory)
  };
};

const checkRow = (raw, packageId, contentVersion) => {
  const row = normalizeRow(raw);
  const failed = [];
  if (!row) return { row: null, failed: ["row_shape"] };

  if (row.package_id !== packageId) failed.push("package_id");
  if (row.content_version !== contentVersion) failed.push("content_version");
  if (row.status !== "published") failed.push("status");
  if (row.fictional !== true) failed.push("fictional");
  if (row.checksum_sha256 !== EXPECTED_CHECKSUM) failed.push("checksum");

  const manifest = row.manifest;
  if (!manifest) {
    failed.push("manifest_shape");
  } else {
    if (manifest.packageId !== packageId) failed.push("manifest_package_id");
    if (manifest.contentVersion !== contentVersion) failed.push("manifest_content_version");
    if (strictBoolean(manifest.review?.approved) !== true) failed.push("manifest_review");
    const duplicateChecksum = manifest.publicationGate?.packageChecksum;
    if (duplicateChecksum && duplicateChecksum !== EXPECTED_CHECKSUM) failed.push("manifest_checksum");

    const requiredFalse = [
      ["real_customer_data_guard", manifest.safetyInvariants?.realCustomerDataAllowed],
      ["real_patient_data_guard", manifest.safetyInvariants?.realPatientDataAllowed],
      ["real_record_access_guard", manifest.safetyInvariants?.realRecordAccessAllowed],
      ["real_booking_guard", manifest.safetyInvariants?.realBookingAllowed],
      ["real_payment_guard", manifest.safetyInvariants?.realPaymentAllowed],
      ["clinical_advice_guard", manifest.safetyInvariants?.clinicalAdviceAllowed],
      ["result_interpretation_guard", manifest.safetyInvariants?.resultInterpretationAllowed],
      ["browser_service_role_guard", manifest.publicationGate?.serviceRoleInBrowserAllowed],
      ["browser_write_guard", manifest.publicationGate?.directBrowserWriteAllowed]
    ];
    for (const [code, value] of requiredFalse) {
      if (strictBoolean(value) !== false) failed.push(code);
    }
    if (strictBoolean(manifest.safetyInvariants?.administrativeOnly) !== true) failed.push("administrative_only_guard");
  }

  if (!row.payload) {
    failed.push("payload_shape");
  } else {
    const keys = Object.keys(row.payload).sort();
    const expectedKeys = [...REQUIRED_PAYLOAD_KEYS].sort();
    if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) failed.push("payload_keys");
  }

  if (!row.inventory) {
    failed.push("inventory_shape");
  } else {
    for (const [key, expected] of Object.entries(EXPECTED_INVENTORY)) {
      if (Number(row.inventory[key]) !== expected) failed.push(`inventory_${key}`);
    }
  }

  return { row, failed };
};

const sendIntegrityFailure = (response, packageId, contentVersion, failed) => {
  const safeFailures = [...new Set(failed)].slice(0, 20);
  console.error(`WORKFORCE_CATALOG_INTEGRITY_FAILED=${safeFailures.join(",") || "unknown"}`);
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-PredixAI-Catalog-Source", "supabase_published_package");
  response.setHeader("X-PredixAI-Integrity-Failures", safeFailures.join(","));
  const body = {
    packageId,
    contentVersion,
    source: "supabase_published_package",
    status: "NOT_READY",
    payload: null,
    checksum: null,
    error: "PACKAGE_INTEGRITY_FAILED"
  };
  if (process.env.VERCEL_ENV === "preview") body.failedChecks = safeFailures;
  return response.status(409).json(body);
};

const sendDocument = (request, response, row) => {
  const document = {
    packageId: row.package_id,
    contentVersion: row.content_version,
    source: "supabase_published_package",
    status: "READY",
    payload: row.payload,
    checksum: { algorithm: "sha256", value: row.checksum_sha256, verifiedAtPublication: true },
    manifest: row.manifest,
    inventory: row.inventory,
    provenance: {
      repository: row.source_repository,
      branch: row.source_branch,
      commitSha: row.source_commit_sha,
      pullRequest: row.source_pr,
      publishedAt: row.published_at,
      updatedAt: row.updated_at
    },
    warnings: []
  };
  const etag = `"sha256-${row.checksum_sha256}"`;
  response.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  response.setHeader("ETag", etag);
  response.setHeader("X-PredixAI-Catalog-Source", "supabase_published_package");
  if (header(request, "if-none-match") === etag) return response.status(304).end();
  if (request.method === "HEAD") return response.status(200).end();
  return response.status(200).json(document);
};

module.exports = async function handler(request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Robots-Tag", "noindex, nofollow");
  response.setHeader("Vary", "Origin, Accept-Encoding");

  const origin = allowedOrigin(request);
  if (origin === false) return response.status(403).json({ status: "NOT_READY", error: "ORIGIN_NOT_ALLOWED" });
  if (origin) response.setHeader("Access-Control-Allow-Origin", origin);

  if (request.method === "OPTIONS") {
    response.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, If-None-Match");
    response.setHeader("Access-Control-Max-Age", "86400");
    return response.status(204).end();
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD, OPTIONS");
    return response.status(405).json({ status: "NOT_READY", error: "METHOD_NOT_ALLOWED" });
  }

  if (clean(request.query?.health, 10) === "1") {
    const body = {
      service: "predixai-workforce-catalog",
      status: "READY",
      configured,
      fallbackAvailable: true,
      deliveryLayer: "VERCEL_API",
      directBrowserDatabaseAccess: false
    };
    return request.method === "HEAD" ? response.status(200).end() : response.status(200).json(body);
  }

  const packageId = clean(request.query?.packageId, 120) || PACKAGE_ID;
  const contentVersion = clean(request.query?.contentVersion, 30) || CONTENT_VERSION;
  if (`${packageId}@${contentVersion}` !== `${PACKAGE_ID}@${CONTENT_VERSION}` || !configured) return legacyHandler(request, response);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstream = await fetch(`${serviceUrl}/rest/v1/rpc/get_published_workforce_catalog`, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({ p_package_id: packageId, p_content_version: contentVersion }),
      signal: controller.signal
    });
    if (!upstream.ok) {
      console.error(`WORKFORCE_CATALOG_UPSTREAM_HTTP=${upstream.status}`);
      return legacyHandler(request, response);
    }

    let rows;
    try {
      rows = JSON.parse(await upstream.text());
    } catch {
      console.error("WORKFORCE_CATALOG_UPSTREAM_JSON=INVALID");
      return legacyHandler(request, response);
    }
    if (!Array.isArray(rows) || rows.length !== 1) {
      console.error(`WORKFORCE_CATALOG_UPSTREAM_ROWS=${Array.isArray(rows) ? rows.length : "not_array"}`);
      return legacyHandler(request, response);
    }

    const checked = checkRow(rows[0], packageId, contentVersion);
    if (checked.failed.length) return sendIntegrityFailure(response, packageId, contentVersion, checked.failed);
    return sendDocument(request, response, checked.row);
  } catch (error) {
    console.error(`WORKFORCE_CATALOG_UPSTREAM_ERROR=${error instanceof Error ? error.message : "unknown"}`);
    return legacyHandler(request, response);
  } finally {
    clearTimeout(timer);
  }
};
