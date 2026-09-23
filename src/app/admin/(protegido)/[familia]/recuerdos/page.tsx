import Link from "next/link";

import { requerirMiembro } from "@/lib/admin";
import { anioDeFecha, formatearFechaLarga } from "@/lib/meses";
import { TarjetaRecuerdo, type RecuerdoLista } from "./TarjetaRecuerdo";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const DURACION_URL_FIRMADA = 60 * 10;

export default async function ListaRecuerdos({
  params,
}: {
  params: Promise<{ familia: string }>;
}) {
  const { familia: slug } = await params;
  const { supabase, familia } = await requerirMiembro(slug);

  const { data: recuerdos } = await supabase
    .from("recuerdos")
    .select("id, fecha, titulo, lugar")
    .eq("familia_id", familia.id)
    .is("borrado_en", null)
    .order("fecha", { ascending: false });

  const ids = (recuerdos ?? []).map((r) => r.id);
  const portadas = new Map<string, string>();
  if (ids.length > 0) {
    const { data: fotos } = await supabase
      .from("recuerdo_fotos")
      .select("recuerdo_id, ruta_web")
      .in("recuerdo_id", ids)
      .eq("orden", 0);
    await Promise.all(
      (fotos ?? []).map(async (f) => {
        const { data } = await supabase.storage
          .from("fotos")
          .createSignedUrl(f.ruta_web, DURACION_URL_FIRMADA);
        if (data?.signedUrl) portadas.set(f.recuerdo_id, data.signedUrl);
      })
    );
  }

  const porAnio = new Map<number, RecuerdoLista[]>();
  for (const r of recuerdos ?? []) {
    const anio = anioDeFecha(r.fecha);
    const lista = porAnio.get(anio) ?? [];
    lista.push({
      id: r.id,
      titulo: r.titulo,
      fechaLarga: formatearFechaLarga(r.fecha),
      lugar: r.lugar,
      fotoPortadaUrl: portadas.get(r.id) ?? null,
    });
    porAnio.set(anio, lista);
  }
  const anios = [...porAnio.keys()].sort((a, b) => b - a);

  return (
    <div>
      <div className={styles.cabeceraLista}>
        <h1 className={styles.titulo}>Recuerdos</h1>
        <Link href={`/admin/${slug}/recuerdos/nueva`} className={styles.boton}>
          Agregar recuerdo
        </Link>
      </div>

      {anios.length === 0 ? (
        <p className={styles.vacio}>Todavía no hay recuerdos.</p>
      ) : (
        anios.map((anio) => (
          <section key={anio} className={styles.grupoAnio}>
            <h2 className={styles.tituloAnio}>{anio}</h2>
            <ul className={styles.listaRecuerdos}>
              {porAnio.get(anio)!.map((r) => (
                <TarjetaRecuerdo key={r.id} slug={slug} recuerdo={r} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
