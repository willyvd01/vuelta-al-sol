"use client";

import { useActionState } from "react";
import { guardarDatosAction, cambiarCodigoAction, type EstadoAjustes } from "./actions";
import styles from "./page.module.css";

const estadoInicial: EstadoAjustes = { error: null, exito: false };

export function FormularioDatos({
  slug,
  nombre,
  monograma,
}: {
  slug: string;
  nombre: string;
  monograma: string | null;
}) {
  const accion = guardarDatosAction.bind(null, slug);
  const [estado, enviar, enCurso] = useActionState(accion, estadoInicial);

  return (
    <form action={enviar} className={styles.formulario}>
      <label className={styles.etiqueta}>
        Nombre
        <input type="text" name="nombre" defaultValue={nombre} required className={styles.campo} />
      </label>
      <label className={styles.etiqueta}>
        Monograma
        <input
          type="text"
          name="monograma"
          defaultValue={monograma ?? ""}
          className={styles.campo}
        />
      </label>
      {estado.error && <p className={styles.error}>{estado.error}</p>}
      {estado.exito && <p className={styles.exito}>Guardado.</p>}
      <button type="submit" className={styles.boton} disabled={enCurso}>
        {enCurso ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

export function FormularioCodigo({ slug }: { slug: string }) {
  const accion = cambiarCodigoAction.bind(null, slug);
  const [estado, enviar, enCurso] = useActionState(accion, estadoInicial);

  return (
    <form
      action={enviar}
      className={styles.formulario}
      onSubmit={(evento) => {
        const confirmado = window.confirm(
          "Al cambiar el código, toda la familia tendrá que escribir el código nuevo la próxima vez que abra el álbum. ¿Seguro que quieres cambiarlo?"
        );
        if (!confirmado) evento.preventDefault();
      }}
    >
      <label className={styles.etiqueta}>
        Código de acceso nuevo (mínimo 6 caracteres)
        <input
          type="text"
          name="codigoNuevo"
          minLength={6}
          required
          autoCapitalize="off"
          autoCorrect="off"
          className={styles.campo}
        />
      </label>
      {estado.error && <p className={styles.error}>{estado.error}</p>}
      {estado.exito && <p className={styles.exito}>Código actualizado.</p>}
      <button type="submit" className={styles.boton} disabled={enCurso}>
        {enCurso ? "Cambiando…" : "Cambiar código"}
      </button>
    </form>
  );
}
