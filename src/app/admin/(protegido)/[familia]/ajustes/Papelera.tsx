"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { restaurarItemAction } from "./actions";
import styles from "./page.module.css";

export interface ItemPapelera {
  tipo: "persona" | "recuerdo";
  id: string;
  titulo: string;
  borradoEn: string;
  borradoPor: string;
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

function FilaPapelera({ slug, item }: { slug: string; item: ItemPapelera }) {
  const router = useRouter();
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restaurar() {
    setEnCurso(true);
    const resultado = await restaurarItemAction(slug, item.tipo, item.id);
    if (resultado.error) {
      setError(resultado.error);
      setEnCurso(false);
      return;
    }
    router.refresh();
  }

  return (
    <li className={styles.filaMiembro}>
      <div>
        <p className={styles.nombreMiembro}>{item.titulo}</p>
        <p className={styles.metaMiembro}>
          {item.tipo === "persona" ? "Persona" : "Recuerdo"} · borrado por {item.borradoPor} el{" "}
          {formatearFecha(item.borradoEn)}
        </p>
      </div>
      <div className={styles.accionesPersona}>
        {error && <span className={styles.errorChico}>{error}</span>}
        <button type="button" onClick={restaurar} disabled={enCurso}>
          {enCurso ? "Restaurando…" : "Restaurar"}
        </button>
      </div>
    </li>
  );
}

export function Papelera({ slug, items }: { slug: string; items: ItemPapelera[] }) {
  if (items.length === 0) {
    return <p className={styles.aviso}>La papelera está vacía.</p>;
  }

  return (
    <div className={styles.listaMiembros}>
      <p className={styles.aviso}>Lo que lleva más de 30 días aquí se elimina de verdad, junto con sus fotos.</p>
      <ul className={styles.listaMiembrosItems}>
        {items.map((item) => (
          <FilaPapelera key={`${item.tipo}-${item.id}`} slug={slug} item={item} />
        ))}
      </ul>
    </div>
  );
}
