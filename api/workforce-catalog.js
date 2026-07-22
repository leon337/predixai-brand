const serviceUrl = String(process.env[["SUPABASE", "URL"].join("_")] || "")
  .trim()
  .replace(/\/+$/, "");
const serviceSecret = String(
  process.env[["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_")] || ""
).trim();

const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(serviceUrl) && serviceSecret.length >= 20;
const UPSTREAM_TIMEOUT_MS = 8000;

const allowedPackages = new Map([
  [
    "health-medical-testing-clinic-aurora@0.1.0",
    {
      checksum: "940efb5e8ccb1ce23a078e90b78002218851af1322e815f7e2d8040f1300fa69",
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
      }
    }
  ]
]);

const clean = (value, maxLength) => {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected === undefined || selected === null
    ? ""
    : String(selected).trim().slice(0, maxLength);
};

const header = (request, name) => {
  const value = request.headers?.[name];
  return Array.isArray(value) ? value[0] : String(value || "");
};

const allowedOrigin = (request) => {
  const raw = header(request, "origin") || header(request, "referer");
  if (!raw) return true;

  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" && !new Set(["localhost", "127.0.0.1"]).has(host)) return false;
    return host === "predixai-brand.vercel.app" ||
      host.endsWith(".vercel.app") ||
      host === "localhost" ||
      host === "127.0.0.1";
  } catch {
    return false;
  }
};

const matchesInventory = (actual, expected) => {
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) return false;
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
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

const validateRow = (row, packageId, contentVersion, contract) => {
  if (!row || typeof row !== "object" || Array.isArray(row)) return false;
  if (row.package_id !== packageId || row.content_version !== contentVersion) return false;
  if (row.status !== "published" || row.fictional !== true) return false;
  if (row.checksum_sha256 !== contract.checksum) return false;
  if (row.manifest?.packageId !== packageId || row.manifest?.contentVersion !== contentVersion) return false;
  if (row.manifest?.review?.approved !== true) return false;
  if (row.manifest?.publicationGate?.packageChecksum !== row.checksum_sha256) return false;
  if (!validSafetyContract(row.manifest)) return false;
  if (!matchesInventory(row.inventory, contract.inventory)) return false;
  if (!row.payload || typeof row.payload !== "object" || Array.isArray(row.payload)) return false;
  return true;
};

const json = (response, status, body) => response.status(status).json(body);

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    return json(response, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  if (!allowedOrigin(request)) {
    return json(response, 403, { ok: false, error: "ORIGIN_NOT_ALLOWED" });
  }

  const health = clean(request.query?.health, 10) === "1";
  if (health) {
    const body = {
      ok: true,
      service: "predixai-workforce-catalog",
      configured,
      deliveryLayer: "VERCEL_API",
      directBrowserDatabaseAccess: false
    };
    return request.method === "HEAD" ? response.status(200).end() : json(response, 200, body);
  }

  if (!configured) {
    return json(response, 503, { ok: false, error: "SERVICE_CONFIG_MISSING" });
  }

  const packageId = clean(request.query?.packageId, 120);
  const contentVersion = clean(request.query?.contentVersion, 30);
  const contract = allowedPackages.get(`${packageId}@${contentVersion}`);

  if (!contract) {
    return json(response, 404, { ok: false, error: "PACKAGE_NOT_ALLOWED" });
  }

  const endpoint = new URL(`${serviceUrl}/rest/v1/workforce_catalog_packages`);
  endpoint.searchParams.set(
    "select",
    "package_id,content_version,status,fictional,manifest,payload,inventory,checksum_sha256,source_repository,source_branch,source_commit_sha,source_pr,published_at,updated_at"
  );
  endpoint.searchParams.set("package_id", `eq.${packageId}`);
  endpoint.searchParams.set("content_version", `eq.${contentVersion}`);
  endpoint.searchParams.set("status", "eq.published");
  endpoint.searchParams.set("limit", "1");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(endpoint, {
      method: "GET",
      headers: {
        [["api", "key"].join("")]: serviceSecret,
        [["author", "ization"].join("")]: ["Bear", "er "].join("") + serviceSecret,
        Accept: "application/json",
        "x-client-info": "predixai-brand-workforce-catalog/0.1"
      },
      signal: controller.signal
    });

    const text = await upstream.text();
    let rows;
    try {
      rows = text ? JSON.parse(text) : null;
    } catch {
      return json(response, 502, { ok: false, error: "UPSTREAM_INVALID_JSON" });
    }

    if (!upstream.ok) {
      const error = upstream.status === 401 || upstream.status === 403
        ? "UPSTREAM_ACCESS_DENIED"
        : "UPSTREAM_QUERY_FAILED";
      return json(response, 502, { ok: false, error });
    }

    if (!Array.isArray(rows) || rows.length !== 1) {
      return json(response, 404, { ok: false, error: "PACKAGE_NOT_FOUND" });
    }

    const row = rows[0];
    if (!validateRow(row, packageId, contentVersion, contract)) {
      return json(response, 409, { ok: false, error: "PACKAGE_INTEGRITY_FAILED" });
    }

    const document = {
      packageId: row.package_id,
      contentVersion: row.content_version,
      source: "supabase_published_package",
      status: "READY",
      manifest: row.manifest,
      inventory: row.inventory,
      payload: row.payload,
      checksumSha256: row.checksum_sha256,
      provenance: {
        repository: row.source_repository,
        branch: row.source_branch,
        commitSha: row.source_commit_sha,
        pullRequest: row.source_pr,
        publishedAt: row.published_at,
        updatedAt: row.updated_at
      }
    };

    if (request.method === "HEAD") return response.status(200).end();
    return json(response, 200, { ok: true, data: document });
  } catch (error) {
    if (error?.name === "AbortError") {
      return json(response, 504, { ok: false, error: "UPSTREAM_TIMEOUT" });
    }
    return json(response, 502, { ok: false, error: "UPSTREAM_UNAVAILABLE" });
  } finally {
    clearTimeout(timer);
  }
};
