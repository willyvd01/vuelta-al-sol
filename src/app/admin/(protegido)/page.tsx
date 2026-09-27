import Link from "next/link";
import type { Metadata } from "next";

import { crearClienteServidor } from "@/lib/supabase-server";
import { FormularioCrearFamilia } from "./FormularioCrearFamilia";
import { BotonCerrarSesion } from "./BotonCerrarSesion";
import { EnlaceSolicitudes } from "./EnlaceSolicitudes";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "Panel — Vuelta al Sol" };

export default async function AdminInicio() {
  const supabase = await crearClienteServidor();
  // RLS ya filtra: solo vuelven las familias donde el usuario es miembro.
  const { data: familias } = await supabase
    .from("familias")
    .select("slug, nombre, monograma")
    .order("nombre");

  return (
    <main className={styles.pagina}>
      <div className={styles.cabeceraInicio}>
        <h1 className={styles.titulo}>Tus familias</h1>
        <BotonCerrarSesion className={styles.botonSecundario} />
      </div>
      <p className={styles.enlaceSolicitudes}>
        <EnlaceSolicitudes />
      </p>

      {familias && familias.length > 0 ? (
        <ul className={styles.lista}>
          {familias.map((familia) => (
            <li key={familia.slug}>
              <Link href={`/admin/${familia.slug}`} className={styles.tarjeta}>
                <span className={styles.nombreFamilia}>{familia.nombre}</span>
                {familia.monograma && (
                  <span className={styles.monograma}>{familia.monograma}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.vacio}>Todavía no perteneces a ninguna familia.</p>
      )}

      <FormularioCrearFamilia />
    </main>
  );
}
