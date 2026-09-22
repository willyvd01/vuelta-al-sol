"use client";

import { useActionState } from "react";
import { iniciarSesionAction, type EstadoEntradaAdmin } from "./actions";
import styles from "./page.module.css";

const estadoInicial: EstadoEntradaAdmin = { error: null };

export function FormularioAdminEntrada() {
  const [estado, enviar, enCurso] = useActionState(iniciarSesionAction, estadoInicial);

  return (
    <form action={enviar} className={styles.formulario}>
      <input
        type="email"
        name="correo"
        placeholder="Correo"
        autoComplete="email"
        required
        className={styles.campo}
      />
      <input
        type="password"
        name="contrasena"
        placeholder="Contraseña"
        autoComplete="current-password"
        required
        className={styles.campo}
      />
      {estado.error && <p className={styles.error}>{estado.error}</p>}
      <button type="submit" className={styles.boton} disabled={enCurso}>
        {enCurso ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
