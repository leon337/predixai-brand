const { createHash } = require("node:crypto");

const serviceUrl = String(process.env["SUPABASE" + "_URL"] || "").trim().replace(/\/+$/, "");
const publicToken = String(process.env["SUPABASE" + "_PUBLISHABLE" + "_KEY"] || "").trim();
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(serviceUrl) && publicToken.length >= 20;
const MAX_BODY_BYTES = 20000;
const UPSTREAM_TIMEOUT_MS = 8000;

const legacyFields = new Set([
  "source","product_interest","person_name","business_name","city","state",
  "business_segment","preferred_contact","contact_value","current_tool",
  "main_problem","desired_result","commercial_interest","acceptable_price_range",
  "consent_contact","consent_news","details","utm_source","utm_medium",
  "utm_campaign","utm_content","utm_term","website"
]);

const k6Fields = new Set([
  ...legacyFields,
  "schema_version","submission_attempt_id","idempotency_key","payload_hash",
  "selected_technical_scope","readiness_summary","consent_version","privacy_notice_version"
]);

const products = new Set(["workforce","atendimento","pet","market","sob_medida","indefinido"]);
const sources = new Set(["site","home","workforce","workforce_k6","atendimento","pet","market","sob_medida","direto"]);
const contacts = new Set(["email","whatsapp"]);
const prices = new Set(["ate_49","50_99","100_199","200_399","400_mais","apos_demo"]);
const interests = new Set(["novidades","entrevista","diagnostico","demonstracao","piloto","proposta"]);
const scopeIds = new Set(["channel-integration","agenda-system","request-registration","business-content"]);
const readinessClasses = new Set([
  "NOT_ELIGIBLE_FOR_AUTOMATION",
  "NEEDS_TECHNICAL_EVALUATION",
  "NEEDS_BUSINESS_CONTENT",
  "READY_FOR_MANUAL_TEST"
]);

const clean = (value, max) => value === undefined || value === null ? "" : String(value).trim().slice(0, max);
const uniqueStrings = (value, maxItems, maxLength) => Array.isArray(value)
  ? [...new Set(value.map((item) => clean(item, maxLength)).filter(Boolean))].slice(0, maxItems)
  : [];

const stableNormalize = (value) => {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((result, key) => {
      if (value[key] !== undefined) result[key] = stableNormalize(value[key]);
      return result;
    }, {});
  }
  return value;
};
const stableStringify = (value) => JSON.stringify(stableNormalize(value));
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const fnv1a = (text) => {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
};
const expectedPayloadHash = (payload, suppliedHash) => {
  const canonical = stableStringify(payload);
  return suppliedHash.length === 8 ? fnv1a(canonical) : sha256(canonical);
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
    if (url.protocol !== "https:" && !new Set(["localhost","127.0.0.1"]).has(host)) return false;
    return host === "predixai-brand.vercel.app" ||
      host.endsWith(".vercel.app") ||
      host === "leon337.github.io" ||
      host === "localhost" ||
      host === "127.0.0.1";
  } catch {
    return false;
  }
};

const fingerprint = (request) => {
  const forwarded = header(request, "x-forwarded-for").split(",")[0].trim();
  const ip = forwarded || header(request, "x-real-ip").trim() || "unknown";
  const agent = header(request, "user-agent").slice(0, 300) || "unknown";
  return createHash("sha256").update(`${ip}|${agent}|predixai-leads-v4`).digest("hex");
};

