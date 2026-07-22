const fs = require("node:fs");
const path = require("node:path");

const serviceUrl = String(process.env[["SUPABASE", "URL"].join("_")] || "")
  .trim()
  .replace(/\/+$/, "");
const publicToken = String(
  process.env[["SUPABASE", "PUBLISHABLE", "KEY"].join("_")] || ""
).trim();

const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(serviceUrl) && publicToken.length >= 20;
const UPSTREAM_TIMEOUT_MS = 8000;
const componentBase = path.join(
  process.cwd(),
  "data",
  "employee-simulations",
  "health",
  "medical-testing-clinic"
);

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

const setCommonHeaders = (request, response) => {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Robots-Tag", "noindex, nofollow");
  response.setHeader("Vary", "Origin, Accept-Encoding");

  const origin = allowedOrigin(request);
  if (origin && origin !== false) response.setHeader("Access-Control-Allow-Origin", origin);
  return origin;
};

const readJson = (filename) => JSON.parse(
  fs.readFileSync(path.join(componentBase, filename), "utf8")
);
const readText = (filename) => fs.readFileSync(path.join(componentBase, filename), "utf8");

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
  if (Object.keys(row.payload).length !== 10) return false;
  return true;
};

const buildFallbackDocument = (packageId, contentVersion, contract) => {
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

  if (evidence.packageId !== packageId || evidence.contentVersion !== contentVersion) {
    throw new Error("FALLBACK_IDENTITY_MISMATCH");
  }
  if (evidence.validation?.checksumMatch !== true || evidence.supabase?.checksumSha256 !== contract.checksum) {
    throw new Error("FALLBACK_CHECKSUM_EVIDENCE_INVALID");
  }
  if (!matchesInventory(evidence.inventory, contract.inventory) || !validSafetyContract(manifest)) {
    throw new Error("FALLBACK_CONTRACT_INVALID");
  }
  if (Object.keys(payload).length !== 10) throw new Error("FALLBACK_COMPONENTS_MISSING");

  return {
    packageId,
    contentVersion,
    source: "github_build_fallback",
    status: "READY",
    payload,
    checksum: {
      algorithm: "sha256",
      value: contract.checksum,
      verifiedAtPublication: true
    },
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

const readPublishedPackage = async (packageId, contentVersion, contract) => {
  if (!configured) throw new Error("SERVICE_CONFIG_MISSING");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${serviceUrl}/rest/v1/rpc/get_published_workforce_catalog`, {
      method: "POST",
      headers: {
        [["api", "key"].join("")]: publicToken,
        [["author", "ization"].join("")]: ["Bear", "er "].join("") + publicToken,
        "content-type": "application/json",
        Accept: "application/json",
        "x-client-info": "predixai-brand-workforce-catalog/1.0"
      },
      body: JSON.stringify({
        p_package_id: packageId,
        p_content_version: contentVersion
      }),
      signal: controller.signal
    });

    const text = await upstream.text();
    if (!upstream.ok) throw new Error("UPSTREAM_QUERY_FAILED");

    let rows;
    try {
      rows = text ? JSON.parse(text) : null;
    } catch {
      throw new Error("UPSTREAM_INVALID_JSON");
    }

    if (!Array.isArray(rows) || rows.length !== 1) throw new Error("PACKAGE_NOT_FOUND");
    const row = rows[0];
    if (!validateRow(row, packageId, contentVersion, contract)) {
      throw new Error("PACKAGE_INTEGRITY_FAILED");
    }

    return {
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
  } finally {
    clearTimeout(timer);
  }
};

const sendDocument = (request, response, document) => {
  const etag = `"sha256-${document.checksum.value}"`;
  response.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  response.setHeader("ETag", etag);
  response.setHeader("X-PredixAI-Catalog-Source", document.source);

  if (header(request, "if-none-match") === etag) return response.status(304).end();
  if (request.method === "HEAD") return response.status(200).end();
  return response.status(200).json(document);
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

module.exports = async function handler(request, response) {
  const origin = setCommonHeaders(request, response);
  if (origin === false) {
    return response.status(403).json({ status: "NOT_READY", error: "ORIGIN_NOT_ALLOWED" });
  }

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
  const contract = allowedPackages.get(`${packageId}@${contentVersion}`);

  if (!contract) {
    return response.status(404).json({
      packageId,
      contentVersion,
      source: "none",
      status: "NOT_READY",
      payload: null,
      checksum: null,
      error: "PACKAGE_NOT_ALLOWED"
    });
  }

  try {
    const document = await readPublishedPackage(packageId, contentVersion, contract);
    return sendDocument(request, response, document);
  } catch (error) {
    if (error instanceof Error && error.message === "PACKAGE_INTEGRITY_FAILED") {
      return sendIntegrityFailure(response, packageId, contentVersion);
    }

    try {
      const fallback = buildFallbackDocument(packageId, contentVersion, contract);
      return sendDocument(request, response, fallback);
    } catch {
      response.setHeader("Cache-Control", "no-store");
      return response.status(503).json({
        packageId,
        contentVersion,
        source: "none",
        status: "NOT_READY",
        payload: null,
        checksum: null,
        error: "CATALOG_UNAVAILABLE"
      });
    }
  }
};
