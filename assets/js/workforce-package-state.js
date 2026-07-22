(() => {
  "use strict";

  const storeNamespace = globalThis.PredixSessionStateStore;
  const runtime = globalThis.PredixWorkforcePackageRuntime;
  const client = globalThis.PredixWorkforcePackageClient;
  const bootstrap = globalThis.PredixWorkforcePackageBootstrap;
  const contracts = globalThis.PredixJourneyContracts;
  if (!storeNamespace?.SessionStateStore || !runtime || !client || !bootstrap || !contracts) {
    throw new Error("WORKFORCE_PACKAGE_STATE_DEPENDENCY_MISSING");
  }

  const BaseStore = storeNamespace.SessionStateStore;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  const normalizeCustomization = (value) => {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      answerModes: source.answerModes && typeof source.answerModes === "object" && !Array.isArray(source.answerModes) ? { ...source.answerModes } : {},
      answers: source.answers && typeof source.answers === "object" && !Array.isArray(source.answers) ? clone(source.answers) : {},
      omittedOptionalFields: Array.isArray(source.omittedOptionalFields) ? [...new Set(source.omittedOptionalFields.filter((item) => typeof item === "string"))] : [],
      updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : null
    };
  };

  const applyContext = (state) => {
    state.packageContext = bootstrap.packageContext();
    const current = runtime.customization || state.packageCustomization;
    state.packageCustomization = normalizeCustomization(current);
    runtime.customization = clone(state.packageCustomization);
    return state;
  };

  class PackageAwareSessionStateStore extends BaseStore {
    load() {
      let state = super.load();
      if (!state) return state;

      const storedPackageId = state.packageContext?.packageId || null;
      if (runtime.active && storedPackageId && storedPackageId !== client.PACKAGE_ID) {
        state = contracts.createInitialState();
      } else if (runtime.active && !storedPackageId) {
        state = contracts.createInitialState();
      } else if (!runtime.active && state.packageContext?.mode === "package") {
        state = contracts.createInitialState();
      }

      if (runtime.active && state.packageContext?.checksum && state.packageContext.checksum !== client.CHECKSUM_SHA256) {
        state.artifacts.prompt = null;
        state.artifacts.readinessMap = null;
        state.recommendation = null;
        state.configuration.employeeId = "";
        state.session.status = "PACKAGE_VERSION_CHANGED";
      }

      return applyContext(state);
    }

    save(state) {
      applyContext(state);
      return super.save(state);
    }

    clear() {
      const result = super.clear();
      if (result.ok) runtime.customization = bootstrap.emptyCustomization();
      return result;
    }
  }

  globalThis.PredixSessionStateStore = Object.freeze({
    ...storeNamespace,
    SessionStateStore: PackageAwareSessionStateStore,
    normalizePackageCustomization: normalizeCustomization
  });
})();
