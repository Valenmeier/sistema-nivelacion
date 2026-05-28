"use client";

import { useEffect, useState } from "react";
import styles from "./ExamHeader.module.css";

const STORAGE_KEY = "set-exam-end-time";
const EXAM_DURATION_MS = 45 * 60 * 1000 + 32 * 1000;

function formatTime(milliseconds) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function ExamHeader({ showTimer = true }) {
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_MS);

  useEffect(() => {
    if (!showTimer) return;
    const savedEnd = sessionStorage.getItem(STORAGE_KEY);
    const endTime = savedEnd ? Number(savedEnd) : Date.now() + EXAM_DURATION_MS;
    if (!savedEnd) sessionStorage.setItem(STORAGE_KEY, String(endTime));

    const update = () => setTimeLeft(Math.max(0, endTime - Date.now()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [showTimer]);

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Examen de Nivelación</h1>
      {showTimer && (
        <div
          className={styles.timer}
          aria-label={`Tiempo restante ${formatTime(timeLeft)}`}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 7v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
          </svg>
          <div>
            <span className={styles.label}>Tiempo restante</span>
            <strong className={styles.time}>{formatTime(timeLeft)}</strong>
          </div>
        </div>
      )}
    </header>
  );
}
