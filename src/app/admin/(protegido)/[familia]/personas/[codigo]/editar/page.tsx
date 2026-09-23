import { notFound } from "next/navigation";
import { requerirMiembro } from "@/lib/admin";
import { FormularioPersona } from "../../FormularioPersona";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import styles from "../../page.module.css";

export const dynamic = "force-dynamic";

export default async function EditarPersona({
  params,
}: {
  params: Promise<{ familia: string; codigo: string }>;
}) {
  const { familia: slug, codigo } = await params;
  const { supabase, familia } = await requerirMiembro(slug);

  const { data: persona } = await supabase
    .from("personas")
    .select("codigo, nombres, apellidos, dia, mes, anio, parentesco, fallecida, foto_web")
    .eq("codigo", codigo)
    .eq("familia_id", familia.id)
    .is("borrado_en", null)
    .maybeSingle();

  if (!persona) notFound();

  let fotoWebUrl: string | null = null;
  if (persona.foto_web) {
    const { data } = await supabase.storage.from("fotos").createSignedUrl(persona.foto_web, 600);
    fotoWebUrl = data?.signedUrl ?? null;
  }

  return (
    <div>
      <h1 className={styles.titulo}>Editar persona</h1>
      <ErrorBoundary titulo="No se pudo cargar el formulario">
        <FormularioPersona
          slug={slug}
          persona={{
            codigo: persona.codigo,
            nombres: persona.nombres,
            apellidos: persona.apellidos,
            dia: persona.dia,
            mes: persona.mes,
            anio: persona.anio,
            parentesco: persona.parentesco,
            fallecida: persona.fallecida,
            fotoWebUrl,
          }}
        />
      </ErrorBoundary>
    </div>
  );
}
