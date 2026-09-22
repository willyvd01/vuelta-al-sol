import Link from "next/link";
import type { ReactNode } from "react";

import { requerirMiembro } from "@/lib/admin";
import { mesEnUrl } from "@/lib/meses";
import { BotonCerrarSesion } from "../BotonCerrarSesion";

import styles from "./layout.module.css";

export default async function FamiliaAdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ familia: string }>;
}) {
  const { familia: slug } = await params;
  const { familia } = await requerirMiembro(slug);
  const mesActual = mesEnUrl(new Date().getMonth() + 1);

  return (
    <div className={styles.pagina}>
      <header className={styles.cabecera}>
        <div className={styles.filaSuperior}>
          <p className={styles.nombreFamilia}>{familia.nombre}</p>
          <BotonCerrarSesion className={styles.botonCerrarSesion} />
        </div>
        <nav className={styles.nav}>
          <Link href={`/admin/${slug}`}>Resumen</Link>
          <Link href={`/admin/${slug}/personas`}>Personas</Link>
          <Link href={`/admin/${slug}/recuerdos`}>Recuerdos</Link>
          <Link href={`/admin/${slug}/ajustes`}>Ajustes</Link>
          <Link href={`/f/${slug}/${mesActual}`}>Ver álbum</Link>
        </nav>
      </header>
      <main className={styles.contenido}>{children}</main>
    </div>
  );
}
