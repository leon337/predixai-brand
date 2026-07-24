"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const fail = (code) => {
  console.error(`LEA_167_VALIDATION=FAIL:${code}`);
  process.exit(1);
};
const assert = (condition, code) => { if (!condition) fail(code); };

const html = read("funcionario-ia-gratis/index.html");
const projectionSource = read("assets/js/workforce-package-projection.js");
const builderSource = read("assets/js/employee-builder.js");
const promptSource = read("assets/js/workforce-package-prompt.js");

const scriptOrder = [
  "workforce-package-effective-config.js",
  "employee-builder.js",
  "workforce-package-projection.js",
  "workforce-package-ui.js"
].map((name) => html.indexOf(name));
assert(scriptOrder.every((index) => index >= 0), "SCRIPT_REFERENCE_MISSING");
assert(scriptOrder.every((index, position) => position === 0 || index > scriptOrder[position - 1]), "SCRIPT_ORDER_INVALID");

assert(projectionSource.includes("PredixWorkforceEffectiveConfig"), "EFFECTIVE_CONFIG_NOT_CONSUMED");
assert(projectionSource.includes("buildEffectiveAgentConfig"), "EFFECTIVE_CONFIG_BUILDER_NOT_USED");
assert(projectionSource.includes('runtime?.active && runtime?.status === "READY"'), "PACKAGE_READY_GATE_MISSING");
assert(projectionSource.includes('api.status = "FAILED"'), "FAIL_CLOSED_STATE_MISSING");
assert(projectionSource.includes("MutationObserver"), "RERENDER_OBSERVER_MISSING");
assert(projectionSource.includes('communication.tone'), "TONE_PROJECTION_MISSING");
assert(projectionSource.includes('communication.responseLength'), "RESPONSE_LENGTH_PROJECTION_MISSING");
assert(projectionSource.includes("companyDisplayName"), "COMPANY_PROJECTION_MISSING");
assert(projectionSource.includes("employeePresentation"), "EMPLOYEE_PRESENTATION_PROJECTION_MISSING");
assert(projectionSource.includes("data-package-projection-hidden"), "GENERIC_CONTROL_RESTORE_MISSING");

const projection = require(path.join(root, "assets/js/workforce-package-projection.js"));
const sample = projection.buildVisualProjection({
  employee: { name: "Sophia", presentation: "Atendente de IA" },
  company: { displayName: "Clínica Ciame" },
  communication: { tone: "professional", responseLength: "short" },
  traceability: { effectiveConfigHash: "abc123" },
  resolvedAnswers: [
    { binding: "communication.tone", rawValue: "professional", displayValue: "Profissional e claro" },
    { binding: "communication.responseLength", rawValue: "short", displayValue: "Respostas curtas" }
  ]
});
assert(Object.isFrozen(sample), "PROJECTION_NOT_FROZEN");
assert(sample.employeeName === "Sophia", "EMPLOYEE_NAME_NOT_PROJECTED");
assert(sample.employeePresentation === "Atendente de IA", "EMPLOYEE_PRESENTATION_NOT_PROJECTED");
assert(sample.companyDisplayName === "Clínica Ciame", "COMPANY_NAME_NOT_PROJECTED");
assert(sample.tone === "Profissional e claro", "TONE_DISPLAY_NOT_PROJECTED");
assert(sample.responseLength === "Respostas curtas", "RESPONSE_LENGTH_NOT_PROJECTED");

assert(builderSource.includes("const employeeById"), "GENERIC_EMPLOYEE_LOOKUP_REMOVED");
assert(builderSource.includes("base.generatePromptArtifact") || promptSource.includes("base.generatePromptArtifact"), "GENERIC_PROMPT_FALLBACK_REMOVED");
assert(promptSource.includes("evaluateCustomization"), "LEA_168_SCOPE_PREMATURELY_CHANGED");
assert(!projectionSource.includes("supabase.co"), "DIRECT_SUPABASE_ACCESS_FOUND");
assert(!projectionSource.includes("fetch("), "NETWORK_ACCESS_FOUND");
assert(!projectionSource.includes("sessionStorage"), "NEW_PERSISTED_SOURCE_FOUND");

console.log("LEA_167_VALIDATION=PASS");
console.log("EFFECTIVE_CONFIG_SCRIPT_LOADED=PASS");
console.log("PACKAGE_READY_REQUIRED=PASS");
console.log("PACKAGE_FAILURE_FAIL_CLOSED=PASS");
console.log("CUSTOM_EMPLOYEE_NAME_PROJECTED=PASS");
console.log("CUSTOM_COMPANY_NAME_PROJECTED=PASS");
console.log("CUSTOM_EMPLOYEE_PRESENTATION_PROJECTED=PASS");
console.log("CUSTOM_TONE_PROJECTED=PASS");
console.log("CUSTOM_RESPONSE_LENGTH_PROJECTED=PASS");
console.log("GENERIC_PATH_PRESERVED=PASS");
console.log("LEA_168_STARTED=NO");
