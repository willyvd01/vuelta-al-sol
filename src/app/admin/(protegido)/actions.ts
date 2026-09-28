"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase-server";
import { requerirSesion } from "@/lib/admin";

export interface EstadoCrearFamilia {
  error: string | null;
}

const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function crearFamiliaAction(
  _estadoPrevio: EstadoCrearFamilia,
  formData: FormData
): Promise<EstadoCrearFamilia> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const codigo = String(formData.get("codigo") ?? "");
  const monograma = String(formData.get("monograma") ?? "").trim();

  if (!nombre) return { error: "Ponle un nombre a la familia." };
  if (!SLUG_VALIDO.test(slug)) {
    return {
      error:
        "El identificador solo puede tener minúsculas, números y guiones (ej: familia-perez).",
    };
  }

  // /admin/solicitudes es una página fija del panel, no una familia.
  if (slug === "solicitudes") {
    return { error: "Ese identificador está reservado, elige otro." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("crear_familia", {
    p_nombre: nombre,
    p_slug: slug,
    p_codigo_acceso: codigo,
    p_monograma: monograma || undefined,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ese identificador ya está en uso, elige otro." };
    }
    return { error: error.message };
  }

  redirect(`/admin/${slug}`);
}

/** Solo un admin de esa familia (aunque esté eliminada) puede restaurarla. */
export async function restaurarFamiliaAction(familiaId: string): Promise<{ error: string | null }> {
  const { supabase, user } = await requerirSesion();

  const { data: miembro } = await supabase
    .from("miembros")
    .select("rol")
    .eq("familia_id", familiaId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!miembro || miembro.rol !== "admin") {
    return { error: "Solo un administrador puede restaurar esta familia." };
  }

  const { error } = await supabase
    .from("familias")
    .update({ borrado_en: null, borrado_por: null })
    .eq("id", familiaId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { error: null };
}
