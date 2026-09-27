"use client";

import { useActionState } from "react";

import { enviarSolicitudAction, type EstadoSolicitud } from "./acciones";
import styles from "./page.module.css";

const estadoInicial: EstadoSolicitud = { error: null, enviada: false };

export function FormularioSolicitud({ slug, nombreInicial }: { slug: string; nombreInicial: string }) {
  const accion = enviarSolicitudAction.bind(null, slug);
  const [estado, enviar, enCurso] = useActionState(accion, estadoInicial);

  if (estado.enviada) {
    return (
      <p className={styles.exito}>
        Recibimos tu solicitud. Te respondemos por el contacto que dejaste.
      </p>
    );
  }

  return (
    <form action={enviar} className={styles.formulario}>
      <label className={styles.etiqueta}>
        Qué necesitas
        <select name="tipo" defaultValue="imprimir_de_nuevo" className={styles.campo}>
          <option value="imprimir_de_nuevo">Imprimir de nuevo el calendario</option>
          <option value="corregir_datos">Corregir datos</option>
          <option value="agregar_personas">Agregar personas</option>
          <option value="otra">Otra consulta</option>
        </select>
      </label>
      <label className={styles.etiqueta}>
        Tu nombre
        <input type="text" name="autorNombre" defaultValue={nombreInicial} maxLength={100} required className={styles.campo} />
      </label>
      <label className={styles.etiqueta}>
        WhatsApp o correo
        <input type="text" name="contacto" maxLength={200} required className={styles.campo} />
      </label>
      <label className={styles.etiqueta}>
        Mensaje
        <textarea name="mensaje" rows={4} maxLength={2000} className={styles.campo} />
      </label>
      {estado.error && <p className={styles.error}>{estado.error}</p>}
      <button type="submit" className={styles.boton} disabled={enCurso}>
        {enCurso ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
