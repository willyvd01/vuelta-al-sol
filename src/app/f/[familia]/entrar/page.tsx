import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { verificarAcceso, siguienteValido } from "@/lib/acceso";
import { MarcaAgua } from "@/components/MarcaAgua";
import { IconoSol } from "@/components/iconos";
import { FormularioEntrada } from "./FormularioEntrada";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar — Vuelta al Sol",
};

type Params = { familia: string };
type SearchParams = { siguiente?: string };

export default async function Entrar({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { familia: familiaSlug } = await params;
  const { siguiente: siguienteCrudo } = await searchParams;
  const siguiente = siguienteValido(siguienteCrudo, familiaSlug);

  // Si ya hay una cookie válida para esta familia, no hace falta pedir el código otra vez.
  const acceso = await verificarAcceso(familiaSlug);
  if (acceso) redirect(siguiente);

  return (
    <main className={styles.pagina}>
      {/* Monograma genérico: esta página se ve igual para cualquier familia, real o no. */}
      <MarcaAgua monograma="VS" />

      <div className={styles.contenido}>
        <IconoSol className={styles.sol} />
        <h1 className={styles.titulo}>Vuelta al Sol</h1>
        <p className={styles.instruccion}>Escribe el código de tu familia</p>
        <FormularioEntrada familiaSlug={familiaSlug} siguiente={siguiente} />
      </div>
    </main>
  );
}