const validateCommon = (body, allowedFields) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_PAYLOAD");
  if (Object.keys(body).some((key) => !allowedFields.has(key))) throw new Error("UNKNOWN_FIELDS");
  if (clean(body.website, 200)) throw new Error("SPAM_DETECTED");

  const preferred = clean(body.preferred_contact, 20).toLowerCase();
  const contactValue = clean(body.contact_value, 180);
  const product = clean(body.product_interest || "indefinido", 30).toLowerCase();
  const source = clean(body.source || "site", 30).toLowerCase();
  const price = clean(body.acceptable_price_range, 30).toLowerCase();

  if (!products.has(product)) throw new Error("INVALID_PRODUCT");
  if (!sources.has(source)) throw new Error("INVALID_SOURCE");
  if (!contacts.has(preferred)) throw new Error("INVALID_CONTACT_METHOD");
  if (price && !prices.has(price)) throw new Error("INVALID_PRICE_RANGE");
  if (preferred === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(contactValue)) throw new Error("INVALID_EMAIL");
  if (preferred === "whatsapp" && !/^\d{10,15}$/.test(contactValue.replace(/\D/g, ""))) throw new Error("INVALID_WHATSAPP");
  if (body.consent_contact !== true) throw new Error("CONSENT_REQUIRED");

  const person = clean(body.person_name, 120);
  const business = clean(body.business_name, 160);
  const city = clean(body.city, 120);
  const state = clean(body.state, 2).toUpperCase();
  const segment = clean(body.business_segment, 120);
  const tool = clean(body.current_tool, 180);
  const problem = clean(body.main_problem, 1000);
  const result = clean(body.desired_result, 500);

  if (person.length < 2) throw new Error("INVALID_PERSON_NAME");
  if (city.length < 2) throw new Error("INVALID_CITY");
  if (!/^[A-Z]{2}$/.test(state)) throw new Error("INVALID_STATE");
  if (segment.length < 2) throw new Error("INVALID_SEGMENT");
  if (problem.length < 2) throw new Error("INVALID_MAIN_PROBLEM");

  const selectedInterests = uniqueStrings(body.commercial_interest, 6, 30).map((item) => item.toLowerCase());
  if (!selectedInterests.length || selectedInterests.some((item) => !interests.has(item))) throw new Error("INVALID_COMMERCIAL_INTEREST");

  return {
    source,
    product_interest: product,
    person_name: person,
    business_name: business || "Profissional autônomo",
    city,
    state,
    business_segment: segment,
    preferred_contact: preferred,
    contact_value: contactValue,
    current_tool: tool || null,
    main_problem: problem,
    desired_result: result || null,
    commercial_interest: selectedInterests,
    acceptable_price_range: price || null,
    consent_contact: true,
    consent_news: body.consent_news === true,
    website: ""
  };
};

const normalizeLegacy = (body) => {
  const common = validateCommon(body, legacyFields);
  const details = body.details && typeof body.details === "object" && !Array.isArray(body.details) ? body.details : {};
  return {
    ...common,
    details,
    utm_source: clean(body.utm_source, 120) || null,
    utm_medium: clean(body.utm_medium, 120) || null,
    utm_campaign: clean(body.utm_campaign, 120) || null,
    utm_content: clean(body.utm_content, 120) || null,
    utm_term: clean(body.utm_term, 120) || null
  };
};

const normalizeK6 = (body) => {
  const common = validateCommon(body, k6Fields);
  if (clean(body.schema_version, 10) !== "2.0") throw new Error("INVALID_SCHEMA_VERSION");

  const submissionAttemptId = clean(body.submission_attempt_id, 160);
  const idempotencyKey = clean(body.idempotency_key, 160);
  const payloadHash = clean(body.payload_hash, 64).toLowerCase();
  const selectedScope = uniqueStrings(body.selected_technical_scope, 6, 80).sort();
  const readinessSummary = Array.isArray(body.readiness_summary) ? body.readiness_summary.slice(0, 12) : [];

  if (submissionAttemptId.length < 8) throw new Error("INVALID_SUBMISSION_ATTEMPT");
  if (idempotencyKey.length < 8) throw new Error("INVALID_IDEMPOTENCY_KEY");
  if (!/^[0-9a-f]{64}$/.test(payloadHash) && !/^[0-9a-f]{8}$/.test(payloadHash)) throw new Error("INVALID_PAYLOAD_HASH");
  if (!selectedScope.length || selectedScope.some((item) => !scopeIds.has(item))) throw new Error("INVALID_TECHNICAL_SCOPE");

  const safeReadiness = readinessSummary.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("INVALID_READINESS_SUMMARY");
    const capabilityId = clean(item.capabilityId, 80);
    const classification = clean(item.classification, 80);
    if (!capabilityId || !readinessClasses.has(classification) || classification === "NOT_ELIGIBLE_FOR_AUTOMATION") {
      throw new Error("INVALID_READINESS_SUMMARY");
    }
    return { capabilityId, classification };
  }).sort((a, b) => a.capabilityId.localeCompare(b.capabilityId));

  const canonicalWithoutHash = {
    schema_version: "2.0",
    submission_attempt_id: submissionAttemptId,
    idempotency_key: idempotencyKey,
    ...common,
    selected_technical_scope: selectedScope,
    readiness_summary: safeReadiness,
    consent_version: clean(body.consent_version, 40) || "1.0",
    privacy_notice_version: clean(body.privacy_notice_version, 40) || "4.0"
  };
  const recomputed = expectedPayloadHash(canonicalWithoutHash, payloadHash);
  if (recomputed !== payloadHash) throw new Error("PAYLOAD_HASH_MISMATCH");

  return { ...canonicalWithoutHash, payload_hash: payloadHash };
};

