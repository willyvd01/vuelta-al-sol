"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { cambiarEstadoSolicitudAction } from "./actions";
import styles from "./page.module.css";

export function AccionesSolicitud({ id, estado }: { id: string; estado: string }) {
  const router = useRouter();
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(nuevo: "en_proceso" | "resuelta") {
    setEnCurso(true);
    setError(null);
    const resultado = await cambiarEstadoSolicitudAction(id, nuevo);
    if (resultado.error) {
      setError(resultado.error);
      setEnCurso(false);
      return;
    }
    router.refresh();
    setEnCurso(false);
  }

  return (
    <div className={styles.acciones}>
      {estado === "nueva" && (
        <button type="button" onClick={() => cambiar("en_proceso")} disabled={enCurso}>
          Marcar en proceso
        </button>
      )}
      {estado !== "resuelta" && (
        <button type="button" onClick={() => cambiar("resuelta")} disabled={enCurso}>
          Marcar resuelta
        </button>
      )}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
