(() => {
  "use strict";

  const root = document.querySelector("[data-k6-app]");
  if (!(root instanceof HTMLElement)) return;

  const enhancePresentation = () => {
    const panel = root.querySelector(".k6-control-panel");
    if (panel instanceof HTMLElement && panel.dataset.uxEnhanced !== "true") {
      panel.dataset.uxEnhanced = "true";
      panel.classList.add("k6-protection-panel");

      const card = panel.closest(".k6-card");
      if (card instanceof HTMLElement) card.classList.add("k6-configuration-card");

      const heading = panel.querySelector("h2");
      if (heading) heading.textContent = "Proteções do seu Funcionário de IA";

      const list = panel.querySelector("ul");
      if (list) {
        list.classList.add("k6-protection-list");
        list.querySelectorAll("li").forEach((item) => {
          item.textContent = item.textContent.replace(/^\s*🔒\s*/u, "");
        });

        const intro = document.createElement("p");
        intro.className = "k6-protection-intro";
        intro.textContent = "Estas proteções ajudam a evitar respostas inseguras e mantêm decisões importantes sob revisão humana durante o teste.";
        panel.insertBefore(intro, list);
      }
    }

    root.querySelectorAll(".k6-field-help").forEach((help) => {
      if (help.textContent.includes("Regras que tentem remover controles obrigatórios")) {
        help.textContent = "Você pode acrescentar orientações do negócio. As proteções essenciais continuam ativas para evitar respostas inseguras.";
        help.classList.add("k6-protection-help");
      }
    });
  };

  const observer = new MutationObserver(enhancePresentation);
  observer.observe(root, { childList: true, subtree: true });
  enhancePresentation();
})();
