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
  assert.equal(first.metadata.promptInstructionMapVersion, effective.PROMPT_INSTRUCTION_MAP_VERSION);
  assert.equal(first.metadata.omittedOptionalCount, 0);
  assert.equal(first.resolvedAnswers.length, 19);
  assert.match(first.traceability.materializerMapHash, /^[a-f0-9]{64}$/);
  assert.equal(first.traceability.materializerMapHash, second.traceability.materializerMapHash);
  assert.equal(first.traceability.effectiveConfigHash, second.traceability.effectiveConfigHash);
  assert.equal(first.traceability.customizationHash, second.traceability.customizationHash);
  assert.equal(effective.stableCanonicalize(first), effective.stableCanonicalize(second));
  assert.equal(JSON.stringify(questionnaire), sourceSnapshot, "input document mutated");
  assert.ok(deeplyFrozen(first), "output must be deeply frozen");
  assert.equal(first.company.displayName, "Clínica Aurora Diagnósticos");
  assert.equal(first.employee.name, "Clara");
  assert.ok(first.resolvedAnswers.every((item) => item.promptInstruction && item.source === "suggested"));

  const redundantSuggested = await effective.buildEffectiveAgentConfig({
    packageDocument: questionnaire,
    packageCustomization: { answerModes: { employee_name: "use_suggested" }, answers: {}, omittedOptionalFields: [] }
  });
  assert.equal(redundantSuggested.traceability.customizationHash, first.traceability.customizationHash);
  assert.equal(redundantSuggested.traceability.effectiveConfigHash, first.traceability.effectiveConfigHash);

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

  const reversedInstructions = Object.fromEntries(Object.entries(effective.DEFAULT_MATERIALIZER_MAP.instructions).reverse());
  const reorderedMaterializer = {
    version: effective.PROMPT_INSTRUCTION_MAP_VERSION,
    instructions: reversedInstructions,
    packageId: effective.PACKAGE_ID
  };
  const reordered = await effective.buildEffectiveAgentConfig({ packageDocument: questionnaire, materializerMap: reorderedMaterializer });
  assert.equal(reordered.traceability.materializerMapHash, first.traceability.materializerMapHash);
  assert.equal(reordered.traceability.effectiveConfigHash, first.traceability.effectiveConfigHash);

  const changedMaterializer = clone(effective.DEFAULT_MATERIALIZER_MAP);
  changedMaterializer.instructions.employee_name = "Use rigorosamente como nome do funcionário de IA";
  const changedMaterialized = await effective.buildEffectiveAgentConfig({ packageDocument: questionnaire, materializerMap: changedMaterializer });
  assert.notEqual(changedMaterialized.traceability.materializerMapHash, first.traceability.materializerMapHash);
  assert.notEqual(changedMaterialized.traceability.effectiveConfigHash, first.traceability.effectiveConfigHash);
  const canonicalMaterializer = effective.validateMaterializerMap(effective.DEFAULT_MATERIALIZER_MAP, new Set(effective.EXPECTED_QUESTION_IDS));
  assert.equal(first.traceability.materializerMapHash, await effective.sha256(canonicalMaterializer));

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

  for (const field of ["answerModes", "answers", "omittedOptionalFields"]) {
    const customization = { answerModes: {}, answers: {}, omittedOptionalFields: [] };
    if (field === "omittedOptionalFields") customization[field] = ["unknown_question"];
    else customization[field] = { unknown_question: field === "answerModes" ? "use_suggested" : "orphan" };
    await expectCode("UNKNOWN_CUSTOMIZATION_ID", () => effective.buildEffectiveAgentConfig({ packageDocument: questionnaire, packageCustomization: customization }));
  }

  await expectCode("ORPHAN_CUSTOMIZATION_ANSWER", () => effective.buildEffectiveAgentConfig({
    packageDocument: questionnaire,
    packageCustomization: { answerModes: {}, answers: { employee_name: "resposta órfã" }, omittedOptionalFields: [] }
  }));
  await expectCode("ORPHAN_CUSTOMIZATION_ANSWER", () => effective.buildEffectiveAgentConfig({
    packageDocument: questionnaire,
    packageCustomization: { answerModes: { employee_name: "use_suggested" }, answers: { employee_name: "resposta órfã" }, omittedOptionalFields: [] }
  }));
  await expectCode("EDITED_ANSWER_REQUIRED", () => effective.buildEffectiveAgentConfig({
    packageDocument: questionnaire,
    packageCustomization: { answerModes: { employee_name: "edit_suggested" }, answers: {}, omittedOptionalFields: [] }
  }));
  await expectCode("DUPLICATE_OMITTED_OPTIONAL_ID", () => effective.buildEffectiveAgentConfig({
    packageDocument: questionnaire,
    packageCustomization: { answerModes: {}, answers: {}, omittedOptionalFields: ["company_display_name", "company_display_name"] }
  }));

  const duplicateBinding = clone(questionnaire);
  duplicateBinding.sections[0].questions[1].includeInPromptAs = "company.displayName";
  await expectCode("DUPLICATE_BINDING", () => effective.buildEffectiveAgentConfig({ packageDocument: duplicateBinding }));

  const unknownBinding = clone(questionnaire);
  unknownBinding.sections[0].questions[0].includeInPromptAs = "company.unknown";
  await expectCode("UNKNOWN_BINDING", () => effective.buildEffectiveAgentConfig({ packageDocument: unknownBinding }));

  const partialDocument = clone(questionnaire);
  partialDocument.sections = [{ ...partialDocument.sections[0], questions: [partialDocument.sections[0].questions[0]] }];
  await expectCode("REQUIRED_QUESTION_IDS_MISSING", () => effective.buildEffectiveAgentConfig({ packageDocument: partialDocument }));

  const unknownQuestionId = clone(questionnaire);
  unknownQuestionId.sections[0].questions[0].id = "unknown_question";
  await expectCode("REQUIRED_QUESTION_IDS_MISSING", () => effective.buildEffectiveAgentConfig({ packageDocument: unknownQuestionId }));

  const duplicateQuestionId = clone(questionnaire);
  duplicateQuestionId.sections[0].questions[1].id = duplicateQuestionId.sections[0].questions[0].id;
  await expectCode("DUPLICATE_QUESTION_ID", () => effective.buildEffectiveAgentConfig({ packageDocument: duplicateQuestionId }));

  const materializerMissing = clone(effective.DEFAULT_MATERIALIZER_MAP);
  delete materializerMissing.instructions.employee_name;
  await expectCode("MATERIALIZER_INSTRUCTIONS_MISSING", () => effective.buildEffectiveAgentConfig({ packageDocument: questionnaire, materializerMap: materializerMissing }));

  const materializerExtra = clone(effective.DEFAULT_MATERIALIZER_MAP);
  materializerExtra.instructions.unknown_question = "Não permitido";
  await expectCode("MATERIALIZER_INSTRUCTIONS_UNKNOWN", () => effective.buildEffectiveAgentConfig({ packageDocument: questionnaire, materializerMap: materializerExtra }));

  const materializerVersion = clone(effective.DEFAULT_MATERIALIZER_MAP);
  materializerVersion.version = 999;
  await expectCode("MATERIALIZER_MAP_VERSION_MISMATCH", () => effective.buildEffectiveAgentConfig({ packageDocument: questionnaire, materializerMap: materializerVersion }));

  const materializerPackage = clone(effective.DEFAULT_MATERIALIZER_MAP);
  materializerPackage.packageId = "outro-pacote";
  await expectCode("MATERIALIZER_MAP_PACKAGE_MISMATCH", () => effective.buildEffectiveAgentConfig({ packageDocument: questionnaire, materializerMap: materializerPackage }));

  const materializerInvalid = clone(effective.DEFAULT_MATERIALIZER_MAP);
  materializerInvalid.instructions.employee_name = "";
  await expectCode("MATERIALIZER_INSTRUCTION_INVALID", () => effective.buildEffectiveAgentConfig({ packageDocument: questionnaire, materializerMap: materializerInvalid }));

  for (const malicious of ["__proto__.polluted", "company.prototype.value", "company.constructor.value", "company..name", "a.b.c.d.e"]) {
    assert.throws(() => effective.validateBindingPath(malicious));
  }
  assert.equal({}.polluted, undefined);

  const optional = clone(questionnaire);
  optional.sections[0].questions[0].required = false;
  const omittedByList = await effective.buildEffectiveAgentConfig({
    packageDocument: optional,
    packageCustomization: { answerModes: {}, answers: {}, omittedOptionalFields: ["company_display_name"] }
  });
  const omittedByMode = await effective.buildEffectiveAgentConfig({
    packageDocument: optional,
    packageCustomization: { answerModes: { company_display_name: "do_not_include" }, answers: {}, omittedOptionalFields: [] }
  });
  assert.equal(omittedByList.metadata.omittedOptionalCount, 1);
  assert.equal(omittedByList.company?.displayName, undefined);
  assert.equal(omittedByList.metadata.bindingCount, 19);
  assert.equal(omittedByList.traceability.customizationHash, omittedByMode.traceability.customizationHash);
  assert.equal(omittedByList.traceability.effectiveConfigHash, omittedByMode.traceability.effectiveConfigHash);

  const mutationBefore = first.employee.name;
  try { first.employee.name = "mutated"; } catch {}
  assert.equal(first.employee.name, mutationBefore);

  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => effective.stableCanonicalize(cyclic), (error) => error?.code === "CYCLIC_REFERENCE");
  assert.throws(() => effective.stableCanonicalize({ bad: Number.NaN }), (error) => error?.code === "NON_FINITE_NUMBER");

  console.log("LEA_166_EFFECTIVE_CONFIG_CONTRACT=PASS");
  console.log("PACKAGE_QUESTIONS=19");
  console.log("QUESTION_ID_SET=EXACT");
  console.log("CUSTOMIZATION_IDS_VALIDATED=PASS");
  console.log("REDUNDANT_MODES_CANONICALIZED=PASS");
  console.log("SEMANTIC_CUSTOMIZATION_HASH=PASS");
  console.log("ORPHAN_CUSTOMIZATION_ANSWERS=REJECTED");
  console.log("EDITED_ANSWER_REQUIRED=PASS");
  console.log("MATERIALIZER_MAP_CONTRACT=CLOSED");
  console.log("MATERIALIZER_INSTRUCTION_SET=EXACT");
  console.log("MATERIALIZER_MAP_HASH=VERIFIED");
  console.log("MATERIALIZER_CONTENT_BOUND_TO_EFFECTIVE_HASH=PASS");
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