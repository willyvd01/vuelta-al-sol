"use client";

import { useActionState, useState } from "react";
import { crearFamiliaAction, type EstadoCrearFamilia } from "./actions";
import styles from "./page.module.css";

const estadoInicial: EstadoCrearFamilia = { error: null };

export function FormularioCrearFamilia() {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, enCurso] = useActionState(crearFamiliaAction, estadoInicial);

  if (!abierto) {
    return (
      <button type="button" className={styles.botonSecundario} onClick={() => setAbierto(true)}>
        Crear familia
      </button>
    );
  }

  return (
    <form action={enviar} className={styles.formulario}>
      <label className={styles.etiqueta}>
        Nombre
        <input type="text" name="nombre" required className={styles.campo} />
      </label>
      <label className={styles.etiqueta}>
        Identificador para la URL
        <input
          type="text"
          name="slug"
          placeholder="familia-perez"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
          className={styles.campo}
        />
      </label>
      <label className={styles.etiqueta}>
        Código de acceso (mínimo 6 caracteres)
        <input type="text" name="codigo" minLength={6} required className={styles.campo} />
      </label>
      <label className={styles.etiqueta}>
        Monograma (opcional, ej: &quot;W&amp;W&quot;)
        <input type="text" name="monograma" className={styles.campo} />
      </label>
      {estado.error && <p className={styles.error}>{estado.error}</p>}
      <div className={styles.filaBotones}>
        <button type="submit" className={styles.boton} disabled={enCurso}>
          {enCurso ? "Creando…" : "Crear familia"}
        </button>
        <button type="button" className={styles.botonSecundario} onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
