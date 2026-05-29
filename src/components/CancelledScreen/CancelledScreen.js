import Image from "next/image";
import styles from "./CancelledScreen.module.css";

export default function CancelledScreen() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Image src="/logo.webp" alt="SET Idiomas" width={76} height={76} className={styles.logo} priority />
        <div className={styles.alert}>!</div>
        <h1>Examen cancelado</h1>
        <p>Este intento fue cerrado porque se registraron dos salidas de la pantalla del examen durante la evaluación.</p>
        <p className={styles.note}>Para solicitar un nuevo intento, comunicate con el equipo académico de SET Idiomas.</p>
      </section>
    </main>
  );
}
