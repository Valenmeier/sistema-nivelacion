"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowIcon, BookmarkIcon, PencilIcon } from "@/components/icons/Icons";
import production from "../Production.module.css";
import styles from "./WritingClient.module.css";
import button from "@/components/ui/Button/Button.module.css";
import bookmark from "@/components/ui/Bookmark/Bookmark.module.css";
import { cx } from "@/lib/cx";
import { readProductionMarks, saveProductionMark } from "../sectionProgress";
import { readWritingResponse, saveWritingResponse } from "../responseStorage";

export default function WritingClient({ task }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [marked, setMarked] = useState(false);
  const [responseLoaded, setResponseLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setText(readWritingResponse());
    setMarked(readProductionMarks().writing);
    setResponseLoaded(true);
  }, []);

  useEffect(() => {
    if (responseLoaded) saveWritingResponse(text);
  }, [responseLoaded, text]);

  function toggleMarked() {
    const next = !marked;
    setMarked(next);
    saveProductionMark("writing", next);
  }

  async function saveAndContinue() {
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/attempt/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptId: task.id, response: text }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.push("/exam/audio");
    } catch (requestError) {
      setError(requestError.message || "No se pudo guardar la producción escrita.");
    } finally {
      setSaving(false);
    }
  }

  const wordCount = useMemo(() => text.trim() ? text.trim().split(/\s+/).length : 0, [text]);

  return (
    <section className={production.card}>
      <div className={production.heading}>
        <div className={production.title}>
          <span className={production.icon}><PencilIcon /></span>
          <h2>Sección 2: Producción escrita</h2>
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
      <p className={production.instruction}>Leé la consigna atentamente y escribí tu respuesta.</p>
      <div className={production.prompt}><p>{task.prompt}</p><p>{task.evaluationNote}</p></div>
      <div className={styles.editor}>
        <div className={styles.toolbar}><span className={styles.format}><strong>B</strong> <em>I</em> <u>U</u>　☷　☰　↶　↷</span><small className={styles.count}>{wordCount} palabras</small></div>
        <textarea className={styles.textarea} value={text} onChange={(event) => setText(event.target.value)} placeholder="Escribí tu respuesta aquí..." />
      </div>
      <p className={styles.info}>ⓘ　Extensión recomendada: entre {task.minWords} y {task.maxWords} palabras.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={cx(production.actions, production.actionsEnd)}>
        <button className={cx(button.base, button.primary, button.compact)} disabled={saving} onClick={saveAndContinue}>{saving ? "Guardando..." : "Guardar e ir a producción oral"} <ArrowIcon className={button.icon} /></button>
      </div>
    </section>
  );
}
