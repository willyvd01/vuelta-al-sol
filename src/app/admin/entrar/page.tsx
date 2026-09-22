import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase-server";
import { IconoSol } from "@/components/iconos";
import { FormularioAdminEntrada } from "./FormularioAdminEntrada";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar al panel — Vuelta al Sol",
};

export default async function EntrarAdmin() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/admin");

  return (
    <main className={styles.pagina}>
      <div className={styles.contenido}>
        <IconoSol className={styles.sol} />
        <h1 className={styles.titulo}>Panel de administración</h1>
        <p className={styles.instruccion}>Entra con tu correo y contraseña</p>
        <FormularioAdminEntrada />
      </div>
    </main>
  );
}
