import { notFound, redirect } from "next/navigation";
import { requerirMiembro } from "@/lib/admin";
import { FormularioRecuerdo } from "../../FormularioRecuerdo";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import styles from "../../page.module.css";

export const dynamic = "force-dynamic";

const DURACION_URL_FIRMADA = 60 * 10;

export default async function EditarRecuerdo({
  params,
}: {
  params: Promise<{ familia: string; id: string }>;
}) {
  const { familia: slug, id } = await params;
  const { supabase, familia, user, esAdmin } = await requerirMiembro(slug);

  const { data: recuerdo } = await supabase
    .from("recuerdos")
    .select("id, fecha, titulo, historia, lugar, creado_por")
    .eq("id", id)
    .eq("familia_id", familia.id)
    .maybeSingle();

  if (!recuerdo) notFound();

  const puedeEditar = esAdmin || recuerdo.creado_por === user.id;
  if (!puedeEditar) redirect(`/admin/${slug}/recuerdos`);

  const [{ data: personas }, { data: personasRecuerdo }, { data: fotos }] = await Promise.all([
    supabase.from("personas").select("id, nombres, apellidos").eq("familia_id", familia.id).order("nombres"),
    supabase.from("recuerdo_personas").select("persona_id").eq("recuerdo_id", id),
    supabase
      .from("recuerdo_fotos")
      .select("id, ruta_web, orden")
      .eq("recuerdo_id", id)
      .order("orden", { ascending: true }),
  ]);

  const fotosConUrl = await Promise.all(
    (fotos ?? []).map(async (f) => {
      const { data } = await supabase.storage
        .from("fotos")
        .createSignedUrl(f.ruta_web, DURACION_URL_FIRMADA);
      return { id: f.id, url: data?.signedUrl ?? "" };
    })
  );

  return (
    <div>
      <h1 className={styles.titulo}>Editar recuerdo</h1>
      <ErrorBoundary titulo="No se pudo cargar el formulario">
        <FormularioRecuerdo
          slug={slug}
          personasDisponibles={personas ?? []}
          esAdmin={esAdmin}
          recuerdo={{
            id: recuerdo.id,
            fecha: recuerdo.fecha,
            titulo: recuerdo.titulo,
            historia: recuerdo.historia,
            lugar: recuerdo.lugar,
            personas: (personasRecuerdo ?? []).map((p) => p.persona_id),
            fotos: fotosConUrl.filter((f) => f.url),
          }}
        />
      </ErrorBoundary>
    </div>
  );
}
