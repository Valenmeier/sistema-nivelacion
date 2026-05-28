"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowIcon, BookmarkIcon } from "@/components/icons/Icons";
import panel from "@/components/ui/Panel/Panel.module.css";
import button from "@/components/ui/Button/Button.module.css";
import bookmark from "@/components/ui/Bookmark/Bookmark.module.css";
import styles from "./MultipleChoiceClient.module.css";
import { cx } from "@/lib/cx";

const LETTERS = "ABCDEFGHIJKLsMNOPQRSTUVWXYZ";

export default function MultipleChoiceClient({ questions }) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const question = questions[currentIndex];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  function selectAnswer(optionIndex) {
    setAnswers((previous) => ({ ...previous, [question.id]: optionIndex }));
  }

  function toggleMark() {
    setMarked((previous) => ({
      ...previous,
      [question.id]: !previous[question.id],
    }));
  }

  function goNext() {
    if (currentIndex < questions.length - 1)
      setCurrentIndex((index) => index + 1);
    else router.push("/exam/writing");
  }

  return (
    <>
      <section className={styles.card}>
        <div className={styles.top}>
          <span className={styles.pill}>Pregunta {currentIndex + 1}</span>
          <button
            className={cx(
              bookmark.button,
              marked[question.id] && bookmark.selected,
            )}
            onClick={toggleMark}
            aria-pressed={Boolean(marked[question.id])}
            aria-label={
              marked[question.id]
                ? "Quitar marca para revisar"
                : "Marcar para revisar"
            }
          >
            <BookmarkIcon className={bookmark.icon} />
            <span className={bookmark.label}>
              {marked[question.id] ? "Marcada para revisar" : "Marcar para revisar"}
            </span>
          </button>
        </div>
        <p className={styles.instruction}>{question.instruction}</p>
        {question.text && <div className={styles.reading}>{question.text}</div>}
        <h2 className={styles.title}>{question.question}</h2>
        <div
          className={styles.options}
          role="radiogroup"
          aria-label="Opciones de respuesta"
        >
          {question.options.map((option, optionIndex) => {
            const selected = answers[question.id] === optionIndex;
            return (
              <button
                key={option}
                className={cx(styles.answer, selected && styles.answerSelected)}
                onClick={() => selectAnswer(optionIndex)}
                role="radio"
                aria-checked={selected}
              >
                <span className={styles.letter}>{LETTERS[optionIndex]}</span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.actions}>
          <button
            className={cx(button.base, button.secondary)}
            disabled={!currentIndex}
            onClick={() => setCurrentIndex((index) => index - 1)}
          >
            <ArrowIcon className={cx(button.icon, button.reverse)} /> Anterior
          </button>
          <button
            className={cx(button.base, button.primary, button.compact)}
            onClick={goNext}
          >
            {currentIndex === questions.length - 1 ? "Continuar" : "Siguiente"}{" "}
            <ArrowIcon className={button.icon} />
          </button>
        </div>
      </section>
      <aside className={styles.side}>
        <section className={panel.card}>
          <h2 className={panel.title}>Navegador de preguntas</h2>
          <div className={styles.numbers}>
            {questions.map((item, index) => {
              const isCurrent = index === currentIndex;
              const isAnswered = answers[item.id] !== undefined;
              const isMarked = Boolean(marked[item.id]);
              const states = [
                isCurrent && "actual",
                isAnswered && "respondida",
                isMarked && "marcada para revisar",
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <button
                  key={item.id}
                  className={cx(
                    styles.number,
                    isAnswered && !isCurrent && !isMarked && styles.answered,
                    isMarked && styles.marked,
                    isCurrent && styles.current,
                    isCurrent && isMarked && styles.markedCurrent,
                  )}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`Pregunta ${index + 1}${states ? `: ${states}` : ": sin responder"}`}
                  title={isMarked ? "Marcada para revisar" : undefined}
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
          <p>Leé cada pregunta con atención antes de elegir tu respuesta.</p>
          <small>{answeredCount} respondidas en esta pantalla</small>
        </section>
      </aside>
    </>
  );
}
