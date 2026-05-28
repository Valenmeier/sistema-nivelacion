"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowIcon, BookmarkIcon, PencilIcon } from "@/components/icons/Icons";
import production from "../Production.module.css";
import styles from "./WritingClient.module.css";
import button from "@/components/ui/Button/Button.module.css";
import bookmark from "@/components/ui/Bookmark/Bookmark.module.css";
import { cx } from "@/lib/cx";

const STORAGE_KEY = "set-writing-answer";

export default function WritingClient({ task }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [marked, setMarked] = useState(false);

  useEffect(() => setText(localStorage.getItem(STORAGE_KEY) || ""), []);
  useEffect(() => localStorage.setItem(STORAGE_KEY, text), [text]);

  const wordCount = useMemo(() => text.trim() ? text.trim().split(/\s+/).length : 0, [text]);

  return (
    <section className={production.card}>
      <div className={production.heading}>
        <div className={production.title}>
          <span className={production.icon}><PencilIcon /></span>
          <h2>Sección 2: Producción escrita</h2>
        </div>
        <button className={cx(bookmark.button, marked && bookmark.selected)} onClick={() => setMarked(!marked)}>
          <BookmarkIcon className={bookmark.icon} /><span className={bookmark.label}>Marcar para revisar</span>
        </button>
      </div>
      <p className={production.instruction}>Leé la consigna atentamente y escribí tu respuesta.</p>
      <div className={production.prompt}><p>{task.prompt}</p><p>{task.evaluationNote}</p></div>
      <div className={styles.editor}>
        <div className={styles.toolbar}><span className={styles.format}><strong>B</strong> <em>I</em> <u>U</u>　☷　☰　↶　↷</span><small className={styles.count}>{wordCount} palabras</small></div>
        <textarea className={styles.textarea} value={text} onChange={(event) => setText(event.target.value)} placeholder="Escribí tu respuesta aquí..." />
      </div>
      <p className={styles.info}>ⓘ　Extensión recomendada: entre {task.minWords} y {task.maxWords} palabras.</p>
      <div className={cx(production.actions, production.actionsEnd)}>
        <button className={cx(button.base, button.primary, button.compact)} onClick={() => router.push("/exam/audio")}>Guardar y continuar <ArrowIcon className={button.icon} /></button>
      </div>
    </section>
  );
}
