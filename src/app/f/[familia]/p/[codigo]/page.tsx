import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import {
  obtenerFamiliaPorId,
  obtenerPersonaPorCodigo,
  obtenerRecuerdosDePersona,
  type Recuerdo,
} from "@/lib/supabase-admin";
import { verificarAcceso } from "@/lib/acceso";
import {
  mesEnUrl,
  obtenerMes,
  formatearDiaMes,
  formatearFechaLarga,
  anioDeFecha,
} from "@/lib/meses";
import { SIGNOS, ZODIACO_ICONOS, type SignoClave } from "@/lib/zodiaco";
import { IconoPersona } from "@/components/iconos";
import { MarcaAgua } from "@/components/MarcaAgua";
import { CarruselFotos } from "@/components/CarruselFotos";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type Params = { familia: string; codigo: string };

async function cargarFicha(params: Promise<Params>) {
  const { familia: familiaSlug, codigo } = await params;

  const acceso = await verificarAcceso(familiaSlug);
  if (!acceso) {
    const siguiente = encodeURIComponent(`/f/${familiaSlug}/p/${codigo}`);
    redirect(`/f/${familiaSlug}/entrar?siguiente=${siguiente}`);
  }

  const familia = await obtenerFamiliaPorId(acceso.familiaId);
  if (!familia) notFound();

  const persona = await obtenerPersonaPorCodigo(codigo);
  if (!persona || persona.familiaId !== acceso.familiaId) notFound();

  return { familiaSlug, familia, persona };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { codigo } = await params;
  const persona = await obtenerPersonaPorCodigo(codigo);
  if (!persona) return {};
  return { title: `${persona.nombres} ${persona.apellidos} — Vuelta al Sol` };
}

function agruparPorAnio(recuerdos: Recuerdo[]) {
  const grupos: { anio: number; recuerdos: Recuerdo[] }[] = [];
  for (const recuerdo of recuerdos) {
    const anio = anioDeFecha(recuerdo.fecha);
    const grupo = grupos.at(-1);
    if (grupo && grupo.anio === anio) {
      grupo.recuerdos.push(recuerdo);
    } else {
      grupos.push({ anio, recuerdos: [recuerdo] });
    }
  }
  return grupos;
}

export default async function FichaPersona({
  params,
}: {
  params: Promise<Params>;
}) {
  const { familiaSlug, familia, persona } = await cargarFicha(params);
  const recuerdos = await obtenerRecuerdosDePersona(
    familia.id,
    persona.id,
    persona.codigo
  );
  const grupos = agruparPorAnio(recuerdos);

  const signo = SIGNOS[persona.signo as SignoClave];
  const diaMesTexto = formatearDiaMes(persona.dia, persona.mes);
  const mesDeLaPersona = obtenerMes(persona.mes);

  const edad =
    persona.anio && !persona.fallecida
      ? new Date().getFullYear() - persona.anio
      : null;

  return (
    <main className={styles.pagina}>
      <MarcaAgua monograma={familia.monograma ?? ""} />

      <div className={styles.contenido}>
        <Link
          href={`/f/${familiaSlug}/${mesEnUrl(persona.mes)}`}
          className={styles.regresar}
        >
          ← {mesDeLaPersona.nombre}
        </Link>

        <div className={styles.retrato}>
          {persona.fotoWebUrl ? (
            <Image
              src={persona.fotoWebUrl}
              alt={`${persona.nombres} ${persona.apellidos}`}
              fill
              sizes="(min-width: 480px) 480px, 100vw"
              style={{ objectFit: "cover" }}
              priority
            />
          ) : (
            <IconoPersona className={styles.iconoPersonaVacia} />
          )}
        </div>

        <h1 className={styles.nombre}>
          {persona.nombres} {persona.apellidos}
        </h1>

        <p className={styles.rotuloFecha}>
          <span>{diaMesTexto}</span>
          {signo && (
            <>
              <span className={styles.puntoSeparador}>·</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={styles.iconoSigno}
                dangerouslySetInnerHTML={{ __html: ZODIACO_ICONOS[signo.clave] }}
              />
              <span>{signo.nombre}</span>
            </>
          )}
          {persona.parentesco && (
            <>
              <span className={styles.puntoSeparador}>·</span>
              <span>{persona.parentesco}</span>
            </>
          )}
        </p>

        {edad !== null && (
          <p className={styles.edad}>
            Cumple {edad} años el {diaMesTexto}
          </p>
        )}

        <div className={styles.filete} />
        <h2 className={styles.tituloSeccion}>Recuerdos</h2>

        {grupos.length === 0 ? (
          <p className={styles.vacio}>
            Aún no hay recuerdos de {persona.nombres}.
          </p>
        ) : (
          grupos.map((grupo) => (
            <section key={grupo.anio} className={styles.grupoAnio}>
              <div className={styles.encabezadoAnio}>
                <span className={styles.anio}>{grupo.anio}</span>
                <div className={styles.lineaAnio} />
              </div>

              {grupo.recuerdos.map((recuerdo) => (
                <article key={recuerdo.id} className={styles.recuerdo}>
                  <CarruselFotos
                    fotos={recuerdo.fotos}
                    alt={recuerdo.titulo}
                  />
                  <h3 className={styles.tituloRecuerdo}>{recuerdo.titulo}</h3>
                  <p className={styles.metaRecuerdo}>
                    {formatearFechaLarga(recuerdo.fecha)}
                    {recuerdo.lugar && ` · ${recuerdo.lugar}`}
                  </p>
                  {recuerdo.historia && (
                    <p className={styles.historia}>{recuerdo.historia}</p>
                  )}
                  {recuerdo.otrasPersonas.length > 0 && (
                    <p className={styles.conQuien}>
                      Con:{" "}
                      {recuerdo.otrasPersonas.map((otra, i) => (
                        <span key={otra.codigo}>
                          {i > 0 && ", "}
                          <Link href={`/f/${familiaSlug}/p/${otra.codigo}`}>
                            {otra.nombres} {otra.apellidos}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                </article>
              ))}
            </section>
          ))
        )}
      </div>
    </main>
  );
}
