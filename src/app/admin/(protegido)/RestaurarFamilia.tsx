"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { restaurarFamiliaAction } from "./actions";
import styles from "./page.module.css";

export function RestaurarFamilia({ id }: { id: string }) {
  const router = useRouter();
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restaurar() {
    setEnCurso(true);
    setError(null);
    const resultado = await restaurarFamiliaAction(id);
    if (resultado.error) {
      setError(resultado.error);
      setEnCurso(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className={styles.accionesBorrada}>
      {error && <span className={styles.errorChico}>{error}</span>}
      <button type="button" onClick={restaurar} disabled={enCurso}>
        {enCurso ? "Restaurando…" : "Restaurar"}
      </button>
    </div>
  );
}
