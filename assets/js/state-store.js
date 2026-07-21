(() => {
  "use strict";

  const contracts = window.PredixJourneyContracts;
  if (!contracts) throw new Error("JOURNEY_CONTRACTS_REQUIRED");

  const { STORAGE, SUBMISSION, createInitialState, validateEnvelope, deriveCanonicalScreen, clone } = contracts;

  const safeParse = (raw) => {
    if (!raw || typeof raw !== "string") return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const safeText = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const safeList = (value, maxItems, maxLength) => Array.isArray(value)
    ? [...new Set(value.filter((item) => typeof item === "string").map((item) => item.trim().slice(0, maxLength)).filter(Boolean))].slice(0, maxItems)
    : [];

  const recoverPartialEnvelope = (source) => {
    if (!source || typeof source !== "object" || Array.isArray(source)) return null;
    const recovered = createInitialState();
    const answers = source.answers && typeof source.answers === "object" ? source.answers : {};
    const configuration = source.configuration && typeof source.configuration === "object" ? source.configuration : {};

    recovered.answers.objectiveId = safeText(answers.objectiveId, 80);
    recovered.answers.segment = safeText(answers.segment, 80);
    recovered.answers.processModeId = safeText(answers.processModeId, 80);
    recovered.answers.channelIds = safeList(answers.channelIds, 8, 80);
    recovered.answers.desiredResultIds = safeList(answers.desiredResultIds, 3, 80);
    recovered.configuration.employeeId = safeText(configuration.employeeId, 80);
    recovered.configuration.tone = safeText(configuration.tone, 120) || recovered.configuration.tone;

    const hasAnyRecoverableValue = Boolean(
      recovered.answers.objectiveId || recovered.answers.segment || recovered.answers.processModeId ||
      recovered.answers.channelIds.length || recovered.answers.desiredResultIds.length || recovered.configuration.employeeId
    );
    if (!hasAnyRecoverableValue) return null;

    recovered.meta.stateRevision = Number.isInteger(source.meta?.stateRevision) && source.meta.stateRevision >= 0
      ? source.meta.stateRevision + 1
      : 1;
    recovered.meta.integrityStatus = "partial_recovery";
    recovered.session.status = "RECOVERABLE_PARTIAL";
    recovered.operations.recoveryNotice = "PARTIAL_RECOVERY_ALLOWLIST_APPLIED";

    let screen = contracts.SCREENS.OBJECTIVE;
    if (recovered.answers.objectiveId) screen = contracts.SCREENS.SEGMENT;
    if (recovered.answers.objectiveId && recovered.answers.segment) screen = contracts.SCREENS.PROCESS;
    if (recovered.answers.objectiveId && recovered.answers.segment && recovered.answers.processModeId) screen = contracts.SCREENS.RESULTS;
    recovered.journey.canonicalScreen = screen;
    recovered.journey.phase = contracts.PHASES.CREATE;
    recovered.session.resumeHintScreen = screen;

    recovered.recommendation = null;
    recovered.artifacts.prompt = null;
    recovered.artifacts.readinessMap = null;
    recovered.externalJourney.activeTestAttempt = null;
    recovered.externalJourney.observations = [];
    recovered.commercial.draft = null;
    recovered.commercial.submission.status = SUBMISSION.DRAFT;
    return recovered;
  };

  class SessionStateStore {
    constructor(storage) {
      this.storage = storage || null;
      this.memoryState = null;
      this.status = "AVAILABLE";
      if (!this.storage) {
        try {
          this.storage = window.sessionStorage;
        } catch {
          this.storage = null;
          this.status = "MEMORY_ONLY";
        }
      }
    }

    probe() {
      if (!this.storage) {
        this.status = "MEMORY_ONLY";
        return this.status;
      }
      try {
        const key = `${STORAGE.namespace}.probe`;
        this.storage.setItem(key, "1");
        this.storage.removeItem(key);
        this.status = "AVAILABLE";
      } catch (error) {
        this.status = error?.name === "QuotaExceededError" ? "QUOTA_EXCEEDED" : "MEMORY_ONLY";
      }
      return this.status;
    }

    normalizeRecoveredOperations(envelope) {
      if (!envelope || typeof envelope !== "object") return envelope;
      if (envelope.operations) envelope.operations.activeOperation = null;
      const submission = envelope.commercial?.submission;
      if (submission?.status === SUBMISSION.SUBMITTING) {
        submission.status = SUBMISSION.UNKNOWN;
        submission.lastErrorCode = "RECOVERED_FROM_INTERRUPTED_SUBMISSION";
      }
      return envelope;
    }

    finalizeLoaded(envelope, status = null) {
      this.normalizeRecoveredOperations(envelope);
      envelope.journey.canonicalScreen = deriveCanonicalScreen(envelope);
      if (status) envelope.session.status = status;
      this.memoryState = clone(envelope);
      return envelope;
    }

    load() {
      if (this.probe() !== "AVAILABLE") return this.memoryState ? clone(this.memoryState) : null;
      try {
        const activeRaw = this.storage.getItem(STORAGE.active);
        const backupRaw = this.storage.getItem(STORAGE.lastKnownGood);
        const active = safeParse(activeRaw);
        if (validateEnvelope(active)) return this.finalizeLoaded(active);

        const backup = safeParse(backupRaw);
        if (validateEnvelope(backup)) {
          this.status = "CORRUPTED";
          const recoveredBackup = recoverPartialEnvelope(backup);
          if (recoveredBackup) return this.finalizeLoaded(recoveredBackup, "RECOVERABLE_PARTIAL");
        }

        const partial = recoverPartialEnvelope(active) || recoverPartialEnvelope(backup);
        if (partial) {
          this.status = "CORRUPTED";
          this.memoryState = clone(partial);
          return partial;
        }

        if (activeRaw || backupRaw) this.status = "CORRUPTED";
      } catch {
        this.status = "READ_FAILED";
      }
      return null;
    }

    save(state) {
      const envelope = clone(state);
      envelope.journey.canonicalScreen = deriveCanonicalScreen(envelope);
      this.memoryState = clone(envelope);

      if (this.probe() !== "AVAILABLE") {
        envelope.meta.storageStatus = "memory_only";
        this.memoryState = clone(envelope);
        return { ok: true, durable: false, status: this.status === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "MEMORY_ONLY" };
      }

      try {
        const serialized = JSON.stringify(envelope);
        this.storage.setItem(STORAGE.pending, serialized);
        const pending = safeParse(this.storage.getItem(STORAGE.pending));
        if (!validateEnvelope(pending) || pending.meta.stateRevision !== envelope.meta.stateRevision) throw new Error("PENDING_VALIDATION_FAILED");
        const previous = this.storage.getItem(STORAGE.active);
        if (previous) this.storage.setItem(STORAGE.lastKnownGood, previous);
        this.storage.setItem(STORAGE.active, serialized);
        this.storage.removeItem(STORAGE.pending);
        const verified = safeParse(this.storage.getItem(STORAGE.active));
        if (!validateEnvelope(verified) || verified.meta.stateRevision !== envelope.meta.stateRevision) throw new Error("ACTIVE_VALIDATION_FAILED");
        this.status = "AVAILABLE";
        return { ok: true, durable: true, status: "AVAILABLE" };
      } catch (error) {
        this.status = error?.name === "QuotaExceededError" ? "QUOTA_EXCEEDED" : "WRITE_FAILED";
        return { ok: false, durable: false, status: this.status };
      }
    }

    clear() {
      if (this.memoryState?.commercial?.submission?.status === SUBMISSION.UNKNOWN) return { ok: false, status: "SUBMISSION_UNKNOWN_BLOCKS_CLEAR" };
      const keys = [STORAGE.active, STORAGE.pending, STORAGE.lastKnownGood];
      if (!this.storage) {
        this.memoryState = null;
        return { ok: true, status: "CLEARED_MEMORY_ONLY" };
      }
      try {
        keys.forEach((key) => this.storage.removeItem(key));
        const remains = keys.some((key) => this.storage.getItem(key) !== null);
        if (remains) return { ok: false, status: "WRITE_FAILED" };
        this.memoryState = null;
        return { ok: true, status: "CLEARED" };
      } catch {
        return { ok: false, status: "WRITE_FAILED" };
      }
    }
  }

  window.PredixSessionStateStore = Object.freeze({ SessionStateStore, recoverPartialEnvelope });
})();
