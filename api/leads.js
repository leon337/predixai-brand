const SUPABASE_URL = process.env.SUPABASE_URL || "https://vcmvdmxmkmekcurcfdze.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_jtl_BpCayPEQk-GuBwXajg_zhWvBUNN";

const MAX_BODY_BYTES = 16_000;
const ALLOWED_FIELDS = new Set([
  "source", "product_interest", "person_name", "business_name", "city", "state",
  "business_segment", "preferred_contact", "contact_value", "current_tool",
  "main_problem", "desired_result", "commercial_interest", "acceptable_price_range",
  "consent_contact", "consent_news", "details", "utm_source", "utm_medium",
  "utm_campaign", "utm_content", "utm_term", "website"
]);

const PRODUCTS = new Set(["atendimento", "pet", "market", "indefinido"]);
const SOURCES = new Set(["site", "home", "atendimento", "pet", "market", "direto"]);
const CONTACT_METHODS = new Set(["email", "whatsapp"]);
const PRICE_RANGES = new Set(["ate_49", "50_99", "100_199", "200_399", "400_mais", "apos_demo"]);
const COMMERCIAL_INTERESTS = new Set(["novidades", "entrevista", "demonstracao", "piloto", "proposta"]);

const trimText = (value, maxLength) => {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
};

const cleanDetails = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowed = new Set([
    "daily_volume", "channels", "organization_method", "services", "monthly_volume",
    "pet_problems", "cash_registers", "equipment", "market_operation", "offline_operation"
  ]);
  const result = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!allowed.has(key)) continue;
    if (Array.isArray(raw)) {
      result[key] = raw.map((item) => trimText(item, 80)).filter(Boolean).slice(0, 10);
    } else {
      const text = trimText(raw, 180);
      if (text) result[key] = text;
    }
  }
  return result;
};

const normalizeBody = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_PAYLOAD");

  const unknown = Object.keys(body).filter((key) => !ALLOWED_FIELDS.has(key));
  if (unknown.length) throw new Error("UNKNOWN_FIELDS");

  const preferredContact = trimText(body.preferred_contact, 20).toLowerCase();
  const contactValue = trimText(body.contact_value, 180);
  const productInterest = trimText(body.product_interest || "indefinido", 30).toLowerCase();
  const source = trimText(body.source || "site", 30).toLowerCase();
  const priceRange = trimText(body.acceptable_price_range, 30).toLowerCase();

  if (!PRODUCTS.has(productInterest)) throw new Error("INVALID_PRODUCT");
  if (!SOURCES.has(source)) throw new Error("INVALID_SOURCE");
  if (!CONTACT_METHODS.has(preferredContact)) throw new Error("INVALID_CONTACT_METHOD");
  if (priceRange && !PRICE_RANGES.has(priceRange)) throw new Error("INVALID_PRICE_RANGE");
  if (trimText(body.website, 200)) throw new Error("SPAM_DETECTED");

  const personName = trimText(body.person_name, 120);
  const businessName = trimText(body.business_name, 160);
  const city = trimText(body.city, 120);
  const state = trimText(body.state, 2).toUpperCase();
  const segment = trimText(body.business_segment, 120);
  const currentTool = trimText(body.current_tool, 180);
  const mainProblem = trimText(body.main_problem, 1000);
  const desiredResult = trimText(body.desired_result, 500);

  if (personName.length < 2) throw new Error("INVALID_PERSON_NAME");
  if (businessName.length < 2) throw new Error("INVALID_BUSINESS_NAME");
  if (city.length < 2) throw new Error("INVALID_CITY");
  if (!/^[A-Z]{2}$/.test(state)) throw new Error("INVALID_STATE");
  if (segment.length < 2) throw new Error("INVALID_SEGMENT");
  if (mainProblem.length < 2) throw new Error("INVALID_MAIN_PROBLEM");

  if (preferredContact === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(contactValue)) throw new Error("INVALID_EMAIL");
  if (preferredContact === "whatsapp" && !/^\d{10,15}$/.test(contactValue.replace(/\D/g, ""))) throw new Error("INVALID_WHATSAPP");
  if (body.consent_contact !== true) throw new Error("CONSENT_REQUIRED");

  const commercialInterest = Array.isArray(body.commercial_interest)
    ? [...new Set(body.commercial_interest.map((item) => trimText(item, 30).toLowerCase()))]
    : [];
  if (commercialInterest.length > 5 || commercialInterest.some((item) => !COMMERCIAL_INTERESTS.has(item))) {
    throw new Error("INVALID_COMMERCIAL_INTEREST");
  }

  return {
    source,
    product_interest: productInterest,
    person_name: personName,
    business_name: businessName,
    city,
    state,
    business_segment: segment,
    preferred_contact: preferredContact,
    contact_value: contactValue,
    current_tool: currentTool || null,
    main_problem: mainProblem,
    desired_result: desiredResult || null,
    commercial_interest: commercialInterest,
    acceptable_price_range: priceRange || null,
    consent_contact: true,
    consent_news: body.consent_news === true,
    details: cleanDetails(body.details),
    utm_source: trimText(body.utm_source, 120) || null,
    utm_medium: trimText(body.utm_medium, 120) || null,
    utm_campaign: trimText(body.utm_campaign, 120) || null,
    utm_content: trimText(body.utm_content, 120) || null,
    utm_term: trimText(body.utm_term, 120) || null,
    website: ""
  };
};

const errorStatus = (code) => code === "RATE_LIMIT" ? 429 : code === "SPAM_DETECTED" ? 400 : 422;

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const contentType = String(request.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("application/json")) return response.status(415).json({ ok: false, error: "JSON_REQUIRED" });

  const announcedLength = Number(request.headers["content-length"] || 0);
  if (announcedLength > MAX_BODY_BYTES) return response.status(413).json({ ok: false, error: "PAYLOAD_TOO_LARGE" });

  let rawBody = request.body;
  if (typeof rawBody === "string") {
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) return response.status(413).json({ ok: false, error: "PAYLOAD_TOO_LARGE" });
    try { rawBody = JSON.parse(rawBody); } catch { return response.status(400).json({ ok: false, error: "INVALID_JSON" }); }
  }

  let payload;
  try { payload = normalizeBody(rawBody); }
  catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_PAYLOAD";
    return response.status(errorStatus(code)).json({ ok: false, error: code });
  }

  try {
    const upstream = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_commercial_lead`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "content-type": "application/json",
        "x-client-info": "predixai-brand-site/1.0"
      },
      body: JSON.stringify({ payload })
    });

    const text = await upstream.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!upstream.ok) {
      const upstreamMessage = typeof data === "object" && data ? String(data.message || "") : "";
      const mapped = ["RATE_LIMIT", "SPAM_DETECTED", "CONSENT_REQUIRED"].find((code) => upstreamMessage.includes(code));
      console.error("Lead API upstream rejection", { status: upstream.status, code: mapped || "UPSTREAM_REJECTED" });
      return response.status(mapped === "RATE_LIMIT" ? 429 : 422).json({ ok: false, error: mapped || "VALIDATION_REJECTED" });
    }

    return response.status(201).json({ ok: true, lead_id: typeof data === "string" ? data : null, next: "/obrigado/" });
  } catch (error) {
    console.error("Lead API unavailable", { name: error instanceof Error ? error.name : "UnknownError" });
    return response.status(503).json({ ok: false, error: "SERVICE_UNAVAILABLE" });
  }
};
