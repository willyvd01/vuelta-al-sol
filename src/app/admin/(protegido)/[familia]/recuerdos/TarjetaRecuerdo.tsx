"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { borrarRecuerdoAction } from "./actions";
import styles from "./page.module.css";

export interface RecuerdoLista {
  id: string;
  titulo: string;
  fechaLarga: string;
  lugar: string | null;
  fotoPortadaUrl: string | null;
  puedeEditar: boolean;
}

export function TarjetaRecuerdo({
  slug,
  recuerdo,
  esAdmin,
}: {
  slug: string;
  recuerdo: RecuerdoLista;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function borrar() {
    setEnCurso(true);
    const resultado = await borrarRecuerdoAction(slug, recuerdo.id);
    if (resultado.error) {
      setError(resultado.error);
      setEnCurso(false);
      return;
    }
    router.refresh();
  }

  return (
    <li className={styles.filaRecuerdo}>
      <div className={styles.fotoChica}>
        {recuerdo.fotoPortadaUrl && (
          <Image src={recuerdo.fotoPortadaUrl} alt="" fill style={{ objectFit: "cover" }} sizes="56px" />
        )}
      </div>
      <div className={styles.datosRecuerdo}>
        <p className={styles.tituloRecuerdo}>{recuerdo.titulo}</p>
        <p className={styles.metaRecuerdo}>
          {recuerdo.fechaLarga}
          {recuerdo.lugar && ` · ${recuerdo.lugar}`}
        </p>
      </div>

      {!confirmando && (
        <div className={styles.accionesPersona}>
          {recuerdo.puedeEditar && (
            <Link href={`/admin/${slug}/recuerdos/${recuerdo.id}/editar`}>Editar</Link>
          )}
          {esAdmin && (
            <button type="button" onClick={() => setConfirmando(true)}>
              Borrar
            </button>
          )}
        </div>
      )}

      {confirmando && (
        <div className={styles.accionesPersona}>
          {error ? (
            <span className={styles.errorChico}>{error}</span>
          ) : (
            <span className={styles.errorChico}>¿Borrar &quot;{recuerdo.titulo}&quot;?</span>
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
