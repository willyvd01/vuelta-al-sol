"use client";

import { useActionState, useState } from "react";

import { eliminarFamiliaAction, type EstadoEliminarFamilia } from "./actions";
import styles from "./page.module.css";

const estadoInicial: EstadoEliminarFamilia = { error: null };

export function FormularioEliminar({ slug, nombre }: { slug: string; nombre: string }) {
  const accion = eliminarFamiliaAction.bind(null, slug);
  const [estado, enviar, enCurso] = useActionState(accion, estadoInicial);
  const [confirmacion, setConfirmacion] = useState("");

  const coincide = confirmacion === nombre;

  return (
    <form action={enviar} className={styles.formulario}>
      <label className={styles.etiqueta}>
        Escribe el nombre exacto de la familia para confirmar: <strong>{nombre}</strong>
        <input
          type="text"
          name="confirmacion"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          className={styles.campo}
        />
      </label>
      {estado.error && <p className={styles.error}>{estado.error}</p>}
      <button type="submit" className={styles.botonPeligro} disabled={enCurso || !coincide}>
        {enCurso ? "Eliminando…" : "Eliminar esta familia"}
      </button>
    </form>
  );
}
