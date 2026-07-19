(() => {
  "use strict";

  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");
  const year = document.querySelector("[data-year]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (year) year.textContent = String(new Date().getFullYear());

  const primaryOrigin = "https://predixai-brand.vercel.app";
  const isGitHubPages = window.location.hostname.endsWith("github.io");
  const commercialHref = (path) => isGitHubPages ? `${primaryOrigin}${path}` : path;

  const installCommercialLayer = () => {
    if (!document.querySelector("link[data-commercial-styles]") && !document.querySelector('link[href="/assets/css/commercial.css"]')) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.dataset.commercialStyles = "true";
      stylesheet.href = commercialHref("/assets/css/commercial.css");
      document.head.append(stylesheet);
    }

    const nav = document.querySelector("[data-menu]");
    if (nav && !nav.querySelector('a[href="#produtos"]')) {
      const productLink = document.createElement("a");
      productLink.href = "#produtos";
      productLink.textContent = "Produtos";
      nav.insertBefore(productLink, nav.querySelector('a[href="#metodo"]'));
    }

    const navCta = document.querySelector(".nav-cta");
    if (navCta instanceof HTMLAnchorElement) {
      navCta.href = commercialHref("/validacao/?source=home");
      navCta.textContent = "Validar solução";
    }

    const genericSolutions = document.getElementById("solucoes");
    if (genericSolutions && !document.getElementById("produtos")) {
      const section = document.createElement("section");
      section.className = "section commercial-section";
      section.id = "produtos";
      section.innerHTML = `
        <div class="container">
          <div class="section-heading reveal">
            <p class="eyebrow">Produtos em validação</p>
            <h2>Um ecossistema para organizar, atender e vender melhor.</h2>
            <p>Conheça as primeiras soluções da PredixAI BR e participe da construção com necessidades reais do seu negócio.</p>
          </div>
          <div class="product-grid">
            <a class="product-card reveal" href="${commercialHref("/solucoes/atendimento/")}">
              <span class="product-status is-priority">Primeiro MVP</span>
              <span class="product-code">PREDIXAI // ATENDIMENTO</span>
              <h3>Atendimento assistido por IA</h3>
              <p>Clientes, agenda, orçamentos, lembretes e recuperação de oportunidades em um fluxo simples.</p>
              <strong>Conhecer solução →</strong>
            </a>
            <a class="product-card reveal" href="${commercialHref("/solucoes/pet/")}">
              <span class="product-status">Primeira vertical</span>
              <span class="product-code">PREDIXAI // PET</span>
              <h3>Gestão para serviços pet</h3>
              <p>Tutores, animais, serviços recorrentes, pacotes, agenda e relacionamento sem funções clínicas no MVP.</p>
              <strong>Conhecer solução →</strong>
            </a>
            <a class="product-card reveal" href="${commercialHref("/solucoes/market/")}">
              <span class="product-status is-research">Pesquisa</span>
              <span class="product-code">PREDIXAI // MARKET</span>
              <h3>Gestão para mercados de bairro</h3>
              <p>Conceito em validação para estoque, operação e decisões. Ainda não representa um sistema pronto.</p>
              <strong>Entrar na validação →</strong>
            </a>
          </div>
        </div>`;
      genericSolutions.insertAdjacentElement("afterend", section);
    }

    const contactButton = document.querySelector(".contact-card .button-primary");
    if (contactButton instanceof HTMLAnchorElement) {
      contactButton.href = commercialHref("/validacao/?source=home");
      contactButton.removeAttribute("target");
      contactButton.removeAttribute("rel");
      contactButton.innerHTML = 'Participar da validação <span aria-hidden="true">→</span>';
    }

    const footerLinks = document.querySelector(".footer-links");
    if (footerLinks && !footerLinks.querySelector('a[href="/privacidade/"]')) {
      const privacy = document.createElement("a");
      privacy.href = commercialHref("/privacidade/");
      privacy.textContent = "Privacidade";
      footerLinks.append(privacy);
    }
  };

  installCommercialLayer();

  const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 18);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const closeMenu = () => {
    menu?.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  };

  toggle?.addEventListener("click", () => {
    const open = menu?.classList.toggle("is-open") ?? false;
    toggle.setAttribute("aria-expanded", String(open));
  });

  menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });

  const revealItems = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px" });
    revealItems.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
      observer.observe(item);
    });
  }

  if (reduceMotion) return;

  const canvas = document.getElementById("network-canvas");
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const context = canvas.getContext("2d");
  if (!context) return;

  let width = 0;
  let height = 0;
  let nodes = [];
  let frameId = 0;
  const pointer = { x: -1000, y: -1000 };

  const createNodes = () => {
    const count = Math.min(64, Math.max(24, Math.floor((width * height) / 28000)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      radius: Math.random() * 1.2 + 0.5
    }));
  };

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    createNodes();
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);
    nodes.forEach((node, index) => {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < -20) node.x = width + 20;
      if (node.x > width + 20) node.x = -20;
      if (node.y < -20) node.y = height + 20;
      if (node.y > height + 20) node.y = -20;

      const pointerDistance = Math.hypot(node.x - pointer.x, node.y - pointer.y);
      if (pointerDistance < 130) {
        const force = (130 - pointerDistance) / 1300;
        node.x += (node.x - pointer.x) * force;
        node.y += (node.y - pointer.y) * force;
      }

      context.beginPath();
      context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      context.fillStyle = "rgba(101, 241, 216, .44)";
      context.fill();

      for (let next = index + 1; next < nodes.length; next += 1) {
        const other = nodes[next];
        const distance = Math.hypot(node.x - other.x, node.y - other.y);
        if (distance > 125) continue;
        context.beginPath();
        context.moveTo(node.x, node.y);
        context.lineTo(other.x, other.y);
        context.strokeStyle = `rgba(93, 168, 255, ${0.12 * (1 - distance / 125)})`;
        context.lineWidth = 0.7;
        context.stroke();
      }
    });
    frameId = window.requestAnimationFrame(draw);
  };

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", (event) => { pointer.x = event.clientX; pointer.y = event.clientY; }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) window.cancelAnimationFrame(frameId);
    else frameId = window.requestAnimationFrame(draw);
  });

  resize();
  draw();
})();
