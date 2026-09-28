"use server";

import { redirect } from "next/navigation";
import { requerirMiembro } from "@/lib/admin";

export interface EstadoEliminarFamilia {
  error: string | null;
}

export async function eliminarFamiliaAction(
  slug: string,
  _estadoPrevio: EstadoEliminarFamilia,
  formData: FormData
): Promise<EstadoEliminarFamilia> {
  const { supabase, user, familia, esAdmin } = await requerirMiembro(slug);
  if (!esAdmin) return { error: "Solo un administrador puede eliminar la familia." };

  const confirmacion = String(formData.get("confirmacion") ?? "").trim();
  if (confirmacion !== familia.nombre) {
    return { error: `Escribe exactamente "${familia.nombre}" para confirmar.` };
  }

  const { error } = await supabase
    .from("familias")
    .update({ borrado_en: new Date().toISOString(), borrado_por: user.id })
    .eq("id", familia.id);
  if (error) return { error: error.message };

  redirect("/admin");
}
