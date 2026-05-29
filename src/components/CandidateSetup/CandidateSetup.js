"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import button from "@/components/ui/Button/Button.module.css";
import { cx } from "@/lib/cx";
import { readCandidateProfile, saveCandidateProfile } from "@/lib/examClientStorage";
import styles from "./CandidateSetup.module.css";

const GROUPS = [
  {
    title: "Inicial",
    description: "Para quienes están construyendo las bases del idioma.",
    options: [
      { level: "A1.1", label: "Estoy comenzando", detail: "Reconozco algunas palabras o expresiones muy simples." },
      { level: "A1.2", label: "Puedo comunicar información básica", detail: "Puedo presentarme y responder preguntas sencillas." },
      { level: "A2.1", label: "Resuelvo situaciones cotidianas simples", detail: "Puedo hablar de rutinas, compras o necesidades frecuentes." },
    ],
  },
  {
    title: "Intermedio",
    description: "Para quienes ya pueden sostener conversaciones habituales.",
    options: [
      { level: "A2.2", label: "Me comunico en situaciones conocidas", detail: "Puedo relatar experiencias simples y explicar necesidades." },
      { level: "B1.1", label: "Puedo conversar sobre temas frecuentes", detail: "Comprendo ideas principales y expreso opiniones básicas." },
      { level: "B1.2", label: "Puedo desenvolverme con cierta autonomía", detail: "Puedo explicar experiencias, planes y motivos con claridad general." },
    ],
  },
  {
    title: "Avanzado",
    description: "Para quienes usan el idioma con autonomía en contextos amplios.",
    options: [
      { level: "B2.1", label: "Participo en conversaciones complejas", detail: "Puedo argumentar y desenvolverme en contextos laborales o académicos." },
      { level: "B2.2", label: "Me expreso con fluidez en diversos contextos", detail: "Puedo desarrollar opiniones detalladas y comprender textos exigentes." },
      { level: "C1.1", label: "Uso el idioma con alto dominio", detail: "Puedo comunicar ideas complejas con precisión y naturalidad." },
    ],
  },
];

export default function CandidateSetup({ language }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [startLevel, setStartLevel] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = readCandidateProfile();
    if (!saved) return;
    setFullName(saved.fullName || "");
    setEmail(saved.email || "");
    setStartLevel(saved.startLevel || "");
  }, []);

  async function continueToPolicy(event) {
    event.preventDefault();
    setError("");
    if (!startLevel) {
      setError("Elegí la opción que mejor describa tu experiencia actual con el idioma.");
      return;
    }

    const profile = { fullName: fullName.trim(), email: email.trim(), startLevel, language };

    try {
      const response = await fetch("/api/attempt/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      // Se conserva como borrador de interfaz; PostgreSQL es la fuente oficial del intento.
      saveCandidateProfile(profile);
      router.push("/exam/policy");
    } catch (requestError) {
      setError(requestError.message || "No se pudieron guardar tus datos.");
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <Image src="/logo.webp" alt="SET Idiomas" width={64} height={64} className={styles.logo} priority />
          <div>
            <p className={styles.step}>Antes de comenzar · {language}</p>
            <h1>Datos del estudiante</h1>
            <p>Completá tus datos y elegí la descripción que más se acerque a tu experiencia actual.</p>
          </div>
        </header>

        <form onSubmit={continueToPolicy} className={styles.form}>
          <div className={styles.fields}>
            <label className={styles.field}>
              <span>Nombre y apellido</span>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} required placeholder="Ej.: Juan Pérez" />
            </label>

            <label className={styles.field}>
              <span>Correo electrónico</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="Ej.: nombre@email.com" />
            </label>
          </div>
          <p className={styles.fieldHint}>Lo utilizaremos únicamente si necesitamos comunicarnos con vos sobre tu nivelación.</p>

          <fieldset className={styles.placement}>
            <legend>¿Cuál de estas descripciones se parece más a tu experiencia actual con el idioma?</legend>
            <p className={styles.help}>No necesitás conocer tu nivel técnico. Tu elección solo define el punto de inicio; el examen ajustará las preguntas según tus respuestas.</p>
            <div className={styles.groups}>
              {GROUPS.map((group) => (
                <section className={styles.group} key={group.title}>
                  <h2>{group.title}</h2>
                  <p>{group.description}</p>
                  {group.options.map((option) => (
                    <label className={cx(styles.option, startLevel === option.level && styles.selected)} key={option.level}>
                      <input type="radio" name="startLevel" value={option.level} checked={startLevel === option.level} onChange={() => setStartLevel(option.level)} />
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.detail}</small>
                      </span>
                    </label>
                  ))}
                </section>
              ))}
            </div>
            <p className={styles.levelNote}>Los niveles superiores a C1.1 también podrán detectarse durante el recorrido adaptativo del examen.</p>
          </fieldset>

          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <button className={cx(button.base, button.primary, button.compact)} type="submit">Continuar a condiciones del examen →</button>
          </div>
        </form>
      </section>
    </main>
  );
}
