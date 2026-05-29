"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowIcon, BookmarkIcon } from "@/components/icons/Icons";
import panel from "@/components/ui/Panel/Panel.module.css";
import button from "@/components/ui/Button/Button.module.css";
import bookmark from "@/components/ui/Bookmark/Bookmark.module.css";
import styles from "./MultipleChoiceClient.module.css";
import { cx } from "@/lib/cx";

function getOptionLabel(index) {
  let value = index + 1;
  let label = "";

  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }

  return label;
}

function draftKey(blockId) {
  return `set-multiple-choice-draft-${blockId}`;
}

function readBlockDraft(block) {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(draftKey(block.id)) || "{}");
  } catch {
    return {};
  }
}

function saveBlockDraft(progress) {
  if (typeof window === "undefined" || !progress?.id) return;
  window.sessionStorage.setItem(
    draftKey(progress.id),
    JSON.stringify({
      answers: progress.answers,
      marked: progress.marked,
      currentIndex: progress.currentIndex,
    }),
  );
}

function createProgress(block) {
  const draft = readBlockDraft(block);
  return {
    ...block,
    answers: draft.answers || {},
    marked: draft.marked || {},
    currentIndex: Math.min(Number(draft.currentIndex) || 0, block.questions.length - 1),
  };
}

export default function MultipleChoiceClient() {
  const router = useRouter();
  const [progress, setProgress] = useState(null);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentBlock() {
      try {
        const response = await fetch("/api/attempt/multiple-choice/current", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (result.cancelled) {
          router.replace("/exam/cancelled");
          return;
        }
        if (result.completed) {
          router.replace("/exam/writing");
          return;
        }
        if (!cancelled) setProgress(createProgress(result.block));
      } catch (error) {
        if (!cancelled) setLoadError(error.message || "No se pudo preparar el bloque de preguntas.");
      }
    }

    loadCurrentBlock();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (progress) saveBlockDraft(progress);
  }, [progress]);

  useEffect(() => {
    if (!showConfirmModal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [showConfirmModal]);

  const question = progress?.questions[progress.currentIndex];
  const answeredCount = useMemo(
    () => progress ? Object.keys(progress.answers).length : 0,
    [progress],
  );

  if (loadError) {
    return <section className={styles.card}><p className={styles.blockError}>{loadError}</p></section>;
  }
  if (!progress || !question) {
    return <section className={styles.card}><p>Preparando tu primer bloque de preguntas...</p></section>;
  }

  function updateProgress(updates) {
    setProgress((previous) => ({ ...previous, ...updates }));
  }

  function selectAnswer(optionIndex) {
    updateProgress({ answers: { ...progress.answers, [question.id]: optionIndex } });
    setMessage("");
  }

  function toggleMark() {
    updateProgress({ marked: { ...progress.marked, [question.id]: !progress.marked[question.id] } });
  }

  function requestBlockConfirmation() {
    const missing = progress.questions.length - Object.keys(progress.answers).length;
    if (missing > 0) {
      setMessage(`Todavía tenés ${missing} pregunta${missing === 1 ? "" : "s"} sin responder en este bloque.`);
      return;
    }
    setShowConfirmModal(true);
  }

  async function submitConfirmedBlock() {
    setShowConfirmModal(false);
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/attempt/multiple-choice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId: progress.id, answers: progress.answers }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      window.sessionStorage.removeItem(draftKey(progress.id));

      if (result.cancelled) {
        router.replace("/exam/cancelled");
        return;
      }
      if (result.completed) {
        router.push("/exam/writing");
        return;
      }

      setProgress(createProgress(result.block));
    } catch (error) {
      setMessage(error.message || "No se pudo confirmar el bloque.");
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (progress.currentIndex < progress.questions.length - 1) {
      updateProgress({ currentIndex: progress.currentIndex + 1 });
      return;
    }
    requestBlockConfirmation();
  }

  return (
    <>
      <section className={styles.card}>
        <div className={styles.blockMeta}>
          <strong>Bloque {progress.blockNumber}</strong>
        </div>
        <div className={styles.top}>
          <span className={styles.pill}>Pregunta {progress.currentIndex + 1} de {progress.questions.length}</span>
          <button
            className={cx(bookmark.button, progress.marked[question.id] && bookmark.selected)}
            onClick={toggleMark}
            aria-pressed={Boolean(progress.marked[question.id])}
            aria-label={progress.marked[question.id] ? "Quitar marca para revisar" : "Marcar para revisar"}
          >
            <BookmarkIcon className={bookmark.icon} />
            <span className={bookmark.label}>
              {progress.marked[question.id] ? "Marcada para revisar" : "Marcar para revisar"}
            </span>
          </button>
        </div>
        <p className={styles.instruction}>{question.instruction}</p>
        {question.text && <div className={styles.reading}>{question.text}</div>}
        <h2 className={styles.title}>{question.question}</h2>
        <div className={styles.options} role="radiogroup" aria-label="Opciones de respuesta">
          {question.options.map((option, optionIndex) => {
            const selected = progress.answers[question.id] === optionIndex;
            return (
              <button
                key={`${question.id}-${optionIndex}`}
                className={cx(styles.answer, selected && styles.answerSelected)}
                onClick={() => selectAnswer(optionIndex)}
                role="radio"
                aria-checked={selected}
                disabled={submitting}
              >
                <span className={styles.letter}>{getOptionLabel(optionIndex)}</span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
        {message && <p className={styles.blockError} role="alert">{message}</p>}
        <div className={styles.actions}>
          <button className={cx(button.base, button.secondary)} disabled={!progress.currentIndex || submitting} onClick={() => updateProgress({ currentIndex: progress.currentIndex - 1 })}>
            <ArrowIcon className={cx(button.icon, button.reverse)} /> Anterior
          </button>
          <button className={cx(button.base, button.primary, button.compact)} disabled={submitting} onClick={goNext}>
            {progress.currentIndex === progress.questions.length - 1 ? "Confirmar bloque" : "Siguiente"} <ArrowIcon className={button.icon} />
          </button>
        </div>
      </section>
      <aside className={styles.side}>
        <section className={panel.card}>
          <h2 className={panel.title}>Navegador de preguntas</h2>
          <div className={styles.numbers}>
            {progress.questions.map((item, index) => {
              const isCurrent = index === progress.currentIndex;
              const isAnswered = progress.answers[item.id] !== undefined;
              const isMarked = Boolean(progress.marked[item.id]);
              const states = [isCurrent && "actual", isAnswered && "respondida", isMarked && "marcada para revisar"].filter(Boolean).join(", ");
              return (
                <button
                  key={item.id}
                  className={cx(styles.number, isAnswered && !isCurrent && !isMarked && styles.answered, isMarked && styles.marked, isCurrent && styles.current, isCurrent && isMarked && styles.markedCurrent)}
                  onClick={() => updateProgress({ currentIndex: index })}
                  aria-label={`Pregunta ${index + 1}${states ? `: ${states}` : ": sin responder"}`}
                  disabled={submitting}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className={styles.legend}>
            <span className={cx(styles.dot, styles.green)} /> Respondida
            <span className={cx(styles.dot, styles.purple)} /> Actual
            <span className={cx(styles.dot, styles.amber)} /> Marcada
            <span className={cx(styles.dot, styles.empty)} /> Sin responder
          </div>
        </section>
        <section className={cx(panel.card, styles.tip)}>
          <strong>💡 Consejo</strong>
          <p>Leé cada pregunta con atención. Al confirmar un bloque, las respuestas quedarán cerradas.</p>
          <small>{answeredCount} respondidas en este bloque</small>
        </section>
      </aside>
      {showConfirmModal && (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={styles.confirmModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-block-title"
            aria-describedby="confirm-block-message"
          >
            <div className={styles.confirmIcon} aria-hidden="true">?</div>
            <div className={styles.confirmContent}>
              <p className={styles.confirmLabel}>Confirmar bloque</p>
              <h2 id="confirm-block-title">¿Finalizar este bloque?</h2>
              <p id="confirm-block-message">
                Una vez confirmadas, no podrás modificar las respuestas de este bloque.
                El examen utilizará el resultado para seleccionar las próximas preguntas.
              </p>
              <div className={styles.confirmActions}>
                <button className={styles.cancelConfirm} type="button" onClick={() => setShowConfirmModal(false)}>
                  Seguir revisando
                </button>
                <button className={styles.acceptConfirm} type="button" onClick={submitConfirmedBlock} autoFocus>
                  Confirmar respuestas
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
