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
    PROMPT_COPY_CONFIRMED: "PROMPT_COPY_CONFIRMED",
    PLATFORM_SELECTED: "PLATFORM_SELECTED",
    PROMPT_SUBMISSION_DECLARED: "PROMPT_SUBMISSION_DECLARED",
    TEST_SKIPPED: "TEST_SKIPPED",
    SCENARIO_EXECUTED: "SCENARIO_EXECUTED",
    OBSERVATION_RECORDED: "OBSERVATION_RECORDED",
    READINESS_VIEWED: "READINESS_VIEWED",
    FREE_PATH_SELECTED: "FREE_PATH_SELECTED",
    COMMERCIAL_SCOPE_SELECTED: "COMMERCIAL_SCOPE_SELECTED",
    COMMERCIAL_CONTACT_CONFIRMED: "COMMERCIAL_CONTACT_CONFIRMED",
    COMMERCIAL_SUBMIT_STARTED: "COMMERCIAL_SUBMIT_STARTED",
    COMMERCIAL_SUBMIT_CONFIRMED: "COMMERCIAL_SUBMIT_CONFIRMED",
    COMMERCIAL_SUBMIT_FAILED: "COMMERCIAL_SUBMIT_FAILED",
    COMMERCIAL_SUBMIT_UNKNOWN: "COMMERCIAL_SUBMIT_UNKNOWN",
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

  const nowIso = () => new Date().toISOString();
  const randomId = (prefix) => `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  const createInitialState = () => ({
    meta: {
      schemaVersion: "1.0",
      stateRevision: 0,
      storageMode: "session",
      storageStatus: "available",
      integrityStatus: "valid",
      tabInstanceId: randomId("tab"),
      appBuildVersion: "k6.1"
    },
    session: {
      sessionId: randomId("session"),
      status: "valid",
      resumeHintScreen: SCREENS.ENTRY
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
    commercial: {
      draft: null,
      submission: {
        status: SUBMISSION.DRAFT,
        submissionAttemptId: null,
        idempotencyKey: null,
        serverReference: null,
        lastErrorCode: null
      }
    },
    operations: {
      activeOperation: null,
      lastError: null
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
    state.journey.history.push({ screen, event, stateRevision: state.meta.stateRevision + 1, at: nowIso() });
    state.journey.history = state.journey.history.slice(-30);
  };

  const invalidateFromConfiguration = (state) => {
    if (state.artifacts.prompt) state.artifacts.prompt.status = "STALE";
    if (state.artifacts.readinessMap) state.artifacts.readinessMap.status = "STALE";
    state.externalJourney.activeTestAttempt = null;
    state.externalJourney.observations = [];
    state.commercial.draft = null;
    state.commercial.submission = {
      status: SUBMISSION.DRAFT,
      submissionAttemptId: null,
      idempotencyKey: null,
      serverReference: null,
      lastErrorCode: null
    };
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
        state.answers.objectiveId = payload.objectiveId;
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
        state.answers.processModeId = payload.processModeId;
        invalidateFromConfiguration(state);
        setScreen(state, SCREENS.CHANNELS, event);
        break;
      case EVENTS.CHANNELS_CONFIRMED:
        if (!Array.isArray(payload.channelIds)) throw new Error("INVALID_SELECTION");
        state.answers.channelIds = [...new Set(payload.channelIds)].slice(0, 8);
        invalidateFromConfiguration(state);
        setScreen(state, SCREENS.RESULTS, event);
        break;
      case EVENTS.RESULTS_CONFIRMED:
        if (!Array.isArray(payload.desiredResultIds) || payload.desiredResultIds.length < 1 || payload.desiredResultIds.length > 3) throw new Error("INVALID_SELECTION");
        state.answers.desiredResultIds = [...new Set(payload.desiredResultIds)];
        state.recommendation = payload.recommendation;
        state.versions.recommendationVersion += 1;
        state.versions.configurationVersion += 1;
        state.configuration.employeeId = payload.recommendation.employeeId;
        state.configuration.mandatoryControls = payload.mandatoryControls || [];
        setScreen(state, SCREENS.RECOMMENDATION, event);
        break;
      case EVENTS.RECOMMENDATION_ACCEPTED:
        if (!state.recommendation?.employeeId) throw new Error("MISSING_RECOMMENDATION");
        setScreen(state, SCREENS.CONFIGURATION, event);
        break;
      case EVENTS.CONFIGURATION_CONFIRMED:
        state.configuration.tone = String(payload.tone || state.configuration.tone);
        state.configuration.additionalRules = String(payload.additionalRules || "").trim().slice(0, 500);
        state.configuration.authorizedContent = Array.isArray(payload.authorizedContent) ? payload.authorizedContent.slice(0, 10) : [];
        state.versions.configurationVersion += 1;
        state.versions.humanControlVersion += 1;
        state.versions.authorizedContentVersion += 1;
        invalidateFromConfiguration(state);
        setScreen(state, SCREENS.REVIEW, event);
        break;
      case EVENTS.PROMPT_PREPARED:
        if (!payload.promptArtifact?.content) throw new Error("PROMPT_GENERATION_FAILED");
        state.artifacts.prompt = payload.promptArtifact;
        state.versions.promptVersion = payload.promptArtifact.promptVersion;
        setScreen(state, SCREENS.PROMPT, event);
        break;
      case EVENTS.PROMPT_COPY_CONFIRMED:
        if (!state.artifacts.prompt || state.artifacts.prompt.status === "STALE") throw new Error("STALE_PROMPT");
        state.artifacts.prompt.copyStatus = payload.copyStatus || "CLIPBOARD_SUCCESS";
        state.artifacts.prompt.copiedVersion = state.artifacts.prompt.promptVersion;
        setScreen(state, SCREENS.PLATFORM, event);
        break;
      case EVENTS.PLATFORM_SELECTED:
        if (!payload.platformId) throw new Error("INVALID_SELECTION");
        if (state.artifacts.prompt?.copiedVersion !== state.artifacts.prompt?.promptVersion) throw new Error("PROMPT_NOT_COPIED");
        state.externalJourney.activeTestAttempt = {
          testAttemptId: randomId("attempt"),
          promptVersion: state.artifacts.prompt.promptVersion,
          platformId: payload.platformId,
          status: "AWAITING_USER_RETURN",
          createdAt: nowIso()
        };
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
        state.externalJourney.activeTestAttempt = state.externalJourney.activeTestAttempt || {
          testAttemptId: randomId("attempt"),
          promptVersion: state.artifacts.prompt?.promptVersion || 0,
          platformId: null
        };
        state.externalJourney.activeTestAttempt.status = "SKIPPED";
        state.externalJourney.activeTestAttempt.completedAt = nowIso();
        setScreen(state, SCREENS.READINESS, event);
        break;
      case EVENTS.SCENARIO_EXECUTED:
        if (state.externalJourney.activeTestAttempt?.status !== "USER_DECLARED_PROMPT_SENT") throw new Error("PROMPT_SUBMISSION_REQUIRED");
        state.externalJourney.activeTestAttempt.status = "USER_DECLARED_TEST_EXECUTED";
        setScreen(state, SCREENS.OBSERVATION, event);
        break;
      case EVENTS.OBSERVATION_RECORDED:
        if (!payload.observation) throw new Error("INCOMPLETE_INPUT");
        state.externalJourney.observations.push({
          observationId: randomId("observation"),
          testAttemptId: state.externalJourney.activeTestAttempt?.testAttemptId || null,
          promptVersion: state.artifacts.prompt?.promptVersion || 0,
          ...payload.observation,
          recordedAt: nowIso()
        });
        state.externalJourney.activeTestAttempt.status = "OBSERVATION_RECORDED";
        state.artifacts.readinessMap = payload.readinessMap;
        setScreen(state, SCREENS.TEST_SUMMARY, event);
        break;
      case EVENTS.READINESS_VIEWED:
        if (!state.artifacts.readinessMap) state.artifacts.readinessMap = payload.readinessMap;
        setScreen(state, SCREENS.DECISION, event);
        break;
      case EVENTS.FREE_PATH_SELECTED:
        setScreen(state, SCREENS.FREE_PATH, event);
        break;
      case EVENTS.COMMERCIAL_SCOPE_SELECTED:
        if (!Array.isArray(payload.scopeIds) || payload.scopeIds.length < 1) throw new Error("INVALID_SELECTION");
        state.commercial.draft = {
          schemaVersion: "2.0",
          selectedTechnicalScopeIds: [...new Set(payload.scopeIds)].slice(0, 6),
          readinessSummaryAllowlist: payload.readinessSummaryAllowlist || [],
          createdAt: nowIso()
        };
        setScreen(state, SCREENS.COMMERCIAL_CONTACT, event);
        break;
      case EVENTS.COMMERCIAL_CONTACT_CONFIRMED:
        if (!state.commercial.draft) throw new Error("MISSING_COMMERCIAL_SCOPE");
        state.commercial.draft = { ...state.commercial.draft, ...payload.contact };
        state.commercial.submission.status = SUBMISSION.READY;
        setScreen(state, SCREENS.COMMERCIAL_SUBMIT, event);
        break;
      case EVENTS.COMMERCIAL_SUBMIT_STARTED:
        if (state.commercial.submission.status === SUBMISSION.UNKNOWN) throw new Error("SUBMISSION_RETRY_BLOCKED");
        state.commercial.submission = {
          ...state.commercial.submission,
          status: SUBMISSION.SUBMITTING,
          submissionAttemptId: payload.submissionAttemptId,
          idempotencyKey: payload.idempotencyKey,
          lastErrorCode: null
        };
        break;
      case EVENTS.COMMERCIAL_SUBMIT_CONFIRMED:
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
      case EVENTS.BACK:
        setScreen(state, payload.screen || SCREENS.ENTRY, event);
        break;
      case EVENTS.RESET:
        return createInitialState();
      default:
        throw new Error("UNKNOWN_EVENT");
    }

    return state;
  };

  const validateEnvelope = (value) => {
    if (!value || typeof value !== "object") return false;
    if (value.meta?.schemaVersion !== "1.0") return false;
    if (!Number.isInteger(value.meta?.stateRevision) || value.meta.stateRevision < 0) return false;
    if (!Object.values(SCREENS).includes(value.journey?.canonicalScreen)) return false;
    if (!value.session?.sessionId || !value.meta?.tabInstanceId) return false;
    return true;
  };

  const deriveCanonicalScreen = (state) => {
    if (!validateEnvelope(state)) return SCREENS.ENTRY;
    const requested = state.journey.canonicalScreen;
    if ([SCREENS.SCENARIO, SCREENS.OBSERVATION, SCREENS.TEST_SUMMARY].includes(requested)) {
      if (state.externalJourney.activeTestAttempt?.status !== "USER_DECLARED_PROMPT_SENT" &&
          state.externalJourney.activeTestAttempt?.status !== "USER_DECLARED_TEST_EXECUTED" &&
          state.externalJourney.activeTestAttempt?.status !== "OBSERVATION_RECORDED") return SCREENS.RETURN;
    }
    if ([SCREENS.READINESS, SCREENS.DECISION, SCREENS.FREE_PATH, SCREENS.COMMERCIAL_SCOPE, SCREENS.COMMERCIAL_CONTACT, SCREENS.COMMERCIAL_SUBMIT].includes(requested) &&
        !state.artifacts.prompt) return SCREENS.REVIEW;
    return requested;
  };

  window.PredixJourneyContracts = Object.freeze({
    STORAGE,
    PHASES,
    SCREENS,
    EVENTS,
    READINESS,
    SUBMISSION,
    createInitialState,
    transition,
    validateEnvelope,
    deriveCanonicalScreen,
    randomId,
    clone
  });
})();