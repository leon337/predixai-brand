const targetBranch = "ptp-web-2-workforce-k6-questionnaire-r2";
const packageId = "health-medical-testing-clinic-aurora";
const contentVersion = "0.1.0";
const checksum = "940efb5e8ccb1ce23a078e90b78002218851af1322e815f7e2d8040f1300fa69";

const vercelEnv = String(process.env.VERCEL_ENV || "");
const branch = String(process.env.VERCEL_GIT_COMMIT_REF || "");

if (vercelEnv !== "preview" || branch !== targetBranch) {
  console.log("VERCEL_SUPABASE_PREVIEW_CHECK=SKIP_NON_TARGET");
  process.exit(0);
}

const serviceUrl = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const publicToken = String(process.env.SUPABASE_PUBLISHABLE_KEY || "").trim();

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(serviceUrl)) {
  throw new Error("SUPABASE_URL_INVALID_OR_MISSING");
}
if (!publicToken.startsWith("sb_publishable_") && publicToken.split(".").length !== 3) {
  throw new Error("SUPABASE_PUBLISHABLE_KEY_INVALID_OR_MISSING");
}

const headers = {
  apikey: publicToken,
  "content-type": "application/json",
  Accept: "application/json",
  "x-client-info": "predixai-brand-vercel-preview-check/1.0"
};
if (!publicToken.startsWith("sb_publishable_")) headers.Authorization = `Bearer ${publicToken}`;

(async () => {
  const response = await fetch(`${serviceUrl}/rest/v1/rpc/get_published_workforce_catalog`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      p_package_id: packageId,
      p_content_version: contentVersion
    })
  });

  if (!response.ok) throw new Error(`SUPABASE_RPC_HTTP_${response.status}`);
  const rows = JSON.parse(await response.text());
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error("SUPABASE_RPC_ROW_COUNT_INVALID");

  const row = rows[0];
  if (row.package_id !== packageId || row.content_version !== contentVersion) throw new Error("PACKAGE_IDENTITY_MISMATCH");
  if (row.status !== "published" || row.fictional !== true) throw new Error("PACKAGE_STATUS_INVALID");
  if (row.checksum_sha256 !== checksum) throw new Error("PACKAGE_CHECKSUM_MISMATCH");
  if (!row.payload || typeof row.payload !== "object" || Array.isArray(row.payload)) throw new Error("PACKAGE_PAYLOAD_INVALID");
  if (Object.keys(row.payload).length !== 10) throw new Error("PACKAGE_COMPONENT_COUNT_INVALID");

  console.log("VERCEL_SUPABASE_PREVIEW_CHECK=PASS");
  console.log("SOURCE=supabase_published_package");
  console.log(`PACKAGE_ID=${packageId}`);
  console.log(`CONTENT_VERSION=${contentVersion}`);
  console.log(`CHECKSUM_SHA256=${checksum}`);
  console.log("PAYLOAD_COMPONENTS=10");
})().catch((error) => {
  console.error(`VERCEL_SUPABASE_PREVIEW_CHECK=FAIL:${error.message}`);
  process.exit(1);
});
