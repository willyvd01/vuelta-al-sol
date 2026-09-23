import Link from "next/link";

import { requerirMiembro } from "@/lib/admin";
import { MESES } from "@/lib/meses";
import { TarjetaPersona, type PersonaLista } from "./TarjetaPersona";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const DURACION_URL_FIRMADA = 60 * 10;

export default async function ListaPersonas({
  params,
}: {
  params: Promise<{ familia: string }>;
}) {
  const { familia: slug } = await params;
  const { supabase, familia } = await requerirMiembro(slug);

  const { data: personas } = await supabase
    .from("personas")
    .select("codigo, nombres, apellidos, dia, mes, foto_web")
    .eq("familia_id", familia.id)
    .is("borrado_en", null)
    .order("dia", { ascending: true });

  const porMes = new Map<number, PersonaLista[]>();
  await Promise.all(
    (personas ?? []).map(async (p) => {
      let fotoWebUrl: string | null = null;
      if (p.foto_web) {
        const { data } = await supabase.storage
          .from("fotos")
          .createSignedUrl(p.foto_web, DURACION_URL_FIRMADA);
        fotoWebUrl = data?.signedUrl ?? null;
      }
      const lista = porMes.get(p.mes) ?? [];
      lista.push({
        codigo: p.codigo,
        nombres: p.nombres,
        apellidos: p.apellidos,
        dia: p.dia,
        fotoWebUrl,
      });
      porMes.set(p.mes, lista);
    })
  );
  for (const lista of porMes.values()) lista.sort((a, b) => a.dia - b.dia);

  return (
    <div>
      <div className={styles.cabeceraLista}>
        <h1 className={styles.titulo}>Personas</h1>
        <Link href={`/admin/${slug}/personas/nueva`} className={styles.boton}>
          Agregar persona
        </Link>
      </div>

      {!personas || personas.length === 0 ? (
        <p className={styles.vacio}>Todavía no hay personas registradas.</p>
      ) : (
        MESES.map((mes) => {
          const lista = porMes.get(mes.numero);
          if (!lista || lista.length === 0) return null;
          return (
            <section key={mes.numero} className={styles.grupoMes}>
              <h2 className={styles.tituloMes}>{mes.nombre}</h2>
              <ul className={styles.listaPersonas}>
                {lista.map((p) => (
                  <TarjetaPersona key={p.codigo} slug={slug} persona={p} />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
