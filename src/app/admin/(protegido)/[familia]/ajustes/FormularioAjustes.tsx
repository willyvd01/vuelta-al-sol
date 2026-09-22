"use client";

import { useActionState, useState } from "react";
import {
  guardarDatosAction,
  cambiarCodigoAction,
  cambiarMiContrasenaAction,
  type EstadoAjustes,
} from "./actions";
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

function normalizar(texto: string): string {
  return texto.trim().toLowerCase();
}

export function FormularioCodigo({ slug }: { slug: string }) {
  const accion = cambiarCodigoAction.bind(null, slug);
  const [estado, enviar, enCurso] = useActionState(accion, estadoInicial);

  const [abierto, setAbierto] = useState(false);
  const [codigoNuevo, setCodigoNuevo] = useState("");
  const [confirmacion, setConfirmacion] = useState("");

  if (!abierto) {
    return (
      <button
        type="button"
        className={styles.botonSecundario}
        onClick={() => setAbierto(true)}
      >
        Cambiar código de acceso
      </button>
    );
  }

  const tocado = confirmacion.length > 0;
  const coinciden = normalizar(codigoNuevo) === normalizar(confirmacion);
  const puedeEnviar = codigoNuevo.trim().length >= 6 && tocado && coinciden;

  return (
    <form action={enviar} className={styles.formulario}>
      <p className={styles.advertencia}>
        Al cambiar el código, toda la familia tendrá que escribir el código
        nuevo la próxima vez que abra el álbum en su celular. Escríbelo dos
        veces para evitar un error de tipeo que deje a alguien por fuera.
      </p>
      <label className={styles.etiqueta}>
        Código nuevo (mínimo 6 caracteres)
        <input
          type="text"
          name="codigoNuevo"
          value={codigoNuevo}
          onChange={(e) => setCodigoNuevo(e.target.value)}
          minLength={6}
          required
          autoCapitalize="off"
          autoCorrect="off"
          className={styles.campo}
        />
      </label>
      <label className={styles.etiqueta}>
        Repite el código nuevo
        <input
          type="text"
          name="codigoConfirmacion"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          minLength={6}
          required
          autoCapitalize="off"
          autoCorrect="off"
          className={styles.campo}
        />
      </label>
      {tocado && !coinciden && (
        <p className={styles.error}>Los dos códigos no coinciden.</p>
      )}
      {estado.error && <p className={styles.error}>{estado.error}</p>}
      {estado.exito && <p className={styles.exito}>Código actualizado.</p>}
      <div className={styles.filaBotones}>
        <button
          type="submit"
          className={styles.boton}
          disabled={enCurso || !puedeEnviar}
        >
          {enCurso ? "Cambiando…" : "Cambiar código"}
        </button>
        <button
          type="button"
          className={styles.botonSecundario}
          onClick={() => {
            setAbierto(false);
            setCodigoNuevo("");
            setConfirmacion("");
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function FormularioMiContrasena() {
  const [estado, enviar, enCurso] = useActionState(cambiarMiContrasenaAction, estadoInicial);
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");

  const tocado = confirmacion.length > 0;
  const coinciden = nueva === confirmacion;
  const puedeEnviar = nueva.length >= 8 && tocado && coinciden;

  return (
    <form action={enviar} className={styles.formulario}>
      <label className={styles.etiqueta}>
        Contraseña nueva (mínimo 8 caracteres)
        <input
          type="password"
          name="nueva"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          minLength={8}
          required
          className={styles.campo}
        />
      </label>
      <label className={styles.etiqueta}>
        Repite la contraseña nueva
        <input
          type="password"
          name="confirmacion"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          minLength={8}
          required
          className={styles.campo}
        />
      </label>
      {tocado && !coinciden && <p className={styles.error}>Las dos contraseñas no coinciden.</p>}
      {estado.error && <p className={styles.error}>{estado.error}</p>}
      {estado.exito && <p className={styles.exito}>Contraseña actualizada.</p>}
      <button type="submit" className={styles.boton} disabled={enCurso || !puedeEnviar}>
        {enCurso ? "Cambiando…" : "Cambiar mi contraseña"}
      </button>
    </form>
  );
}
