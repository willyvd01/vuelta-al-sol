import { requerirMiembro } from "@/lib/admin";
import { obtenerDatosDeUsuarios, purgarPapeleraVieja } from "@/lib/supabase-admin";
import { FormularioDatos, FormularioCodigo, FormularioMiContrasena } from "./FormularioAjustes";
import { FormularioColaboradores, type MiembroLista } from "./FormularioColaboradores";
import { Papelera, type ItemPapelera } from "./Papelera";

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

  await purgarPapeleraVieja(familia.id);

  const [{ data: personasBorradas }, { data: recuerdosBorrados }] = await Promise.all([
    supabase
      .from("personas")
      .select("id, nombres, apellidos, borrado_en, borrado_por")
      .eq("familia_id", familia.id)
      .not("borrado_en", "is", null),
    supabase
      .from("recuerdos")
      .select("id, titulo, borrado_en, borrado_por")
      .eq("familia_id", familia.id)
      .not("borrado_en", "is", null),
  ]);

  const idsParaNombres = [
    ...new Set(
      [...(miembrosCrudos ?? []).map((m) => m.user_id), ...(personasBorradas ?? []).map((p) => p.borrado_por), ...(recuerdosBorrados ?? []).map((r) => r.borrado_por)].filter(
        (id): id is string => !!id
      )
    ),
  ];
  const datosUsuarios = await obtenerDatosDeUsuarios(idsParaNombres);

  const miembros: MiembroLista[] = (miembrosCrudos ?? []).map((m) => ({
    userId: m.user_id,
    rol: m.rol,
    correo: datosUsuarios.get(m.user_id)?.correo ?? "—",
    nombre: datosUsuarios.get(m.user_id)?.nombre ?? null,
    esUsuarioActual: m.user_id === user.id,
  }));

  const nombreDeQuienBorro = (userId: string | null) =>
    userId ? datosUsuarios.get(userId)?.nombre ?? datosUsuarios.get(userId)?.correo ?? "alguien" : "alguien";

  const papelera: ItemPapelera[] = [
    ...(personasBorradas ?? []).map((p) => ({
      tipo: "persona" as const,
      id: p.id,
      titulo: `${p.nombres} ${p.apellidos}`.trim(),
      borradoEn: p.borrado_en as string,
      borradoPor: nombreDeQuienBorro(p.borrado_por),
    })),
    ...(recuerdosBorrados ?? []).map((r) => ({
      tipo: "recuerdo" as const,
      id: r.id,
      titulo: r.titulo,
      borradoEn: r.borrado_en as string,
      borradoPor: nombreDeQuienBorro(r.borrado_por),
    })),
  ].sort((a, b) => new Date(b.borradoEn).getTime() - new Date(a.borradoEn).getTime());

  return (
    <div>
      <h1 className={styles.titulo}>Ajustes</h1>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Datos de la familia</h2>
        <FormularioDatos
          slug={slug}
          nombre={familia.nombre}
          monograma={familia.monograma}
          mostrarSiluetasImpresas={familia.mostrarSiluetasImpresas}
        />
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
        <h2 className={styles.tituloSeccion}>Papelera</h2>
        <Papelera slug={slug} items={papelera} />
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Tu cuenta</h2>
        <FormularioMiContrasena />
      </section>
    </div>
  );
}
