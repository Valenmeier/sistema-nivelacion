"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ExamIntegrityGuard.module.css";

const ACKNOWLEDGED_WARNING_KEY = "set-exam-integrity-warning-acknowledged";

function readAcknowledgedAbandonmentCount() {
  if (typeof window === "undefined") return 0;
  return Number(window.sessionStorage.getItem(ACKNOWLEDGED_WARNING_KEY) || 0);
}

function markWarningAcknowledged(count) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ACKNOWLEDGED_WARNING_KEY, String(count));
}

export default function ExamIntegrityGuard() {
  const router = useRouter();
  const stateRef = useRef(null);
  const recordedExitRef = useRef(false);
  const hiddenCycleRecordedRef = useRef(false);
  const hiddenEventKeyRef = useRef("");
  const [integrity, setIntegrity] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

  function applyState(current) {
    stateRef.current = current;
    setIntegrity(current);

    if (current.cancelled) {
      router.replace("/exam/cancelled");
      return;
    }

    const acknowledgedCount = readAcknowledgedAbandonmentCount();
    setShowWarningModal(
      current.abandonmentCount === 1 &&
      current.abandonmentCount > acknowledgedCount,
    );
  }

  useEffect(() => {
    let mounted = true;

    async function syncState() {
      try {
        const response = await fetch("/api/attempt/state", { cache: "no-store" });
        const current = await response.json();
        if (mounted && response.ok) applyState(current);
      } catch {
        // Si falla una sincronización transitoria, se reintentará al regresar a la pestaña.
      }
    }

    async function registerExit(eventType, eventKey) {
      const current = stateRef.current;
      if (!current || current.cancelled || current.completed) return current;

      try {
        const response = await fetch("/api/attempt/integrity-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType, eventKey }),
          keepalive: true,
        });
        const next = await response.json();
        if (mounted && response.ok) applyState(next);
        return next;
      } catch {
        return current;
      }
    }

    syncState();
    window.history.pushState({ setExamGuard: true }, "", window.location.href);

    function handlePopState() {
      registerExit("HISTORY_BACK", crypto.randomUUID());
      window.history.pushState({ setExamGuard: true }, "", window.location.href);
    }

    function handleBeforeUnload(event) {
      const current = stateRef.current;
      if (!current || current.cancelled || current.completed) return;
      event.preventDefault();
      event.returnValue = "";
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        if (hiddenCycleRecordedRef.current) return;
        hiddenCycleRecordedRef.current = true;
        recordedExitRef.current = true;
        hiddenEventKeyRef.current = crypto.randomUUID();
        registerExit("VISIBILITY_HIDDEN", hiddenEventKeyRef.current);
        return;
      }

      hiddenCycleRecordedRef.current = false;
      recordedExitRef.current = false;
      hiddenEventKeyRef.current = "";
      syncState();
    }

    function handlePageHide() {
      if (recordedExitRef.current) return;
      recordedExitRef.current = true;
      const eventKey = hiddenEventKeyRef.current || crypto.randomUUID();
      registerExit("PAGE_HIDE", eventKey);
    }

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  useEffect(() => {
    if (!showWarningModal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [showWarningModal]);

  function continueExam() {
    markWarningAcknowledged(integrity.abandonmentCount);
    setShowWarningModal(false);
  }

  if (!integrity || !showWarningModal || integrity.cancelled) return null;

  return (
    <div className={styles.backdrop} role="presentation">
      <section
        className={styles.modal}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="integrity-warning-title"
        aria-describedby="integrity-warning-message"
      >
        <div className={styles.icon} aria-hidden="true">!</div>
        <div className={styles.content}>
          <p className={styles.label}>Advertencia importante</p>
          <h2 id="integrity-warning-title">Registramos una salida del examen</h2>
          <p id="integrity-warning-message">
            Cambiaste de pestaña, minimizaste la ventana o abandonaste la página. Si vuelve a ocurrir,
            el intento se cancelará automáticamente y no podrás continuar.
          </p>
          <button className={styles.button} type="button" onClick={continueExam} autoFocus>
            Entiendo, continuar el examen
          </button>
        </div>
      </section>
    </div>
  );
}
