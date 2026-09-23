import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { obtenerPersonaPorCodigo } from "@/lib/supabase-admin";
import { verificarAcceso } from "@/lib/acceso";
import { identificarVisitante, puedeEditar } from "@/lib/autoria";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FormularioPersonaAlbum } from "../../../personas/FormularioPersonaAlbum";

import styles from "../page.module.css";
import formStyles from "../recuerdo-nuevo/page.module.css";

export const dynamic = "force-dynamic";

type Params = { familia: string; codigo: string };

export default async function EditarPersonaDesdeAlbum({ params }: { params: Promise<Params> }) {
  const { familia: slug, codigo } = await params;

  const acceso = await verificarAcceso(slug);
  if (!acceso) {
    redirect(`/f/${slug}/entrar?siguiente=${encodeURIComponent(`/f/${slug}/p/${codigo}/editar`)}`);
  }

  const persona = await obtenerPersonaPorCodigo(codigo);
  if (!persona || persona.familiaId !== acceso.familiaId) notFound();

  const autor = await identificarVisitante(acceso.familiaId);
  if (!puedeEditar(autor, { creadoPor: null, autorToken: persona.autorToken })) notFound();

  return (
    <main className={styles.pagina}>
      <div className={styles.contenido}>
        <Link href={`/f/${slug}/p/${codigo}`} className={styles.regresar}>
          ← {persona.nombres}
        </Link>

        <h1 className={formStyles.titulo}>Editar a {persona.nombres}</h1>

        <ErrorBoundary titulo="No se pudo cargar el formulario">
          <FormularioPersonaAlbum
            slug={slug}
            volverA={`/f/${slug}/p/${codigo}`}
            pedirNombre={false}
            mesInicial={persona.mes}
            personaExistente={{
              codigo: persona.codigo,
              nombres: persona.nombres,
              apellidos: persona.apellidos,
              dia: persona.dia,
              mes: persona.mes,
              anio: persona.anio,
              parentesco: persona.parentesco,
              fotoWebUrl: persona.fotoWebUrl,
            }}
          />
        </ErrorBoundary>
      </div>
    </main>
  );
}
