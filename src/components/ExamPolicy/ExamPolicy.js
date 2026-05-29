"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import button from "@/components/ui/Button/Button.module.css";
import { cx } from "@/lib/cx";
import {
  beginOrResumeExamAttempt,
  clearMultipleChoiceProgress,
  readCandidateProfile,
  readPolicyAcceptance,
  savePolicyAcceptance,
} from "@/lib/examClientStorage";
import { deleteAudioResponse, saveWritingResponse } from "@/components/Production/responseStorage";
import { clearProductionMarks } from "@/components/Production/sectionProgress";
import styles from "./ExamPolicy.module.css";

export default function ExamPolicy({ language }) {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const [microphoneStatus, setMicrophoneStatus] = useState("Todavía no comprobado");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedProfile = readCandidateProfile();
    if (!savedProfile) {
      router.replace("/exam/registration");
      return;
    }
    setProfile(savedProfile);
    setAccepted(Boolean(readPolicyAcceptance().accepted));
  }, [router]);

  async function verifyMicrophone() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophoneStatus("Este navegador no permite comprobar el micrófono.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophoneReady(true);
      setMicrophoneStatus("Micrófono disponible y permiso concedido.");
    } catch {
      setMicrophoneReady(false);
      setMicrophoneStatus("No se pudo acceder al micrófono.");
      setError("Necesitás habilitar el micrófono para comenzar el examen.");
    }
  }

  function acceptPolicy() {
    savePolicyAcceptance();
    setAccepted(true);
  }

  async function beginExam() {
    setError("");
    if (!accepted || !microphoneReady) return;

    try {
      const response = await fetch("/api/attempt/start", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      // Los siguientes datos son borradores locales de UI; el intento crítico ya se abrió en PostgreSQL.
      // Al iniciar desde la política siempre deben resetearse para no heredar respuestas de otro código.
      beginOrResumeExamAttempt();
      clearMultipleChoiceProgress();
      saveWritingResponse("");
      clearProductionMarks();
      try { await deleteAudioResponse(); } catch { /* El examen puede continuar aunque no exista audio previo. */ }
      sessionStorage.removeItem("set-exam-end-time");
      router.push("/exam/multiple-choice");
    } catch (requestError) {
      setError(requestError.message || "No se pudo iniciar el examen.");
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <Image src="/logo.webp" alt="SET Idiomas" width={64} height={64} className={styles.logo} priority />
          <div>
            <p className={styles.step}>Condiciones del examen · {language}</p>
            <h1>Antes de comenzar</h1>
            {profile && <p>Estudiante: <strong>{profile.fullName}</strong></p>}
          </div>
        </header>

        <div className={styles.notice}>
          <strong>Leé atentamente estas condiciones.</strong>
          <p>Al aceptar, confirmás que comprendés cómo se realizará la nivelación y que disponés de un micrófono para la instancia oral.</p>
        </div>

        <section className={styles.policy} aria-label="Política del examen">
          <h2>¿Cómo será la evaluación?</h2>
          <ol>
            <li><strong>Preguntas de múltiple opción adaptativas.</strong> Comenzarás desde un punto estimado según la información brindada. Los bloques podrán ajustar el nivel de las preguntas según tus respuestas.</li>
            <li><strong>Producción escrita.</strong> Redactarás un texto a partir de una consigna vinculada al nivel detectado.</li>
            <li><strong>Producción oral.</strong> Grabarás un audio para evaluar tu capacidad de expresarte oralmente. Para realizar esta instancia necesitás habilitar el micrófono.</li>
          </ol>

          <h2>Continuidad e integridad del examen</h2>
          <ul>
            <li>Intentá completar el examen en una única sesión y en un lugar tranquilo.</li>
            <li>Si cambiás de pestaña, minimizás la ventana, recargás o abandonás la página durante el examen, se registrará una advertencia.</li>
            <li><strong>Si salís de la pantalla del examen por segunda vez, la evaluación se cancelará y no podrás continuar con ese intento.</strong></li>
            <li>Mantené esta pestaña visible y activa mientras la evaluación esté en curso.</li>
          </ul>

          <p className={styles.note}>El resultado generado funcionará como orientación para el equipo académico, que podrá validar el nivel recomendado antes de asignar el curso correspondiente.</p>
        </section>

        <div className={styles.verification}>
          <div>
            <strong>Micrófono requerido</strong>
            <p className={microphoneReady ? styles.success : styles.pending}>{microphoneStatus}</p>
          </div>
          <button className={cx(button.base, button.secondary, styles.verify)} onClick={verifyMicrophone} type="button">
            {microphoneReady ? "Volver a comprobar" : "Comprobar micrófono"}
          </button>
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}>
          <button className={cx(button.base, accepted ? button.secondary : button.primary)} type="button" onClick={acceptPolicy} disabled={accepted}>
            {accepted ? "Política aceptada ✓" : "Aceptar política"}
          </button>
          <button className={cx(button.base, button.primary)} type="button" disabled={!accepted || !microphoneReady} onClick={beginExam}>
            Comenzar examen →
          </button>
        </div>
      </section>
    </main>
  );
}
