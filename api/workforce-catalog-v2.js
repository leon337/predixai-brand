const legacyHandler = require("./workforce-catalog.js");

const serviceUrl = String(process.env[["SUPABASE", "URL"].join("_")] || "")
  .trim()
  .replace(/\/+$/, "");
const publicToken = String(
  process.env[["SUPABASE", "PUBLISHABLE", "KEY"].join("_")] || ""
).trim();

const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(serviceUrl) && publicToken.length >= 20;
const UPSTREAM_TIMEOUT_MS = 8000;
const allowedKey = "health-medical-testing-clinic-aurora@0.1.0";
const expectedChecksum = "940efb5e8ccb1ce23a078e90b78002218851af1322e815f7e2d8040f1300fa69";
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
    "x-client-info": "predixai-brand-workforce-catalog/2.1"
  };
  if (!publicToken.startsWith("sb_publishable_")) headers.Authorization = `Bearer ${publicToken}`;
  return headers;
};

const validInventory = (inventory) => {
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) return false;
  return Object.entries(expectedInventory).every(([key, value]) => inventory[key] === value);
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

const validRow = (row, packageId, contentVersion) => {
  if (!row || typeof row !== "object" || Array.isArray(row)) return false;
  if (row.package_id !== packageId || row.content_version !== contentVersion) return false;
  if (row.status !== "published" || row.fictional !== true) return false;
  if (row.checksum_sha256 !== expectedChecksum) return false;
  if (row.manifest?.packageId !== packageId || row.manifest?.contentVersion !== contentVersion) return false;
  if (row.manifest?.review?.approved !== true) return false;
  const manifestChecksum = row.manifest?.publicationGate?.packageChecksum;
  if (manifestChecksum && manifestChecksum !== expectedChecksum) return false;
  if (!validSafetyContract(row.manifest) || !validInventory(row.inventory)) return false;
  if (!row.payload || typeof row.payload !== "object" || Array.isArray(row.payload)) return false;
  return Object.keys(row.payload).length === 10;
};

const sendIntegrityFailure = (response, packageId, contentVersion) => {
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
    checksum: {
      algorithm: "sha256",
      value: row.checksum_sha256,
      verifiedAtPublication: true
    },
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

  const health = clean(request.query?.health, 10) === "1";
  if (health) {
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

  const packageId = clean(request.query?.packageId, 120) || "health-medical-testing-clinic-aurora";
  const contentVersion = clean(request.query?.contentVersion, 30) || "0.1.0";
  if (`${packageId}@${contentVersion}` !== allowedKey || !configured) return legacyHandler(request, response);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${serviceUrl}/rest/v1/rpc/get_published_workforce_catalog`, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({ p_package_id: packageId, p_content_version: contentVersion }),
      signal: controller.signal
    });

    if (!upstream.ok) return legacyHandler(request, response);

    let rows;
    try {
      rows = JSON.parse(await upstream.text());
    } catch {
      return legacyHandler(request, response);
    }

    if (!Array.isArray(rows) || rows.length !== 1) return legacyHandler(request, response);
    if (!validRow(rows[0], packageId, contentVersion)) return sendIntegrityFailure(response, packageId, contentVersion);
    return sendDocument(request, response, rows[0]);
  } catch {
    return legacyHandler(request, response);
  } finally {
    clearTimeout(timer);
  }
};
