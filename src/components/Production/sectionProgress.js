export const PRODUCTION_MARKS_STORAGE_KEY = "set-production-section-marks";
export const PRODUCTION_MARKS_EVENT = "set-production-section-marks-changed";

const EMPTY_MARKS = { writing: false, audio: false };

export function readProductionMarks() {
  if (typeof window === "undefined") return EMPTY_MARKS;

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(PRODUCTION_MARKS_STORAGE_KEY) || "{}",
    );

    return {
      writing: Boolean(stored.writing),
      audio: Boolean(stored.audio),
    };
  } catch {
    return EMPTY_MARKS;
  }
}

export function saveProductionMark(section, isMarked) {
  const nextMarks = {
    ...readProductionMarks(),
    [section]: isMarked,
  };

  window.localStorage.setItem(
    PRODUCTION_MARKS_STORAGE_KEY,
    JSON.stringify(nextMarks),
  );
  window.dispatchEvent(
    new CustomEvent(PRODUCTION_MARKS_EVENT, { detail: nextMarks }),
  );

  return nextMarks;
}

export function clearProductionMarks() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PRODUCTION_MARKS_STORAGE_KEY);
  window.dispatchEvent(
    new CustomEvent(PRODUCTION_MARKS_EVENT, { detail: EMPTY_MARKS }),
  );
}
