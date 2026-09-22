"use client";

import { useActionState } from "react";
import { verificarCodigoAction, type EstadoEntrada } from "./actions";
import styles from "./FormularioEntrada.module.css";

const estadoInicial: EstadoEntrada = { error: null };

export function FormularioEntrada({
  familiaSlug,
  siguiente,
}: {
  familiaSlug: string;
  siguiente: string;
}) {
  const accion = verificarCodigoAction.bind(null, familiaSlug);
  const [estado, enviar, enCurso] = useActionState(accion, estadoInicial);

  return (
    <form action={enviar} className={styles.formulario}>
      <input type="hidden" name="siguiente" value={siguiente} />
      <input
        type="text"
        name="codigo"
        placeholder="Código de familia"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
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
