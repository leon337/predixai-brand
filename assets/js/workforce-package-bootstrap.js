(() => {
  "use strict";

  const runtime = globalThis.PredixWorkforcePackageRuntime;
  const client = globalThis.PredixWorkforcePackageClient;
  const adapter = globalThis.PredixWorkforcePackageAdapter;
  const contracts = globalThis.PredixJourneyContracts;
  if (!runtime || !client || !adapter || !contracts) throw new Error("WORKFORCE_PACKAGE_BOOTSTRAP_DEPENDENCY_MISSING");

  const emptyCustomization = () => ({
    answerModes: {},
    answers: {},
    omittedOptionalFields: [],
    updatedAt: null
  });

  const packageContext = () => runtime.active ? {
    mode: "package",
    packageId: client.PACKAGE_ID,
    contentVersion: client.CONTENT_VERSION,
    source: runtime.source || "none",
    checksum: runtime.document?.checksum?.value || client.CHECKSUM_SHA256,
    status: runtime.status,
    warnings: [...(runtime.warnings || [])]
  } : {
    mode: "generic",
    packageId: null,
    contentVersion: null,
    source: "none",
    checksum: null,
    status: "NOT_SELECTED",
    warnings: []
  };

  const baseCreateInitialState = contracts.createInitialState;
  const createInitialState = () => {
    const state = baseCreateInitialState();
    state.packageContext = packageContext();
    state.packageCustomization = emptyCustomization();
    return state;
  };

  globalThis.PredixJourneyContracts = Object.freeze({
    ...contracts,
    createInitialState
  });

  const clearForExplicitNewJourney = () => {
    const params = new URLSearchParams(globalThis.location?.search || "");
    if (params.get("new") !== "1") return;
    try {
      const storage = globalThis.sessionStorage;
      if (storage) {
        [contracts.STORAGE.active, contracts.STORAGE.pending, contracts.STORAGE.lastKnownGood].forEach((key) => storage.removeItem(key));
      }
    } catch {
      // O criador já possui fallback para memória quando sessionStorage não está disponível.
    }
    params.delete("new");
    if (globalThis.history?.replaceState && globalThis.location) {
      const query = params.toString();
      const next = `${globalThis.location.pathname || ""}${query ? `?${query}` : ""}${globalThis.location.hash || ""}`;
      globalThis.history.replaceState(globalThis.history.state, "", next);
    }
  };

  const isGenericCatalogRequest = (resource) => {
    try {
      const raw = typeof resource === "string" ? resource : resource?.url;
      if (!raw) return false;
      const url = new URL(raw, globalThis.location?.href || "https://predixai.invalid/");
      return url.pathname.endsWith("/assets/data/ai-employees.json");
    } catch {
      return false;
    }
  };

  const installCatalogInterceptor = () => {
    if (!runtime.active || typeof globalThis.fetch !== "function") return;
    const originalFetch = globalThis.fetch.bind(globalThis);
    if (originalFetch.__predixPackageWrapped) return;

    const wrappedFetch = async (resource, options) => {
      if (!isGenericCatalogRequest(resource)) return originalFetch(resource, options);

      const genericResponse = await originalFetch(resource, options);
      if (!genericResponse.ok) return genericResponse;
      const genericCatalog = await genericResponse.json();
      const document = await client.loadPackage(originalFetch);
      const adapted = adapter.adaptCatalog(genericCatalog, document);

      return new Response(JSON.stringify(adapted), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          "x-predixai-package-source": document.source
        }
      });
    };
    wrappedFetch.__predixPackageWrapped = true;
    globalThis.fetch = wrappedFetch;
  };

  clearForExplicitNewJourney();
  installCatalogInterceptor();

  globalThis.PredixWorkforcePackageBootstrap = Object.freeze({
    emptyCustomization,
    packageContext,
    createInitialState,
    isGenericCatalogRequest,
    installCatalogInterceptor
  });
})();
