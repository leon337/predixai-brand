(() => {
  "use strict";

  const PACKAGE_ID = "health-medical-testing-clinic-aurora";
  const SCHEMA_VERSION = "1.0.0";
  const BINDING_SCHEMA_VERSION = "1.0.0";
  const PROMPT_INSTRUCTION_MAP_VERSION = 1;
  const CANONICALIZATION_VERSION = 1;
  const MODES = Object.freeze({ suggested: "use_suggested", edited: "edit_suggested", omitted: "do_not_include" });
  const SOURCES = Object.freeze({ suggested: "suggested", edited: "user_edited" });
  const FORBIDDEN_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);
  const TEMPORAL_FIELDS = new Set(["createdAt", "updatedAt", "sessionId", "tabInstanceId"]);

  const ALLOWED_BINDINGS = Object.freeze([
    "company.displayName", "company.description", "company.serviceRegion", "company.audiences",
    "employee.name", "employee.presentation", "employee.initialMessage",
    "communication.tone", "communication.responseLength", "communication.emojiPolicy", "communication.handoffPhrase",
    "operation.channels", "operation.currentWorkflow", "operation.dailyDemand", "operation.priorityRequests",
    "knowledge.authorizedSources", "knowledge.unknownInformationBehavior",
    "output.responseStructure", "output.serviceSummary"
  ]);
  const ALLOWED_BINDING_SET = new Set(ALLOWED_BINDINGS);

  const PROMPT_INSTRUCTIONS = Object.freeze({
    company_display_name: "Use como nome da empresa",
    business_description: "Descreva a empresa como",
    service_region: "Considere como região de atendimento",
    primary_audience: "Considere como públicos autorizados",
    employee_name: "Use como nome do funcionário de IA",
    employee_role_label: "Apresente o funcionário como",
    initial_message: "Use como mensagem inicial",
    communication_tone: "Adote o tom de comunicação",
    response_length: "Mantenha as respostas no padrão",
    emoji_policy: "Aplique a política de emojis",
    handoff_phrase: "Use no encaminhamento humano",
    primary_channels: "Considere como canais do cenário fictício",
    current_workflow: "Considere como fluxo operacional atual",
    daily_demand: "Considere como demanda diária fictícia",
    priority_request_types: "Priorize os tipos de solicitação",
    authorized_sources: "Use somente as fontes autorizadas",
    unknown_information_behavior: "Quando faltar informação",
    response_structure: "Estruture as respostas para",
    service_summary: "Ao finalizar o atendimento"
  });
  const EXPECTED_QUESTION_IDS = Object.freeze(Object.keys(PROMPT_INSTRUCTIONS));
  const EXPECTED_QUESTION_ID_SET = new Set(EXPECTED_QUESTION_IDS);
  const DEFAULT_MATERIALIZER_MAP = Object.freeze({
    packageId: PACKAGE_ID,
    version: PROMPT_INSTRUCTION_MAP_VERSION,
    instructions: PROMPT_INSTRUCTIONS
  });

  const fail = (code, detail = "") => {
    const error = new Error(detail ? `${code}:${detail}` : code);
    error.code = code;
    throw error;
  };

  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  const cloneValue = (value) => {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (isPlainObject(value)) {
      const output = Object.create(null);
      for (const key of Object.keys(value)) output[key] = cloneValue(value[key]);
      return output;
    }
    return value;
  };

  const flattenQuestions = (document) => {
    const sections = document?.sections || document?.payload?.questionnaire?.sections || document?.payload?.questions?.sections;
    if (!Array.isArray(sections)) fail("PACKAGE_QUESTION_SECTIONS_REQUIRED");
    return sections.flatMap((section) => Array.isArray(section?.questions) ? section.questions : []);
  };

  const assertExactIdSet = ({ actualIds, expectedIds, missingCode, extraCode, mismatchCode }) => {
    const actual = new Set(actualIds);
    const expected = new Set(expectedIds);
    const missing = expectedIds.filter((id) => !actual.has(id));
    const extra = actualIds.filter((id) => !expected.has(id));
    if (missing.length) fail(missingCode, missing.join(","));
    if (extra.length) fail(extraCode, extra.join(","));
    if (actual.size !== expected.size) fail(mismatchCode);
  };

  const validateQuestionSet = (questions) => {
    const ids = [];
    const seen = new Set();
    for (const question of questions) {
      if (!question?.id) fail("QUESTION_ID_REQUIRED");
      if (seen.has(question.id)) fail("DUPLICATE_QUESTION_ID", question.id);
      seen.add(question.id);
      ids.push(question.id);
    }
    assertExactIdSet({
      actualIds: ids,
      expectedIds: EXPECTED_QUESTION_IDS,
      missingCode: "REQUIRED_QUESTION_IDS_MISSING",
      extraCode: "UNKNOWN_QUESTION_IDS_PRESENT",
      mismatchCode: "QUESTION_ID_SET_MISMATCH"
    });
    return seen;
  };

  const validateBindingPath = (path) => {
    if (typeof path !== "string" || !path) fail("BINDING_PATH_REQUIRED");
    const segments = path.split(".");
    if (segments.length > 4) fail("BINDING_PATH_TOO_DEEP", path);
    if (segments.some((segment) => !segment || FORBIDDEN_SEGMENTS.has(segment))) fail("BINDING_PATH_FORBIDDEN", path);
    if (!ALLOWED_BINDING_SET.has(path)) fail("UNKNOWN_BINDING", path);
    return segments;
  };

  const setByPath = (target, path, value) => {
    const segments = validateBindingPath(path);
    let cursor = target;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index];
      if (!own(cursor, segment)) cursor[segment] = Object.create(null);
      if (!isPlainObject(cursor[segment])) fail("BINDING_PATH_COLLISION", path);
      cursor = cursor[segment];
    }
    const leaf = segments.at(-1);
    if (own(cursor, leaf)) fail("DUPLICATE_BINDING", path);
    cursor[leaf] = cloneValue(value);
  };

  const cleanText = (value, maxLength = 1000) => String(value ?? "").normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);

  const validateOptionValue = (question, value) => {
    const options = Array.isArray(question.options) ? question.options : [];
    const allowed = new Set(options.filter((option) => option && option.disabled !== true).map((option) => option.id));
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) if (!allowed.has(item)) fail("UNKNOWN_OR_DISABLED_OPTION", `${question.id}:${item}`);
  };

  const normalizeAnswer = (question, rawValue) => {
    const type = question.answerType;
    if (type === "multi_select") {
      if (!Array.isArray(rawValue)) fail("MULTI_SELECT_ARRAY_REQUIRED", question.id);
      const value = [...new Set(rawValue.map((item) => cleanText(item, 120)).filter(Boolean))];
      validateOptionValue(question, value);
      return value;
    }
    if (type === "single_select") {
      const value = cleanText(rawValue, 120);
      validateOptionValue(question, value);
      return value;
    }
    return cleanText(rawValue, Number.isInteger(question.maxLength) ? question.maxLength : 1000);
  };

  const displayValueFor = (question, rawValue) => {
    const labels = new Map((Array.isArray(question.options) ? question.options : []).map((option) => [option.id, option.label]));
    if (Array.isArray(rawValue)) return rawValue.map((item) => labels.get(item) || item).join(", ");
    return labels.get(rawValue) || String(rawValue);
  };

  const validateMaterializerMap = (value, questionIds) => {
    if (!isPlainObject(value)) fail("MATERIALIZER_MAP_OBJECT_REQUIRED");
    if (value.packageId !== PACKAGE_ID) fail("MATERIALIZER_MAP_PACKAGE_MISMATCH", String(value.packageId));
    if (value.version !== PROMPT_INSTRUCTION_MAP_VERSION) fail("MATERIALIZER_MAP_VERSION_MISMATCH", String(value.version));
    if (!isPlainObject(value.instructions)) fail("MATERIALIZER_INSTRUCTIONS_OBJECT_REQUIRED");
    const instructionIds = Object.keys(value.instructions);
    assertExactIdSet({
      actualIds: instructionIds,
      expectedIds: [...questionIds],
      missingCode: "MATERIALIZER_INSTRUCTIONS_MISSING",
      extraCode: "MATERIALIZER_INSTRUCTIONS_UNKNOWN",
      mismatchCode: "MATERIALIZER_INSTRUCTION_SET_MISMATCH"
    });
    for (const id of instructionIds) {
      if (typeof value.instructions[id] !== "string" || !value.instructions[id].trim()) fail("MATERIALIZER_INSTRUCTION_INVALID", id);
    }
    return value;
  };

  const promptInstructionFor = (question, displayValue, materializerMap) => {
    const prefix = materializerMap.instructions[question.id];
    return `${prefix.trim()}: ${displayValue}.`.normalize("NFC");
  };

  const normalizeCustomization = (value, questionsById) => {
    const source = isPlainObject(value) ? value : Object.create(null);
    if (own(source, "bindingSchemaVersion") && source.bindingSchemaVersion !== BINDING_SCHEMA_VERSION) {
      fail("BINDING_SCHEMA_VERSION_MISMATCH", String(source.bindingSchemaVersion));
    }
    const rawModes = own(source, "answerModes") ? source.answerModes : Object.create(null);
    const rawAnswers = own(source, "answers") ? source.answers : Object.create(null);
    const rawOmitted = own(source, "omittedOptionalFields") ? source.omittedOptionalFields : [];
    if (!isPlainObject(rawModes)) fail("ANSWER_MODES_OBJECT_REQUIRED");
    if (!isPlainObject(rawAnswers)) fail("ANSWERS_OBJECT_REQUIRED");
    if (!Array.isArray(rawOmitted)) fail("OMITTED_OPTIONAL_FIELDS_ARRAY_REQUIRED");

    const knownIds = new Set(questionsById.keys());
    const validateIds = (ids, field) => {
      for (const id of ids) if (!knownIds.has(id)) fail("UNKNOWN_CUSTOMIZATION_ID", `${field}:${id}`);
    };
    validateIds(Object.keys(rawModes), "answerModes");
    validateIds(Object.keys(rawAnswers), "answers");
    validateIds(rawOmitted, "omittedOptionalFields");
    if (new Set(rawOmitted).size !== rawOmitted.length) fail("DUPLICATE_OMITTED_OPTIONAL_ID");

    const answerModes = cloneValue(rawModes);
    const omittedOptionalFields = [...rawOmitted].sort();
    for (const id of omittedOptionalFields) {
      const question = questionsById.get(id);
      if (question.required) fail("REQUIRED_PACKAGE_QUESTION_OMITTED", id);
      if (own(answerModes, id) && answerModes[id] !== MODES.omitted) fail("OMISSION_MODE_CONFLICT", id);
      answerModes[id] = MODES.omitted;
    }

    const answers = Object.create(null);
    for (const id of Object.keys(rawAnswers)) {
      if (answerModes[id] !== MODES.edited) fail("ORPHAN_CUSTOMIZATION_ANSWER", id);
      answers[id] = cloneValue(rawAnswers[id]);
    }
    for (const id of Object.keys(answerModes)) {
      if (answerModes[id] === MODES.edited && !own(rawAnswers, id)) fail("EDITED_ANSWER_REQUIRED", id);
      if (answerModes[id] === MODES.omitted && own(rawAnswers, id)) fail("ORPHAN_CUSTOMIZATION_ANSWER", id);
    }

    return { answerModes, answers, omittedOptionalFields, bindingSchemaVersion: BINDING_SCHEMA_VERSION };
  };

  const resolveEffectiveAnswer = ({ question, customization, materializerMap }) => {
    const mode = customization.answerModes[question.id] || MODES.suggested;
    if (![MODES.suggested, MODES.edited, MODES.omitted].includes(mode)) fail("UNKNOWN_ANSWER_MODE", `${question.id}:${mode}`);
    if (mode === MODES.omitted) {
      if (question.required) fail("REQUIRED_PACKAGE_QUESTION_OMITTED", question.id);
      return null;
    }
    const rawInput = mode === MODES.edited ? customization.answers[question.id] : question.suggestedAnswer;
    const rawValue = normalizeAnswer(question, rawInput);
    const empty = Array.isArray(rawValue) ? rawValue.length === 0 : rawValue.length === 0;
    if (question.required && empty) fail("REQUIRED_PACKAGE_QUESTION_EMPTY", question.id);
    const displayValue = displayValueFor(question, rawValue);
    return Object.freeze({
      questionId: question.id,
      bindingPath: question.includeInPromptAs,
      rawValue: cloneValue(rawValue),
      displayValue,
      promptInstruction: promptInstructionFor(question, displayValue, materializerMap),
      source: mode === MODES.edited ? SOURCES.edited : SOURCES.suggested
    });
  };

  const canonicalizeValue = (value, stack = new Set()) => {
    if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") fail("NON_CANONICAL_VALUE");
    if (typeof value === "number" && !Number.isFinite(value)) fail("NON_FINITE_NUMBER");
    if (typeof value === "string") return value.normalize("NFC");
    if (value === null || typeof value !== "object") return value;
    if (stack.has(value)) fail("CYCLIC_REFERENCE");
    stack.add(value);
    let output;
    if (Array.isArray(value)) output = value.map((item) => canonicalizeValue(item, stack));
    else if (isPlainObject(value)) {
      output = Object.create(null);
      for (const key of Object.keys(value).filter((item) => !TEMPORAL_FIELDS.has(item)).sort()) output[key] = canonicalizeValue(value[key], stack);
    } else fail("NON_PLAIN_OBJECT");
    stack.delete(value);
    return output;
  };

  const stableCanonicalize = (value) => JSON.stringify(canonicalizeValue(value));

  const sha256 = async (value) => {
    const bytes = new TextEncoder().encode(typeof value === "string" ? value : stableCanonicalize(value));
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    if (typeof require === "function") return require("node:crypto").createHash("sha256").update(bytes).digest("hex");
    fail("SHA256_UNAVAILABLE");
  };

  const deepFreeze = (value, seen = new Set()) => {
    if (value === null || typeof value !== "object" || seen.has(value)) return value;
    seen.add(value);
    Object.values(value).forEach((item) => deepFreeze(item, seen));
    return Object.freeze(value);
  };

  const assertExactBindingSet = (seenBindings) => {
    const missing = ALLOWED_BINDINGS.filter((binding) => !seenBindings.has(binding));
    const extra = [...seenBindings].filter((binding) => !ALLOWED_BINDING_SET.has(binding));
    if (missing.length) fail("REQUIRED_BINDINGS_MISSING", missing.join(","));
    if (extra.length) fail("UNKNOWN_BINDINGS_PRESENT", extra.join(","));
    if (seenBindings.size !== ALLOWED_BINDINGS.length) fail("BINDING_SET_MISMATCH");
  };

  const buildEffectiveAgentConfig = async ({ packageDocument, packageCustomization = {}, materializerMap = DEFAULT_MATERIALIZER_MAP, canonicalizationVersion = CANONICALIZATION_VERSION }) => {
    if (canonicalizationVersion !== CANONICALIZATION_VERSION) fail("CANONICALIZATION_VERSION_UNSUPPORTED");
    const questions = flattenQuestions(packageDocument);
    if (!questions.length) fail("PACKAGE_QUESTIONS_REQUIRED");
    const questionIds = validateQuestionSet(questions);
    const questionsById = new Map(questions.map((question) => [question.id, question]));
    const customization = normalizeCustomization(packageCustomization, questionsById);
    const validatedMaterializerMap = validateMaterializerMap(materializerMap, questionIds);
    const config = Object.create(null);
    const resolvedAnswers = [];
    const seenBindings = new Set();
    let omittedOptionalCount = 0;

    for (const question of questions) {
      const binding = question.includeInPromptAs;
      validateBindingPath(binding);
      if (seenBindings.has(binding)) fail("DUPLICATE_BINDING", binding);
      seenBindings.add(binding);
      const resolved = resolveEffectiveAnswer({ question, customization, materializerMap: validatedMaterializerMap });
      if (!resolved) { omittedOptionalCount += 1; continue; }
      setByPath(config, binding, resolved.rawValue);
      resolvedAnswers.push(resolved);
    }

    assertExactBindingSet(seenBindings);
    const requiredQuestions = questions.filter((question) => question.required).length;
    const boundRequired = questions.filter((question) => question.required && seenBindings.has(question.includeInPromptAs)).length;
    if (boundRequired !== requiredQuestions) fail("UNBOUND_REQUIRED_QUESTION");

    const packageId = packageDocument.profileId || packageDocument.packageId || packageDocument.payload?.manifest?.packageId || PACKAGE_ID;
    if (packageId !== PACKAGE_ID) fail("UNSUPPORTED_PACKAGE", packageId);
    const contentVersion = packageDocument.contentVersion || packageDocument.payload?.manifest?.contentVersion;
    if (!contentVersion) fail("CONTENT_VERSION_REQUIRED");
    const checksum = packageDocument.checksum?.value || packageDocument.checksum_sha256 || packageDocument.payload?.manifest?.checksum || null;

    const customizationHash = await sha256(customization);
    const baseOutput = {
      schemaVersion: SCHEMA_VERSION,
      package: { packageId, contentVersion, checksum },
      ...config,
      metadata: {
        bindingSchemaVersion: BINDING_SCHEMA_VERSION,
        promptInstructionMapVersion: PROMPT_INSTRUCTION_MAP_VERSION,
        canonicalizationVersion: CANONICALIZATION_VERSION,
        questionCount: questions.length,
        bindingCount: seenBindings.size,
        omittedOptionalCount
      },
      traceability: { customizationHash, effectiveConfigHash: null },
      resolvedAnswers,
      conflicts: []
    };
    const effectiveConfigHash = await sha256({ ...baseOutput, traceability: { customizationHash } });
    baseOutput.traceability.effectiveConfigHash = effectiveConfigHash;
    return deepFreeze(baseOutput);
  };

  const api = Object.freeze({
    PACKAGE_ID, BINDING_SCHEMA_VERSION, ALLOWED_BINDINGS, EXPECTED_QUESTION_IDS, DEFAULT_MATERIALIZER_MAP,
    PROMPT_INSTRUCTION_MAP_VERSION, CANONICALIZATION_VERSION, validateQuestionSet, validateMaterializerMap,
    validateBindingPath, setByPath, resolveEffectiveAnswer, stableCanonicalize, sha256, deepFreeze, buildEffectiveAgentConfig
  });
  globalThis.PredixWorkforceEffectiveConfig = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();