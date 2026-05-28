import Link from "next/link";
import button from "@/components/ui/Button/Button.module.css";
import panel from "@/components/ui/Panel/Panel.module.css";
import { cx } from "@/lib/cx";
import styles from "./FinishedScreen.module.css";

export default function FinishedScreen() {
  return (
    <>
      <section className={styles.completion}>
        <div className={styles.check}>✓</div>
        <h2 className={styles.title}>Examen finalizado</h2>
        <p className={styles.lead}>
          Nos pondremos en contacto en unos días para coordinar las siguientes
          etapas.
        </p>
        <div className={styles.line} />
        <p className={styles.sent}>
          <strong>✉　Gracias por completar el proceso de nivelación.</strong>
          <br />
          <span>Tus respuestas fueron enviadas correctamente.</span>
        </p>
        <Link
          className={cx(button.base, button.secondary, styles.home)}
          href="/"
        >
          ⌂　Volver al inicio
        </Link>
      </section>
      <aside>
        <section className={cx(panel.card, styles.summary)}>
          <h2 className={panel.title}>Resumen del examen</h2>
          <p>
            ▤　 Secciones completadas
            <br />
            <strong>　　 3 de 3</strong>
          </p>
          <hr />
          <p>
            　　 Estado
            <br />
            <strong className={styles.status}>　　 Finalizado　✓</strong>
          </p>
        </section>
        <section className={cx(panel.card, styles.next)}>
          <h2 className={panel.title}>🗓　¿Qué sigue?</h2>
          <p>
            Nuestro equipo evaluará tus respuestas y te contactará por email
            para informarte los próximos pasos.
          </p>
        </section>
      </aside>
    </>
  );
}