const statusFor = (code) => code === "RATE_LIMIT" ? 429 :
  code === "SPAM_DETECTED" ? 400 :
  code === "ORIGIN_NOT_ALLOWED" ? 403 :
  code === "SERVICE_CONFIG_MISSING" ? 503 :
  code === "JSON_REQUIRED" ? 415 :
  code === "PAYLOAD_HASH_MISMATCH" ? 409 :
  422;

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (request.method === "GET" || request.method === "HEAD") {
    return response.status(200).json({ ok: true, service: "predixai-leads", accepts: ["1.0", "2.0"], configured });
  }
  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, HEAD, POST");
    return response.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }
  if (!configured) return response.status(503).json({ ok: false, error: "SERVICE_CONFIG_MISSING" });
  if (!allowedOrigin(request)) return response.status(403).json({ ok: false, error: "ORIGIN_NOT_ALLOWED" });
  if (!String(request.headers["content-type"] || "").toLowerCase().includes("application/json")) {
    return response.status(415).json({ ok: false, error: "JSON_REQUIRED" });
  }
  if (Number(request.headers["content-length"] || 0) > MAX_BODY_BYTES) {
    return response.status(413).json({ ok: false, error: "PAYLOAD_TOO_LARGE" });
  }

  let raw = request.body;
  if (typeof raw === "string") {
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return response.status(413).json({ ok: false, error: "PAYLOAD_TOO_LARGE" });
    try { raw = JSON.parse(raw); } catch { return response.status(400).json({ ok: false, error: "INVALID_JSON" }); }
  }

  const isK6 = clean(raw?.schema_version, 10) === "2.0";
  let payload;
  try {
    payload = isK6 ? normalizeK6(raw) : normalizeLegacy(raw);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_PAYLOAD";
    return response.status(statusFor(code)).json({ ok: false, error: code });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const rpc = isK6 ? "submit_commercial_lead_k6" : "submit_commercial_lead";

  try {
    const upstream = await fetch(`${serviceUrl}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      headers: {
        [["api","key"].join("")]: publicToken,
        [["author","ization"].join("")]: ["Bear","er "].join("") + publicToken,
        "content-type": "application/json",
        "x-client-info": "predixai-brand-site/4.1",
        "x-predixai-fingerprint": fingerprint(request)
      },
      body: JSON.stringify({ payload }),
      signal: controller.signal
    });

    const text = await upstream.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!upstream.ok) {
      const message = typeof data === "object" && data ? String(data.message || data.error || "") : String(data || "");
      const known = [
        "RATE_LIMIT","SPAM_DETECTED","CONSENT_REQUIRED","IDEMPOTENCY_CONFLICT",
        "INVALID_PAYLOAD","UNKNOWN_FIELDS","INVALID_TECHNICAL_SCOPE","PAYLOAD_HASH_MISMATCH"
      ].find((code) => message.includes(code));
      console.error("Lead API upstream rejection", { status: upstream.status, code: known || "UPSTREAM_REJECTED", rpc });
      if (upstream.status >= 500) return response.status(503).json({ ok: false, error: "UPSTREAM_UNAVAILABLE" });
      return response.status(known === "RATE_LIMIT" ? 429 : known === "IDEMPOTENCY_CONFLICT" ? 409 : 422).json({ ok: false, error: known || "VALIDATION_REJECTED" });
    }

    const leadId = typeof data === "string" ? data : data?.id || data?.lead_id || null;
    return response.status(isK6 ? 200 : 201).json({
      ok: true,
      lead_id: leadId,
      submission_id: isK6 ? payload.submission_attempt_id : null,
      idempotent: isK6,
      next: "/obrigado/"
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    console.error("Lead API unavailable", { name: error instanceof Error ? error.name : "UnknownError", timedOut, rpc });
    return response.status(503).json({ ok: false, error: timedOut ? "UPSTREAM_TIMEOUT" : "SERVICE_UNAVAILABLE" });
  } finally {
    clearTimeout(timer);
  }
};

module.exports.normalizeLegacy = normalizeLegacy;
module.exports.normalizeK6 = normalizeK6;
module.exports.allowedOrigin = allowedOrigin;
module.exports.stableStringify = stableStringify;
module.exports.expectedPayloadHash = expectedPayloadHash;
