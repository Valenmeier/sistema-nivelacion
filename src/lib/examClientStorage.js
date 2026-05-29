const PROFILE_KEY = "set-exam-candidate-profile";
const POLICY_KEY = "set-exam-policy-acceptance";
const INTEGRITY_KEY = "set-exam-integrity";
const MULTIPLE_CHOICE_KEY = "set-exam-multiple-choice-progress";

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}


export function clearClientStateForNewAccess() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_KEY);
  window.localStorage.removeItem(POLICY_KEY);
  window.localStorage.removeItem(INTEGRITY_KEY);
  window.localStorage.removeItem(MULTIPLE_CHOICE_KEY);
}

export function saveCandidateProfile(profile) {
  writeJson(PROFILE_KEY, { ...profile, savedAt: Date.now() });
}

export function readCandidateProfile() {
  return readJson(PROFILE_KEY, null);
}

export function savePolicyAcceptance() {
  writeJson(POLICY_KEY, { accepted: true, acceptedAt: Date.now() });
}

export function readPolicyAcceptance() {
  return readJson(POLICY_KEY, { accepted: false });
}

export function readIntegrityState() {
  return readJson(INTEGRITY_KEY, {
    active: false,
    cancelled: false,
    completed: false,
    abandonmentCount: 0,
  });
}

export function beginOrResumeExamAttempt() {
  const existing = readIntegrityState();
  if (existing.cancelled) return { state: existing, isNew: false };
  if (existing.active && !existing.completed) return { state: existing, isNew: false };

  const state = {
    active: true,
    cancelled: false,
    completed: false,
    abandonmentCount: 0,
    startedAt: Date.now(),
  };
  writeJson(INTEGRITY_KEY, state);
  return { state, isNew: true };
}

export function recordAbandonment() {
  const current = readIntegrityState();
  if (!current.active || current.completed || current.cancelled) return current;

  const abandonmentCount = current.abandonmentCount + 1;
  const next = {
    ...current,
    abandonmentCount,
    cancelled: abandonmentCount >= 2,
    cancelledAt: abandonmentCount >= 2 ? Date.now() : undefined,
    lastAbandonmentAt: Date.now(),
  };
  writeJson(INTEGRITY_KEY, next);
  return next;
}

export function markExamCompleted() {
  const current = readIntegrityState();
  writeJson(INTEGRITY_KEY, {
    ...current,
    active: false,
    completed: true,
    completedAt: Date.now(),
  });
}

export function saveMultipleChoiceProgress(progress) {
  writeJson(MULTIPLE_CHOICE_KEY, progress);
}

export function readMultipleChoiceProgress() {
  return readJson(MULTIPLE_CHOICE_KEY, null);
}

export function clearMultipleChoiceProgress() {
  if (typeof window !== "undefined") window.localStorage.removeItem(MULTIPLE_CHOICE_KEY);
}

export function clearPolicyAcceptance() {
  if (typeof window !== "undefined") window.localStorage.removeItem(POLICY_KEY);
}
