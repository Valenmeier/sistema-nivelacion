"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./LoginForm.module.css";
import button from "@/components/ui/Button/Button.module.css";
import utils from "@/components/ui/VisuallyHidden/VisuallyHidden.module.css";
import { cx } from "@/lib/cx";
import { clearClientStateForNewAccess } from "@/lib/examClientStorage";

export default function LoginForm() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      clearClientStateForNewAccess();
      sessionStorage.removeItem("set-exam-end-time");
      router.push("/exam/registration");
    } catch (requestError) {
      setError(requestError.message || "No se pudo ingresar al examen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={utils.srOnly} htmlFor="exam-id">
        ID del examen
      </label>
      <div className={styles.inputWrap}>
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 21a8 8 0 0 0-16 0m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
        </svg>
        <input
          className={styles.input}
          id="exam-id"
          value={id}
          onChange={(event) => setId(event.target.value)}
          placeholder="Ingresá el ID"
          autoComplete="off"
          required
        />
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button
        className={cx(button.base, button.primary, button.wide, styles.submit)}
        disabled={loading}
        type="submit"
      >
        {loading ? "Validando..." : "Confirmar"}
      </button>
      <p className={styles.demoId}>
        ID de prueba: <strong>SET-DEMO-001</strong>
      </p>
    </form>
  );
}
