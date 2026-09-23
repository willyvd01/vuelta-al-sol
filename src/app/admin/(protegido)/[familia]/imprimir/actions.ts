"use server";

import { revalidatePath } from "next/cache";
import { requerirMiembro } from "@/lib/admin";
import { marcarPersonasComoImpresas } from "@/lib/supabase-admin";

export interface EstadoEdicion {
  error: string | null;
  numero?: number;
}

/** Deja constancia de que se imprimió un lote del calendario. Solo admin. */
export async function registrarEdicionAction(
  slug: string,
  notas: string
): Promise<EstadoEdicion> {
  const { supabase, familia, esAdmin } = await requerirMiembro(slug);
  if (!esAdmin) return { error: "Solo un administrador puede registrar una edición." };

  const { count, error: errorConteo } = await supabase
    .from("ediciones")
    .select("id", { count: "exact", head: true })
    .eq("familia_id", familia.id);
  if (errorConteo) return { error: errorConteo.message };

  const numero = (count ?? 0) + 1;

  const { error } = await supabase
    .from("ediciones")
    .insert({ familia_id: familia.id, numero, notas: notas.trim() || null });
  if (error) return { error: error.message };

  await marcarPersonasComoImpresas(familia.id, numero);

  revalidatePath(`/admin/${slug}/imprimir`);
  return { error: null, numero };
}
