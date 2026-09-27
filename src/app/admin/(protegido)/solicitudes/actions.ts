"use server";

import { revalidatePath } from "next/cache";

import { requerirSesion } from "@/lib/admin";

/** Solo se puede borrar (borrado suave, papelera) una solicitud ya resuelta. */
export async function borrarSolicitudAction(id: string): Promise<{ error: string | null }> {
  const { supabase, user } = await requerirSesion();

  const { data: actual, error: errorLectura } = await supabase
    .from("solicitudes")
    .select("estado")
    .eq("id", id)
    .maybeSingle();
  if (errorLectura) return { error: errorLectura.message };
  if (!actual) return { error: "No se encontró esa solicitud." };
  if (actual.estado !== "resuelta") {
    return { error: "Solo se pueden borrar solicitudes ya resueltas." };
  }

  const { error } = await supabase
    .from("solicitudes")
    .update({ borrado_en: new Date().toISOString(), borrado_por: user.id })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/solicitudes");
  return { error: null };
}

export async function cambiarEstadoSolicitudAction(
  id: string,
  estado: "en_proceso" | "resuelta"
): Promise<{ error: string | null }> {
  if (estado !== "en_proceso" && estado !== "resuelta") return { error: "Estado no válido." };

  // Sesión del usuario: RLS solo deja actualizar solicitudes de sus familias.
  const { supabase } = await requerirSesion();
  const { data, error } = await supabase
    .from("solicitudes")
    .update({ estado })
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "No se pudo actualizar esa solicitud." };

  // También refresca el contador de la barra de navegación del panel.
  revalidatePath("/admin", "layout");
  return { error: null };
}
