"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowIcon, BookmarkIcon, MicrophoneIcon } from "@/components/icons/Icons";
import production from "../Production.module.css";
import styles from "./AudioClient.module.css";
import button from "@/components/ui/Button/Button.module.css";
import bookmark from "@/components/ui/Bookmark/Bookmark.module.css";
import { cx } from "@/lib/cx";
import { readProductionMarks, saveProductionMark } from "../sectionProgress";
import { markExamCompleted } from "@/lib/examClientStorage";
import {
  deleteAudioResponse,
  readAudioResponse,
  readWritingResponse,
  saveAudioResponse,
} from "../responseStorage";

function formatSeconds(value) {
  const minutes = String(Math.floor(value / 60)).padStart(2, "0");
  const seconds = String(value % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function AudioClient({ task, writingTask }) {
  const router = useRouter();
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const secondsRef = useRef(0);
  const audioElementRef = useRef(null);
  const mountedRef = useRef(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioLoading, setAudioLoading] = useState(true);
  const [marked, setMarked] = useState(false);
  const [error, setError] = useState("");
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    mountedRef.current = true;
    setMarked(readProductionMarks().audio);

    async function restoreAudio() {
      try {
        const savedAudio = await readAudioResponse();
        if (!cancelled && savedAudio?.blob) {
          const restoredSeconds = Number(savedAudio.seconds) || 0;
          secondsRef.current = restoredSeconds;
          setSeconds(restoredSeconds);
          setAudioUrl(URL.createObjectURL(savedAudio.blob));
        }
      } catch {
        if (!cancelled) {
          setError("No se pudo recuperar la grabación. Volvé a grabar tu respuesta.");
        }
      } finally {
        if (!cancelled) setAudioLoading(false);
      }
    }

    restoreAudio();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearInterval(timerRef.current);
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  }

  async function startRecording() {
    if (audioLoading || recording || submitting) return;
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = ({ data }) => {
        if (data.size) chunksRef.current.push(data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (!blob.size) return;

        try {
          await saveAudioResponse(blob, secondsRef.current);
        } catch {
          if (mountedRef.current) {
            setError("No se pudo guardar la grabación. Volvé a intentarlo.");
          }
        }

        if (mountedRef.current) {
          setAudioUrl(URL.createObjectURL(blob));
        }
      };

      recorder.start();
      setAudioUrl("");
      secondsRef.current = 0;
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        const nextSeconds = Math.min(secondsRef.current + 1, task.maxSeconds);
        secondsRef.current = nextSeconds;
        setSeconds(nextSeconds);

        if (nextSeconds >= task.maxSeconds) stopRecording();
      }, 1000);
    } catch {
      setError(
        "No se pudo acceder al micrófono. Revisá los permisos del navegador.",
      );
    }
  }

  function toggleMarked() {
    const next = !marked;
    setMarked(next);
    saveProductionMark("audio", next);
  }

  async function removeAudio() {
    setError("");
    setAudioUrl("");
    secondsRef.current = 0;
    setSeconds(0);

    try {
      await deleteAudioResponse();
    } catch {
      setError("No se pudo eliminar la grabación. Volvé a intentarlo.");
    }
  }

  function requestFinalSubmission() {
    setError("");
    const writingResponse = readWritingResponse().trim();

    if (!writingResponse) {
      setError("Antes de finalizar, completá la producción escrita en la Sección 2.");
      return;
    }

    setShowSubmitConfirmation(true);
  }

  async function confirmFinalSubmission() {
    const writingResponse = readWritingResponse().trim();
    if (!writingResponse) {
      setShowSubmitConfirmation(false);
      setError("Antes de finalizar, completá la producción escrita en la Sección 2.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/attempt/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: writingTask.id,
          response: writingResponse,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "No se pudo guardar la producción escrita.");
      }

      markExamCompleted();
      router.push("/exam/finished");
    } catch (requestError) {
      setShowSubmitConfirmation(false);
      setError(
        requestError.message ||
          "No se pudo finalizar la evaluación. Revisá tus respuestas e intentá nuevamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className={production.card}>
        <div className={production.heading}>
          <div className={production.title}>
            <span className={production.icon}>
              <MicrophoneIcon />
            </span>
            <h2>Sección 3: Producción oral (audio)</h2>
          </div>
          <button
            className={cx(bookmark.button, marked && bookmark.selected)}
            onClick={toggleMarked}
            aria-pressed={marked}
            aria-label={marked ? "Quitar marca para revisar" : "Marcar para revisar"}
          >
            <BookmarkIcon className={bookmark.icon} />
            <span className={bookmark.label}>
              {marked ? "Marcada para revisar" : "Marcar para revisar"}
            </span>
          </button>
        </div>
        <p className={production.instruction}>
          Leé la consigna atentamente y grabá tu respuesta.
        </p>
        <div className={production.prompt}>
          <p>{task.prompt}</p>
        </div>
        <div className={styles.recorder}>
          <button
            className={cx(styles.recordButton, recording && styles.recording)}
            onClick={recording ? stopRecording : startRecording}
            disabled={audioLoading || submitting}
            aria-label={recording ? "Detener grabación" : "Comenzar grabación"}
          >
            <MicrophoneIcon />
          </button>
          <strong className={styles.status}>
            {audioLoading
              ? "Recuperando grabación..."
              : recording
                ? "Grabando... presioná para detener"
                : audioUrl
                  ? "Audio grabado"
                  : "Presioná para grabar"}
          </strong>
          <span className={styles.time}>{formatSeconds(seconds)}</span>
          <p className={styles.help}>
            Duración recomendada: {task.minSeconds / 60} a {task.maxSeconds / 60}{" "}
            minutos.
          </p>
          <div className={styles.wave} aria-hidden="true">
            ▁▂▁▃▂▁▃▅▂▁▃▁▂▅▃▁▂▆▂▁▃▁▂▅▁▂▁
          </div>
          {audioUrl && (
            <audio ref={audioElementRef} controls src={audioUrl} className={styles.preview} />
          )}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.controls}>
            <button
              disabled={!audioUrl || recording || submitting}
              onClick={() => audioElementRef.current?.play()}
            >
              ▶ Reproducir
            </button>
            <button
              disabled={!audioUrl || audioLoading || recording || submitting}
              onClick={startRecording}
            >
              ↻ Volver a grabar
            </button>
            <button
              disabled={!audioUrl || recording || submitting}
              onClick={removeAudio}
            >
              ⌫ Eliminar
            </button>
          </div>
          <p className={styles.note}>
            ⓘ　Asegurate de permitir el acceso al micrófono.
          </p>
        </div>
        <div className={production.actions}>
          <button
            className={cx(button.base, button.secondary)}
            disabled={recording || submitting}
            onClick={() => router.push("/exam/writing")}
          >
            <ArrowIcon className={cx(button.icon, button.reverse)} /> Volver a producción escrita
          </button>
          <button
            className={cx(button.base, button.primary, button.compact)}
            disabled={!audioUrl || recording || submitting}
            onClick={requestFinalSubmission}
          >
            {submitting ? "Finalizando..." : "Finalizar examen"}{" "}
            <ArrowIcon className={button.icon} />
          </button>
        </div>
      </section>
      {showSubmitConfirmation && (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={styles.confirmModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-exam-title"
            aria-describedby="confirm-exam-message"
          >
            <div className={styles.confirmIcon} aria-hidden="true">?</div>
            <div className={styles.confirmContent}>
              <p className={styles.confirmLabel}>Finalizar evaluación</p>
              <h2 id="confirm-exam-title">¿Querés entregar tus respuestas?</h2>
              <p id="confirm-exam-message">
                Antes de finalizar, verificá que tu producción escrita y tu grabación estén completas.
              </p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.cancelConfirm}
                  type="button"
                  onClick={() => setShowSubmitConfirmation(false)}
                  disabled={submitting}
                >
                  Seguir revisando
                </button>
                <button
                  className={styles.acceptConfirm}
                  type="button"
                  onClick={confirmFinalSubmission}
                  disabled={submitting}
                  autoFocus
                >
                  {submitting ? "Finalizando..." : "Finalizar evaluación"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
