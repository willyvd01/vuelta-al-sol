import { redirect } from "next/navigation";

import { verificarAcceso, obtenerIdentidad } from "@/lib/acceso";
import { obtenerMiembroSesion } from "@/lib/autoria";
import { obtenerFamiliaPorId } from "@/lib/supabase-admin";
import { MarcaAgua } from "@/components/MarcaAgua";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FormularioPersonaAlbum } from "../personas/FormularioPersonaAlbum";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type Params = { familia: string };

export default async function NuevaPersonaDesdeAlbum({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ mes?: string; volver?: string }>;
}) {
  const { familia: slug } = await params;
  const { mes: mesParam, volver } = await searchParams;

  const acceso = await verificarAcceso(slug);
  if (!acceso) {
    redirect(`/f/${slug}/entrar?siguiente=${encodeURIComponent(`/f/${slug}/personas-nueva`)}`);
  }

  const familia = await obtenerFamiliaPorId(acceso.familiaId);
  if (!familia) redirect(`/f/${slug}/entrar`);

  const miembro = await obtenerMiembroSesion(acceso.familiaId);
  const identidad = miembro ? null : await obtenerIdentidad();
  const pedirNombre = !miembro && !identidad;

  const mesNumero = Number(mesParam);
  const mesInicial = mesNumero >= 1 && mesNumero <= 12 ? mesNumero : new Date().getMonth() + 1;
  const volverValido = volver && volver.startsWith(`/f/${slug}/`) ? volver : `/f/${slug}`;

  return (
    <main className={styles.pagina}>
      <MarcaAgua monograma={familia.monograma ?? ""} />
      <div className={styles.contenido}>
        <h1 className={styles.titulo}>Agregar a alguien de la familia</h1>

        <ErrorBoundary titulo="No se pudo cargar el formulario">
          <FormularioPersonaAlbum
            slug={slug}
            volverA={volverValido}
            pedirNombre={pedirNombre}
            mesInicial={mesInicial}
          />
        </ErrorBoundary>
      </div>
    </main>
  );
}
