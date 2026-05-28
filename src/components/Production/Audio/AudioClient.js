"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowIcon, BookmarkIcon, MicrophoneIcon } from "@/components/icons/Icons";
import production from "../Production.module.css";
import styles from "./AudioClient.module.css";
import button from "@/components/ui/Button/Button.module.css";
import bookmark from "@/components/ui/Bookmark/Bookmark.module.css";
import { cx } from "@/lib/cx";

function formatSeconds(value) {
  const minutes = String(Math.floor(value / 60)).padStart(2, "0");
  const seconds = String(value % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function AudioClient({ task }) {
  const router = useRouter();
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [marked, setMarked] = useState(false);
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      clearInterval(timerRef.current);
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
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = ({ data }) =>
        data.size && chunksRef.current.push(data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setAudioUrl("");
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setSeconds((value) => {
          if (value + 1 >= task.maxSeconds) stopRecording();
          return Math.min(value + 1, task.maxSeconds);
        });
      }, 1000);
    } catch {
      setError(
        "No se pudo acceder al micrófono. Revisá los permisos del navegador.",
      );
    }
  }

  function removeAudio() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");
    setSeconds(0);
  }

  return (
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
          onClick={() => setMarked(!marked)}
        >
          <BookmarkIcon className={bookmark.icon} />
          <span className={bookmark.label}>Marcar para revisar</span>
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
          aria-label={recording ? "Detener grabación" : "Comenzar grabación"}
        >
          <MicrophoneIcon />
        </button>
        <strong className={styles.status}>
          {recording
            ? "Grabando... presioná para detener"
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
          <audio controls src={audioUrl} className={styles.preview} />
        )}
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.controls}>
          <button
            disabled={!audioUrl}
            onClick={() => document.querySelector("audio")?.play()}
          >
            ▶ Reproducir
          </button>
          <button disabled={!audioUrl} onClick={startRecording}>
            ↻ Volver a grabar
          </button>
          <button disabled={!audioUrl} onClick={removeAudio}>
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
          onClick={() => router.push("/exam/writing")}
        >
          <ArrowIcon className={cx(button.icon, button.reverse)} /> Anterior
        </button>
        <button
          className={cx(button.base, button.primary, button.compact)}
          onClick={() => router.push("/exam/finished")}
        >
          Guardar y continuar <ArrowIcon className={button.icon} />
        </button>
      </div>
    </section>
  );
}
