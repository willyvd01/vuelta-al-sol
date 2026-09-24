import { MESES, mesEnUrl, traduccionesVisibles } from "@/lib/meses";
import { SIGNOS, ZODIACO_ICONOS, signosDelMes, rangoSigno, type SignoClave } from "@/lib/zodiaco";
import { IconoPersona } from "@/components/iconos";
import styles from "./PaginaMes.module.css";

export interface PersonaParaImprimir {
  codigo: string;
  nombres: string;
  apellidos: string;
  dia: number;
  mes: number;
  signo: string;
  fotoOriginalUrl: string | null;
}

type Casilla = { tipo: "persona"; persona: PersonaParaImprimir } | { tipo: "vacia" };

// Fase 10a: siempre 9 casillas, 3 × 3 — el llamador (page.tsx) ya reparte
// en hojas de 9; acá solo se completan las casillas que sobran vacías.
function completarCasillas(personas: PersonaParaImprimir[]): Casilla[] {
  const casillas: Casilla[] = personas.map((persona) => ({ tipo: "persona" as const, persona }));
  while (casillas.length < 9) casillas.push({ tipo: "vacia" });
  return casillas;
}

export function PaginaMes({
  numeroMes,
  nombreFamilia,
  personas,
  qrSvg,
  sufijoEtiqueta,
  mostrarSiluetas,
}: {
  numeroMes: number;
  nombreFamilia: string;
  personas: PersonaParaImprimir[];
  qrSvg: string;
  sufijoEtiqueta?: string;
  mostrarSiluetas: boolean;
}) {
  const info = MESES[numeroMes - 1];
  const traducciones = traduccionesVisibles(numeroMes);
  const signos = signosDelMes(numeroMes);
  const casillas = completarCasillas(personas);

  return (
    <div className={styles.pagina}>
      <div className={styles.marco}>
        <p className={styles.etiquetaPagina}>
          {mesEnUrl(numeroMes)} — {nombreFamilia}
          {sufijoEtiqueta}
        </p>

        <div className={styles.filaCabecera}>
          <div>
            <h1 className={styles.nombreMes}>{info.nombre}</h1>
            {traducciones.length > 0 && (
              <p className={styles.traducciones}>{traducciones.join(" · ")}</p>
            )}
          </div>
          <div className={styles.signosCabecera}>
            {signos.map((signo) => (
              <div key={signo.clave} className={styles.signoCab}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={styles.iconoSignoCab}
                  dangerouslySetInnerHTML={{ __html: ZODIACO_ICONOS[signo.clave] }}
                />
                <span className={styles.nombreSignoCab}>{signo.nombre}</span>
                <span className={styles.rangoSignoCab}>{rangoSigno(signo)}</span>
              </div>
            ))}
          </div>
        </div>

        <ul className={styles.rejilla}>
          {casillas.map((casilla, indice) => {
            if (casilla.tipo === "vacia") {
              return (
                <li key={`vacia-${indice}`} className={styles.tarjeta}>
                  <div className={styles.marcoCasilla}>
                    <div className={styles.foto}>
                      {mostrarSiluetas && <IconoPersona className={styles.iconoSilueta} />}
                    </div>
                  </div>
                  <div className={styles.barra} />
                </li>
              );
            }

            const persona = casilla.persona;
            const signo = SIGNOS[persona.signo as SignoClave];
            return (
              <li key={persona.codigo} className={styles.tarjeta}>
                <div className={styles.marcoCasilla}>
                  <div className={styles.foto}>
                    {persona.fotoOriginalUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- impresión: se necesita la imagen a resolución completa, sin el recorte de next/image.
                      <img
                        src={persona.fotoOriginalUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <IconoPersona className={styles.iconoPersonaVacia} />
                    )}
                  </div>
                </div>
                <div className={styles.barra}>
                  <p className={styles.dia}>{persona.dia}</p>
                  <div className={styles.infoPersona}>
                    <p className={styles.nombrePersona}>
                      {persona.nombres} {persona.apellidos}
                    </p>
                    {signo && (
                      <span className={styles.signoPersona}>
                        {signo.nombre}
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          className={styles.iconoSignoPersona}
                          dangerouslySetInnerHTML={{ __html: ZODIACO_ICONOS[signo.clave] }}
                        />
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className={styles.pie}>
          <div className={styles.pieTexto}>
            <p className={styles.instruccion}>
              Escanea para abrir {info.nombre.toLowerCase()} en el álbum digital
            </p>
            <nav className={styles.tiraMeses} aria-hidden="true">
              {MESES.map((mes) => (
                <span
                  key={mes.numero}
                  className={
                    mes.numero === numeroMes ? `${styles.mesTira} ${styles.mesActivo}` : styles.mesTira
                  }
                >
                  {mes.abreviatura}
                </span>
              ))}
            </nav>
          </div>
          <div className={styles.qr} dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </div>
      </div>
    </div>
  );
}
