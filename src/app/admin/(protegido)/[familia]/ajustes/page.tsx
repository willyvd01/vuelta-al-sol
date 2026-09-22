import { requerirMiembro } from "@/lib/admin";
import { FormularioDatos, FormularioCodigo } from "./FormularioAjustes";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Ajustes({
  params,
}: {
  params: Promise<{ familia: string }>;
}) {
  const { familia: slug } = await params;
  const { familia, esAdmin } = await requerirMiembro(slug);

  if (!esAdmin) {
    return (
      <div>
        <h1 className={styles.titulo}>Ajustes</h1>
        <dl className={styles.soloLectura}>
          <dt>Nombre</dt>
          <dd>{familia.nombre}</dd>
          <dt>Monograma</dt>
          <dd>{familia.monograma ?? "—"}</dd>
        </dl>
        <p className={styles.aviso}>Solo un administrador puede cambiar estos datos.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={styles.titulo}>Ajustes</h1>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Datos de la familia</h2>
        <FormularioDatos slug={slug} nombre={familia.nombre} monograma={familia.monograma} />
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Código de acceso</h2>
        <FormularioCodigo slug={slug} />
      </section>
    </div>
  );
}
