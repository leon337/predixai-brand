const legacyHandler = require("./workforce-catalog.js");

const serviceUrl = String(process.env[["SUPABASE", "URL"].join("_")] || "").trim().replace(/\/+$/, "");
const publicToken = String(process.env[["SUPABASE", "PUBLISHABLE", "KEY"].join("_")] || "").trim();
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(serviceUrl) && publicToken.length >= 20;
const UPSTREAM_TIMEOUT_MS = 8000;
const PACKAGE_ID = "health-medical-testing-clinic-aurora";
const CONTENT_VERSION = "0.1.0";
const EXPECTED_CHECKSUM = "940efb5e8ccb1ce23a078e90b78002218851af1322e815f7e2d8040f1300fa69";
const REQUIRED_PAYLOAD_KEYS = new Set([
  "businessProfile", "questions", "services", "operations", "scheduling",
  "paymentsAndInsurance", "faq", "handoffRules", "scenarios", "agentTemplate"
]);

const clean = (value, maxLength) => {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected === undefined || selected === null ? "" : String(selected).trim().slice(0, maxLength);
};

const header = (request, name) => {
  const value = request.headers?.[name];
  return Array.isArray(value) ? value[0] : String(value || "");
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
    "x-client-info": "predixai-brand-workforce-catalog/2.2"
  };
  if (!publicToken.startsWith("sb_publishable_")) headers.Authorization = `Bearer ${publicToken}`;
  return headers;
};

const checkRow = (row, packageId, contentVersion) => {
  const failed = [];
  if (!row || typeof row !== "object" || Array.isArray(row)) return ["row_shape"];
  if (row.package_id !== packageId) failed.push("package_id");
  if (row.content_version !== contentVersion) failed.push("content_version");
  if (row.status !== "published") failed.push("status");
  if (row.fictional !== true) failed.push("fictional");
  if (row.checksum_sha256 !== EXPECTED_CHECKSUM) failed.push("checksum");
  if (row.manifest?.packageId !== packageId) failed.push("manifest_package_id");
  if (row.manifest?.contentVersion !== contentVersion) failed.push("manifest_content_version");
  if (row.manifest?.review?.approved !== true) failed.push("manifest_review");
  const duplicateChecksum = row.manifest?.publicationGate?.packageChecksum;
  if (duplicateChecksum && duplicateChecksum !== EXPECTED_CHECKSUM) failed.push("manifest_checksum");
  if (row.manifest?.safetyInvariants?.realCustomerDataAllowed !== false) failed.push("real_customer_data_guard");
  if (row.manifest?.safetyInvariants?.realPatientDataAllowed !== false) failed.push("real_patient_data_guard");
  if (row.manifest?.publicationGate?.serviceRoleInBrowserAllowed !== false) failed.push("browser_service_role_guard");
  if (row.manifest?.publicationGate?.directBrowserWriteAllowed !== false) failed.push("browser_write_guard");
  if (!row.payload || typeof row.payload !== "object" || Array.isArray(row.payload)) {
    failed.push("payload_shape");
  } else {
    const keys = Object.keys(row.payload);
    if (keys.length !== REQUIRED_PAYLOAD_KEYS.size || keys.some((key) => !REQUIRED_PAYLOAD_KEYS.has(key))) failed.push("payload_keys");
  }
  return failed;
};

const sendIntegrityFailure = (response, packageId, contentVersion, failed) => {
  console.error(`WORKFORCE_CATALOG_INTEGRITY_FAILED=${failed.join(",") || "unknown"}`);
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-PredixAI-Catalog-Source", "supabase_published_package");
  return response.status(409).json({
    packageId,
    contentVersion,
    source: "supabase_published_package",
    status: "NOT_READY",
    payload: null,
    checksum: null,
    error: "PACKAGE_INTEGRITY_FAILED"
  });
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
    const failed = checkRow(rows[0], packageId, contentVersion);
    if (failed.length) return sendIntegrityFailure(response, packageId, contentVersion, failed);
    return sendDocument(request, response, rows[0]);
  } catch (error) {
    console.error(`WORKFORCE_CATALOG_UPSTREAM_ERROR=${error instanceof Error ? error.message : "unknown"}`);
    return legacyHandler(request, response);
  } finally {
    clearTimeout(timer);
  }
};
