import "server-only";
import { redirect, notFound } from "next/navigation";
import { crearClienteServidor } from "./supabase-server";

/** Exige sesión de Supabase Auth; si no hay, manda a /admin/entrar. */
export async function requerirSesion() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/entrar");

  return { supabase, user };
}

export interface FamiliaAdmin {
  id: string;
  nombre: string;
  slug: string;
  monograma: string | null;
  mostrarSiluetasImpresas: boolean;
}

/**
 * Exige sesión y membresía en la familia del slug. La consulta a
 * `familias` ya queda filtrada por RLS (`es_miembro`), así que si vuelve
 * vacía, da igual si es porque el slug no existe o porque el usuario no
 * pertenece a ella: 404 en ambos casos.
 */
export async function requerirMiembro(slug: string) {
  const { supabase, user } = await requerirSesion();

  const { data: familia } = await supabase
    .from("familias")
    .select("id, nombre, slug, monograma, mostrar_siluetas_impresas, borrado_en")
    .eq("slug", slug)
    .maybeSingle();

  // Una familia eliminada (borrado suave) no abre ninguna página del panel,
  // ni para su propio admin: lo único posible con ella es restaurarla desde
  // /admin (ver "Eliminar una familia").
  if (!familia || familia.borrado_en) notFound();

  const { data: miembro } = await supabase
    .from("miembros")
    .select("rol")
    .eq("familia_id", familia.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!miembro) notFound();

  const familiaAdmin: FamiliaAdmin = {
    id: familia.id,
    nombre: familia.nombre,
    slug: familia.slug,
    monograma: familia.monograma,
    mostrarSiluetasImpresas: familia.mostrar_siluetas_impresas,
  };

  return { supabase, user, familia: familiaAdmin, esAdmin: miembro.rol === "admin" };
}
