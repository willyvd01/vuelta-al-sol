import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { obtenerPersonaPorCodigo, obtenerTodasLasPersonas } from "@/lib/supabase-admin";
import { verificarAcceso, obtenerIdentidad } from "@/lib/acceso";
import { crearClienteServidor } from "@/lib/supabase-server";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FormularioRecuerdoAlbum } from "../../../recuerdos/FormularioRecuerdoAlbum";

import styles from "../page.module.css";
import formStyles from "./page.module.css";

export const dynamic = "force-dynamic";

type Params = { familia: string; codigo: string };

async function faltaNombre(familiaId: string): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: miembro } = await supabase
      .from("miembros")
      .select("user_id")
      .eq("familia_id", familiaId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (miembro) return false;
  }
  const identidad = await obtenerIdentidad();
  return !identidad;
}

export default async function NuevoRecuerdoDesdeAlbum({ params }: { params: Promise<Params> }) {
  const { familia: slug, codigo } = await params;

  const acceso = await verificarAcceso(slug);
  if (!acceso) {
    const siguiente = encodeURIComponent(`/f/${slug}/p/${codigo}/recuerdo-nuevo`);
    redirect(`/f/${slug}/entrar?siguiente=${siguiente}`);
  }

  const persona = await obtenerPersonaPorCodigo(codigo);
  if (!persona || persona.familiaId !== acceso.familiaId) notFound();

  const [personas, pedirNombre] = await Promise.all([
    obtenerTodasLasPersonas(acceso.familiaId),
    faltaNombre(acceso.familiaId),
  ]);

  return (
    <main className={styles.pagina}>
      <div className={styles.contenido}>
        <Link href={`/f/${slug}/p/${codigo}`} className={styles.regresar}>
          ← {persona.nombres}
        </Link>

        <h1 className={formStyles.titulo}>Agregar un recuerdo de {persona.nombres}</h1>

        <ErrorBoundary titulo="No se pudo cargar el formulario">
          <FormularioRecuerdoAlbum
            slug={slug}
            volverA={`/f/${slug}/p/${codigo}`}
            personaPrincipalId={persona.id}
            personasDisponibles={personas}
            pedirNombre={pedirNombre}
          />
        </ErrorBoundary>
      </div>
    </main>
  );
}
