(() => {
  "use strict";

  const base = globalThis.PredixPromptGenerator;
  const runtime = globalThis.PredixWorkforcePackageRuntime;
  const client = globalThis.PredixWorkforcePackageClient;
  const adapter = globalThis.PredixWorkforcePackageAdapter;
  if (!base || !runtime || !client || !adapter) throw new Error("WORKFORCE_PACKAGE_PROMPT_DEPENDENCY_MISSING");

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const same = (left, right) => base.stableStringify(left) === base.stableStringify(right);
  const cleanText = (value, maxLength = 1000) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);

  const normalizedAnswer = (question, value) => {
    if (Array.isArray(value)) return [...new Set(value.map((item) => cleanText(item, 120)).filter(Boolean))].slice(0, 20);
    return cleanText(value, Number.isInteger(question.maxLength) ? question.maxLength : 1000);
  };

  const optionLabel = (question, value) => {
    const options = Array.isArray(question.options) ? question.options : [];
    const labelFor = (item) => options.find((option) => option.id === item)?.label || item;
    return Array.isArray(value) ? value.map(labelFor).join(", ") : labelFor(value);
  };

  const evaluateCustomization = (document, state) => {
    const questions = adapter.flattenQuestions(document);
    const customization = runtime.customization || state.packageCustomization || {};
    const modes = customization.answerModes || {};
    const answers = customization.answers || {};
    const changes = [];
    const omissions = [];
    const effectiveAnswers = {};

    for (const question of questions) {
      const mode = modes[question.id] || "use_suggested";
      if (mode === "do_not_include") {
        if (question.required) throw new Error("REQUIRED_PACKAGE_QUESTION_OMITTED");
        omissions.push(question.id);
        continue;
      }

      const raw = mode === "edit_suggested" ? answers[question.id] : question.suggestedAnswer;
      const value = normalizedAnswer(question, raw);
      const empty = Array.isArray(value) ? value.length === 0 : !value;
      if (question.required && empty) throw new Error("REQUIRED_PACKAGE_QUESTION_EMPTY");
      effectiveAnswers[question.id] = value;

      if (mode === "edit_suggested" && !same(value, normalizedAnswer(question, question.suggestedAnswer))) {
        changes.push({
          id: question.id,
          prompt: question.prompt,
          value,
          displayValue: optionLabel(question, value)
        });
      }
    }

    return { changes, omissions, effectiveAnswers };
  };

  const packageRecommendation = (catalog, answers) => {
    const employeeId = catalog.workforcePackage?.employeeId || "atendente-clinica-aurora";
    const employee = catalog.employees.find((item) => item.id === employeeId);
    if (!employee) throw new Error("PACKAGE_EMPLOYEE_REQUIRED");
    return {
      recommendationId: globalThis.PredixJourneyContracts.randomId("recommendation"),
      employeeId,
      alternativeIds: [],
      appliedRules: [
        `package:${catalog.workforcePackage.packageId}`,
        `contentVersion:${catalog.workforcePackage.contentVersion}`,
        `objective:${answers.objectiveId || "atendimento"}`
      ],
      explanation: "A configuração foi carregada do pacote fictício publicado para Clínica de exames e permanece limitada ao atendimento administrativo simulado.",
      catalogVersion: catalog.catalogVersion,
      createdAt: new Date().toISOString()
    };
  };

  const recommendEmployee = (catalog, answers) => catalog?.workforcePackage?.active
    ? packageRecommendation(catalog, answers)
    : base.recommendEmployee(catalog, answers);

  const generatePackagePrompt = async ({ catalog, state }) => {
    const document = runtime.document;
    if (!document || runtime.status !== "READY") throw new Error("PACKAGE_NOT_READY");
    client.validateDocument(document);
    if (state.packageContext?.packageId !== client.PACKAGE_ID) throw new Error("PACKAGE_CONTEXT_MISSING");
    if (state.packageContext?.checksum !== client.CHECKSUM_SHA256) throw new Error("PACKAGE_CONTEXT_CHECKSUM_MISMATCH");

    const evaluated = evaluateCustomization(document, state);
    const canonical = document.payload.agentTemplate.promptText.trim();
    const additions = [];

    if (evaluated.changes.length) {
      additions.push("## 14. Personalizações autorizadas nesta sessão");
      additions.push("");
      additions.push("As personalizações abaixo substituem somente os valores correspondentes do cenário fictício. Todos os controles, limites e proibições do pacote publicado permanecem obrigatórios.");
      additions.push("");
      for (const change of evaluated.changes) additions.push(`- ${cleanText(change.prompt, 300)}: ${cleanText(change.displayValue, 800)}`);
    }
    if (evaluated.omissions.length) {
      if (!additions.length) additions.push("## 14. Personalizações autorizadas nesta sessão", "");
      additions.push("", `Campos opcionais omitidos: ${evaluated.omissions.join(", ")}.`);
    }

    const content = additions.length ? `${canonical}\n\n${additions.join("\n")}` : canonical;
    const contentHash = await base.simpleHash(content);
    const customizationSnapshot = {
      answerModes: clone((runtime.customization || state.packageCustomization || {}).answerModes || {}),
      answers: clone((runtime.customization || state.packageCustomization || {}).answers || {}),
      omittedOptionalFields: [...evaluated.omissions]
    };

    return {
      promptId: globalThis.PredixJourneyContracts.randomId("prompt"),
      promptVersion: state.versions.promptVersion + 1,
      content,
      contentHash,
      dependencyHash: await base.simpleHash(base.stableStringify({
        packageId: client.PACKAGE_ID,
        contentVersion: client.CONTENT_VERSION,
        checksum: client.CHECKSUM_SHA256,
        configurationVersion: state.versions.configurationVersion,
        humanControlVersion: state.versions.humanControlVersion,
        authorizedContentVersion: state.versions.authorizedContentVersion,
        customization: customizationSnapshot
      })),
      configurationVersion: state.versions.configurationVersion,
      humanControlVersion: state.versions.humanControlVersion,
      authorizedContentVersion: state.versions.authorizedContentVersion,
      catalogVersion: catalog.catalogVersion,
      packageId: client.PACKAGE_ID,
      contentVersion: client.CONTENT_VERSION,
      packageSource: document.source,
      packageChecksum: client.CHECKSUM_SHA256,
      customization: customizationSnapshot,
      effectiveAnswers: evaluated.effectiveAnswers,
      status: "READY",
      copyStatus: "NOT_REQUESTED",
      copiedVersion: null,
      createdAt: new Date().toISOString()
    };
  };

  const generatePromptArtifact = (input) => input?.catalog?.workforcePackage?.active
    ? generatePackagePrompt(input)
    : base.generatePromptArtifact(input);

  globalThis.PredixPromptGenerator = Object.freeze({
    ...base,
    recommendEmployee,
    generatePromptArtifact,
    evaluatePackageCustomization: evaluateCustomization,
    generatePackagePrompt
  });
})();
