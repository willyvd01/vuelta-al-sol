import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { verificarAcceso, obtenerIdentidad } from "@/lib/acceso";
import { obtenerFamiliaPorId } from "@/lib/supabase-admin";
import { hoyEnBogota } from "@/lib/edad";
import { mesEnUrl } from "@/lib/meses";
import { MarcaAgua } from "@/components/MarcaAgua";
import { FormularioSolicitud } from "./FormularioSolicitud";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Ayuda — Vuelta al Sol" };

const PREGUNTAS: { pregunta: string; respuesta: string }[] = [
  {
    pregunta: "¿Cómo agrego a una persona?",
    respuesta:
      "En cualquier mes, toca una casilla vacía (dice «Agregar a alguien»). Escribe su nombre, el día y el mes en que cumple años y, si quieres, el año y una foto.",
  },
  {
    pregunta: "¿Cómo agrego un recuerdo?",
    respuesta:
      "Toca el retrato de la persona para abrir su ficha y usa «Agregar un recuerdo de…». Puedes subir fotos, contar la historia y marcar con quién salió.",
  },
  {
    pregunta: "¿Cómo comparto el código de la familia?",
    respuesta:
      "Es el mismo código que escribiste al abrir el álbum. Mándalo solo a quienes sean de la familia: con él se puede ver el álbum y agregar cosas. Si crees que se filtró, escríbenos y lo cambiamos.",
  },
  {
    pregunta: "¿Qué hago si el QR no abre?",
    respuesta:
      "Enfoca todo el cuadrado con buena luz y revisa que tengas internet. Si sigue sin abrir, escríbenos y te mandamos el enlace directo del mes.",
  },
  {
    pregunta: "¿Cómo pido que se imprima de nuevo el calendario?",
    respuesta:
      "Manda una solicitud abajo con el tipo «Imprimir de nuevo el calendario». Nos llega con cuántas personas todavía no salen en el papel y en qué meses.",
  },
];

export default async function Ayuda({ params }: { params: Promise<{ familia: string }> }) {
  const { familia: slug } = await params;

  const acceso = await verificarAcceso(slug);
  if (!acceso) {
    redirect(`/f/${slug}/entrar?siguiente=${encodeURIComponent(`/f/${slug}/ayuda`)}`);
  }
  const familia = await obtenerFamiliaPorId(acceso.familiaId);
  if (!familia) notFound();

  const identidad = await obtenerIdentidad();

  const numero = (process.env.WHATSAPP_SOPORTE ?? "").replace(/\D/g, "");
  const enlaceWhatsApp = numero
    ? `https://wa.me/${numero}?text=${encodeURIComponent(`Hola, escribo desde el álbum de la familia ${familia.nombre}.`)}`
    : null;

  return (
    <main className={styles.pagina}>
      <MarcaAgua monograma={familia.monograma ?? ""} />

      <div className={styles.contenido}>
        <Link href={`/f/${slug}/${mesEnUrl(hoyEnBogota().mes)}`} className={styles.regresar}>
          ← Volver al álbum
        </Link>

        <h1 className={styles.titulo}>Ayuda</h1>

        <section className={styles.seccion}>
          <h2 className={styles.tituloSeccion}>Preguntas frecuentes</h2>
          {PREGUNTAS.map((p) => (
            <details key={p.pregunta} className={styles.pregunta}>
              <summary>{p.pregunta}</summary>
              <p>{p.respuesta}</p>
            </details>
          ))}
        </section>

        <section className={styles.seccion}>
          <h2 className={styles.tituloSeccion}>Escríbenos</h2>
          <FormularioSolicitud slug={slug} nombreInicial={identidad?.nombre ?? ""} />
          {enlaceWhatsApp && (
            <a href={enlaceWhatsApp} target="_blank" rel="noopener noreferrer" className={styles.whatsapp}>
              Escríbenos por WhatsApp
            </a>
          )}
        </section>
      </div>
    </main>
  );
}
