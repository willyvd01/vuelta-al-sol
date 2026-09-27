"use server";

import { revalidatePath } from "next/cache";

import { requerirSesion } from "@/lib/admin";

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
