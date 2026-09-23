import { notFound, redirect } from "next/navigation";

import { obtenerRecuerdoParaEditarAlbum, obtenerTodasLasPersonas } from "@/lib/supabase-admin";
import { verificarAcceso } from "@/lib/acceso";
import { identificarVisitante, puedeEditar } from "@/lib/autoria";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FormularioRecuerdoAlbum } from "../../FormularioRecuerdoAlbum";

import styles from "../../../p/[codigo]/page.module.css";
import formStyles from "../../../p/[codigo]/recuerdo-nuevo/page.module.css";

export const dynamic = "force-dynamic";

type Params = { familia: string; id: string };

export default async function EditarRecuerdoDesdeAlbum({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ volver?: string }>;
}) {
  const { familia: slug, id } = await params;
  const { volver } = await searchParams;

  const acceso = await verificarAcceso(slug);
  if (!acceso) {
    redirect(`/f/${slug}/entrar?siguiente=${encodeURIComponent(`/f/${slug}/recuerdos/${id}/editar`)}`);
  }

  const recuerdo = await obtenerRecuerdoParaEditarAlbum(id);
  if (!recuerdo || recuerdo.familiaId !== acceso.familiaId) notFound();

  const autor = await identificarVisitante(acceso.familiaId);
  if (!puedeEditar(autor, recuerdo)) notFound();

  const personas = await obtenerTodasLasPersonas(acceso.familiaId);

  const volverValido = volver && volver.startsWith(`/f/${slug}/`) ? volver : null;
  const primeraCodigo = personas.find((p) => p.id === recuerdo.personaIds[0])?.codigo;
  const volverA = volverValido ?? (primeraCodigo ? `/f/${slug}/p/${primeraCodigo}` : `/f/${slug}`);

  return (
    <main className={styles.pagina}>
      <div className={styles.contenido}>
        <h1 className={formStyles.titulo}>Editar recuerdo</h1>

        <ErrorBoundary titulo="No se pudo cargar el formulario">
          <FormularioRecuerdoAlbum
            slug={slug}
            volverA={volverA}
            personaPrincipalId=""
            personasDisponibles={personas}
            pedirNombre={false}
            recuerdo={{
              id: recuerdo.id,
              fecha: recuerdo.fecha,
              titulo: recuerdo.titulo,
              historia: recuerdo.historia,
              personaIds: recuerdo.personaIds,
              fotos: recuerdo.fotos,
            }}
          />
        </ErrorBoundary>
      </div>
    </main>
  );
}
