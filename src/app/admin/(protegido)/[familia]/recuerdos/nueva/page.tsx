import { requerirMiembro } from "@/lib/admin";
import { FormularioRecuerdo } from "../FormularioRecuerdo";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export default async function NuevoRecuerdo({
  params,
}: {
  params: Promise<{ familia: string }>;
}) {
  const { familia: slug } = await params;
  const { supabase, familia } = await requerirMiembro(slug);

  const { data: personas } = await supabase
    .from("personas")
    .select("id, nombres, apellidos")
    .eq("familia_id", familia.id)
    .is("borrado_en", null)
    .order("nombres");

  return (
    <div>
      <h1 className={styles.titulo}>Nuevo recuerdo</h1>
      <ErrorBoundary titulo="No se pudo cargar el formulario">
        <FormularioRecuerdo slug={slug} personasDisponibles={personas ?? []} />
      </ErrorBoundary>
    </div>
  );
}
