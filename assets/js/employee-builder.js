(() => {
  "use strict";

  const root = document.querySelector("[data-employee-builder]");
  if (!(root instanceof HTMLElement)) return;

  const isPages = window.location.hostname === "leon337.github.io";
  const publicBase = isPages ? "/predixai-brand" : "";
  const dataUrl = `${publicBase}/assets/data/ai-employees.json`;
  const generator = window.PredixPromptGenerator;
  const state = { employees: [], selected: null, step: 0, prompt: "", diagnosis: null };
  const steps = [...root.querySelectorAll("[data-builder-step]")];
  const progress = root.querySelector("[data-builder-progress]");
  const status = root.querySelector("[data-builder-status]");
  const grid = root.querySelector("[data-employee-grid]");
  const configForm = root.querySelector("[data-employee-config]");
  const promptOutput = root.querySelector("[data-prompt-output]");
  const selectedSummary = root.querySelector("[data-selected-summary]");
  const diagnosisManual = root.querySelector("[data-diagnosis-manual]");
  const diagnosisIntegrations = root.querySelector("[data-diagnosis-integrations]");
  const diagnosisAutomations = root.querySelector("[data-diagnosis-automations]");
  const diagnosisSummary = root.querySelector("[data-diagnosis-summary]");
  const implementationLink = root.querySelector("[data-implementation-link]");

  const setStatus = (message, type = "info") => {
    if (!(status instanceof HTMLElement)) return;
    status.textContent = message;
    status.dataset.type = type;
    status.hidden = !message;
  };

  const focusStep = () => {
    const heading = steps[state.step]?.querySelector("h2");
    if (heading instanceof HTMLElement) {
      heading.setAttribute("tabindex", "-1");
      window.requestAnimationFrame(() => heading.focus({ preventScroll: false }));
    }
  };

  const updateStep = () => {
    steps.forEach((step, index) => {
      step.hidden = index !== state.step;
      step.setAttribute("aria-hidden", String(index !== state.step));
    });
    if (progress instanceof HTMLElement) {
      progress.textContent = `Etapa ${state.step + 1} de ${steps.length}`;
      progress.style.setProperty("--progress", `${((state.step + 1) / steps.length) * 100}%`);
    }
    setStatus("");
    focusStep();
  };

  const createChoice = (name, value, text, checked = false) => {
    const label = document.createElement("label");
    label.className = "builder-check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.value = value;
    input.checked = checked;
    const span = document.createElement("span");
    span.textContent = text;
    label.append(input, span);
    return label;
  };

  const renderChoices = (selector, name, items, defaults = []) => {
    const target = root.querySelector(selector);
    if (!(target instanceof HTMLElement)) return;
    target.replaceChildren(...items.map((item) => createChoice(name, item, item, defaults.includes(item))));
  };

  const renderEmployees = () => {
    if (!(grid instanceof HTMLElement)) return;
    const fragment = document.createDocumentFragment();
    state.employees.forEach((employee) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "employee-option";
      button.dataset.employeeId = employee.id;
      button.setAttribute("aria-pressed", String(state.selected?.id === employee.id));
      button.innerHTML = `<span class="employee-icon" aria-hidden="true">${employee.icone}</span><span><strong>${employee.nome}</strong><small>${employee.departamento}</small><span>${employee.descricao}</span></span>`;
      fragment.append(button);
    });
    grid.replaceChildren(fragment);
  };

  const chooseEmployee = (employee) => {
    state.selected = employee;
    renderEmployees();
    renderChoices("[data-trigger-options]", "triggers", employee.gatilhos, employee.gatilhos.slice(0, 1));
    renderChoices("[data-task-options]", "tasks", employee.tarefas, employee.tarefas.slice(0, 3));
    renderChoices("[data-source-options]", "sources", employee.fontes, []);
    renderChoices("[data-result-options]", "results", employee.resultados, employee.resultados.slice(0, 1));
    if (selectedSummary instanceof HTMLElement) {
      selectedSummary.innerHTML = `<span aria-hidden="true">${employee.icone}</span><div><strong>${employee.nome}</strong><p>${employee.descricao}</p></div>`;
    }
  };

  const values = (name) => [...root.querySelectorAll(`input[name="${name}"]:checked`)]
    .filter((input) => input instanceof HTMLInputElement)
    .map((input) => input.value);

  const value = (name) => {
    if (!(configForm instanceof HTMLFormElement)) return "";
    const field = configForm.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) return field.value.trim();
    return "";
  };

  const renderList = (target, items) => {
    if (!(target instanceof HTMLElement)) return;
    target.replaceChildren(...items.map((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      return li;
    }));
  };

  const generate = () => {
    if (!state.selected || !generator) {
      setStatus("Não foi possível carregar o gerador. Atualize a página.", "error");
      return false;
    }
    if (!(configForm instanceof HTMLFormElement) || !configForm.reportValidity()) return false;
    const tasks = values("tasks");
    if (!tasks.length) {
      setStatus("Selecione pelo menos uma tarefa para o funcionário.", "error");
      root.querySelector("[data-task-options] input")?.focus();
      return false;
    }
    const handoffs = values("handoffs");
    const input = {
      employee: state.selected,
      company: value("company"),
      segment: value("segment"),
      tone: value("tone"),
      triggers: values("triggers"),
      tasks,
      sources: values("sources"),
      results: values("results"),
      handoffs,
      notes: value("notes")
    };
    state.prompt = generator.generatePrompt(input);
    state.diagnosis = generator.buildDiagnosis(input);
    if (promptOutput instanceof HTMLTextAreaElement) promptOutput.value = state.prompt;
    renderList(diagnosisManual, state.diagnosis.manual);
    renderList(diagnosisIntegrations, state.diagnosis.integrations);
    renderList(diagnosisAutomations, state.diagnosis.automations);
    if (diagnosisSummary instanceof HTMLElement) diagnosisSummary.textContent = state.diagnosis.summary;
    if (implementationLink instanceof HTMLAnchorElement) {
      const params = new URLSearchParams({ source: "workforce", produto: "workforce", utm_source: "site", utm_medium: "employee_builder", utm_campaign: "funcionario_ia_gratis", utm_content: state.selected.id });
      implementationLink.href = `${publicBase}/validacao/?${params.toString()}`;
    }
    return true;
  };

  const copyPrompt = async () => {
    if (!state.prompt || !(promptOutput instanceof HTMLTextAreaElement)) return;
    try {
      await navigator.clipboard.writeText(state.prompt);
      setStatus("Prompt copiado. Cole em um assistente de IA para começar o teste.", "success");
    } catch {
      promptOutput.focus();
      promptOutput.select();
      const copied = document.execCommand("copy");
      setStatus(copied ? "Prompt copiado." : "Selecione o texto e copie manualmente.", copied ? "success" : "info");
    }
  };

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const employeeButton = target.closest("[data-employee-id]");
    if (employeeButton instanceof HTMLButtonElement) {
      const employee = state.employees.find((item) => item.id === employeeButton.dataset.employeeId);
      if (employee) chooseEmployee(employee);
      return;
    }
    if (target.closest("[data-next-step]")) {
      if (state.step === 0 && !state.selected) {
        setStatus("Escolha um funcionário de IA para continuar.", "error");
        return;
      }
      if (state.step === 1 && !generate()) return;
      state.step = Math.min(state.step + 1, steps.length - 1);
      updateStep();
      return;
    }
    if (target.closest("[data-back-step]")) {
      state.step = Math.max(state.step - 1, 0);
      updateStep();
      return;
    }
    if (target.closest("[data-copy-prompt]")) copyPrompt();
    if (target.closest("[data-restart-builder]")) {
      state.step = 0;
      state.selected = null;
      state.prompt = "";
      state.diagnosis = null;
      if (configForm instanceof HTMLFormElement) configForm.reset();
      renderEmployees();
      updateStep();
    }
  });

  fetch(dataUrl, { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error("CATALOG_UNAVAILABLE");
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data.employees) || data.employees.length !== 10) throw new Error("INVALID_CATALOG");
      state.employees = data.employees;
      renderEmployees();
      setStatus("");
    })
    .catch(() => setStatus("O catálogo não pôde ser carregado. Atualize a página para tentar novamente.", "error"));

  updateStep();
})();
