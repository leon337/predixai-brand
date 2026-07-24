#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const effective = require("../assets/js/workforce-package-effective-config.js");

const root = path.resolve(__dirname, "..");
const questionnairePath = path.join(root, "data/employee-simulations/health/medical-testing-clinic/questions-and-suggested-answers.json");
const questionnaire = JSON.parse(fs.readFileSync(questionnairePath, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));
const expectCode = async (code, operation) => {
  await assert.rejects(operation, (error) => error?.code === code, `expected ${code}`);
};

const deeplyFrozen = (value, seen = new Set()) => {
  if (value === null || typeof value !== "object" || seen.has(value)) return true;
  seen.add(value);
  return Object.isFrozen(value) && Object.values(value).every((item) => deeplyFrozen(item, seen));
};

(async () => {
  const sourceSnapshot = JSON.stringify(questionnaire);
  const first = await effective.buildEffectiveAgentConfig({ packageDocument: questionnaire });
  const second = await effective.buildEffectiveAgentConfig({ packageDocument: clone(questionnaire) });

  assert.equal(first.package.packageId, "health-medical-testing-clinic-aurora");
  assert.equal(first.package.contentVersion, "0.1.0");
  assert.equal(first.metadata.questionCount, 19);
  assert.equal(first.metadata.bindingCount, 19);
  assert.equal(first.metadata.bindingSchemaVersion, effective.BINDING_SCHEMA_VERSION);
  assert.equal(first.metadata.omittedOptionalCount, 0);
  assert.equal(first.resolvedAnswers.length, 19);
  assert.equal(first.traceability.effectiveConfigHash, second.traceability.effectiveConfigHash);
  assert.equal(first.traceability.customizationHash, second.traceability.customizationHash);
  assert.equal(effective.stableCanonicalize(first), effective.stableCanonicalize(second));
  assert.equal(JSON.stringify(questionnaire), sourceSnapshot, "input document mutated");
  assert.ok(deeplyFrozen(first), "output must be deeply frozen");
  assert.equal(first.company.displayName, "Clínica Aurora Diagnósticos");
  assert.equal(first.employee.name, "Clara");
  assert.ok(first.resolvedAnswers.every((item) => item.promptInstruction && item.source === "suggested"));

  const edited = await effective.buildEffectiveAgentConfig({
    packageDocument: questionnaire,
    packageCustomization: {
      answerModes: { employee_name: "edit_suggested" },
      answers: { employee_name: "Clara NFC" },
      omittedOptionalFields: [],
      bindingSchemaVersion: effective.BINDING_SCHEMA_VERSION,
      updatedAt: "2026-07-24T00:00:00Z"
    }
  });
  assert.equal(edited.employee.name, "Clara NFC");
  assert.equal(edited.resolvedAnswers.find((item) => item.questionId === "employee_name").source, "user_edited");
  assert.notEqual(first.traceability.effectiveConfigHash, edited.traceability.effectiveConfigHash);

  const temporalA = await effective.buildEffectiveAgentConfig({
    packageDocument: questionnaire,
    packageCustomization: { answerModes: {}, answers: {}, omittedOptionalFields: [], updatedAt: "2026-07-24T01:00:00Z" }
  });
  const temporalB = await effective.buildEffectiveAgentConfig({
    packageDocument: questionnaire,
    packageCustomization: { answerModes: {}, answers: {}, omittedOptionalFields: [], updatedAt: "2027-01-01T01:00:00Z" }
  });
  assert.equal(temporalA.traceability.customizationHash, temporalB.traceability.customizationHash);

  const unicodeComposed = await effective.sha256({ value: "Clínica" });
  const unicodeDecomposed = await effective.sha256({ value: "Cli\u0301nica" });
  assert.equal(unicodeComposed, unicodeDecomposed);
  assert.notEqual(await effective.sha256(["a", "b"]), await effective.sha256(["b", "a"]));
  assert.equal(await effective.sha256({ b: 2, a: 1 }), await effective.sha256({ a: 1, b: 2 }));

  await expectCode("UNKNOWN_ANSWER_MODE", () => effective.buildEffectiveAgentConfig({
    packageDocument: questionnaire,
    packageCustomization: { answerModes: { employee_name: "invalid" } }
  }));
  await expectCode("REQUIRED_PACKAGE_QUESTION_OMITTED", () => effective.buildEffectiveAgentConfig({
    packageDocument: questionnaire,
    packageCustomization: { answerModes: { employee_name: "do_not_include" } }
  }));
  await expectCode("UNKNOWN_OR_DISABLED_OPTION", () => effective.buildEffectiveAgentConfig({
    packageDocument: questionnaire,
    packageCustomization: { answerModes: { service_region: "edit_suggested" }, answers: { service_region: "unknown" } }
  }));
  await expectCode("BINDING_SCHEMA_VERSION_MISMATCH", () => effective.buildEffectiveAgentConfig({
    packageDocument: questionnaire,
    packageCustomization: { bindingSchemaVersion: "0.9.0", answerModes: {}, answers: {}, omittedOptionalFields: [] }
  }));

  const duplicateBinding = clone(questionnaire);
  duplicateBinding.sections[0].questions[1].includeInPromptAs = "company.displayName";
  await expectCode("DUPLICATE_BINDING", () => effective.buildEffectiveAgentConfig({ packageDocument: duplicateBinding }));

  const unknownBinding = clone(questionnaire);
  unknownBinding.sections[0].questions[0].includeInPromptAs = "company.unknown";
  await expectCode("UNKNOWN_BINDING", () => effective.buildEffectiveAgentConfig({ packageDocument: unknownBinding }));

  const partialDocument = clone(questionnaire);
  partialDocument.sections = [{ ...partialDocument.sections[0], questions: [partialDocument.sections[0].questions[0]] }];
  await expectCode("REQUIRED_BINDINGS_MISSING", () => effective.buildEffectiveAgentConfig({ packageDocument: partialDocument }));

  const missingBindingDocument = clone(questionnaire);
  missingBindingDocument.sections[0].questions.splice(0, 1);
  await expectCode("REQUIRED_BINDINGS_MISSING", () => effective.buildEffectiveAgentConfig({ packageDocument: missingBindingDocument }));

  for (const malicious of ["__proto__.polluted", "company.prototype.value", "company.constructor.value", "company..name", "a.b.c.d.e"]) {
    assert.throws(() => effective.validateBindingPath(malicious));
  }
  assert.equal({}.polluted, undefined);

  const optional = clone(questionnaire);
  optional.sections[0].questions[0].required = false;
  const omitted = await effective.buildEffectiveAgentConfig({
    packageDocument: optional,
    packageCustomization: { answerModes: { company_display_name: "do_not_include" }, omittedOptionalFields: ["company_display_name"] }
  });
  assert.equal(omitted.metadata.omittedOptionalCount, 1);
  assert.equal(omitted.company?.displayName, undefined);
  assert.equal(omitted.metadata.bindingCount, 19);

  const mutationBefore = first.employee.name;
  try { first.employee.name = "mutated"; } catch {}
  assert.equal(first.employee.name, mutationBefore);

  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => effective.stableCanonicalize(cyclic), (error) => error?.code === "CYCLIC_REFERENCE");
  assert.throws(() => effective.stableCanonicalize({ bad: Number.NaN }), (error) => error?.code === "NON_FINITE_NUMBER");

  console.log("LEA_166_EFFECTIVE_CONFIG_CONTRACT=PASS");
  console.log("PACKAGE_QUESTIONS=19");
  console.log("BINDING_COVERAGE=100%");
  console.log("EXACT_BINDING_SET=PASS");
  console.log("PARTIAL_DOCUMENT_REJECTED=PASS");
  console.log("BINDING_SCHEMA_VERSION_MISMATCH_REJECTED=PASS");
  console.log("UNKNOWN_BINDINGS=0");
  console.log("DUPLICATE_BINDINGS=0");
  console.log("PROMPT_INSTRUCTION_COVERAGE=100%");
  console.log("PROTOTYPE_POLLUTION=BLOCK");
  console.log("DETERMINISTIC_HASH=PASS");
  console.log("UNICODE_NFC=PASS");
  console.log("OUTPUT_DEEP_FROZEN=PASS");
  console.log("INPUT_MUTATION=0");
})().catch((error) => {
  console.error("LEA_166_EFFECTIVE_CONFIG_CONTRACT=FAIL");
  console.error(error?.stack || error);
  process.exitCode = 1;
});