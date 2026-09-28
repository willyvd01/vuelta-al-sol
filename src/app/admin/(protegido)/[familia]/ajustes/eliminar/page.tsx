import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requerirMiembro } from "@/lib/admin";
import { obtenerResumenBorradoFamilia } from "@/lib/supabase-admin";
import { FormularioEliminar } from "./FormularioEliminar";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "Eliminar familia — Vuelta al Sol" };
export const dynamic = "force-dynamic";

export default async function EliminarFamilia({
  params,
}: {
  params: Promise<{ familia: string }>;
}) {
  const { familia: slug } = await params;
  const { familia, esAdmin } = await requerirMiembro(slug);
  if (!esAdmin) notFound();

  const resumen = await obtenerResumenBorradoFamilia(familia.id);

  return (
    <div>
      <p className={styles.volver}>
        <Link href={`/admin/${slug}/ajustes`}>← Ajustes</Link>
      </p>
      <h1 className={styles.titulo}>Eliminar {familia.nombre}</h1>
      <p className={styles.intro}>
        Queda oculta 30 días — se puede restaurar desde el panel de inicio en ese tiempo. Pasado
        ese plazo se elimina de verdad, junto con todas sus fotos.
      </p>

      <div className={styles.resumen}>
        <p className={styles.tituloResumen}>Esto es lo que se va a perder:</p>
        <ul className={styles.listaResumen}>
          <li>{resumen.personas} {resumen.personas === 1 ? "persona" : "personas"}</li>
          <li>{resumen.recuerdos} {resumen.recuerdos === 1 ? "recuerdo" : "recuerdos"}</li>
          <li>{resumen.fotos} {resumen.fotos === 1 ? "foto" : "fotos"}</li>
          <li>{resumen.solicitudes} {resumen.solicitudes === 1 ? "solicitud" : "solicitudes"}</li>
        </ul>
      </div>

      {resumen.ediciones > 0 && (
        <p className={styles.avisoEdiciones}>
          Esta familia tiene {resumen.ediciones}{" "}
          {resumen.ediciones === 1 ? "calendario impreso registrado" : "calendarios impresos registrados"}.
          Puede haber uno colgado en una pared de verdad — su código QR va a dejar de abrir en
          cuanto elimines la familia, no solo pasados los 30 días.
        </p>
      )}

      <a href={`/admin/${slug}/ajustes/eliminar/exportar`} className={styles.botonExportar}>
        Exportar antes de borrar
      </a>

      <div className={styles.zonaRiesgo}>
        <FormularioEliminar slug={slug} nombre={familia.nombre} />
      </div>
    </div>
  );
}
