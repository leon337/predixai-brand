(() => {
  "use strict";

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const flattenQuestions = (document) => (document?.payload?.questions?.sections || []).flatMap((section) =>
    (section.questions || []).map((question) => ({
      ...clone(question),
      sectionId: section.id,
      sectionTitle: section.title,
      sectionDescription: section.description || ""
    }))
  );

  const packageEmployee = (document) => {
    const questions = flattenQuestions(document);
    const byId = Object.fromEntries(questions.map((question) => [question.id, question]));
    const suggested = (id, fallback) => byId[id]?.suggestedAnswer ?? fallback;
    const profile = document.payload.businessProfile || {};
    const displayName = profile.company?.displayName || profile.business?.displayName || suggested("company_display_name", "Clínica Aurora Diagnósticos");
    const employeeName = suggested("employee_name", "Clara");

    return {
      id: "atendente-clinica-aurora",
      nome: `${employeeName} — Atendente virtual`,
      departamento: "Atendimento",
      icone: "🩺",
      descricao: `Atendimento administrativo fictício da ${displayName}, com catálogo publicado e encaminhamento humano obrigatório quando necessário.`,
      gatilhos: ["Quando chegar uma mensagem fictícia", "Quando existir uma dúvida administrativa", "Quando uma pessoa solicitar um teste"],
      tarefas: [
        "Responder dúvidas administrativas publicadas",
        "Explicar serviços fictícios do catálogo",
        "Informar horários, canais e unidades fictícias",
        "Organizar solicitações simuladas",
        "Preparar encaminhamento humano fictício"
      ],
      fontes: ["Pacote fictício publicado", "Catálogo aprovado", "FAQ fictícia", "Políticas administrativas fictícias"],
      resultados: ["Responder uma mensagem fictícia", "Preparar um resumo", "Encaminhar para uma pessoa", "Executar cenário de teste"],
      integracoes: ["Teste manual no ChatGPT", "Teste manual no Claude", "Teste manual no Gemini"],
      limites: [
        "Não acessar dados reais de pacientes, clientes ou prontuários",
        "Não interpretar exames nem oferecer orientação clínica",
        "Não confirmar preço, vaga, cobertura, pagamento ou ação real",
        "Não alegar contato, agendamento ou cancelamento executado"
      ],
      exemplos: [
        "Informe os serviços fictícios disponíveis",
        "Explique o horário administrativo fictício",
        "Prepare um encaminhamento humano sem solicitar dados reais"
      ],
      packageId: document.packageId,
      contentVersion: document.contentVersion
    };
  };

  const adaptCatalog = (genericCatalog, document) => {
    if (!genericCatalog || typeof genericCatalog !== "object") throw new Error("GENERIC_CATALOG_INVALID");
    const catalog = clone(genericCatalog);
    const employee = packageEmployee(document);
    const employees = Array.isArray(catalog.employees) ? catalog.employees.filter((item) => item.id !== employee.id) : [];
    employees.push(employee);
    catalog.employees = employees;
    catalog.catalogVersion = `${catalog.catalogVersion}+${document.packageId}@${document.contentVersion}`;

    const scenarioRows = document.payload.scenarios?.scenarios || [];
    const packageScenarios = scenarioRows.slice(0, 8).map((scenario) => ({
      id: `package-${scenario.id}`,
      objectiveId: "atendimento",
      message: scenario.customerMessage || scenario.title || "Execute um cenário administrativo fictício."
    }));
    if (packageScenarios.length) catalog.scenarioTemplates = packageScenarios;

    catalog.workforcePackage = {
      active: true,
      packageId: document.packageId,
      contentVersion: document.contentVersion,
      checksum: document.checksum.value,
      source: document.source,
      warnings: Array.isArray(document.warnings) ? [...document.warnings] : [],
      questionnaireSections: clone(document.payload.questions.sections),
      employeeId: employee.id
    };
    return catalog;
  };

  globalThis.PredixWorkforcePackageAdapter = Object.freeze({
    flattenQuestions,
    packageEmployee,
    adaptCatalog
  });
})();
