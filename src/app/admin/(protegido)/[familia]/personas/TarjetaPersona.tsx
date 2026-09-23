"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { borrarPersonaAction } from "./actions";
import styles from "./page.module.css";

export interface PersonaLista {
  codigo: string;
  nombres: string;
  apellidos: string;
  dia: number;
  fotoWebUrl: string | null;
}

export function TarjetaPersona({
  slug,
  persona,
}: {
  slug: string;
  persona: PersonaLista;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function borrar() {
    setEnCurso(true);
    const resultado = await borrarPersonaAction(slug, persona.codigo);
    if (resultado.error) {
      setError(resultado.error);
      setEnCurso(false);
      return;
    }
    router.refresh();
  }

  return (
    <li className={styles.filaPersona}>
      <div className={styles.fotoChica}>
        {persona.fotoWebUrl ? (
          <Image src={persona.fotoWebUrl} alt="" fill style={{ objectFit: "cover" }} sizes="44px" />
        ) : null}
      </div>
      <span className={styles.nombrePersona}>
        {persona.dia} · {persona.nombres} {persona.apellidos}
      </span>

      {!confirmando && (
        <div className={styles.accionesPersona}>
          <Link href={`/admin/${slug}/personas/${persona.codigo}/editar`}>Editar</Link>
          <button type="button" onClick={() => setConfirmando(true)}>
            Borrar
          </button>
        </div>
      )}

      {confirmando && (
        <div className={styles.accionesPersona}>
          {error ? (
            <span className={styles.errorChico}>{error}</span>
          ) : (
            <span className={styles.errorChico}>¿Borrar a {persona.nombres}?</span>
          )}
          <button type="button" onClick={borrar} disabled={enCurso}>
            {enCurso ? "Borrando…" : "Sí, borrar"}
          </button>
          <button type="button" onClick={() => setConfirmando(false)} disabled={enCurso}>
            Cancelar
          </button>
        </div>
      )}
    </li>
  );
}
