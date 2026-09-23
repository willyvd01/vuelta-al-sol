import Link from "next/link";

import { requerirMiembro } from "@/lib/admin";
import { MESES, mesEnUrl } from "@/lib/meses";
import {
  calcularStorageUsadoFamilia,
  UMBRAL_STORAGE_AVISO_BYTES,
  contarPersonasSinImprimir,
} from "@/lib/supabase-admin";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function formatearMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export default async function ResumenFamilia({
  params,
}: {
  params: Promise<{ familia: string }>;
}) {
  const { familia: slug } = await params;
  const { supabase, familia } = await requerirMiembro(slug);

  const [{ data: personas }, storageUsado, sinImprimir] = await Promise.all([
    supabase.from("personas").select("mes").eq("familia_id", familia.id).is("borrado_en", null),
    calcularStorageUsadoFamilia(familia.id),
    contarPersonasSinImprimir(familia.id),
  ]);

  const conteos = new Array(12).fill(0);
  for (const persona of personas ?? []) {
    conteos[persona.mes - 1]++;
  }

  return (
    <div>
      <h1 className={styles.titulo}>Resumen</h1>

      {storageUsado > UMBRAL_STORAGE_AVISO_BYTES && (
        <p className={styles.avisoStorage}>
          Las fotos de la familia ya ocupan {formatearMb(storageUsado)}. Si sigue creciendo, va a
          hacer falta subir el plan de almacenamiento de Supabase.
        </p>
      )}

      {sinImprimir > 0 && (
        <p className={styles.avisoSinImprimir}>
          {sinImprimir === 1
            ? "Hay 1 persona nueva que todavía no sale en el calendario impreso."
            : `Hay ${sinImprimir} personas nuevas que todavía no salen en el calendario impreso.`}{" "}
          <Link href={`/admin/${slug}/imprimir`}>Ir a Imprimir</Link>
        </p>
      )}

      <ul className={styles.rejilla}>
        {MESES.map((mes) => (
          <li key={mes.numero}>
            <Link href={`/f/${slug}/${mesEnUrl(mes.numero)}`} className={styles.mes}>
              <span className={styles.nombreMes}>{mes.abreviatura}</span>
              <span className={styles.conteo}>{conteos[mes.numero - 1]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
