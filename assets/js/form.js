(() => {
  "use strict";

  const form = document.querySelector("[data-lead-form]");
  if (!(form instanceof HTMLFormElement)) return;

  const steps = [...form.querySelectorAll("[data-step]")];
  const progress = document.querySelector("[data-form-progress]");
  const statusBox = document.querySelector("[data-form-status]");
  const submitButton = form.querySelector('button[type="submit"]');
  const params = new URLSearchParams(window.location.search);
  let currentStep = 0;

  const allowedProducts = new Set(["atendimento", "pet", "market", "indefinido"]);
  const initialProduct = params.get("produto") || params.get("source") || "";
  const normalizedInitialProduct = allowedProducts.has(initialProduct) ? initialProduct : "";

  const setStatus = (message, type = "info") => {
    if (!statusBox) return;
    statusBox.textContent = message;
    statusBox.dataset.type = type;
    statusBox.hidden = !message;
  };

  const updateStep = () => {
    steps.forEach((step, index) => {
      step.hidden = index !== currentStep;
      step.setAttribute("aria-hidden", String(index !== currentStep));
    });
    if (progress) {
      progress.textContent = `Etapa ${currentStep + 1} de ${steps.length}`;
      progress.style.setProperty("--progress", `${((currentStep + 1) / steps.length) * 100}%`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStatus("");
  };

  const visibleRequiredFields = (step) => [...step.querySelectorAll("[required]")].filter((field) => {
    if (!(field instanceof HTMLElement)) return false;
    return !field.closest("[hidden]") && field.offsetParent !== null;
  });

  const validateStep = () => {
    const step = steps[currentStep];
    for (const field of visibleRequiredFields(step)) {
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
        if (!field.checkValidity()) {
          field.reportValidity();
          field.focus();
          return false;
        }
      }
    }
    if (currentStep === 0 && !form.querySelector('input[name="product_interest"]:checked')) {
      setStatus("Escolha uma solução para continuar.", "error");
      return false;
    }
    if (currentStep === 3 && !form.querySelector('input[name="commercial_interest"]:checked')) {
      setStatus("Selecione pelo menos uma forma de participação.", "error");
      return false;
    }
    return true;
  };

  form.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches("[data-next]")) {
      if (!validateStep()) return;
      currentStep = Math.min(currentStep + 1, steps.length - 1);
      updateStep();
    }
    if (target.matches("[data-back]")) {
      currentStep = Math.max(currentStep - 1, 0);
      updateStep();
    }
  });

  const updateProductFields = () => {
    const selected = form.querySelector('input[name="product_interest"]:checked');
    const value = selected instanceof HTMLInputElement ? selected.value : "indefinido";
    form.querySelectorAll("[data-product-details]").forEach((block) => {
      const visible = block.getAttribute("data-product-details") === value;
      block.hidden = !visible;
      block.querySelectorAll("input, select, textarea").forEach((field) => {
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
        if (field.dataset.requiredWhenVisible === "true") field.required = visible;
        if (!visible && field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) field.checked = false;
      });
    });
  };

  form.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    if (target.name === "product_interest") updateProductFields();
    if (target.name === "preferred_contact") {
      const input = form.querySelector("[data-contact-value]");
      const label = form.querySelector("[data-contact-label]");
      if (!(input instanceof HTMLInputElement) || !(label instanceof HTMLElement)) return;
      if (target.value === "email") {
        input.type = "email";
        input.placeholder = "nome@empresa.com.br";
        input.autocomplete = "email";
        label.textContent = "E-mail profissional";
      } else {
        input.type = "tel";
        input.placeholder = "(81) 99999-9999";
        input.autocomplete = "tel";
        label.textContent = "WhatsApp profissional";
      }
      input.value = "";
    }
  });

  const values = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)]
    .filter((input) => input instanceof HTMLInputElement)
    .map((input) => input.value);

  const value = (name) => {
    const field = form.elements.namedItem(name);
    if (field instanceof RadioNodeList) return String(field.value || "");
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) return field.value.trim();
    return "";
  };

  const detailsFor = (product) => {
    if (product === "atendimento") return { daily_volume: value("at_daily_volume"), channels: values("at_channels"), organization_method: value("at_organization_method") };
    if (product === "pet") return { services: values("pet_services"), monthly_volume: value("pet_monthly_volume"), pet_problems: values("pet_problems") };
    if (product === "market") return { cash_registers: value("market_cash_registers"), equipment: values("market_equipment"), market_operation: value("market_operation"), offline_operation: value("market_offline") };
    return {};
  };

  const payload = () => {
    const product = value("product_interest") || "indefinido";
    const sourceParam = params.get("source");
    const source = ["site", "home", "atendimento", "pet", "market", "direto"].includes(sourceParam) ? sourceParam : "site";
    const consentContact = form.elements.namedItem("consent_contact");
    const consentNews = form.elements.namedItem("consent_news");
    return {
      source,
      product_interest: product,
      person_name: value("person_name"),
      business_name: value("business_name"),
      city: value("city"),
      state: value("state").toUpperCase(),
      business_segment: value("business_segment"),
      preferred_contact: value("preferred_contact"),
      contact_value: value("contact_value"),
      current_tool: value("current_tool"),
      main_problem: value("main_problem"),
      desired_result: value("desired_result"),
      commercial_interest: values("commercial_interest"),
      acceptable_price_range: value("acceptable_price_range"),
      consent_contact: consentContact instanceof HTMLInputElement ? consentContact.checked : false,
      consent_news: consentNews instanceof HTMLInputElement ? consentNews.checked : false,
      details: detailsFor(product),
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),
      website: value("website")
    };
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateStep()) return;
    setStatus("Enviando sua resposta com segurança...", "info");
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.textContent || "";
      submitButton.textContent = "Enviando...";
    }
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload()) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const messages = {
          RATE_LIMIT: "Muitas tentativas foram realizadas. Aguarde cerca de uma hora.",
          CONSENT_REQUIRED: "É necessário autorizar o contato para enviar.",
          SPAM_DETECTED: "O envio não passou pela validação antispam.",
          INVALID_EMAIL: "Informe um e-mail válido.",
          INVALID_WHATSAPP: "Informe um WhatsApp com DDD.",
          SERVICE_UNAVAILABLE: "O serviço está temporariamente indisponível."
        };
        throw new Error(messages[data.error] || "Não foi possível registrar sua resposta.");
      }
      const product = encodeURIComponent(value("product_interest") || "indefinido");
      window.location.assign(`/obrigado/?produto=${product}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha inesperada no envio.", "error");
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalText || "Enviar participação";
      }
    }
  });

  if (normalizedInitialProduct && normalizedInitialProduct !== "indefinido") {
    const radio = form.querySelector(`input[name="product_interest"][value="${normalizedInitialProduct}"]`);
    if (radio instanceof HTMLInputElement) radio.checked = true;
  }

  updateProductFields();
  updateStep();
})();
