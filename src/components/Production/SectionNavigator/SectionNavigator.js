"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookmarkIcon } from "@/components/icons/Icons";
import panel from "@/components/ui/Panel/Panel.module.css";
import styles from "./SectionNavigator.module.css";
import { cx } from "@/lib/cx";
import {
  PRODUCTION_MARKS_EVENT,
  PRODUCTION_MARKS_STORAGE_KEY,
  readProductionMarks,
} from "../sectionProgress";

const SECTIONS = [
  { key: "writing", number: 2, title: "Sección 2", label: "Producción escrita", href: "/exam/writing" },
  { key: "audio", number: 3, title: "Sección 3", label: "Producción oral (audio)", href: "/exam/audio" },
];

const TIPS = {
  writing: ["Organizá tus ideas antes de escribir.", "Usá conectores para darle coherencia a tu texto.", "Revisá la ortografía y la gramática.", "Asegurate de responder todo lo solicitado."],
  audio: ["Hablá con claridad y a un ritmo natural.", "Organizá tus ideas antes de grabar.", "Usá ejemplos concretos.", "Expresate de manera fluida y auténtica."],
};

export default function SectionNavigator({ active }) {
  const [markedSections, setMarkedSections] = useState({ writing: false, audio: false });

  useEffect(() => {
    function syncMarks(event) {
      if (event?.type === PRODUCTION_MARKS_EVENT && event.detail) {
        setMarkedSections(event.detail);
        return;
      }

      if (!event || event.key === PRODUCTION_MARKS_STORAGE_KEY) {
        setMarkedSections(readProductionMarks());
      }
    }

    syncMarks();
    window.addEventListener(PRODUCTION_MARKS_EVENT, syncMarks);
    window.addEventListener("storage", syncMarks);

    return () => {
      window.removeEventListener(PRODUCTION_MARKS_EVENT, syncMarks);
      window.removeEventListener("storage", syncMarks);
    };
  }, []);

  return (
    <aside>
      <section className={panel.card}>
        <h2 className={panel.title}>Navegador de secciones</h2>
        <nav className={styles.nav}>
          {SECTIONS.map((section) => {
            const isActive = active === section.key;
            const isMarked = markedSections[section.key];

            return (
              <Link
                className={cx(
                  styles.navItem,
                  isMarked && styles.marked,
                  isActive && styles.active,
                  isMarked && isActive && styles.markedActive,
                )}
                href={section.href}
                key={section.key}
                aria-label={`${section.title}, ${section.label}${isActive ? ", actual" : ""}${isMarked ? ", marcada para revisar" : ""}`}
              >
                <span className={styles.index}>{section.number}</span>
                <div className={styles.content}>
                  <strong>{section.title}</strong>
                  <p>{section.label}</p>
                  {isMarked && (
                    <span className={styles.markedBadge}>
                      <BookmarkIcon /> Marcada
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </section>
      <section className={cx(panel.card, styles.advice)}>
        <h2 className={panel.title}>💡 Consejos</h2>
        <ul>{TIPS[active].map((tip) => <li key={tip}>{tip}</li>)}</ul>
      </section>
    </aside>
  );
}
