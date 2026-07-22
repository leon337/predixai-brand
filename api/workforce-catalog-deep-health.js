const serviceUrl = String(process.env[["SUPABASE", "URL"].join("_")] || "")
  .trim()
  .replace(/\/+$/, "");
const publicToken = String(
  process.env[["SUPABASE", "PUBLISHABLE", "KEY"].join("_")] || ""
).trim();

const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(serviceUrl) && publicToken.length >= 20;
const UPSTREAM_TIMEOUT_MS = 8000;
const packageId = "health-medical-testing-clinic-aurora";
const contentVersion = "0.1.0";
const checksumSha256 = "940efb5e8ccb1ce23a078e90b78002218851af1322e815f7e2d8040f1300fa69";
const expectedInventory = {
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
    if (host === "predixai-brand.vercel.app") return url.origin;
    if (host.endsWith(".vercel.app")) return url.origin;
    if (host === "leon337.github.io") return url.origin;
    if (host === "localhost" || host === "127.0.0.1") return url.origin;
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
    "x-client-info": "predixai-brand-workforce-catalog-deep-health/1.1"
  };

  if (!publicToken.startsWith("sb_publishable_")) {
    headers.Authorization = `Bearer ${publicToken}`;
  }

  return headers;
};

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

const validInventory = (inventory) => {
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) return false;
  return Object.entries(expectedInventory).every(([key, value]) => inventory[key] === value);
};

const validRow = (row) => {
  if (!row || typeof row !== "object" || Array.isArray(row)) return false;
  if (row.package_id !== packageId || row.content_version !== contentVersion) return false;
  if (row.status !== "published" || row.fictional !== true) return false;
  if (row.checksum_sha256 !== checksumSha256) return false;
  if (row.manifest?.packageId !== packageId || row.manifest?.contentVersion !== contentVersion) return false;
  if (row.manifest?.review?.approved !== true) return false;
  if (row.manifest?.publicationGate?.packageChecksum !== checksumSha256) return false;
  if (!validSafetyContract(row.manifest)) return false;
  if (!validInventory(row.inventory)) return false;
  if (!row.payload || typeof row.payload !== "object" || Array.isArray(row.payload)) return false;
  return Object.keys(row.payload).length === 10;
};

const notReady = (response, statusCode, error, upstreamStatus = null) => {
  response.setHeader("Cache-Control", "no-store");
  return response.status(statusCode).json({
    service: "predixai-workforce-catalog-deep-health",
    status: "NOT_READY",
    configured,
    source: "none",
    packageId,
    contentVersion,
    checksumSha256: null,
    payloadComponents: 0,
    warnings: [],
    directBrowserDatabaseAccess: false,
    error,
    upstreamStatus
  });
};

module.exports = async function handler(request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Robots-Tag", "noindex, nofollow");
  response.setHeader("Vary", "Origin, Accept-Encoding");
  response.setHeader("Cache-Control", "no-store");

  const origin = allowedOrigin(request);
  if (origin === false) return notReady(response, 403, "ORIGIN_NOT_ALLOWED");
  if (origin) response.setHeader("Access-Control-Allow-Origin", origin);

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    return notReady(response, 405, "METHOD_NOT_ALLOWED");
  }

  if (!configured) return notReady(response, 503, "SERVICE_CONFIG_MISSING");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${serviceUrl}/rest/v1/rpc/get_published_workforce_catalog`, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({
        p_package_id: packageId,
        p_content_version: contentVersion
      }),
      signal: controller.signal
    });

    if (!upstream.ok) return notReady(response, 502, "UPSTREAM_QUERY_FAILED", upstream.status);

    let rows;
    try {
      rows = JSON.parse(await upstream.text());
    } catch {
      return notReady(response, 502, "UPSTREAM_INVALID_JSON", upstream.status);
    }

    if (!Array.isArray(rows) || rows.length !== 1) return notReady(response, 404, "PACKAGE_NOT_FOUND", upstream.status);
    if (!validRow(rows[0])) return notReady(response, 409, "PACKAGE_INTEGRITY_FAILED", upstream.status);

    const body = {
      service: "predixai-workforce-catalog-deep-health",
      status: "READY",
      configured: true,
      source: "supabase_published_package",
      packageId,
      contentVersion,
      checksumSha256,
      payloadComponents: 10,
      warnings: [],
      directBrowserDatabaseAccess: false
    };

    response.setHeader("X-PredixAI-Catalog-Source", "supabase_published_package");
    return request.method === "HEAD" ? response.status(200).end() : response.status(200).json(body);
  } catch (error) {
    return notReady(response, error?.name === "AbortError" ? 504 : 502, error?.name === "AbortError" ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE");
  } finally {
    clearTimeout(timer);
  }
};
