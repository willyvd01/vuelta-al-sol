import { redirect } from "next/navigation";
import { requerirMiembro } from "@/lib/admin";
import { FormularioPersona } from "../FormularioPersona";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export default async function NuevaPersona({
  params,
}: {
  params: Promise<{ familia: string }>;
}) {
  const { familia: slug } = await params;
  const { esAdmin } = await requerirMiembro(slug);
  if (!esAdmin) redirect(`/admin/${slug}/personas`);

  return (
    <div>
      <h1 className={styles.titulo}>Nueva persona</h1>
      <ErrorBoundary titulo="No se pudo cargar el formulario">
        <FormularioPersona slug={slug} />
      </ErrorBoundary>
    </div>
  );
}
