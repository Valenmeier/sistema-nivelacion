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
        <h2 className={styles.title}>Evaluación completada</h2>
        <p className={styles.lead}>
          Completaste todas las secciones de la evaluación de nivelación.
        </p>
        <div className={styles.line} />
        <p className={styles.sent}>
          <strong>Gracias por tu participación.</strong>
          <br />
          <span>
            SET Idiomas analizará tus respuestas para determinar el nivel recomendado.
          </span>
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
            El equipo académico revisará la evaluación y se comunicará por los medios informados si corresponde.
          </p>
        </section>
      </aside>
    </>
  );
}
