"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase-server";

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
