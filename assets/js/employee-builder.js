(() => {
  "use strict";

  const root = document.querySelector("[data-k6-app]");
  if (!(root instanceof HTMLElement)) return;

  const C = window.PredixJourneyContracts;
  const G = window.PredixPromptGenerator;
  const StoreClass = window.PredixSessionStateStore?.SessionStateStore;
  if (!C || !G || !StoreClass) {
    root.innerHTML = '<div class="k6-fatal" role="alert"><h2>Não foi possível iniciar o gerador.</h2><p>Atualize a página para tentar novamente.</p></div>';
    return;
  }

  const isPages = window.location.hostname === "leon337.github.io";
  const publicBase = isPages ? "/predixai-brand" : "";
  const catalogUrl = `${publicBase}/assets/data/ai-employees.json`;
  const leadEndpoint = isPages ? "https://predixai-brand.vercel.app/api/leads" : "/api/leads";
  const platformUrls = {
    chatgpt: "https://chatgpt.com/",
    claude: "https://claude.ai/",
    gemini: "https://gemini.google.com/"
  };

  const store = new StoreClass();
  let catalog = null;
  let state = null;
  let resumeChoice = false;
  let transientStatus = null;

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const selectedValues = (name) => [...root.querySelectorAll(`[name="${name}"]:checked`)]
    .map((input) => input.value);

  const fieldValue = (name) => {
    const checked = root.querySelector(`[name="${name}"]:checked`);
    if (checked instanceof HTMLInputElement) return checked.value.trim();
    const field = root.querySelector(`[name="${name}"]`);
    return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement
      ? field.value.trim()
      : "";
  };

  const setTransient = (message, type = "info") => {
    transientStatus = { message, type };
    render();
  };

  const phaseLabel = {
    [C.PHASES.CREATE]: "Criar",
    [C.PHASES.KNOW]: "Conhecer",
    [C.PHASES.TEST]: "Testar",
    [C.PHASES.DECIDE]: "Decidir"
  };

  const phaseOrder = [C.PHASES.CREATE, C.PHASES.KNOW, C.PHASES.TEST, C.PHASES.DECIDE];
  const phaseIndex = () => Math.max(0, phaseOrder.indexOf(state.journey.phase));

  const renderPhaseNav = () => phaseOrder.map((phase, index) => {
    const current = index === phaseIndex();
    const done = index < phaseIndex();
    const marker = done ? "✓" : current ? "●" : "○";
    return `<li class="${current ? "is-current" : done ? "is-done" : ""}" ${current ? 'aria-current="step"' : ""}>
      <span aria-hidden="true">${marker}</span>${phaseLabel[phase]}
    </li>`;
  }).join("");

  const statusBanner = () => {
    const parts = [];
    if (store.status === "MEMORY_ONLY") {
      parts.push('<div class="k6-banner k6-banner-warning" role="status">O armazenamento temporário não está disponível. Recarregar ou fechar esta aba pode apagar suas respostas.</div>');
    }
    if (state?.commercial?.submission?.status === C.SUBMISSION.UNKNOWN) {
      parts.push('<div class="k6-banner k6-banner-warning" role="alert">O resultado do envio comercial ainda é desconhecido. Não envie novamente nem apague a sessão neste momento.</div>');
    }
    if (transientStatus) {
      parts.push(`<div class="k6-banner k6-banner-${escapeHtml(transientStatus.type)}" role="${transientStatus.type === "error" ? "alert" : "status"}">${escapeHtml(transientStatus.message)}</div>`);
    }
    return parts.join("");
  };

  const shell = (content, actions = "") => `
    <div class="k6-shell">
      <header class="k6-app-header">
        <a href="${publicBase || "/"}/" class="k6-brand" aria-label="PredixAI BR — início">
          <img src="${publicBase}/assets/img/logo.svg" alt="PredixAI BR" width="194" height="42">
        </a>
        <a href="${publicBase}/privacidade/" class="k6-help">Privacidade</a>
      </header>
      <nav class="k6-phase-nav" aria-label="Fases da jornada">
        <ol>${renderPhaseNav()}</ol>
      </nav>
      ${statusBanner()}
      <main class="k6-main" id="k6-main" tabindex="-1">${content}</main>
      ${actions ? `<footer class="k6-action-bar">${actions}</footer>` : ""}
    </div>`;

  const button = (label, action, kind = "primary", extra = "") =>
    `<button class="button button-${kind}" type="button" data-action="${action}" ${extra}>${label}</button>`;

  const backButton = () => button("← Voltar", "back", "ghost");

  const optionCards = (name, items, selected = [], multiple = false) => items.map((item) => {
    const checked = selected.includes(item.id) ? "checked" : "";
    return `<label class="k6-option">
      <input type="${multiple ? "checkbox" : "radio"}" name="${name}" value="${escapeHtml(item.id)}" ${checked}>
      <span><strong>${escapeHtml(item.label)}</strong>${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}</span>
    </label>`;
  }).join("");

  const renderResumeChoice = () => shell(`
    <section class="k6-card k6-resume-card">
      <p class="eyebrow">Jornada temporária encontrada</p>
      <h1>Continuar de onde você parou?</h1>
      <p>As respostas estão disponíveis apenas nesta aba do navegador. Você pode continuar ou iniciar uma nova jornada.</p>
      <dl class="k6-summary-list">
        <div><dt>Fase</dt><dd>${escapeHtml(phaseLabel[state.journey.phase])}</dd></div>
        <div><dt>Revisão</dt><dd>${state.meta.stateRevision}</dd></div>
      </dl>
    </section>
  `, `${button("Iniciar nova jornada", "restart", "ghost")}${button("Continuar jornada", "resume", "primary")}`);

  const renderEntry = () => shell(`
    <section class="k6-card k6-hero-card">
      <p class="eyebrow">Experimente antes de automatizar</p>
      <h1>Crie um Funcionário de IA para testar</h1>
      <p>Responda perguntas sobre o seu negócio. A PredixAI preparará uma configuração segura, um prompt para teste manual e um mapa do que ainda precisa ser organizado.</p>
      <ul class="k6-check-list">
        <li>Sem login obrigatório</li>
        <li>Geração local no navegador</li>
        <li>Teste manual em uma plataforma escolhida por você</li>
        <li>Decisões importantes permanecem humanas</li>
      </ul>
      <p class="k6-privacy-note">Não use dados pessoais, prontuários, senhas, tokens ou informações reais de clientes.</p>
    </section>
  `, button("Começar", "start"));

  const renderObjective = () => shell(`
    <section class="k6-card">
      <p class="eyebrow">Criar</p>
      <h1>O que você quer melhorar primeiro?</h1>
      <div class="k6-option-grid">${optionCards("objective", catalog.objectives, [state.answers.objectiveId])}</div>
    </section>
  `, `${backButton()}${button("Continuar", "save-objective")}`);

  const renderSegment = () => shell(`
    <section class="k6-card">
      <p class="eyebrow">Criar</p>
      <h1>Qual é o ramo do seu negócio?</h1>
      <label class="k6-field">
        <span>Segmento</span>
        <input name="segment" maxlength="80" value="${escapeHtml(state.answers.segment)}" placeholder="Ex.: clínica de exames, loja, construção">
      </label>
      <p class="k6-field-help">Informe apenas uma descrição geral. Não inclua dados de clientes.</p>
    </section>
  `, `${backButton()}${button("Continuar", "save-segment")}`);

  const renderProcess = () => shell(`
    <section class="k6-card">
      <p class="eyebrow">Criar</p>
      <h1>Como esse trabalho é feito atualmente?</h1>
      <div class="k6-option-grid">${optionCards("processMode", catalog.processModes, [state.answers.processModeId])}</div>
    </section>
  `, `${backButton()}${button("Continuar", "save-process")}`);

  const renderChannels = () => shell(`
    <section class="k6-card">
      <p class="eyebrow">Criar</p>
      <h1>Onde esse trabalho acontece hoje?</h1>
      <p>Os canais servem apenas como contexto. Nenhuma integração será solicitada ou ativada automaticamente.</p>
      <div class="k6-option-grid">${optionCards("channels", catalog.channels, state.answers.channelIds, true)}</div>
    </section>
  `, `${backButton()}${button("Continuar", "save-channels")}`);

  const renderResults = () => shell(`
    <section class="k6-card">
      <p class="eyebrow">Criar</p>
      <h1>O que você espera desse funcionário?</h1>
      <p>Escolha de uma a três opções.</p>
      <div class="k6-option-grid">${optionCards("desiredResults", catalog.desiredResults, state.answers.desiredResultIds, true)}</div>
    </section>
  `, `${backButton()}${button("Criar para teste", "save-results")}`);

  const employeeById = (id) => catalog.employees.find((item) => item.id === id);

  const renderRecommendation = () => {
    const employee = employeeById(state.recommendation.employeeId);
    const alternatives = state.recommendation.alternativeIds.map(employeeById).filter(Boolean);
    return shell(`
      <section class="k6-card">
        <p class="eyebrow">Conhecer</p>
        <h1>Encontramos uma configuração para seu teste</h1>
        <article class="k6-recommendation">
          <span class="k6-employee-icon" aria-hidden="true">${escapeHtml(employee.icone)}</span>
          <div>
            <p class="k6-label">Funcionário recomendado</p>
            <h2>${escapeHtml(employee.nome)}</h2>
            <p>${escapeHtml(employee.descricao)}</p>
          </div>
        </article>
        <div class="k6-explanation">
          <h3>Por que recomendamos</h3>
          <p>${escapeHtml(state.recommendation.explanation)}</p>
          <ul>${state.recommendation.appliedRules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}</ul>
        </div>
        ${alternatives.length ? `<details><summary>Ver alternativa substituta</summary>${alternatives.map((item) => `<p><strong>${escapeHtml(item.nome)}</strong> — ${escapeHtml(item.descricao)}</p>`).join("")}</details>` : ""}
      </section>
    `, `${backButton()}${button("Definir como vai trabalhar", "accept-recommendation")}`);
  };

  const renderConfiguration = () => {
    const employee = employeeById(state.configuration.employeeId);
    return shell(`
      <section class="k6-card">
        <p class="eyebrow">Conhecer</p>
        <h1>Como ${escapeHtml(employee.nome)} vai trabalhar</h1>
        <div class="k6-control-panel">
          <h2>Controles obrigatórios ativos</h2>
          <ul>${state.configuration.mandatoryControls.map((item) => `<li>🔒 ${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
        <label class="k6-field">
          <span>Tom de comunicação</span>
          <select name="tone">
            ${catalog.tones.map((tone) => `<option value="${escapeHtml(tone.value)}" ${tone.value === state.configuration.tone ? "selected" : ""}>${escapeHtml(tone.label)}</option>`).join("")}
          </select>
        </label>
        <fieldset class="k6-fieldset">
          <legend>Informações empresariais autorizadas para o teste</legend>
          ${catalog.authorizedContentOptions.map((item) => `<label class="k6-inline-check"><input type="checkbox" name="authorizedContent" value="${escapeHtml(item.label)}" ${state.configuration.authorizedContent.includes(item.label) ? "checked" : ""}><span>${escapeHtml(item.label)}</span></label>`).join("")}
        </fieldset>
        <label class="k6-field">
          <span>Regra adicional opcional</span>
          <textarea name="additionalRules" maxlength="500" placeholder="Ex.: atendimento de segunda a sexta, das 8h às 18h.">${escapeHtml(state.configuration.additionalRules)}</textarea>
        </label>
        <p class="k6-field-help">Regras que tentem remover controles obrigatórios serão rejeitadas.</p>
      </section>
    `, `${backButton()}${button("Revisar configuração", "save-configuration")}`);
  };

  const renderReview = () => {
    const employee = employeeById(state.configuration.employeeId);
    return shell(`
      <section class="k6-card">
        <p class="eyebrow">Conhecer</p>
        <h1>Revise a configuração</h1>
        <dl class="k6-summary-list">
          <div><dt>Funcionário</dt><dd>${escapeHtml(employee.nome)}</dd></div>
          <div><dt>Segmento</dt><dd>${escapeHtml(state.answers.segment)}</dd></div>
          <div><dt>Tom</dt><dd>${escapeHtml(state.configuration.tone)}</dd></div>
          <div><dt>Controle humano</dt><dd>${state.configuration.mandatoryControls.length} regras obrigatórias</dd></div>
          <div><dt>Conteúdo autorizado</dt><dd>${state.configuration.authorizedContent.length || "Nenhum item específico"}</dd></div>
        </dl>
      </section>
    `, `${backButton()}${button("Preparar meu prompt", "prepare-prompt")}`);
  };

  const renderPrompt = () => shell(`
    <section class="k6-card">
      <p class="eyebrow">Testar</p>
      <h1>Seu prompt está preparado</h1>
      <div class="k6-artifact-meta">
        <span>Versão ${state.artifacts.prompt.promptVersion}</span>
        <span>Hash ${escapeHtml(state.artifacts.prompt.contentHash.slice(0, 12))}</span>
        <span>${escapeHtml(state.artifacts.prompt.status)}</span>
      </div>
      <textarea class="k6-prompt-output" readonly data-prompt-output aria-label="Prompt personalizado">${escapeHtml(state.artifacts.prompt.content)}</textarea>
      <p>O prompt permanece local até você copiá-lo. A PredixAI não o envia para outra plataforma.</p>
    </section>
  `, `${backButton()}${button("Copiar prompt", "copy-prompt")}`);

  const renderPlatform = () => shell(`
    <section class="k6-card">
      <p class="eyebrow">Testar</p>
      <h1>Onde deseja testar?</h1>
      <p>Nenhuma plataforma será conectada automaticamente. Uma nova página poderá ser aberta após o checkpoint local.</p>
      <div class="k6-option-grid">
        ${optionCards("platform", [
          { id: "chatgpt", label: "ChatGPT", description: "Abrir uma conversa nova quando possível." },
          { id: "claude", label: "Claude", description: "Cole e envie manualmente o prompt." },
          { id: "gemini", label: "Gemini", description: "Cole e envie manualmente o prompt." },
          { id: "other", label: "Outra plataforma", description: "Abertura manual, sem URL informada pelo usuário." }
        ])}
      </div>
      <div class="k6-safety-callout">Não cole dados pessoais, senhas, documentos, prontuários ou informações reais de clientes.</div>
    </section>
  `, `${backButton()}${button("Preservar etapa e continuar", "select-platform")}`);

  const renderReturn = () => {
    const attempt = state.externalJourney.activeTestAttempt;
    return shell(`
      <section class="k6-card">
        <p class="eyebrow">Testar</p>
        <h1>O que aconteceu na plataforma?</h1>
        <p>Plataforma escolhida: <strong>${escapeHtml(attempt?.platformId || "outra")}</strong></p>
        <div class="k6-option-grid">${optionCards("returnStatus", [
          { id: "sent", label: "Colei e enviei o prompt" },
          { id: "not-sent", label: "Colei, mas ainda não enviei" },
          { id: "not-copied", label: "Ainda não consegui colar" }
        ])}</div>
        <div class="k6-secondary-actions">
          ${button("Copiar novamente", "copy-prompt-again", "ghost")}
          ${button("Abrir plataforma novamente", "reopen-platform", "ghost")}
          ${button("Continuar sem realizar o teste", "skip-test", "ghost")}
        </div>
      </section>
    `, `${backButton()}${button("Continuar", "confirm-return")}`);
  };

  const scenarioForState = () => {
    const objective = state.answers.objectiveId;
    return catalog.scenarioTemplates.find((item) => item.objectiveId === objective) || catalog.scenarioTemplates[0];
  };

  const renderScenario = () => {
    const scenario = scenarioForState();
    return shell(`
      <section class="k6-card">
        <p class="eyebrow">Testar</p>
        <h1>Faça o primeiro teste</h1>
        <div class="k6-scenario">
          <p class="k6-label">Cenário fictício</p>
          <blockquote>${escapeHtml(scenario.message)}</blockquote>
          ${button("Copiar mensagem de teste", "copy-scenario", "ghost")}
        </div>
        <h2>O que observar</h2>
        <ul class="k6-check-list">
          <li>Usou apenas informações disponíveis</li>
          <li>Pediu esclarecimentos quando necessário</li>
          <li>Evitou promessas ou ações externas</li>
          <li>Encaminhou situações especiais</li>
          <li>Manteve o tom configurado</li>
        </ul>
      </section>
    `, `${backButton()}${button("Já executei o teste", "scenario-executed")}`);
  };

  const renderObservation = () => shell(`
    <section class="k6-card">
      <p class="eyebrow">Testar</p>
      <h1>Como foi o teste?</h1>
      <label class="k6-field"><span>Resultado percebido</span>
        <select name="matchResult">
          <option value="">Selecione</option>
          <option value="expected">Correspondeu ao esperado</option>
          <option value="partial">Correspondeu parcialmente</option>
          <option value="unexpected">Não correspondeu</option>
          <option value="unable">Não consegui avaliar</option>
        </select>
      </label>
      <label class="k6-field"><span>A resposta inventou alguma informação?</span>
        <select name="inventedInfo">
          <option value="">Selecione</option>
          <option value="no">Não percebi</option>
          <option value="yes">Sim</option>
          <option value="unknown">Não sei avaliar</option>
        </select>
      </label>
      <label class="k6-field"><span>Quando necessário, encaminhou para uma pessoa?</span>
        <select name="humanHandoff">
          <option value="">Selecione</option>
          <option value="yes">Sim</option>
          <option value="no">Não</option>
          <option value="not-required">O cenário não exigia</option>
          <option value="unknown">Não sei avaliar</option>
        </select>
      </label>
    </section>
  `, `${backButton()}${button("Registrar observação", "save-observation")}`);

  const renderTestSummary = () => {
    const observation = state.externalJourney.observations.at(-1);
    return shell(`
      <section class="k6-card">
        <p class="eyebrow">Testar</p>
        <h1>Observação registrada</h1>
        <p>Este resultado foi informado por você. A PredixAI não leu nem validou a resposta da plataforma externa.</p>
        <dl class="k6-summary-list">
          <div><dt>Correspondência</dt><dd>${escapeHtml(observation?.matchResult || "Não informado")}</dd></div>
          <div><dt>Informação inventada</dt><dd>${escapeHtml(observation?.inventedInfo || "Não informado")}</dd></div>
          <div><dt>Encaminhamento humano</dt><dd>${escapeHtml(observation?.humanHandoff || "Não informado")}</dd></div>
        </dl>
      </section>
    `, `${backButton()}${button("Ver mapa de prontidão", "view-readiness")}`);
  };

  const readinessLabels = {
    [C.READINESS.READY]: "Pronto para teste manual",
    [C.READINESS.BUSINESS]: "Precisa de informações da empresa",
    [C.READINESS.TECHNICAL]: "Precisa de avaliação técnica",
    [C.READINESS.HUMAN_ONLY]: "Deve permanecer sob responsabilidade humana"
  };

  const renderReadiness = () => shell(`
    <section class="k6-card">
      <p class="eyebrow">Decidir</p>
      <h1>Seu mapa de prontidão</h1>
      <div class="k6-readiness-list">
        ${state.artifacts.readinessMap.capabilities.map((capability) => `
          <article class="k6-readiness-card" data-classification="${escapeHtml(capability.classification)}">
            <p class="k6-label">${escapeHtml(readinessLabels[capability.classification])}</p>
            <h2>${escapeHtml(capability.label)}</h2>
            <p><strong>Dependências:</strong> ${escapeHtml(capability.dependencies.join(", "))}</p>
            <p><strong>Controle:</strong> ${escapeHtml(capability.humanControl)}</p>
            <p><strong>Próxima ação:</strong> ${escapeHtml(capability.nextAction)}</p>
          </article>`).join("")}
      </div>
    </section>
  `, `${backButton()}${button("Escolher próximo passo", "readiness-viewed")}`);

  const renderDecision = () => shell(`
    <section class="k6-card">
      <p class="eyebrow">Decidir</p>
      <h1>Qual será o próximo passo?</h1>
      <div class="k6-decision-grid">
        <article>
          <p class="k6-label">Caminho gratuito</p>
          <h2>Continuar testando</h2>
          <p>Use o prompt, complete informações autorizadas e faça outros testes fictícios.</p>
          ${button("Continuar gratuitamente", "free-path")}
        </article>
        <article>
          <p class="k6-label">Avaliação opcional</p>
          <h2>Avaliar integrações</h2>
          <p>Selecione somente capacidades técnicas que deseja discutir com a PredixAI.</p>
          ${button("Solicitar avaliação", "commercial-path", "ghost")}
        </article>
      </div>
    </section>
  `, backButton());

  const renderFreePath = () => shell(`
    <section class="k6-card">
      <p class="eyebrow">Continuidade gratuita</p>
      <h1>Continue com controle humano</h1>
      <ol class="k6-number-list">
        <li>Adicione somente informações empresariais autorizadas.</li>
        <li>Faça testes com cenários fictícios.</li>
        <li>Revise respostas inesperadas.</li>
        <li>Mantenha decisões importantes sob responsabilidade humana.</li>
      </ol>
      <div class="k6-secondary-actions">
        ${button("Copiar prompt novamente", "copy-prompt-again", "ghost")}
        ${button("Recomeçar configuração", "restart", "ghost")}
      </div>
    </section>
  `, backButton());

  const commercialScopes = () => [
    { id: "channel-integration", label: "Canal de atendimento" },
    { id: "agenda-system", label: "Consulta a agenda ou sistema" },
    { id: "request-registration", label: "Registro automático de solicitações" },
    { id: "business-content", label: "Organização de conteúdo empresarial" }
  ];

  const renderCommercialScope = () => shell(`
    <section class="k6-card">
      <p class="eyebrow">Avaliação opcional</p>
      <h1>O que deseja avaliar?</h1>
      <div class="k6-option-grid">${optionCards("technicalScope", commercialScopes(), [], true)}</div>
      <p>Nenhuma opção está marcada por padrão. Capacidades que devem permanecer humanas não são elegíveis.</p>
    </section>
  `, `${backButton()}${button("Continuar", "save-commercial-scope")}`);

  const renderCommercialContact = () => shell(`
    <section class="k6-card">
      <p class="eyebrow">Avaliação opcional</p>
      <h1>Contato e consentimento</h1>
      <div class="k6-form-grid">
        <label class="k6-field"><span>Nome</span><input name="contactName" maxlength="120" autocomplete="name"></label>
        <label class="k6-field"><span>Empresa ou negócio — opcional</span><input name="companyName" maxlength="160" autocomplete="organization"></label>
        <label class="k6-field"><span>Cidade</span><input name="city" maxlength="120" autocomplete="address-level2"></label>
        <label class="k6-field"><span>Estado</span><input name="state" maxlength="2" autocomplete="address-level1" placeholder="PE"></label>
        <label class="k6-field"><span>Canal de contato</span>
          <select name="contactChannel"><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option></select>
        </label>
        <label class="k6-field"><span>Contato</span><input name="contactValue" maxlength="180" autocomplete="email"></label>
      </div>
      <label class="k6-inline-check"><input type="checkbox" name="consentContact"><span>Concordo com o uso destes dados para responder à solicitação.</span></label>
      <label class="k6-inline-check"><input type="checkbox" name="consentNews"><span>Quero receber novidades da PredixAI. Opcional.</span></label>
    </section>
  `, `${backButton()}${button("Revisar envio", "save-commercial-contact")}`);

  const commercialPayloadPreview = () => {
    const draft = state.commercial.draft || {};
    return {
      schema_version: "2.0",
      selected_technical_scope: draft.selectedTechnicalScopeIds || [],
      person_name: draft.contactName || "",
      business_name: draft.companyName || null,
      city: draft.city || "",
      state: draft.state || "",
      preferred_contact: draft.contactChannel || "",
      contact_value: draft.contactValue || "",
      consent_contact: draft.consentContact === true,
      consent_news: draft.consentNews === true,
      readiness_summary: draft.readinessSummaryAllowlist || []
    };
  };

  const renderCommercialSubmit = () => {
    const submission = state.commercial.submission;
    const preview = commercialPayloadPreview();
    let result = "";
    if (submission.status === C.SUBMISSION.CONFIRMED) {
      result = `<div class="k6-result-success" role="status"><h2>Solicitação registrada</h2><p>Referência: ${escapeHtml(submission.serverReference)}</p><p>Nenhum preço, prazo ou viabilidade técnica foi confirmado.</p></div>`;
    } else if (submission.status === C.SUBMISSION.FAILED) {
      result = `<div class="k6-result-error" role="alert"><h2>Não foi possível enviar</h2><p>Nenhuma confirmação foi registrada. Revise os dados antes de tentar novamente.</p></div>`;
    } else if (submission.status === C.SUBMISSION.UNKNOWN) {
      result = `<div class="k6-result-warning" role="alert"><h2>Resultado ainda não confirmado</h2><p>A solicitação pode ter sido recebida. Não envie novamente neste momento.</p></div>`;
    }
    const canSubmit = ![C.SUBMISSION.CONFIRMED, C.SUBMISSION.UNKNOWN, C.SUBMISSION.SUBMITTING].includes(submission.status);
    return shell(`
      <section class="k6-card">
        <p class="eyebrow">Avaliação opcional</p>
        <h1>Revise exatamente o que será enviado</h1>
        <pre class="k6-payload-preview">${escapeHtml(JSON.stringify(preview, null, 2))}</pre>
        ${result}
      </section>
    `, `${backButton()}${canSubmit ? button(submission.status === C.SUBMISSION.FAILED ? "Tentar novamente" : "Enviar solicitação", "submit-commercial", "primary") : ""}${button("Continuar gratuitamente", "free-path", "ghost")}`);
  };

  const screenRenderers = {
    [C.SCREENS.ENTRY]: renderEntry,
    [C.SCREENS.OBJECTIVE]: renderObjective,
    [C.SCREENS.SEGMENT]: renderSegment,
    [C.SCREENS.PROCESS]: renderProcess,
    [C.SCREENS.CHANNELS]: renderChannels,
    [C.SCREENS.RESULTS]: renderResults,
    [C.SCREENS.RECOMMENDATION]: renderRecommendation,
    [C.SCREENS.CONFIGURATION]: renderConfiguration,
    [C.SCREENS.REVIEW]: renderReview,
    [C.SCREENS.PROMPT]: renderPrompt,
    [C.SCREENS.PLATFORM]: renderPlatform,
    [C.SCREENS.RETURN]: renderReturn,
    [C.SCREENS.SCENARIO]: renderScenario,
    [C.SCREENS.OBSERVATION]: renderObservation,
    [C.SCREENS.TEST_SUMMARY]: renderTestSummary,
    [C.SCREENS.READINESS]: renderReadiness,
    [C.SCREENS.DECISION]: renderDecision,
    [C.SCREENS.FREE_PATH]: renderFreePath,
    [C.SCREENS.COMMERCIAL_SCOPE]: renderCommercialScope,
    [C.SCREENS.COMMERCIAL_CONTACT]: renderCommercialContact,
    [C.SCREENS.COMMERCIAL_SUBMIT]: renderCommercialSubmit
  };

  const render = () => {
    if (!catalog || !state) return;
    if (resumeChoice) {
      root.innerHTML = renderResumeChoice();
    } else {
      const renderer = screenRenderers[state.journey.canonicalScreen] || renderEntry;
      root.innerHTML = renderer();
    }
    const main = root.querySelector("#k6-main");
    if (main instanceof HTMLElement) requestAnimationFrame(() => main.focus({ preventScroll: false }));
  };

  const persist = () => {
    const result = store.save(state);
    if (!result.ok) transientStatus = { message: "Não foi possível preservar esta etapa. A jornada continuará apenas em memória.", type: "warning" };
    return result;
  };

  const commit = (event, payload = {}) => {
    state = C.transition(state, event, payload);
    persist();
    transientStatus = null;
    render();
  };

  const backMap = {
    [C.SCREENS.OBJECTIVE]: C.SCREENS.ENTRY,
    [C.SCREENS.SEGMENT]: C.SCREENS.OBJECTIVE,
    [C.SCREENS.PROCESS]: C.SCREENS.SEGMENT,
    [C.SCREENS.CHANNELS]: C.SCREENS.PROCESS,
    [C.SCREENS.RESULTS]: C.SCREENS.CHANNELS,
    [C.SCREENS.RECOMMENDATION]: C.SCREENS.RESULTS,
    [C.SCREENS.CONFIGURATION]: C.SCREENS.RECOMMENDATION,
    [C.SCREENS.REVIEW]: C.SCREENS.CONFIGURATION,
    [C.SCREENS.PROMPT]: C.SCREENS.REVIEW,
    [C.SCREENS.PLATFORM]: C.SCREENS.PROMPT,
    [C.SCREENS.RETURN]: C.SCREENS.PLATFORM,
    [C.SCREENS.SCENARIO]: C.SCREENS.RETURN,
    [C.SCREENS.OBSERVATION]: C.SCREENS.SCENARIO,
    [C.SCREENS.TEST_SUMMARY]: C.SCREENS.OBSERVATION,
    [C.SCREENS.READINESS]: C.SCREENS.TEST_SUMMARY,
    [C.SCREENS.DECISION]: C.SCREENS.READINESS,
    [C.SCREENS.FREE_PATH]: C.SCREENS.DECISION,
    [C.SCREENS.COMMERCIAL_SCOPE]: C.SCREENS.DECISION,
    [C.SCREENS.COMMERCIAL_CONTACT]: C.SCREENS.COMMERCIAL_SCOPE,
    [C.SCREENS.COMMERCIAL_SUBMIT]: C.SCREENS.COMMERCIAL_CONTACT
  };

  const copyText = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      setTransient(successMessage, "success");
      return "CLIPBOARD_SUCCESS";
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      const copied = document.execCommand("copy");
      area.remove();
      setTransient(copied ? successMessage : "Selecione o conteúdo e copie manualmente.", copied ? "success" : "warning");
      return copied ? "CLIPBOARD_SUCCESS" : "MANUAL_COPY_REQUIRED";
    }
  };

  const handleAction = async (action) => {
    try {
      switch (action) {
        case "resume":
          resumeChoice = false;
          render();
          return;
        case "restart":
          if (state.commercial.submission.status === C.SUBMISSION.UNKNOWN) {
            setTransient("Não é possível apagar a sessão enquanto o resultado do envio estiver desconhecido.", "error");
            return;
          }
          store.clear();
          state = C.createInitialState();
          state.versions.catalogVersion = catalog.catalogVersion;
          resumeChoice = false;
          persist();
          render();
          return;
        case "back":
          commit(C.EVENTS.BACK, { screen: backMap[state.journey.canonicalScreen] || C.SCREENS.ENTRY });
          return;
        case "start":
          commit(C.EVENTS.START);
          return;
        case "save-objective": {
          const objectiveId = fieldValue("objective");
          commit(C.EVENTS.OBJECTIVE_SELECTED, { objectiveId });
          return;
        }
        case "save-segment":
          commit(C.EVENTS.SEGMENT_CONFIRMED, { segment: fieldValue("segment") });
          return;
        case "save-process":
          commit(C.EVENTS.PROCESS_SELECTED, { processModeId: fieldValue("processMode") });
          return;
        case "save-channels":
          commit(C.EVENTS.CHANNELS_CONFIRMED, { channelIds: selectedValues("channels") });
          return;
        case "save-results": {
          const desiredResultIds = selectedValues("desiredResults");
          const recommendation = G.recommendEmployee(catalog, { ...state.answers, desiredResultIds });
          commit(C.EVENTS.RESULTS_CONFIRMED, {
            desiredResultIds,
            recommendation,
            mandatoryControls: catalog.mandatoryControls.map((item) => item.label)
          });
          return;
        }
        case "accept-recommendation":
          commit(C.EVENTS.RECOMMENDATION_ACCEPTED);
          return;
        case "save-configuration": {
          const additionalRules = fieldValue("additionalRules");
          if (G.containsRuleConflict(additionalRules)) {
            setTransient("A regra adicional conflita com os controles obrigatórios. Remova a instrução conflitante.", "error");
            return;
          }
          commit(C.EVENTS.CONFIGURATION_CONFIRMED, {
            tone: fieldValue("tone"),
            additionalRules,
            authorizedContent: selectedValues("authorizedContent")
          });
          return;
        }
        case "prepare-prompt": {
          transientStatus = { message: "Preparando o prompt localmente...", type: "info" };
          render();
          const promptArtifact = await G.generatePromptArtifact({ catalog, state });
          commit(C.EVENTS.PROMPT_PREPARED, { promptArtifact });
          return;
        }
        case "copy-prompt":
        case "copy-prompt-again": {
          const status = await copyText(state.artifacts.prompt.content, "Prompt copiado.");
          if (action === "copy-prompt" && status === "CLIPBOARD_SUCCESS") commit(C.EVENTS.PROMPT_COPY_CONFIRMED, { copyStatus: status });
          return;
        }
        case "select-platform": {
          const platformId = fieldValue("platform");
          commit(C.EVENTS.PLATFORM_SELECTED, { platformId });
          const saved = persist();
          if (!saved.ok) return;
          if (platformUrls[platformId]) window.open(platformUrls[platformId], "_blank", "noopener,noreferrer");
          return;
        }
        case "reopen-platform": {
          const platformId = state.externalJourney.activeTestAttempt?.platformId;
          if (platformUrls[platformId]) window.open(platformUrls[platformId], "_blank", "noopener,noreferrer");
          else setTransient("Abra manualmente a plataforma escolhida.", "info");
          return;
        }
        case "confirm-return": {
          const returnStatus = fieldValue("returnStatus");
          if (returnStatus === "sent") commit(C.EVENTS.PROMPT_SUBMISSION_DECLARED);
          else if (returnStatus) setTransient("O cenário será liberado somente depois que você declarar o envio do prompt.", "warning");
          else setTransient("Selecione o que aconteceu na plataforma.", "error");
          return;
        }
        case "skip-test":
          commit(C.EVENTS.TEST_SKIPPED);
          if (!state.artifacts.readinessMap) {
            state.artifacts.readinessMap = G.buildReadinessMap({ catalog, state });
            persist();
            render();
          }
          return;
        case "copy-scenario":
          await copyText(scenarioForState().message, "Mensagem de teste copiada.");
          return;
        case "scenario-executed":
          commit(C.EVENTS.SCENARIO_EXECUTED);
          return;
        case "save-observation": {
          const observation = {
            matchResult: fieldValue("matchResult"),
            inventedInfo: fieldValue("inventedInfo"),
            humanHandoff: fieldValue("humanHandoff")
          };
          if (Object.values(observation).some((item) => !item)) {
            setTransient("Preencha as três observações para continuar.", "error");
            return;
          }
          const draftState = C.clone(state);
          draftState.externalJourney.observations.push(observation);
          const readinessMap = G.buildReadinessMap({ catalog, state: draftState });
          commit(C.EVENTS.OBSERVATION_RECORDED, { observation, readinessMap });
          return;
        }
        case "view-readiness":
          if (!state.artifacts.readinessMap) state.artifacts.readinessMap = G.buildReadinessMap({ catalog, state });
          state.journey.canonicalScreen = C.SCREENS.READINESS;
          state.journey.phase = C.PHASES.DECIDE;
          state.meta.stateRevision += 1;
          persist();
          render();
          return;
        case "readiness-viewed":
          commit(C.EVENTS.READINESS_VIEWED, { readinessMap: state.artifacts.readinessMap });
          return;
        case "free-path":
          commit(C.EVENTS.FREE_PATH_SELECTED);
          return;
        case "commercial-path":
          state = C.transition(state, C.EVENTS.BACK, { screen: C.SCREENS.COMMERCIAL_SCOPE });
          persist();
          render();
          return;
        case "save-commercial-scope": {
          const scopeIds = selectedValues("technicalScope");
          const readinessSummaryAllowlist = state.artifacts.readinessMap.capabilities
            .filter((capability) => capability.classification !== C.READINESS.HUMAN_ONLY)
            .map((capability) => ({ capabilityId: capability.capabilityId, classification: capability.classification }));
          commit(C.EVENTS.COMMERCIAL_SCOPE_SELECTED, { scopeIds, readinessSummaryAllowlist });
          return;
        }
        case "save-commercial-contact": {
          const contact = {
            contactName: fieldValue("contactName"),
            companyName: fieldValue("companyName"),
            city: fieldValue("city"),
            state: fieldValue("state").toUpperCase(),
            contactChannel: fieldValue("contactChannel"),
            contactValue: fieldValue("contactValue"),
            consentContact: root.querySelector('[name="consentContact"]')?.checked === true,
            consentNews: root.querySelector('[name="consentNews"]')?.checked === true,
            consentVersion: "1.0",
            privacyNoticeVersion: "4.0"
          };
          if (contact.contactName.length < 2 || contact.city.length < 2 || !/^[A-Z]{2}$/.test(contact.state) || contact.contactValue.length < 5 || !contact.consentContact) {
            setTransient("Preencha nome, cidade, estado, contato e o consentimento obrigatório.", "error");
            return;
          }
          commit(C.EVENTS.COMMERCIAL_CONTACT_CONFIRMED, { contact });
          return;
        }
        case "submit-commercial": {
          if (state.commercial.submission.status === C.SUBMISSION.UNKNOWN) return;
          const submissionAttemptId = C.randomId("submission");
          const idempotencyKey = C.randomId("idem");
          const preview = commercialPayloadPreview();
          const payloadHash = await G.simpleHash(JSON.stringify(preview));
          const payload = {
            schema_version: "2.0",
            submission_attempt_id: submissionAttemptId,
            idempotency_key: idempotencyKey,
            payload_hash: payloadHash,
            source: "workforce_k6",
            product_interest: "workforce",
            person_name: preview.person_name,
            business_name: preview.business_name,
            city: preview.city,
            state: preview.state,
            business_segment: state.answers.segment || "Não informado",
            preferred_contact: preview.preferred_contact,
            contact_value: preview.contact_value,
            current_tool: state.answers.channelIds.join(", ") || null,
            main_problem: `Avaliação técnica: ${(preview.selected_technical_scope || []).join(", ")}`,
            desired_result: "Avaliar viabilidade técnica sem promessa de implantação.",
            commercial_interest: ["diagnostico"],
            acceptable_price_range: null,
            consent_contact: true,
            consent_news: preview.consent_news,
            selected_technical_scope: preview.selected_technical_scope,
            readiness_summary: preview.readiness_summary,
            consent_version: state.commercial.draft.consentVersion,
            privacy_notice_version: state.commercial.draft.privacyNoticeVersion,
            website: ""
          };
          commit(C.EVENTS.COMMERCIAL_SUBMIT_STARTED, { submissionAttemptId, idempotencyKey });
          try {
            const response = await fetch(leadEndpoint, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              commit(C.EVENTS.COMMERCIAL_SUBMIT_FAILED, { errorCode: data.error || `HTTP_${response.status}` });
              return;
            }
            commit(C.EVENTS.COMMERCIAL_SUBMIT_CONFIRMED, { serverReference: data.lead_id || data.submission_id || "registrado" });
          } catch {
            commit(C.EVENTS.COMMERCIAL_SUBMIT_UNKNOWN, { errorCode: "NETWORK_RESULT_UNKNOWN" });
          }
          return;
        }
        default:
          return;
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : "UNEXPECTED_ERROR";
      const messages = {
        INCOMPLETE_INPUT: "Complete esta etapa antes de continuar.",
        INVALID_SELECTION: "Revise as opções selecionadas.",
        CONFLICTING_CONFIGURATION: "Uma regra adicional conflita com os controles obrigatórios.",
        PROMPT_NOT_COPIED: "Copie a versão atual do prompt antes de escolher a plataforma.",
        STALE_PROMPT: "O prompt está desatualizado e precisa ser gerado novamente.",
        PROMPT_SUBMISSION_REQUIRED: "Declare primeiro que enviou o prompt.",
        SUBMISSION_RETRY_BLOCKED: "Uma nova tentativa está bloqueada enquanto o resultado anterior estiver desconhecido."
      };
      setTransient(messages[code] || "Não foi possível concluir esta ação. Suas respostas válidas foram preservadas.", "error");
    }
  };

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const actionElement = target.closest("[data-action]");
    if (actionElement instanceof HTMLElement) handleAction(actionElement.dataset.action);
  });

  const load = async () => {
    root.innerHTML = '<div class="k6-loading" role="status" aria-busy="true">Carregando o gerador...</div>';
    try {
      const response = await fetch(catalogUrl, { credentials: "same-origin" });
      if (!response.ok) throw new Error("CATALOG_UNAVAILABLE");
      catalog = await response.json();
      if (catalog.schemaVersion !== "2.0" || !Array.isArray(catalog.employees) || catalog.employees.length < 1) throw new Error("INVALID_CATALOG");
      state = store.load();
      if (state) {
        state.versions.catalogVersion = catalog.catalogVersion;
        resumeChoice = state.meta.stateRevision > 0;
      } else {
        state = C.createInitialState();
        state.versions.catalogVersion = catalog.catalogVersion;
        persist();
      }
      render();
    } catch {
      root.innerHTML = '<div class="k6-fatal" role="alert"><h1>O catálogo não pôde ser carregado</h1><p>Atualize a página para tentar novamente. Nenhuma resposta foi enviada.</p></div>';
    }
  };

  load();
})();