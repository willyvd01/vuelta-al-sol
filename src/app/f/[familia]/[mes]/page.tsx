import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { obtenerFamiliaPorSlug, obtenerPersonasDelMes } from "@/lib/supabase-admin";
import { MESES, obtenerMes, traduccionesVisibles, mesEnUrl } from "@/lib/meses";
import { SIGNOS, ZODIACO_ICONOS, signosDelMes, rangoSigno, type SignoClave } from "@/lib/zodiaco";
import { IconoFlecha, IconoPersona } from "@/components/iconos";
import { MarcaAgua } from "@/components/MarcaAgua";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const MES_EN_URL = /^(0[1-9]|1[0-2])$/;

type Params = { familia: string; mes: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { mes } = await params;
  if (!MES_EN_URL.test(mes)) return {};
  const info = obtenerMes(Number(mes));
  return { title: `${info.nombre} — Vuelta al Sol` };
}

export default async function VistaDelMes({
  params,
}: {
  params: Promise<Params>;
}) {
  const { familia: familiaSlug, mes: mesParam } = await params;

  if (!MES_EN_URL.test(mesParam)) notFound();
  const numeroMes = Number(mesParam);

  const familia = await obtenerFamiliaPorSlug(familiaSlug);
  if (!familia) notFound();

  const personas = await obtenerPersonasDelMes(familia.id, numeroMes);

  const info = obtenerMes(numeroMes);
  const traducciones = traduccionesVisibles(numeroMes);
  const signos = signosDelMes(numeroMes);

  const mesAnterior = numeroMes === 1 ? 12 : numeroMes - 1;
  const mesSiguiente = numeroMes === 12 ? 1 : numeroMes + 1;

  return (
    <main className={styles.pagina}>
      <MarcaAgua monograma={familia.monograma ?? ""} />

      <div className={styles.contenido}>
        <header className={styles.cabecera}>
          <p className={styles.nombreFamilia}>{familia.nombre}</p>

          <div className={styles.navegacionMes}>
            <Link
              href={`/f/${familiaSlug}/${mesEnUrl(mesAnterior)}`}
              className={styles.flecha}
              aria-label={`Ir a ${obtenerMes(mesAnterior).nombre}`}
            >
              <IconoFlecha direccion="izquierda" className={styles.iconoFlecha} />
            </Link>
            <h1 className={styles.nombreMes}>{info.nombre}</h1>
            <Link
              href={`/f/${familiaSlug}/${mesEnUrl(mesSiguiente)}`}
              className={styles.flecha}
              aria-label={`Ir a ${obtenerMes(mesSiguiente).nombre}`}
            >
              <IconoFlecha direccion="derecha" className={styles.iconoFlecha} />
            </Link>
          </div>

          {traducciones.length > 0 && (
            <p className={styles.traducciones}>{traducciones.join(" · ")}</p>
          )}

          <div className={styles.signos}>
            {signos.map((signo) => (
              <div key={signo.clave} className={styles.signo}>
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
                <span className={styles.nombreSigno}>{signo.nombre}</span>
                <span className={styles.rangoSigno}>{rangoSigno(signo)}</span>
              </div>
            ))}
          </div>
        </header>

        <div className={styles.filete} />
        <p className={styles.instruccion}>Toca un retrato para abrir su historia</p>

        {personas.length === 0 ? (
          <p className={styles.vacio}>
            Nadie cumple años en {info.nombre.toLowerCase()}.
          </p>
        ) : (
          <ul className={styles.rejilla}>
            {personas.map((persona) => {
              const signo = SIGNOS[persona.signo as SignoClave];
              return (
                <li key={persona.codigo}>
                  <Link
                    href={`/f/${familiaSlug}/p/${persona.codigo}`}
                    className={styles.tarjeta}
                  >
                    <div className={styles.foto}>
                      {persona.fotoWebUrl ? (
                        <Image
                          src={persona.fotoWebUrl}
                          alt={`${persona.nombres} ${persona.apellidos}`}
                          fill
                          sizes="(min-width: 480px) 150px, 33vw"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <IconoPersona className={styles.iconoPersonaVacia} />
                      )}
                    </div>
                    <p className={styles.nombrePersona}>
                      {persona.nombres} {persona.apellidos}
                    </p>
                    <p className={styles.detallePersona}>
                      <span>{persona.dia}</span>
                      {signo && (
                        <>
                          <span className={styles.puntoSeparador}>·</span>
                          <span>{signo.nombre}</span>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            className={styles.iconoSignoChico}
                            dangerouslySetInnerHTML={{
                              __html: ZODIACO_ICONOS[signo.clave],
                            }}
                          />
                        </>
                      )}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <nav className={styles.tiraMeses} aria-label="Ir a otro mes">
          {MESES.map((mes) => (
            <Link
              key={mes.numero}
              href={`/f/${familiaSlug}/${mesEnUrl(mes.numero)}`}
              className={
                mes.numero === numeroMes
                  ? `${styles.mesTira} ${styles.mesActivo}`
                  : styles.mesTira
              }
            >
              {mes.abreviatura}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
