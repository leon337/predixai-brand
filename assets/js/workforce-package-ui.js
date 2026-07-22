(() => {
  "use strict";

  const root = document.querySelector("[data-k6-app]");
  const runtime = globalThis.PredixWorkforcePackageRuntime;
  const client = globalThis.PredixWorkforcePackageClient;
  const adapter = globalThis.PredixWorkforcePackageAdapter;
  const StoreClass = globalThis.PredixSessionStateStore?.SessionStateStore;
  if (!(root instanceof HTMLElement) || !runtime || !client || !adapter || !StoreClass) return;

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const safeId = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
  let persistTimer = null;

  const getCustomization = () => {
    if (!runtime.customization) {
      runtime.customization = {
        answerModes: {},
        answers: {},
        omittedOptionalFields: [],
        updatedAt: null
      };
    }
    return runtime.customization;
  };

  const navigateWith = (packageId = null) => {
    const url = new URL(globalThis.location.href);
    if (packageId) url.searchParams.set("package", packageId);
    else url.searchParams.delete("package");
    url.searchParams.set("new", "1");
    globalThis.location.assign(url.toString());
  };

  const persistCustomization = (immediate = false) => {
    const execute = () => {
      try {
        const store = new StoreClass();
        const state = store.load();
        if (!state) return;
        state.packageCustomization = clone(getCustomization());
        store.save(state);
      } catch {
        // O armazenamento principal já mostra aviso quando opera somente em memória.
      }
    };
    if (persistTimer) globalThis.clearTimeout(persistTimer);
    if (immediate) execute();
    else persistTimer = globalThis.setTimeout(execute, 250);
  };

  const genericEntry = () => {
    if (runtime.active || root.querySelector("[data-package-entry]")) return;
    const hero = root.querySelector(".k6-hero-card");
    if (!hero) return;
    const card = document.createElement("section");
    card.className = "k6-card package-entry-card";
    card.dataset.packageEntry = "true";
    card.innerHTML = `
      <p class="eyebrow">Exemplo pronto publicado</p>
      <h2>Usar o pacote fictício de Clínica de exames</h2>
      <p>Carregue a Clínica Aurora Diagnósticos com serviços, horários, FAQ, regras administrativas, cenários e prompt operacional já aprovados.</p>
      <ul class="k6-check-list"><li>Dados totalmente fictícios</li><li>Personalização somente nesta aba</li><li>Nenhum acesso direto ao banco no navegador</li></ul>
      <button class="button button-secondary" type="button" data-package-start>Usar exemplo pronto — Clínica de exames</button>`;
    hero.insertAdjacentElement("afterend", card);
  };

  const packageNotice = () => {
    if (!runtime.active || root.querySelector("[data-package-notice]")) return;
    const nav = root.querySelector(".k6-phase-nav");
    if (!nav) return;
    const warning = runtime.source === "github_build_fallback"
      ? '<p class="package-source-warning">A API está usando o fallback versionado do GitHub. A origem está visível e não é silenciosa.</p>'
      : "";
    const notice = document.createElement("aside");
    notice.className = "package-simulation-notice";
    notice.dataset.packageNotice = "true";
    notice.setAttribute("role", "status");
    notice.innerHTML = `
      <strong>DADOS FICTÍCIOS PARA DEMONSTRAÇÃO</strong>
      <span>Não insira dados reais de pacientes, clientes, prontuários, documentos, resultados, telefones ou e-mails.</span>
      <small>Pacote ${escapeHtml(client.CONTENT_VERSION)} · fonte ${escapeHtml(runtime.source || "carregando")}</small>
      ${warning}`;
    nav.insertAdjacentElement("afterend", notice);
  };

  const packageEntrySummary = () => {
    if (!runtime.active || root.querySelector("[data-package-selected]")) return;
    const hero = root.querySelector(".k6-hero-card");
    if (!hero) return;
    const card = document.createElement("section");
    card.className = "k6-card package-selected-card";
    card.dataset.packageSelected = "true";
    card.innerHTML = `
      <p class="eyebrow">Pacote selecionado</p>
      <h2>Clínica Aurora Diagnósticos</h2>
      <p>O criador utilizará o pacote publicado <code>${escapeHtml(client.PACKAGE_ID)}@${escapeHtml(client.CONTENT_VERSION)}</code>.</p>
      <p>O caminho genérico continua disponível e não foi substituído.</p>
      <button class="button button-ghost" type="button" data-package-generic>Voltar ao criador genérico</button>`;
    hero.insertAdjacentElement("afterend", card);
  };

  const answerDisplay = (question, value) => {
    const options = Array.isArray(question.options) ? question.options : [];
    const label = (item) => options.find((option) => option.id === item)?.label || item;
    return Array.isArray(value) ? value.map(label).join(", ") : label(value);
  };

  const editorHtml = (question, value, enabled) => {
    const id = safeId(question.id);
    const disabled = enabled ? "" : "disabled";
    const common = `data-package-answer data-question-id="${escapeHtml(question.id)}" ${disabled}`;
    if (question.answerType === "editable_textarea") {
      return `<textarea id="pkg-answer-${id}" ${common} maxlength="${Number(question.maxLength) || 1000}">${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}</textarea>`;
    }
    if (question.answerType === "single_select") {
      return `<select id="pkg-answer-${id}" ${common}>${(question.options || []).map((option) => `<option value="${escapeHtml(option.id)}" ${option.id === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select>`;
    }
    if (question.answerType === "multi_select") {
      const selected = new Set(Array.isArray(value) ? value : []);
      return `<div class="package-multi-options">${(question.options || []).map((option) => `<label><input type="checkbox" value="${escapeHtml(option.id)}" ${common} ${selected.has(option.id) ? "checked" : ""}><span>${escapeHtml(option.label)}</span></label>`).join("")}</div>`;
    }
    return `<input id="pkg-answer-${id}" type="text" ${common} maxlength="${Number(question.maxLength) || 500}" value="${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}">`;
  };

  const questionHtml = (question) => {
    const customization = getCustomization();
    const mode = customization.answerModes[question.id] || "use_suggested";
    const value = mode === "edit_suggested" && question.id in customization.answers
      ? customization.answers[question.id]
      : question.suggestedAnswer;
    const id = safeId(question.id);
    const omitDisabled = question.required ? "disabled" : "";
    return `
      <article class="package-question" data-package-question="${escapeHtml(question.id)}">
        <div class="package-question-heading"><h4>${escapeHtml(question.prompt)}</h4>${question.required ? '<span class="package-required">Obrigatória</span>' : '<span>Opcional</span>'}</div>
        <p class="package-suggested"><strong>Sugestão:</strong> ${escapeHtml(answerDisplay(question, question.suggestedAnswer))}</p>
        <fieldset class="package-mode" aria-label="Modo da resposta">
          <label><input type="radio" name="pkg-mode-${id}" value="use_suggested" data-package-mode data-question-id="${escapeHtml(question.id)}" ${mode === "use_suggested" ? "checked" : ""}>Usar resposta sugerida</label>
          <label><input type="radio" name="pkg-mode-${id}" value="edit_suggested" data-package-mode data-question-id="${escapeHtml(question.id)}" ${mode === "edit_suggested" ? "checked" : ""}>Editar resposta</label>
          <label><input type="radio" name="pkg-mode-${id}" value="do_not_include" data-package-mode data-question-id="${escapeHtml(question.id)}" ${mode === "do_not_include" ? "checked" : ""} ${omitDisabled}>Não incluir no teste</label>
        </fieldset>
        <div class="package-editor" ${mode === "edit_suggested" ? "" : "hidden"}>${editorHtml(question, value, mode === "edit_suggested")}</div>
      </article>`;
  };

  const questionnaire = () => {
    if (!runtime.active || runtime.status !== "READY" || root.querySelector("[data-package-questionnaire]")) return;
    const main = root.querySelector(".k6-main");
    const heading = main?.querySelector("h1")?.textContent || "";
    if (!main || !heading.startsWith("Como ")) return;
    const sections = runtime.document?.payload?.questions?.sections || [];
    const wrapper = document.createElement("section");
    wrapper.className = "k6-card package-questionnaire";
    wrapper.dataset.packageQuestionnaire = "true";
    wrapper.innerHTML = `
      <p class="eyebrow">Personalizar exemplo pronto</p>
      <h2>Revise as respostas sugeridas</h2>
      <p>As alterações valem somente nesta aba. Campos obrigatórios não podem ser omitidos.</p>
      <div class="package-questionnaire-error" data-package-error role="alert" hidden></div>
      ${sections.map((section, index) => `<details class="package-section" ${index === 0 ? "open" : ""}><summary>${escapeHtml(section.title)}</summary><p>${escapeHtml(section.description || "")}</p>${(section.questions || []).map(questionHtml).join("")}</details>`).join("")}`;
    const target = main.querySelector("section.k6-card");
    target?.insertAdjacentElement("afterend", wrapper);
  };

  const packageFailure = () => {
    if (!runtime.active || runtime.status !== "NOT_READY") return;
    const fatal = root.querySelector(".k6-fatal");
    if (!fatal || fatal.dataset.packageFailure === "true") return;
    fatal.dataset.packageFailure = "true";
    fatal.innerHTML = `
      <h1>O pacote de Clínica de exames não pôde ser carregado</h1>
      <p>A geração foi bloqueada porque a API, o checksum ou algum componente obrigatório não pôde ser validado.</p>
      <p><code>${escapeHtml(runtime.error || "PACKAGE_NOT_READY")}</code></p>
      <button class="button button-ghost" type="button" data-package-generic>Voltar ao criador genérico</button>`;
  };

  const refresh = () => {
    genericEntry();
    packageNotice();
    packageEntrySummary();
    questionnaire();
    packageFailure();
  };

  const readQuestionValue = (questionId) => {
    const fields = [...root.querySelectorAll(`[data-package-answer][data-question-id="${CSS.escape(questionId)}"]`)];
    if (!fields.length) return "";
    if (fields[0] instanceof HTMLInputElement && fields[0].type === "checkbox") {
      return fields.filter((field) => field instanceof HTMLInputElement && field.checked).map((field) => field.value);
    }
    return fields[0].value;
  };

  const validateQuestionnaire = () => {
    const questions = adapter.flattenQuestions(runtime.document);
    const customization = getCustomization();
    for (const question of questions) {
      const mode = customization.answerModes[question.id] || "use_suggested";
      if (question.required && mode === "do_not_include") return { ok: false, questionId: question.id, message: "Uma pergunta obrigatória não pode ser omitida." };
      if (question.required && mode === "edit_suggested") {
        const value = customization.answers[question.id];
        const empty = Array.isArray(value) ? value.length === 0 : !String(value || "").trim();
        if (empty) return { ok: false, questionId: question.id, message: "Preencha a resposta editada antes de continuar." };
      }
    }
    return { ok: true };
  };

  root.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const questionId = target.dataset.questionId;
    if (!questionId) return;
    const customization = getCustomization();

    if (target.matches("[data-package-mode]")) {
      customization.answerModes[questionId] = target.value;
      const question = adapter.flattenQuestions(runtime.document).find((item) => item.id === questionId);
      if (target.value === "edit_suggested" && question && !(questionId in customization.answers)) customization.answers[questionId] = clone(question.suggestedAnswer);
      const article = target.closest("[data-package-question]");
      const editor = article?.querySelector(".package-editor");
      if (editor) {
        editor.hidden = target.value !== "edit_suggested";
        editor.querySelectorAll("[data-package-answer]").forEach((field) => { field.disabled = target.value !== "edit_suggested"; });
      }
      customization.omittedOptionalFields = Object.entries(customization.answerModes).filter(([, mode]) => mode === "do_not_include").map(([id]) => id);
    }

    if (target.matches("[data-package-answer]")) customization.answers[questionId] = readQuestionValue(questionId);
    customization.updatedAt = new Date().toISOString();
    persistCustomization();
  });

  root.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches("[data-package-answer]")) return;
    const questionId = target.dataset.questionId;
    if (!questionId) return;
    const customization = getCustomization();
    customization.answers[questionId] = readQuestionValue(questionId);
    customization.updatedAt = new Date().toISOString();
    persistCustomization();
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-package-start]")) {
      event.preventDefault();
      navigateWith(client.PACKAGE_ID);
      return;
    }
    if (target.closest("[data-package-generic]")) {
      event.preventDefault();
      navigateWith(null);
    }
  });

  document.addEventListener("click", (event) => {
    if (!runtime.active) return;
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('[data-action="save-configuration"]')) return;
    const validation = validateQuestionnaire();
    const errorBox = root.querySelector("[data-package-error]");
    if (!validation.ok) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (errorBox) {
        errorBox.hidden = false;
        errorBox.textContent = validation.message;
      }
      root.querySelector(`[data-package-question="${CSS.escape(validation.questionId)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (errorBox) errorBox.hidden = true;
    getCustomization().updatedAt = new Date().toISOString();
    persistCustomization(true);
  }, true);

  const observer = new MutationObserver(refresh);
  observer.observe(root, { childList: true, subtree: true });
  refresh();
})();
