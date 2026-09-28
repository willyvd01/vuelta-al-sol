import Link from "next/link";
import type { Metadata } from "next";

import { requerirSesion } from "@/lib/admin";
import { purgarFamiliasVencidas } from "@/lib/supabase-admin";
import { FormularioCrearFamilia } from "./FormularioCrearFamilia";
import { BotonCerrarSesion } from "./BotonCerrarSesion";
import { EnlaceSolicitudes } from "./EnlaceSolicitudes";
import { RestaurarFamilia } from "./RestaurarFamilia";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "Panel — Vuelta al Sol" };

const DIAS_EN_PAPELERA = 30;

function diasRestantes(borradoEn: string): number {
  const transcurridos = (Date.now() - new Date(borradoEn).getTime()) / (24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil(DIAS_EN_PAPELERA - transcurridos));
}

export default async function AdminInicio() {
  const { supabase, user } = await requerirSesion();

  // RLS ya filtra: solo vuelven las familias donde el usuario es miembro.
  const { data: familias } = await supabase
    .from("familias")
    .select("slug, nombre, monograma")
    .is("borrado_en", null)
    .order("nombre");

  const { data: miembrosCrudos } = await supabase
    .from("miembros")
    .select("familia_id")
    .eq("user_id", user.id)
    .eq("rol", "admin");
  const idsAdmin = (miembrosCrudos ?? []).map((m) => m.familia_id);

  let familiasBorradas: { id: string; nombre: string; borrado_en: string }[] = [];
  if (idsAdmin.length > 0) {
    await purgarFamiliasVencidas(idsAdmin);
    const { data } = await supabase
      .from("familias")
      .select("id, nombre, borrado_en")
      .in("id", idsAdmin)
      .not("borrado_en", "is", null)
      .order("borrado_en", { ascending: false });
    familiasBorradas = (data ?? []) as typeof familiasBorradas;
  }

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

      {familiasBorradas.length > 0 && (
        <section className={styles.seccionBorradas}>
          <h2 className={styles.tituloBorradas}>Familias eliminadas</h2>
          <p className={styles.avisoBorradas}>
            Se eliminan de verdad, con sus fotos, a los 30 días de borrarse.
          </p>
          <ul className={styles.listaBorradas}>
            {familiasBorradas.map((f) => (
              <li key={f.id} className={styles.filaBorrada}>
                <div>
                  <p className={styles.nombreFamilia}>{f.nombre}</p>
                  <p className={styles.diasRestantes}>
                    {diasRestantes(f.borrado_en) === 0
                      ? "Se elimina de verdad hoy o mañana"
                      : `Quedan ${diasRestantes(f.borrado_en)} días`}
                  </p>
                </div>
                <RestaurarFamilia id={f.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
