const WRITING_STORAGE_KEY = "set-writing-answer";
const DATABASE_NAME = "set-exam-response-drafts";
const DATABASE_VERSION = 1;
const AUDIO_STORE = "audio-responses";
const AUDIO_KEY = "production-audio";

export function readWritingResponse() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(WRITING_STORAGE_KEY) || "";
}

export function saveWritingResponse(text) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WRITING_STORAGE_KEY, text);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no está disponible en este navegador."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(AUDIO_STORE)) {
        database.createObjectStore(AUDIO_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runAudioTransaction(mode, operation) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE, mode);
    const store = transaction.objectStore(AUDIO_STORE);
    let result = null;

    const request = operation(store);
    if (request) {
      request.onsuccess = () => {
        result = request.result ?? null;
      };
    }

    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export function readAudioResponse() {
  return runAudioTransaction("readonly", (store) => store.get(AUDIO_KEY));
}

export function saveAudioResponse(blob, seconds) {
  return runAudioTransaction("readwrite", (store) =>
    store.put(
      {
        blob,
        seconds,
        savedAt: Date.now(),
      },
      AUDIO_KEY,
    ),
  );
}

export function deleteAudioResponse() {
  return runAudioTransaction("readwrite", (store) => store.delete(AUDIO_KEY));
}
