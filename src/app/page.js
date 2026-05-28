import Image from "next/image";
import LoginForm from "@/components/LoginForm/LoginForm";
import styles from "./page.module.css";

export default function StartPage() {
  return (
    <main className={styles.page}>
      <div className={styles.waves} aria-hidden="true" />
      <section className={styles.card}>
        <Image src="/logo.webp" alt="SET Idiomas" width={108} height={108} className={styles.logo} priority />
        <h1 className={styles.title}>Examen de Nivelación</h1>
        <p className={styles.subtitle}>Ingresá tu ID para comenzar</p>
        <LoginForm />
      </section>
    </main>
  );
}
