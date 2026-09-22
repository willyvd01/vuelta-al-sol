"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase-server";

export interface EstadoAjustes {
  error: string | null;
  exito: boolean;
}

const SIN_CAMBIOS: EstadoAjustes = { error: null, exito: false };

export async function guardarDatosAction(
  slug: string,
  _estadoPrevio: EstadoAjustes,
  formData: FormData
): Promise<EstadoAjustes> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const monograma = String(formData.get("monograma") ?? "").trim();

  if (!nombre) return { error: "El nombre no puede quedar vacío.", exito: false };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("familias")
    .update({ nombre, monograma: monograma || null })
    .eq("slug", slug);

  if (error) return { error: error.message, exito: false };

  revalidatePath(`/admin/${slug}/ajustes`);
  return { error: null, exito: true };
}

export async function cambiarCodigoAction(
  slug: string,
  _estadoPrevio: EstadoAjustes,
  formData: FormData
): Promise<EstadoAjustes> {
  const codigo = String(formData.get("codigoNuevo") ?? "");
  const confirmacion = String(formData.get("codigoConfirmacion") ?? "");

  // El cliente ya compara los dos campos, pero se revisa otra vez aquí:
  // nunca confiar solo en la validación de la pantalla.
  if (codigo.trim().toLowerCase() !== confirmacion.trim().toLowerCase()) {
    return { error: "Los dos códigos no coinciden.", exito: false };
  }

  const supabase = await crearClienteServidor();
  const { data: familia } = await supabase
    .from("familias")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!familia) return SIN_CAMBIOS;

  const { error } = await supabase.rpc("cambiar_codigo_acceso", {
    p_familia: familia.id,
    p_codigo: codigo,
  });

  if (error) return { error: error.message, exito: false };

  revalidatePath(`/admin/${slug}/ajustes`);
  return { error: null, exito: true };
}
