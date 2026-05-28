import Link from "next/link";
import panel from "@/components/ui/Panel/Panel.module.css";
import styles from "./SectionNavigator.module.css";
import { cx } from "@/lib/cx";

const SECTIONS = [
  { key: "writing", number: 2, title: "Sección 2", label: "Producción escrita", href: "/exam/writing" },
  { key: "audio", number: 3, title: "Sección 3", label: "Producción oral (audio)", href: "/exam/audio" },
];

const TIPS = {
  writing: ["Organizá tus ideas antes de escribir.", "Usá conectores para darle coherencia a tu texto.", "Revisá la ortografía y la gramática.", "Asegurate de responder todo lo solicitado."],
  audio: ["Hablá con claridad y a un ritmo natural.", "Organizá tus ideas antes de grabar.", "Usá ejemplos concretos.", "Expresate de manera fluida y auténtica."],
};

export default function SectionNavigator({ active }) {
  return (
    <aside>
      <section className={panel.card}>
        <h2 className={panel.title}>Navegador de secciones</h2>
        <nav className={styles.nav}>
          {SECTIONS.map((section) => (
            <Link className={cx(styles.navItem, active === section.key && styles.active)} href={section.href} key={section.key}>
              <span className={styles.index}>{section.number}</span>
              <div><strong>{section.title}</strong><p>{section.label}</p></div>
            </Link>
          ))}
        </nav>
      </section>
      <section className={cx(panel.card, styles.advice)}>
        <h2 className={panel.title}>💡 Consejos</h2>
        <ul>{TIPS[active].map((tip) => <li key={tip}>{tip}</li>)}</ul>
      </section>
    </aside>
  );
}
