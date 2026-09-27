import Link from "next/link";
import type { Metadata } from "next";

import { crearClienteServidor } from "@/lib/supabase-server";
import { BotonCerrarSesion } from "../BotonCerrarSesion";
import { AccionesSolicitud } from "./AccionesSolicitud";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "Solicitudes — Vuelta al Sol" };
export const dynamic = "force-dynamic";

const ESTADOS = [
  { valor: "", nombre: "Todas" },
  { valor: "nueva", nombre: "Nuevas" },
  { valor: "en_proceso", nombre: "En proceso" },
  { valor: "resuelta", nombre: "Resueltas" },
] as const;

const NOMBRE_ESTADO: Record<string, string> = {
  nueva: "Nueva",
  en_proceso: "En proceso",
  resuelta: "Resuelta",
};

const NOMBRE_TIPO: Record<string, string> = {
  imprimir_de_nuevo: "Imprimir de nuevo",
  corregir_datos: "Corregir datos",
  agregar_personas: "Agregar personas",
  otra: "Otra consulta",
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function Solicitudes({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado: estadoParam } = await searchParams;
  const filtro = ESTADOS.some((e) => e.valor === estadoParam && e.valor !== "") ? estadoParam : "";

  const supabase = await crearClienteServidor();
  // RLS ya filtra: solo vuelven solicitudes de familias donde el usuario es miembro.
  let consulta = supabase
    .from("solicitudes")
    .select("id, familia_id, tipo, mensaje, contacto, autor_nombre, estado, creada_en")
    .order("creada_en", { ascending: false });
  if (filtro) consulta = consulta.eq("estado", filtro);

  const [{ data: solicitudes, error }, { data: familias }] = await Promise.all([
    consulta,
    supabase.from("familias").select("id, nombre, slug"),
  ]);
  const familiaPorId = new Map((familias ?? []).map((f) => [f.id, f]));

  return (
    <main className={styles.pagina}>
      <div className={styles.cabecera}>
        <h1 className={styles.titulo}>Solicitudes</h1>
        <BotonCerrarSesion className={styles.botonSecundario} />
      </div>
      <p className={styles.volver}>
        <Link href="/admin">← Tus familias</Link>
      </p>

      <nav className={styles.filtros} aria-label="Filtrar por estado">
        {ESTADOS.map((e) => (
          <Link
            key={e.valor}
            href={e.valor ? `/admin/solicitudes?estado=${e.valor}` : "/admin/solicitudes"}
            className={e.valor === filtro ? `${styles.filtro} ${styles.filtroActivo}` : styles.filtro}
          >
            {e.nombre}
          </Link>
        ))}
      </nav>

      {error ? (
        <p className={styles.errorGrande}>No se pudieron cargar las solicitudes: {error.message}</p>
      ) : !solicitudes || solicitudes.length === 0 ? (
        <p className={styles.vacio}>No hay solicitudes{filtro ? " con ese estado" : " todavía"}.</p>
      ) : (
        <ul className={styles.lista}>
          {solicitudes.map((s) => {
            const familia = familiaPorId.get(s.familia_id);
            return (
              <li key={s.id} className={styles.tarjeta}>
                <div className={styles.encabezado}>
                  <span className={styles.familia}>{familia?.nombre ?? "—"}</span>
                  <span className={`${styles.estado} ${styles[`estado_${s.estado}`] ?? ""}`}>
                    {NOMBRE_ESTADO[s.estado] ?? s.estado}
                  </span>
                </div>
                <p className={styles.meta}>
                  {NOMBRE_TIPO[s.tipo] ?? s.tipo} · {formatearFecha(s.creada_en)}
                </p>
                <p className={styles.meta}>
                  {s.autor_nombre} · {s.contacto}
                </p>
                <p className={styles.mensaje}>{s.mensaje}</p>
                <AccionesSolicitud id={s.id} estado={s.estado} />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
