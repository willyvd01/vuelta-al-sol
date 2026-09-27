import Link from "next/link";

import { verificarAcceso } from "@/lib/acceso";
import { hoyEnBogota } from "@/lib/edad";
import { obtenerCumpleanerosDeHoy } from "@/lib/supabase-admin";

import styles from "./layout.module.css";

export default async function FamiliaLayout({ children, params }: LayoutProps<"/f/[familia]">) {
  const { familia: slug } = await params;
  const acceso = await verificarAcceso(slug);
  const cumpleaneros = acceso ? await obtenerCumpleanerosDeHoy(acceso.familiaId) : [];
  const anioHoy = hoyEnBogota().anio;

  return (
    <>
      {cumpleaneros.length > 0 && (
        <aside className={styles.aviso} aria-label="Cumpleaños de hoy">
          <p className={styles.texto}>
            {cumpleaneros.length === 1 ? "Hoy " : "Hoy cumplen años: "}
            {cumpleaneros.map((p, i) => {
              const edad = p.anio ? anioHoy - p.anio : null;
              const nombre = `${p.nombres} ${p.apellidos}`.trim();
              return (
                <span key={p.codigo}>
                  {i > 0 && (i === cumpleaneros.length - 1 ? " y " : ", ")}
                  <Link href={`/f/${slug}/p/${p.codigo}`} className={styles.enlace}>
                    {nombre}
                  </Link>
                  {cumpleaneros.length === 1
                    ? edad !== null
                      ? ` cumple ${edad} años`
                      : " está de cumpleaños"
                    : edad !== null && ` (${edad})`}
                </span>
              );
            })}
          </p>
        </aside>
      )}
      {children}
    </>
  );
}
