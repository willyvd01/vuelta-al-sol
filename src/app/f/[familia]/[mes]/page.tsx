import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import type { CSSProperties } from "react";

import { obtenerFamiliaPorId, obtenerPersonasDelMes, type Persona } from "@/lib/supabase-admin";
import { verificarAcceso } from "@/lib/acceso";
import { MESES, obtenerMes, traduccionesVisibles, mesEnUrl } from "@/lib/meses";
import { SIGNOS, ZODIACO_ICONOS, signosDelMes, rangoSigno, type SignoClave } from "@/lib/zodiaco";
import { IconoFlecha, IconoPersona } from "@/components/iconos";
import { MarcaAgua } from "@/components/MarcaAgua";
import { EnlaceAnimado } from "@/components/EnlaceAnimado";
import { FotoConEsqueleto } from "@/components/FotoConEsqueleto";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const MES_EN_URL = /^(0[1-9]|1[0-2])$/;

type Params = { familia: string; mes: string };

type Casilla = { tipo: "persona"; persona: Persona } | { tipo: "vacia" };

// Fase 10a: siempre 9 casillas por hoja, llenas en orden de lectura; más de
// 9 personas siguen en una segunda hoja de 9, no en una rejilla que crece.
function construirHojas(personas: Persona[]): Casilla[][] {
  const totalHojas = Math.max(1, Math.ceil(personas.length / 9));
  return Array.from({ length: totalHojas }, (_, h) => {
    const casillas: Casilla[] = personas
      .slice(h * 9, h * 9 + 9)
      .map((persona) => ({ tipo: "persona" as const, persona }));
    while (casillas.length < 9) casillas.push({ tipo: "vacia" });
    return casillas;
  });
}

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

  const acceso = await verificarAcceso(familiaSlug);
  if (!acceso) {
    const siguiente = encodeURIComponent(`/f/${familiaSlug}/${mesParam}`);
    redirect(`/f/${familiaSlug}/entrar?siguiente=${siguiente}`);
  }
  const familia = await obtenerFamiliaPorId(acceso.familiaId);
  if (!familia) notFound();

  const personas = await obtenerPersonasDelMes(acceso.familiaId, numeroMes);

  const info = obtenerMes(numeroMes);
  const traducciones = traduccionesVisibles(numeroMes);
  const signos = signosDelMes(numeroMes);

  const mesAnterior = numeroMes === 1 ? 12 : numeroMes - 1;
  const mesSiguiente = numeroMes === 12 ? 1 : numeroMes + 1;

  return (
    <main className={styles.pagina}>
      <MarcaAgua monograma={familia.monograma ?? ""} />

      <div className={styles.contenido} style={{ viewTransitionName: "vs-mes" } as CSSProperties}>
        <header className={styles.cabecera}>
          <p className={styles.nombreFamilia}>{familia.nombre}</p>

          <div className={styles.navegacionMes}>
            <EnlaceAnimado
              href={`/f/${familiaSlug}/${mesEnUrl(mesAnterior)}`}
              direccion="anterior"
              className={styles.flecha}
              aria-label={`Ir a ${obtenerMes(mesAnterior).nombre}`}
            >
              <IconoFlecha direccion="izquierda" className={styles.iconoFlecha} />
            </EnlaceAnimado>
            <h1 className={styles.nombreMes}>{info.nombre}</h1>
            <EnlaceAnimado
              href={`/f/${familiaSlug}/${mesEnUrl(mesSiguiente)}`}
              direccion="siguiente"
              className={styles.flecha}
              aria-label={`Ir a ${obtenerMes(mesSiguiente).nombre}`}
            >
              <IconoFlecha direccion="derecha" className={styles.iconoFlecha} />
            </EnlaceAnimado>
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

        {construirHojas(personas).map((hoja, indiceHoja) => (
          <ul className={styles.rejilla} key={indiceHoja}>
            {hoja.map((casilla, indiceCasilla) => {
              const estiloIndice = { "--indice": indiceCasilla } as CSSProperties;

              if (casilla.tipo === "vacia") {
                return (
                  <li key={`vacia-${indiceHoja}-${indiceCasilla}`} style={estiloIndice}>
                    <Link
                      href={`/f/${familiaSlug}/personas-nueva?mes=${mesEnUrl(numeroMes)}&volver=${encodeURIComponent(`/f/${familiaSlug}/${mesParam}`)}`}
                      className={styles.tarjetaVacia}
                    >
                      <div className={styles.marco}>
                        <div className={styles.foto}>
                          <IconoPersona className={styles.iconoSilueta} />
                        </div>
                      </div>
                      <p className={styles.textoAgregar}>Agregar a alguien</p>
                    </Link>
                  </li>
                );
              }

              const persona = casilla.persona;
              const signo = SIGNOS[persona.signo as SignoClave];
              return (
                <li key={persona.codigo} style={estiloIndice}>
                  <EnlaceAnimado
                    href={`/f/${familiaSlug}/p/${persona.codigo}`}
                    className={styles.tarjeta}
                  >
                    <div className={styles.marco}>
                      <div
                        className={styles.foto}
                        style={{ viewTransitionName: `vs-persona-${persona.codigo}` } as CSSProperties}
                      >
                        {persona.fotoWebUrl ? (
                          <FotoConEsqueleto
                            src={persona.fotoWebUrl}
                            alt={`${persona.nombres} ${persona.apellidos}`}
                            sizes="(min-width: 480px) 150px, 33vw"
                          />
                        ) : (
                          <IconoPersona className={styles.iconoPersonaVacia} />
                        )}
                        {!persona.impresa && <span className={styles.etiquetaNueva}>Nueva</span>}
                      </div>
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
                  </EnlaceAnimado>
                </li>
              );
            })}
          </ul>
        ))}

        <Link
          href={`/f/${familiaSlug}/personas-nueva?mes=${mesEnUrl(numeroMes)}&volver=${encodeURIComponent(`/f/${familiaSlug}/${mesParam}`)}`}
          className={styles.botonAgregarPersona}
        >
          + Agregar a alguien de la familia
        </Link>

        <nav className={styles.tiraMeses} aria-label="Ir a otro mes">
          {MESES.map((mes) => (
            <EnlaceAnimado
              key={mes.numero}
              href={`/f/${familiaSlug}/${mesEnUrl(mes.numero)}`}
              direccion={mes.numero >= numeroMes ? "siguiente" : "anterior"}
              className={
                mes.numero === numeroMes
                  ? `${styles.mesTira} ${styles.mesActivo}`
                  : styles.mesTira
              }
            >
              {mes.abreviatura}
            </EnlaceAnimado>
          ))}
        </nav>
      </div>
    </main>
  );
}
