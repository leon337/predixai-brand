(() => {
  "use strict";

  const root = typeof document !== "undefined" ? document.querySelector("[data-k6-app]") : null;
  const runtime = globalThis.PredixWorkforcePackageRuntime;
  const effective = globalThis.PredixWorkforceEffectiveConfig;

  const clean = (value) => String(value ?? "").trim();
  const findDisplayValue = (config, binding) => {
    const answer = Array.isArray(config?.resolvedAnswers)
      ? config.resolvedAnswers.find((item) => item?.binding === binding)
      : null;
    return clean(answer?.displayValue ?? answer?.rawValue);
  };

  const buildVisualProjection = (config) => {
    if (!config || typeof config !== "object") throw new Error("EFFECTIVE_CONFIG_REQUIRED");
    return Object.freeze({
      employeeName: clean(config.employee?.name),
      employeePresentation: clean(config.employee?.presentation),
      companyDisplayName: clean(config.company?.displayName),
      tone: findDisplayValue(config, "communication.tone") || clean(config.communication?.tone),
      responseLength: findDisplayValue(config, "communication.responseLength") || clean(config.communication?.responseLength),
      effectiveConfigHash: clean(config.traceability?.effectiveConfigHash)
    });
  };

  const api = {
    status: "IDLE",
    error: null,
    config: null,
    projection: null,
    cacheKey: null,
    isActive: () => Boolean(runtime?.active && runtime?.status === "READY"),
    getProjection: () => api.projection,
    buildVisualProjection
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalThis.PredixWorkforcePackageProjection = api;

  if (typeof HTMLElement === "undefined" || !(root instanceof HTMLElement) || !runtime || !effective?.buildEffectiveAgentConfig) return;

  let scheduled = false;
  let applying = false;

  const keyForCurrentState = () => JSON.stringify({
    packageId: runtime.document?.profileId || runtime.document?.packageId || null,
    contentVersion: runtime.document?.contentVersion || runtime.document?.payload?.manifest?.contentVersion || null,
    customization: runtime.customization || null
  });

  const restoreText = (element) => {
    if (!(element instanceof HTMLElement) || !("packageProjectionOriginal" in element.dataset)) return;
    element.textContent = element.dataset.packageProjectionOriginal;
    delete element.dataset.packageProjectionOriginal;
  };

  const setText = (element, value) => {
    if (!(element instanceof HTMLElement) || !value) return;
    if (!("packageProjectionOriginal" in element.dataset)) element.dataset.packageProjectionOriginal = element.textContent || "";
    if (element.textContent !== value) element.textContent = value;
  };

  const cleanup = () => {
    root.querySelectorAll("[data-package-projection-added]").forEach((element) => element.remove());
    root.querySelectorAll("[data-package-projection-original]").forEach(restoreText);
    root.querySelectorAll("[data-package-projection-hidden]").forEach((element) => {
      element.hidden = false;
      element.disabled = false;
      delete element.dataset.packageProjectionHidden;
    });
  };

  const addDefinitionRow = (list, label, value, marker) => {
    if (!(list instanceof HTMLElement) || !value || list.querySelector(`[data-package-projection-added="${marker}"]`)) return;
    const row = document.createElement("div");
    row.dataset.packageProjectionAdded = marker;
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    row.append(term, detail);
    list.append(row);
  };

  const projectRecommendation = (projection) => {
    const card = root.querySelector(".k6-recommendation");
    if (!(card instanceof HTMLElement)) return;
    setText(card.querySelector("h2"), projection.employeeName);
    setText(card.querySelector("h2 + p"), projection.employeePresentation);
    if (projection.companyDisplayName && !card.querySelector('[data-package-projection-added="recommendation-company"]')) {
      const company = document.createElement("p");
      company.dataset.packageProjectionAdded = "recommendation-company";
      company.className = "k6-field-help";
      company.textContent = `Empresa fictícia: ${projection.companyDisplayName}`;
      card.querySelector("div")?.append(company);
    }
  };

  const projectConfiguration = (projection) => {
    const main = root.querySelector(".k6-main");
    const heading = main?.querySelector("h1");
    if (!(heading instanceof HTMLElement) || !heading.textContent?.startsWith("Como ")) return;
    setText(heading, projection.employeeName ? `Como ${projection.employeeName} vai trabalhar` : "");

    const tone = main.querySelector('[name="tone"]');
    if (tone instanceof HTMLSelectElement) {
      tone.hidden = true;
      tone.disabled = true;
      tone.dataset.packageProjectionHidden = "true";
      const field = tone.closest("label");
      if (field && projection.tone && !field.querySelector('[data-package-projection-added="configuration-tone"]')) {
        const value = document.createElement("strong");
        value.dataset.packageProjectionAdded = "configuration-tone";
        value.textContent = projection.tone;
        field.append(value);
      }
    }

    const card = heading.closest("section.k6-card");
    if (card && !card.querySelector('[data-package-projection-added="configuration-summary"]')) {
      const summary = document.createElement("dl");
      summary.className = "k6-summary-list";
      summary.dataset.packageProjectionAdded = "configuration-summary";
      addDefinitionRow(summary, "Empresa", projection.companyDisplayName, "configuration-company");
      addDefinitionRow(summary, "Tamanho das respostas", projection.responseLength, "configuration-response-length");
      const controls = card.querySelector(".k6-control-panel");
      controls?.insertAdjacentElement("afterend", summary);
    }
  };

  const projectReview = (projection) => {
    const list = [...root.querySelectorAll(".k6-summary-list")].find((candidate) =>
      [...candidate.querySelectorAll("dt")].some((term) => term.textContent?.trim() === "Funcionário")
    );
    if (!(list instanceof HTMLElement)) return;
    for (const row of list.querySelectorAll(":scope > div")) {
      const term = row.querySelector("dt")?.textContent?.trim();
      const detail = row.querySelector("dd");
      if (term === "Funcionário") setText(detail, projection.employeeName);
      if (term === "Tom") setText(detail, projection.tone);
      if (term === "Segmento" && projection.companyDisplayName) setText(detail, projection.companyDisplayName);
    }
    addDefinitionRow(list, "Tamanho das respostas", projection.responseLength, "review-response-length");
  };

  const showFailure = () => {
    if (!api.isActive() || root.querySelector("[data-package-projection-failure]")) return;
    const main = root.querySelector(".k6-main");
    if (!(main instanceof HTMLElement)) return;
    const alert = document.createElement("div");
    alert.dataset.packageProjectionFailure = "true";
    alert.dataset.packageProjectionAdded = "projection-failure";
    alert.className = "k6-banner k6-banner-error";
    alert.setAttribute("role", "alert");
    alert.textContent = "A configuração efetiva não pôde ser projetada. A interface do pacote foi bloqueada para evitar valores divergentes.";
    main.prepend(alert);
  };

  const applyProjection = () => {
    if (applying) return;
    applying = true;
    try {
      if (!api.isActive()) {
        cleanup();
        return;
      }
      if (api.status === "FAILED") {
        showFailure();
        return;
      }
      if (api.status !== "READY" || !api.projection) return;
      projectRecommendation(api.projection);
      projectConfiguration(api.projection);
      projectReview(api.projection);
    } finally {
      applying = false;
    }
  };

  const ensureProjection = async () => {
    if (!api.isActive()) {
      api.status = "IDLE";
      api.error = null;
      api.config = null;
      api.projection = null;
      api.cacheKey = null;
      applyProjection();
      return;
    }
    const cacheKey = keyForCurrentState();
    if (api.status === "READY" && api.cacheKey === cacheKey) {
      applyProjection();
      return;
    }
    if (api.status === "BUILDING" && api.cacheKey === cacheKey) return;
    api.status = "BUILDING";
    api.cacheKey = cacheKey;
    api.error = null;
    try {
      const config = await effective.buildEffectiveAgentConfig({
        packageDocument: runtime.document,
        packageCustomization: runtime.customization || {},
        materializerMap: effective.DEFAULT_MATERIALIZER_MAP
      });
      if (api.cacheKey !== cacheKey) return;
      api.config = config;
      api.projection = buildVisualProjection(config);
      api.status = "READY";
    } catch (error) {
      if (api.cacheKey !== cacheKey) return;
      api.config = null;
      api.projection = null;
      api.status = "FAILED";
      api.error = error?.code || error?.message || "PACKAGE_PROJECTION_FAILED";
    }
    applyProjection();
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      ensureProjection();
    });
  };

  new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  document.addEventListener("change", (event) => {
    if (event.target instanceof Element && event.target.matches("[data-package-mode], [data-package-answer]")) schedule();
  });
  document.addEventListener("input", (event) => {
    if (event.target instanceof Element && event.target.matches("[data-package-answer]")) schedule();
  });
  schedule();
})();
