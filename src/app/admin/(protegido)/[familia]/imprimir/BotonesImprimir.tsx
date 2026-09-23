"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registrarEdicionAction } from "./actions";
import styles from "./BotonesImprimir.module.css";

export function BotonesImprimir({
  slug,
  esAdmin,
  numeroProximaEdicion,
}: {
  slug: string;
  esAdmin: boolean;
  numeroProximaEdicion: number;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [notas, setNotas] = useState("");
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrada, setRegistrada] = useState<number | null>(null);

  async function registrar() {
    setEnCurso(true);
    setError(null);
    try {
      const resultado = await registrarEdicionAction(slug, notas);
      if (resultado.error) {
        setError(resultado.error);
        setEnCurso(false);
        return;
      }
      setRegistrada(resultado.numero ?? null);
      setConfirmando(false);
      setNotas("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la edición.");
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <div className={styles.barra}>
      <button type="button" className={styles.boton} onClick={() => window.print()}>
        Guardar como PDF
      </button>

      {esAdmin && !confirmando && (
        <button type="button" className={styles.botonSecundario} onClick={() => setConfirmando(true)}>
          Registrar esta edición
        </button>
      )}

      {esAdmin && confirmando && (
        <div className={styles.confirmacion}>
          <input
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas (opcional)"
            className={styles.campoNotas}
          />
          <button type="button" className={styles.boton} onClick={registrar} disabled={enCurso}>
            {enCurso ? "Registrando…" : `Sí, registrar edición ${numeroProximaEdicion}`}
          </button>
          <button
            type="button"
            className={styles.botonSecundario}
            onClick={() => setConfirmando(false)}
            disabled={enCurso}
          >
            Cancelar
          </button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
      {registrada && <p className={styles.mensaje}>Edición {registrada} registrada.</p>}
    </div>
  );
}
