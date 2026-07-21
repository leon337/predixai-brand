(() => {
  "use strict";

  const contracts = window.PredixJourneyContracts;
  if (!contracts) throw new Error("JOURNEY_CONTRACTS_REQUIRED");

  const { STORAGE, validateEnvelope, deriveCanonicalScreen, clone } = contracts;

  class SessionStateStore {
    constructor(storage = window.sessionStorage) {
      this.storage = storage;
      this.memoryState = null;
      this.status = "AVAILABLE";
    }

    probe() {
      try {
        const key = `${STORAGE.namespace}.probe`;
        this.storage.setItem(key, "1");
        this.storage.removeItem(key);
        this.status = "AVAILABLE";
      } catch {
        this.status = "MEMORY_ONLY";
      }
      return this.status;
    }

    load() {
      if (this.probe() !== "AVAILABLE") return this.memoryState ? clone(this.memoryState) : null;
      try {
        const activeRaw = this.storage.getItem(STORAGE.active);
        const backupRaw = this.storage.getItem(STORAGE.lastKnownGood);
        const active = activeRaw ? JSON.parse(activeRaw) : null;
        if (validateEnvelope(active)) {
          active.journey.canonicalScreen = deriveCanonicalScreen(active);
          this.memoryState = clone(active);
          return active;
        }
        const backup = backupRaw ? JSON.parse(backupRaw) : null;
        if (validateEnvelope(backup)) {
          backup.session.status = "recoverable_partial";
          backup.journey.canonicalScreen = deriveCanonicalScreen(backup);
          this.memoryState = clone(backup);
          return backup;
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
        return { ok: true, durable: false, status: "MEMORY_ONLY" };
      }

      try {
        const serialized = JSON.stringify(envelope);
        this.storage.setItem(STORAGE.pending, serialized);
        const pending = JSON.parse(this.storage.getItem(STORAGE.pending) || "null");
        if (!validateEnvelope(pending) || pending.meta.stateRevision !== envelope.meta.stateRevision) {
          throw new Error("PENDING_VALIDATION_FAILED");
        }
        const previous = this.storage.getItem(STORAGE.active);
        if (previous) this.storage.setItem(STORAGE.lastKnownGood, previous);
        this.storage.setItem(STORAGE.active, serialized);
        this.storage.removeItem(STORAGE.pending);
        const verified = JSON.parse(this.storage.getItem(STORAGE.active) || "null");
        if (!validateEnvelope(verified) || verified.meta.stateRevision !== envelope.meta.stateRevision) {
          throw new Error("ACTIVE_VALIDATION_FAILED");
        }
        this.status = "AVAILABLE";
        return { ok: true, durable: true, status: "AVAILABLE" };
      } catch (error) {
        this.status = error instanceof DOMException && error.name === "QuotaExceededError" ? "QUOTA_EXCEEDED" : "WRITE_FAILED";
        return { ok: false, durable: false, status: this.status };
      }
    }

    clear() {
      const keys = [STORAGE.active, STORAGE.pending, STORAGE.lastKnownGood];
      try {
        keys.forEach((key) => this.storage.removeItem(key));
        const remains = keys.some((key) => this.storage.getItem(key) !== null);
        if (remains) return { ok: false, status: "WRITE_FAILED" };
        this.memoryState = null;
        return { ok: true, status: "CLEARED" };
      } catch {
        this.memoryState = null;
        return { ok: false, status: "WRITE_FAILED" };
      }
    }
  }

  window.PredixSessionStateStore = Object.freeze({ SessionStateStore });
})();