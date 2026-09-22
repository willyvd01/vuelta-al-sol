import { requerirMiembro } from "@/lib/admin";
import { obtenerDatosDeUsuarios } from "@/lib/supabase-admin";
import { FormularioDatos, FormularioCodigo, FormularioMiContrasena } from "./FormularioAjustes";
import { FormularioColaboradores, type MiembroLista } from "./FormularioColaboradores";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Ajustes({
  params,
}: {
  params: Promise<{ familia: string }>;
}) {
  const { familia: slug } = await params;
  const { supabase, familia, user, esAdmin } = await requerirMiembro(slug);

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

        <section className={styles.seccion}>
          <h2 className={styles.tituloSeccion}>Tu cuenta</h2>
          <FormularioMiContrasena />
        </section>
      </div>
    );
  }

  const { data: miembrosCrudos } = await supabase
    .from("miembros")
    .select("user_id, rol")
    .eq("familia_id", familia.id);

  const datosUsuarios = await obtenerDatosDeUsuarios(
    (miembrosCrudos ?? []).map((m) => m.user_id)
  );

  const miembros: MiembroLista[] = (miembrosCrudos ?? []).map((m) => ({
    userId: m.user_id,
    rol: m.rol,
    correo: datosUsuarios.get(m.user_id)?.correo ?? "—",
    nombre: datosUsuarios.get(m.user_id)?.nombre ?? null,
    esUsuarioActual: m.user_id === user.id,
  }));

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

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Colaboradores</h2>
        <FormularioColaboradores slug={slug} miembros={miembros} />
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Tu cuenta</h2>
        <FormularioMiContrasena />
      </section>
    </div>
  );
}
