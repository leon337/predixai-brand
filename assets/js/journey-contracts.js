(() => {
  "use strict";

  const STORAGE = Object.freeze({
    namespace: "predixai.employeeBuilder",
    active: "predixai.employeeBuilder.active",
    pending: "predixai.employeeBuilder.pending",
    lastKnownGood: "predixai.employeeBuilder.lastKnownGood"
  });

  const PHASES = Object.freeze({
    CREATE: "PHASE_CREATE",
    KNOW: "PHASE_KNOW",
    TEST: "PHASE_TEST",
    DECIDE: "PHASE_DECIDE"
  });

  const SCREENS = Object.freeze({
    ENTRY: "WF-01",
    OBJECTIVE: "WF-02",
    SEGMENT: "WF-03",
    PROCESS: "WF-04A",
    CHANNELS: "WF-04B",
    RESULTS: "WF-05",
    RECOMMENDATION: "WF-06",
    CONFIGURATION: "WF-07",
    REVIEW: "WF-07B",
    PROMPT: "WF-08",
    PLATFORM: "WF-08B",
    RETURN: "WF-08R",
    SCENARIO: "WF-08C",
    OBSERVATION: "WF-08D",
    TEST_SUMMARY: "WF-08E",
    READINESS: "WF-09",
    DECISION: "WF-10",
    FREE_PATH: "WF-10A",
    COMMERCIAL_SCOPE: "WF-10B",
    COMMERCIAL_CONTACT: "WF-10C",
    COMMERCIAL_SUBMIT: "WF-10D",
    COMPLETE: "WF-10E"
  });

  const EVENTS = Object.freeze({
    START: "JOURNEY_STARTED",
    OBJECTIVE_SELECTED: "OBJECTIVE_SELECTED",
    SEGMENT_CONFIRMED: "SEGMENT_CONFIRMED",
    PROCESS_SELECTED: "PROCESS_SELECTED",
    CHANNELS_CONFIRMED: "CHANNELS_CONFIRMED",
    RESULTS_CONFIRMED: "RESULTS_CONFIRMED",
    RECOMMENDATION_ACCEPTED: "RECOMMENDATION_ACCEPTED",
    CONFIGURATION_CONFIRMED: "CONFIGURATION_CONFIRMED",
    PROMPT_PREPARED: "PROMPT_PREPARED",
    PROMPT_COPY_REQUIRED: "PROMPT_COPY_REQUIRED",
    PROMPT_COPY_CONFIRMED: "PROMPT_COPY_CONFIRMED",
    PLATFORM_SELECTED: "PLATFORM_SELECTED",
    PROMPT_SUBMISSION_DECLARED: "PROMPT_SUBMISSION_DECLARED",
    TEST_SKIPPED: "TEST_SKIPPED",
    SCENARIO_EXECUTED: "SCENARIO_EXECUTED",
    OBSERVATION_RECORDED: "OBSERVATION_RECORDED",
    READINESS_PREPARED: "READINESS_PREPARED",
    READINESS_VIEWED: "READINESS_VIEWED",
    FREE_PATH_SELECTED: "FREE_PATH_SELECTED",
    COMMERCIAL_PATH_SELECTED: "COMMERCIAL_PATH_SELECTED",
    COMMERCIAL_SCOPE_SELECTED: "COMMERCIAL_SCOPE_SELECTED",
    COMMERCIAL_CONTACT_CONFIRMED: "COMMERCIAL_CONTACT_CONFIRMED",
    COMMERCIAL_SUBMIT_STARTED: "COMMERCIAL_SUBMIT_STARTED",
    COMMERCIAL_SUBMIT_CONFIRMED: "COMMERCIAL_SUBMIT_CONFIRMED",
    COMMERCIAL_SUBMIT_FAILED: "COMMERCIAL_SUBMIT_FAILED",
    COMMERCIAL_SUBMIT_UNKNOWN: "COMMERCIAL_SUBMIT_UNKNOWN",
    CATALOG_SELECTION_ORPHANED: "CATALOG_SELECTION_ORPHANED",
    CONNECTIVITY_EVIDENCE_CHANGED: "CONNECTIVITY_EVIDENCE_CHANGED",
    TAB_CONFLICT_DETECTED: "TAB_CONFLICT_DETECTED",
    BACK: "NAVIGATE_BACK",
    RESET: "RESET_JOURNEY"
  });

  const READINESS = Object.freeze({
    HUMAN_ONLY: "NOT_ELIGIBLE_FOR_AUTOMATION",
    TECHNICAL: "NEEDS_TECHNICAL_EVALUATION",
    BUSINESS: "NEEDS_BUSINESS_CONTENT",
    READY: "READY_FOR_MANUAL_TEST"
  });

  const SUBMISSION = Object.freeze({
    DRAFT: "DRAFT",
    VALIDATING: "VALIDATING",
    READY: "READY_TO_SUBMIT",
    SUBMITTING: "SUBMITTING",
    CONFIRMED: "CONFIRMED",
    FAILED: "FAILED",
    UNKNOWN: "UNKNOWN",
    CANCELED: "CANCELED"
  });

  const CONNECTIVITY = Object.freeze({
    UNKNOWN: "UNKNOWN",
    LIKELY_ONLINE: "LIKELY_ONLINE",
    LIKELY_OFFLINE: "LIKELY_OFFLINE",
    OPERATION_REQUIRES_CONNECTION: "OPERATION_REQUIRES_CONNECTION",
    REQUEST_FAILED: "REQUEST_FAILED",
    CONNECTION_CONFIRMED_BY_SUCCESS: "CONNECTION_CONFIRMED_BY_SUCCESS"
  });

  const OFFLINE_READINESS = Object.freeze({
    READY: "OFFLINE_READY",
    PARTIAL: "OFFLINE_PARTIAL",
    NOT_READY: "OFFLINE_NOT_READY"
  });

  const nowIso = () => new Date().toISOString();
  const randomId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const isString = (value, max = 1000) => typeof value === "string" && value.length <= max;
  const isStringArray = (value, maxItems, maxLength = 100) => Array.isArray(value) && value.length <= maxItems && value.every((item) => isString(item, maxLength));

  const createInitialState = () => ({
    meta: {
      schemaVersion: "1.0",
      stateRevision: 0,
      storageMode: "session",
      storageStatus: "available",
      integrityStatus: "valid",
      tabInstanceId: randomId("tab"),
      appBuildVersion: "k6.2"
    },
    session: {
      sessionId: randomId("session"),
      status: "valid",
      resumeHintScreen: SCREENS.ENTRY,
      orphanEmployeeId: null,
      duplicateTabDetected: false
    },
    journey: {
      phase: PHASES.CREATE,
      canonicalScreen: SCREENS.ENTRY,
      history: []
    },
    answers: {
      objectiveId: "",
      segment: "",
      processModeId: "",
      channelIds: [],
      desiredResultIds: []
    },
    recommendation: null,
    configuration: {
      employeeId: "",
      tone: "profissional, claro e respeitoso",
      mandatoryControls: [],
      additionalRules: "",
      authorizedContent: []
    },
    versions: {
      configurationVersion: 0,
      recommendationVersion: 0,
      humanControlVersion: 0,
      authorizedContentVersion: 0,
      promptVersion: 0,
      catalogVersion: "0",
      classificationRuleVersion: "1.0"
    },
    artifacts: {
      prompt: null,
      readinessMap: null
    },
    externalJourney: {
      activeTestAttempt: null,
      observations: []
    },
    externalState: {
      connectivityEvidence: CONNECTIVITY.UNKNOWN,
      offlineReadiness: OFFLINE_READINESS.NOT_READY,
      localAssetsReady: false,
      updatedAt: null
    },
    commercial: {
      draft: null,
      submission: {
        status: SUBMISSION.DRAFT,
        submissionAttemptId: null,
        idempotencyKey: null,
        payloadHash: null,
        payloadSnapshot: null,
        serverReference: null,
        lastErrorCode: null
      }
    },
    operations: {
      activeOperation: null,
      lastError: null,
      recoveryNotice: null
    }
  });

  const phaseForScreen = (screen) => {
    if ([SCREENS.ENTRY, SCREENS.OBJECTIVE, SCREENS.SEGMENT, SCREENS.PROCESS, SCREENS.CHANNELS, SCREENS.RESULTS].includes(screen)) return PHASES.CREATE;
    if ([SCREENS.RECOMMENDATION, SCREENS.CONFIGURATION, SCREENS.REVIEW].includes(screen)) return PHASES.KNOW;
    if ([SCREENS.PROMPT, SCREENS.PLATFORM, SCREENS.RETURN, SCREENS.SCENARIO, SCREENS.OBSERVATION, SCREENS.TEST_SUMMARY].includes(screen)) return PHASES.TEST;
    return PHASES.DECIDE;
  };

  const setScreen = (state, screen, event) => {
    state.journey.canonicalScreen = screen;
    state.journey.phase = phaseForScreen(screen);
    state.session.resumeHintScreen = screen;
    state.journey.history.push({ screen, event, stateRevision: state.meta.stateRevision, at: nowIso() });
    state.journey.history = state.journey.history.slice(-30);
  };

  const resetSubmission = () => ({
    status: SUBMISSION.DRAFT,
    submissionAttemptId: null,
    idempotencyKey: null,
    payloadHash: null,
    payloadSnapshot: null,
    serverReference: null,
    lastErrorCode: null
  });

  const invalidateFromConfiguration = (state) => {
    if (state.artifacts.prompt) state.artifacts.prompt.status = "STALE";
    if (state.artifacts.readinessMap) state.artifacts.readinessMap.status = "STALE";
    state.externalJourney.activeTestAttempt = null;
    state.externalJourney.observations = [];
    state.commercial.draft = null;
    state.commercial.submission = resetSubmission();
  };

  const validateObservation = (observation) => {
    if (!observation || typeof observation !== "object") return { ok: false, code: "INCOMPLETE_INPUT" };
    const { matchResult, inventedInfo, humanHandoff } = observation;
    const validMatch = new Set(["expected", "partial", "unexpected", "unable"]);
    const validInvented = new Set(["no", "yes", "unknown"]);
    const validHandoff = new Set(["yes", "no", "not-required", "unknown"]);
    if (!validMatch.has(matchResult) || !validInvented.has(inventedInfo) || !validHandoff.has(humanHandoff)) return { ok: false, code: "INCOMPLETE_INPUT" };
    if (matchResult === "unable" && (inventedInfo !== "unknown" || !["unknown", "not-required"].includes(humanHandoff))) return { ok: false, code: "CONTRADICTORY_OBSERVATION" };
    if (matchResult === "expected" && inventedInfo === "yes") return { ok: false, code: "CONTRADICTORY_OBSERVATION" };
    return { ok: true };
  };

  const validateEnvelope = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    if (value.meta?.schemaVersion !== "1.0") return false;
    if (!Number.isInteger(value.meta?.stateRevision) || value.meta.stateRevision < 0) return false;
    if (!Object.values(SCREENS).includes(value.journey?.canonicalScreen)) return false;
    if (!Object.values(PHASES).includes(value.journey?.phase)) return false;
    if (!value.session?.sessionId || !value.meta?.tabInstanceId) return false;
    if (!value.answers || !isString(value.answers.objectiveId, 80) || !isString(value.answers.segment, 80) || !isString(value.answers.processModeId, 80)) return false;
    if (!isStringArray(value.answers.channelIds, 8, 80) || !isStringArray(value.answers.desiredResultIds, 3, 80)) return false;
    if (!value.configuration || !isString(value.configuration.employeeId, 80) || !isString(value.configuration.tone, 120) || !isString(value.configuration.additionalRules, 500)) return false;
    if (!isStringArray(value.configuration.mandatoryControls, 20, 300) || !isStringArray(value.configuration.authorizedContent, 10, 300)) return false;
    if (!value.commercial?.submission || !Object.values(SUBMISSION).includes(value.commercial.submission.status)) return false;
    return true;
  };

  const screenRank = Object.freeze(Object.values(SCREENS).reduce((acc, screen, index) => ({ ...acc, [screen]: index }), {}));
  const requestedAtOrAfter = (requested, screen) => (screenRank[requested] ?? 0) >= (screenRank[screen] ?? 0);

  const deriveCanonicalScreen = (state) => {
    if (!validateEnvelope(state)) return SCREENS.ENTRY;
    const requested = state.journey.canonicalScreen;
    if (requested === SCREENS.ENTRY) return requested;
    if (!state.answers.objectiveId) return SCREENS.OBJECTIVE;
    if (requestedAtOrAfter(requested, SCREENS.SEGMENT) && !state.answers.segment) return SCREENS.SEGMENT;
    if (requestedAtOrAfter(requested, SCREENS.PROCESS) && !state.answers.processModeId) return SCREENS.PROCESS;
    if (requestedAtOrAfter(requested, SCREENS.RESULTS) && state.answers.desiredResultIds.length < 1) return SCREENS.RESULTS;
    if (requestedAtOrAfter(requested, SCREENS.RECOMMENDATION) && !state.recommendation?.employeeId) return SCREENS.RESULTS;
    if (requestedAtOrAfter(requested, SCREENS.CONFIGURATION) && !state.configuration.employeeId) return SCREENS.RECOMMENDATION;
    if (requestedAtOrAfter(requested, SCREENS.PROMPT) && !state.artifacts.prompt) return SCREENS.REVIEW;
    if (requestedAtOrAfter(requested, SCREENS.PLATFORM) && state.artifacts.prompt?.copiedVersion !== state.artifacts.prompt?.promptVersion) return SCREENS.PROMPT;
    if ([SCREENS.SCENARIO, SCREENS.OBSERVATION, SCREENS.TEST_SUMMARY].includes(requested)) {
      const status = state.externalJourney.activeTestAttempt?.status;
      if (!new Set(["USER_DECLARED_PROMPT_SENT", "USER_DECLARED_TEST_EXECUTED", "OBSERVATION_RECORDED"]).has(status)) return SCREENS.RETURN;
    }
    if (requestedAtOrAfter(requested, SCREENS.READINESS) && !state.artifacts.prompt) return SCREENS.REVIEW;
    if (requestedAtOrAfter(requested, SCREENS.DECISION) && state.artifacts.readinessMap?.status !== "CURRENT") return SCREENS.READINESS;
    if (requestedAtOrAfter(requested, SCREENS.COMMERCIAL_CONTACT) && !state.commercial.draft?.selectedTechnicalScopeIds?.length) return SCREENS.COMMERCIAL_SCOPE;
    if (requestedAtOrAfter(requested, SCREENS.COMMERCIAL_SUBMIT) && state.commercial.submission.status === SUBMISSION.DRAFT) return SCREENS.COMMERCIAL_CONTACT;
    return requested;
  };

  const transition = (current, event, payload = {}) => {
    const state = clone(current);
    state.meta.stateRevision += 1;
    state.operations.lastError = null;

    switch (event) {
      case EVENTS.START:
        setScreen(state, SCREENS.OBJECTIVE, event);
        break;
      case EVENTS.OBJECTIVE_SELECTED:
        if (!payload.objectiveId) throw new Error("INCOMPLETE_INPUT");
        state.answers.objectiveId = String(payload.objectiveId).slice(0, 80);
        invalidateFromConfiguration(state);
        setScreen(state, SCREENS.SEGMENT, event);
        break;
      case EVENTS.SEGMENT_CONFIRMED:
        if (!String(payload.segment || "").trim()) throw new Error("INCOMPLETE_INPUT");
        state.answers.segment = String(payload.segment).trim().slice(0, 80);
        invalidateFromConfiguration(state);
        setScreen(state, SCREENS.PROCESS, event);
        break;
      case EVENTS.PROCESS_SELECTED:
        if (!payload.processModeId) throw new Error("INCOMPLETE_INPUT");
        state.answers.processModeId = String(payload.processModeId).slice(0, 80);
        invalidateFromConfiguration(state);
        setScreen(state, SCREENS.CHANNELS, event);
        break;
      case EVENTS.CHANNELS_CONFIRMED:
        if (!Array.isArray(payload.channelIds)) throw new Error("INVALID_SELECTION");
        state.answers.channelIds = [...new Set(payload.channelIds.map(String))].slice(0, 8);
        invalidateFromConfiguration(state);
        setScreen(state, SCREENS.RESULTS, event);
        break;
      case EVENTS.RESULTS_CONFIRMED:
        if (!Array.isArray(payload.desiredResultIds) || payload.desiredResultIds.length < 1 || payload.desiredResultIds.length > 3) throw new Error("INVALID_SELECTION");
        if (!payload.recommendation?.employeeId) throw new Error("MISSING_RECOMMENDATION");
        state.answers.desiredResultIds = [...new Set(payload.desiredResultIds.map(String))];
        state.recommendation = clone(payload.recommendation);
        state.versions.recommendationVersion += 1;
        state.versions.configurationVersion += 1;
        state.configuration.employeeId = payload.recommendation.employeeId;
        state.configuration.mandatoryControls = Array.isArray(payload.mandatoryControls) ? payload.mandatoryControls.slice(0, 20) : [];
        state.session.orphanEmployeeId = null;
        setScreen(state, SCREENS.RECOMMENDATION, event);
        break;
      case EVENTS.RECOMMENDATION_ACCEPTED:
        if (!state.recommendation?.employeeId) throw new Error("MISSING_RECOMMENDATION");
        setScreen(state, SCREENS.CONFIGURATION, event);
        break;
      case EVENTS.CONFIGURATION_CONFIRMED:
        if (!state.configuration.employeeId || !state.configuration.mandatoryControls.length) throw new Error("MISSING_REQUIRED_CONFIRMATION");
        state.configuration.tone = String(payload.tone || state.configuration.tone).slice(0, 120);
        state.configuration.additionalRules = String(payload.additionalRules || "").trim().slice(0, 500);
        state.configuration.authorizedContent = Array.isArray(payload.authorizedContent) ? payload.authorizedContent.map(String).slice(0, 10) : [];
        state.versions.configurationVersion += 1;
        state.versions.humanControlVersion += 1;
        state.versions.authorizedContentVersion += 1;
        invalidateFromConfiguration(state);
        setScreen(state, SCREENS.REVIEW, event);
        break;
      case EVENTS.PROMPT_PREPARED:
        if (!payload.promptArtifact?.content) throw new Error("PROMPT_GENERATION_FAILED");
        state.artifacts.prompt = clone(payload.promptArtifact);
        state.versions.promptVersion = payload.promptArtifact.promptVersion;
        setScreen(state, SCREENS.PROMPT, event);
        break;
      case EVENTS.PROMPT_COPY_REQUIRED:
        if (!state.artifacts.prompt || state.artifacts.prompt.status === "STALE") throw new Error("STALE_PROMPT");
        state.artifacts.prompt.copyStatus = "MANUAL_COPY_REQUIRED";
        state.artifacts.prompt.copiedVersion = null;
        setScreen(state, SCREENS.PROMPT, event);
        break;
      case EVENTS.PROMPT_COPY_CONFIRMED:
        if (!state.artifacts.prompt || state.artifacts.prompt.status === "STALE") throw new Error("STALE_PROMPT");
        if (!new Set(["CLIPBOARD_SUCCESS", "MANUAL_COPY_CONFIRMED"]).has(payload.copyStatus)) throw new Error("MISSING_REQUIRED_CONFIRMATION");
        state.artifacts.prompt.copyStatus = payload.copyStatus;
        state.artifacts.prompt.copiedVersion = state.artifacts.prompt.promptVersion;
        setScreen(state, SCREENS.PLATFORM, event);
        break;
      case EVENTS.PLATFORM_SELECTED:
        if (!payload.platformId) throw new Error("INVALID_SELECTION");
        if (state.artifacts.prompt?.copiedVersion !== state.artifacts.prompt?.promptVersion) throw new Error("PROMPT_NOT_COPIED");
        state.externalJourney.activeTestAttempt = { testAttemptId: randomId("attempt"), promptVersion: state.artifacts.prompt.promptVersion, platformId: String(payload.platformId).slice(0, 40), status: "AWAITING_USER_RETURN", createdAt: nowIso() };
        setScreen(state, SCREENS.RETURN, event);
        break;
      case EVENTS.PROMPT_SUBMISSION_DECLARED:
        if (!state.externalJourney.activeTestAttempt) throw new Error("MISSING_TEST_ATTEMPT");
        if (state.externalJourney.activeTestAttempt.promptVersion !== state.artifacts.prompt?.promptVersion) throw new Error("STALE_TEST_ATTEMPT");
        state.externalJourney.activeTestAttempt.status = "USER_DECLARED_PROMPT_SENT";
        state.externalJourney.activeTestAttempt.declaredAt = nowIso();
        setScreen(state, SCREENS.SCENARIO, event);
        break;
      case EVENTS.TEST_SKIPPED:
        state.externalJourney.activeTestAttempt = state.externalJourney.activeTestAttempt || { testAttemptId: randomId("attempt"), promptVersion: state.artifacts.prompt?.promptVersion || 0, platformId: null };
        state.externalJourney.activeTestAttempt.status = "SKIPPED";
        state.externalJourney.activeTestAttempt.completedAt = nowIso();
        if (payload.readinessMap) state.artifacts.readinessMap = clone(payload.readinessMap);
        setScreen(state, SCREENS.READINESS, event);
        break;
      case EVENTS.SCENARIO_EXECUTED:
        if (state.externalJourney.activeTestAttempt?.status !== "USER_DECLARED_PROMPT_SENT") throw new Error("PROMPT_SUBMISSION_REQUIRED");
        state.externalJourney.activeTestAttempt.status = "USER_DECLARED_TEST_EXECUTED";
        setScreen(state, SCREENS.OBSERVATION, event);
        break;
      case EVENTS.OBSERVATION_RECORDED: {
        const verdict = validateObservation(payload.observation);
        if (!verdict.ok) throw new Error(verdict.code);
        if (state.externalJourney.activeTestAttempt?.status !== "USER_DECLARED_TEST_EXECUTED") throw new Error("MISSING_TEST_ATTEMPT");
        state.externalJourney.observations.push({ observationId: randomId("observation"), testAttemptId: state.externalJourney.activeTestAttempt.testAttemptId, promptVersion: state.artifacts.prompt?.promptVersion || 0, ...clone(payload.observation), recordedAt: nowIso() });
        state.externalJourney.activeTestAttempt.status = "OBSERVATION_RECORDED";
        if (!payload.readinessMap) throw new Error("MISSING_READINESS_MAP");
        state.artifacts.readinessMap = clone(payload.readinessMap);
        setScreen(state, SCREENS.TEST_SUMMARY, event);
        break;
      }
      case EVENTS.READINESS_PREPARED:
        if (!payload.readinessMap && !state.artifacts.readinessMap) throw new Error("MISSING_READINESS_MAP");
        if (payload.readinessMap) state.artifacts.readinessMap = clone(payload.readinessMap);
        if (state.artifacts.readinessMap?.status !== "CURRENT") throw new Error("MISSING_READINESS_MAP");
        setScreen(state, SCREENS.READINESS, event);
        break;
      case EVENTS.READINESS_VIEWED:
        if (!state.artifacts.readinessMap || state.artifacts.readinessMap.status !== "CURRENT") throw new Error("MISSING_READINESS_MAP");
        setScreen(state, SCREENS.DECISION, event);
        break;
      case EVENTS.FREE_PATH_SELECTED:
        setScreen(state, SCREENS.FREE_PATH, event);
        break;
      case EVENTS.COMMERCIAL_PATH_SELECTED:
        if (!state.artifacts.readinessMap || state.artifacts.readinessMap.status !== "CURRENT") throw new Error("MISSING_READINESS_MAP");
        setScreen(state, SCREENS.COMMERCIAL_SCOPE, event);
        break;
      case EVENTS.COMMERCIAL_SCOPE_SELECTED:
        if (!Array.isArray(payload.scopeIds) || payload.scopeIds.length < 1) throw new Error("INVALID_SELECTION");
        state.commercial.draft = { schemaVersion: "2.0", selectedTechnicalScopeIds: [...new Set(payload.scopeIds.map(String))].sort().slice(0, 6), readinessSummaryAllowlist: Array.isArray(payload.readinessSummaryAllowlist) ? clone(payload.readinessSummaryAllowlist).slice(0, 12) : [], createdAt: nowIso() };
        state.commercial.submission = resetSubmission();
        setScreen(state, SCREENS.COMMERCIAL_CONTACT, event);
        break;
      case EVENTS.COMMERCIAL_CONTACT_CONFIRMED:
        if (!state.commercial.draft) throw new Error("MISSING_COMMERCIAL_SCOPE");
        if (!payload.contact?.consentContact) throw new Error("MISSING_REQUIRED_CONFIRMATION");
        if (!payload.payloadSnapshot || !payload.payloadHash || !payload.submissionAttemptId || !payload.idempotencyKey) throw new Error("MISSING_SUBMISSION_IDENTIFIERS");
        state.commercial.draft = { ...state.commercial.draft, ...clone(payload.contact) };
        state.commercial.submission = { status: SUBMISSION.READY, submissionAttemptId: payload.submissionAttemptId, idempotencyKey: payload.idempotencyKey, payloadHash: payload.payloadHash, payloadSnapshot: clone(payload.payloadSnapshot), serverReference: null, lastErrorCode: null };
        setScreen(state, SCREENS.COMMERCIAL_SUBMIT, event);
        break;
      case EVENTS.COMMERCIAL_SUBMIT_STARTED:
        if ([SUBMISSION.UNKNOWN, SUBMISSION.CONFIRMED, SUBMISSION.SUBMITTING].includes(state.commercial.submission.status)) throw new Error("SUBMISSION_RETRY_BLOCKED");
        if (!state.commercial.submission.submissionAttemptId || !state.commercial.submission.idempotencyKey || !state.commercial.submission.payloadSnapshot) throw new Error("MISSING_SUBMISSION_IDENTIFIERS");
        state.commercial.submission.status = SUBMISSION.SUBMITTING;
        state.commercial.submission.lastErrorCode = null;
        break;
      case EVENTS.COMMERCIAL_SUBMIT_CONFIRMED:
        if (!payload.serverReference) throw new Error("MISSING_SERVER_REFERENCE");
        state.commercial.submission.status = SUBMISSION.CONFIRMED;
        state.commercial.submission.serverReference = payload.serverReference;
        break;
      case EVENTS.COMMERCIAL_SUBMIT_FAILED:
        state.commercial.submission.status = SUBMISSION.FAILED;
        state.commercial.submission.lastErrorCode = payload.errorCode || "SUBMISSION_FAILED";
        break;
      case EVENTS.COMMERCIAL_SUBMIT_UNKNOWN:
        state.commercial.submission.status = SUBMISSION.UNKNOWN;
        state.commercial.submission.lastErrorCode = payload.errorCode || "SUBMISSION_UNKNOWN";
        break;
      case EVENTS.CATALOG_SELECTION_ORPHANED:
        state.session.status = "CATALOG_ORPHANED_SELECTION";
        state.session.orphanEmployeeId = String(payload.employeeId || state.configuration.employeeId || state.recommendation?.employeeId || "").slice(0, 80) || null;
        state.recommendation = null;
        state.configuration.employeeId = "";
        state.configuration.mandatoryControls = [];
        state.artifacts.prompt = null;
        state.artifacts.readinessMap = null;
        state.externalJourney.activeTestAttempt = null;
        state.externalJourney.observations = [];
        state.commercial.draft = null;
        state.commercial.submission = resetSubmission();
        setScreen(state, SCREENS.RESULTS, event);
        break;
      case EVENTS.CONNECTIVITY_EVIDENCE_CHANGED:
        if (!Object.values(CONNECTIVITY).includes(payload.connectivityEvidence)) throw new Error("INVALID_CONNECTIVITY_EVIDENCE");
        if (!Object.values(OFFLINE_READINESS).includes(payload.offlineReadiness)) throw new Error("INVALID_OFFLINE_READINESS");
        state.externalState = { connectivityEvidence: payload.connectivityEvidence, offlineReadiness: payload.offlineReadiness, localAssetsReady: payload.localAssetsReady === true, updatedAt: nowIso() };
        break;
      case EVENTS.TAB_CONFLICT_DETECTED:
        state.session.duplicateTabDetected = true;
        state.session.status = "DUPLICATE_TAB_CONFLICT";
        break;
      case EVENTS.BACK:
        if (!Object.values(SCREENS).includes(payload.screen)) throw new Error("INVALID_NAVIGATION_TARGET");
        setScreen(state, payload.screen, event);
        break;
      case EVENTS.RESET:
        if (state.commercial.submission.status === SUBMISSION.UNKNOWN) throw new Error("SUBMISSION_RETRY_BLOCKED");
        return createInitialState();
      default:
        throw new Error("UNKNOWN_EVENT");
    }

    state.journey.canonicalScreen = deriveCanonicalScreen(state);
    state.journey.phase = phaseForScreen(state.journey.canonicalScreen);
    state.session.resumeHintScreen = state.journey.canonicalScreen;
    return state;
  };

  window.PredixJourneyContracts = Object.freeze({
    STORAGE,
    PHASES,
    SCREENS,
    EVENTS,
    READINESS,
    SUBMISSION,
    CONNECTIVITY,
    OFFLINE_READINESS,
    createInitialState,
    transition,
    validateEnvelope,
    deriveCanonicalScreen,
    validateObservation,
    randomId,
    clone
  });
})();
