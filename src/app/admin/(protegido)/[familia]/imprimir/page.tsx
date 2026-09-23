import { headers } from "next/headers";

import { requerirMiembro } from "@/lib/admin";
import { mesEnUrl } from "@/lib/meses";
import { generarQrSvg } from "@/lib/qr";
import { Portada } from "./Portada";
import { PaginaMes, type PersonaParaImprimir } from "./PaginaMes";
import { BotonesImprimir } from "./BotonesImprimir";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const DURACION_URL_FIRMADA = 60 * 10;
const COLOR_QR = "#1c1a17"; // --tinta: mejor contraste para que el QR escanee bien

async function obtenerOrigen(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}

export default async function VistaDeImpresion({
  params,
}: {
  params: Promise<{ familia: string }>;
}) {
  const { familia: slug } = await params;
  const { supabase, familia, esAdmin } = await requerirMiembro(slug);

  const { data: filas } = await supabase
    .from("personas")
    .select("codigo, nombres, apellidos, dia, mes, anio, signo, foto_original")
    .eq("familia_id", familia.id)
    .order("dia", { ascending: true })
    .order("anio", { ascending: true })
    .order("apellidos", { ascending: true });

  // El orden (día, luego año, luego apellidos) ya viene de la consulta;
  // se resuelven las URL firmadas en paralelo pero guardando cada resultado
  // en el mismo índice, para no perder ese orden al agrupar por mes.
  const personas: PersonaParaImprimir[] = await Promise.all(
    (filas ?? []).map(async (fila) => {
      let fotoOriginalUrl: string | null = null;
      if (fila.foto_original) {
        const { data } = await supabase.storage
          .from("fotos")
          .createSignedUrl(fila.foto_original, DURACION_URL_FIRMADA);
        fotoOriginalUrl = data?.signedUrl ?? null;
      }
      return {
        codigo: fila.codigo,
        nombres: fila.nombres,
        apellidos: fila.apellidos,
        dia: fila.dia,
        mes: fila.mes,
        signo: fila.signo ?? "",
        fotoOriginalUrl,
      };
    })
  );

  const personasPorMes: PersonaParaImprimir[][] = Array.from({ length: 12 }, () => []);
  for (const persona of personas) {
    personasPorMes[persona.mes - 1].push(persona);
  }

  const { count: edicionesPrevias } = await supabase
    .from("ediciones")
    .select("id", { count: "exact", head: true })
    .eq("familia_id", familia.id);
  const numeroProximaEdicion = (edicionesPrevias ?? 0) + 1;

  const origen = await obtenerOrigen();
  const qrPorMes = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      generarQrSvg(`${origen}/f/${slug}/${mesEnUrl(i + 1)}`, COLOR_QR)
    )
  );

  return (
    <div>
      <h1 className={styles.titulo}>Vista de impresión</h1>
      <p className={styles.ayuda}>
        Portada y las 12 páginas del mes, a tamaño A3 (297 × 420 mm). Aquí se ven en miniatura
        solo para revisar el contenido; usa &quot;Guardar como PDF&quot; para exportarlas a tamaño real.
      </p>

      <BotonesImprimir slug={slug} esAdmin={esAdmin} numeroProximaEdicion={numeroProximaEdicion} />

      <div className={styles.miniatura}>
        <div className={styles.hoja}>
          <Portada
            nombreFamilia={familia.nombre}
            monograma={familia.monograma}
            numeroEdicion={numeroProximaEdicion}
          />
        </div>
      </div>

      {personasPorMes.map((personas, indice) => {
        const numeroMes = indice + 1;
        const qrSvg = qrPorMes[indice];

        if (personas.length <= 9) {
          return (
            <div key={numeroMes} className={styles.miniatura}>
              <div className={styles.hoja}>
                <PaginaMes
                  numeroMes={numeroMes}
                  nombreFamilia={familia.nombre}
                  personas={personas}
                  qrSvg={qrSvg}
                />
              </div>
            </div>
          );
        }

        const mitad = Math.ceil(personas.length / 2);
        const partes = [personas.slice(0, mitad), personas.slice(mitad)];
        return partes.map((parte, i) => (
          <div key={`${numeroMes}-${i}`} className={styles.miniatura}>
            <div className={styles.hoja}>
              <PaginaMes
                numeroMes={numeroMes}
                nombreFamilia={familia.nombre}
                personas={parte}
                qrSvg={qrSvg}
                sufijoEtiqueta={` · ${i + 1}/2`}
              />
            </div>
          </div>
        ));
      })}
    </div>
  );
}
