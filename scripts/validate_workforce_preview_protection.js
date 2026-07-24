const path = require("node:path");

const root = path.resolve(__dirname, "..");
const assert = (condition, code) => {
  if (!condition) throw new Error(code);
};

global.window = global;
global.location = {
  hostname: "predixai-brand-preview.vercel.app",
  search: "?package=health-medical-testing-clinic-aurora&_vercel_share=mobile-preview-token",
  href: "https://predixai-brand-preview.vercel.app/funcionario-ia-gratis/?package=health-medical-testing-clinic-aurora&_vercel_share=mobile-preview-token"
};

require(path.join(root, "assets/js/workforce-package-client.js"));

const client = global.PredixWorkforcePackageClient;
const runtime = global.PredixWorkforcePackageRuntime;
const endpoint = client.endpoint();

assert(endpoint.includes("packageId=health-medical-testing-clinic-aurora"), "PACKAGE_QUERY_MISSING");
assert(endpoint.includes("contentVersion=0.1.0"), "CONTENT_VERSION_QUERY_MISSING");
assert(endpoint.includes("_vercel_share=mobile-preview-token"), "VERCEL_SHARE_TOKEN_NOT_FORWARDED");

let requestOptions = null;
const protectedFetch = async (_url, options) => {
  requestOptions = options;
  return {
    ok: false,
    status: 401,
    json: async () => ({ error: { code: "VERCEL_AUTH_REQUIRED" } })
  };
};

(async () => {
  let message = "";
  try {
    await client.loadPackage(protectedFetch);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  assert(requestOptions?.credentials === "same-origin", "PREVIEW_COOKIE_CREDENTIALS_NOT_INCLUDED");
  assert(message === "VERCEL_AUTH_REQUIRED", "OBJECT_ERROR_NOT_NORMALIZED");
  assert(runtime.error === "VERCEL_AUTH_REQUIRED", "RUNTIME_ERROR_NOT_NORMALIZED");
  assert(!message.includes("[object Object]"), "OBJECT_OBJECT_LEAKED_TO_UI");

  console.log("K7_8_2A_14_PREVIEW_SHARE_TOKEN_FORWARDING=PASS");
  console.log("K7_8_2A_14_PREVIEW_COOKIE_CREDENTIALS=PASS");
  console.log("K7_8_2A_14_REMOTE_ERROR_NORMALIZATION=PASS");
})().catch((error) => {
  console.error(`K7_8_2A_14_PREVIEW_PROTECTION=FAIL:${error.message}`);
  process.exit(1);
});
