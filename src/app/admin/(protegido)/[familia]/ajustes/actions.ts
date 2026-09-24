"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase-server";
import { requerirMiembro } from "@/lib/admin";
import { crearUsuarioColaborador } from "@/lib/supabase-admin";

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
  const mostrarSiluetasImpresas = formData.get("mostrarSiluetasImpresas") === "on";

  if (!nombre) return { error: "El nombre no puede quedar vacío.", exito: false };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("familias")
    .update({ nombre, monograma: monograma || null, mostrar_siluetas_impresas: mostrarSiluetasImpresas })
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

export interface EstadoColaborador {
  error: string | null;
  exito: { correo: string; contrasenaTemporal: string } | null;
}

export async function crearColaboradorAction(
  slug: string,
  _estadoPrevio: EstadoColaborador,
  formData: FormData
): Promise<EstadoColaborador> {
  const { supabase, familia, esAdmin } = await requerirMiembro(slug);
  if (!esAdmin) return { error: "Solo un administrador puede crear colaboradores.", exito: null };

  const nombre = String(formData.get("nombre") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();

  if (!nombre) return { error: "Ponle un nombre al colaborador.", exito: null };
  if (!correo) return { error: "Ponle un correo.", exito: null };

  let creado;
  try {
    creado = await crearUsuarioColaborador(correo, nombre);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo crear el usuario.",
      exito: null,
    };
  }

  const { error: errorMiembro } = await supabase
    .from("miembros")
    .insert({ familia_id: familia.id, user_id: creado.userId, rol: "colaborador" });
  if (errorMiembro) return { error: errorMiembro.message, exito: null };

  revalidatePath(`/admin/${slug}/ajustes`);
  return { error: null, exito: { correo, contrasenaTemporal: creado.contrasenaTemporal } };
}

export async function quitarMiembroAction(
  slug: string,
  userId: string
): Promise<EstadoAjustes> {
  const { supabase, familia, user, esAdmin } = await requerirMiembro(slug);
  if (!esAdmin) return { error: "Solo un administrador puede quitar miembros.", exito: false };

  if (userId === user.id) {
    const { count } = await supabase
      .from("miembros")
      .select("user_id", { count: "exact", head: true })
      .eq("familia_id", familia.id)
      .eq("rol", "admin");
    if ((count ?? 0) <= 1) {
      return {
        error: "No puedes quitarte a ti mismo: eres el único administrador de esta familia.",
        exito: false,
      };
    }
  }

  const { error } = await supabase
    .from("miembros")
    .delete()
    .eq("familia_id", familia.id)
    .eq("user_id", userId);
  if (error) return { error: error.message, exito: false };

  revalidatePath(`/admin/${slug}/ajustes`);
  return { error: null, exito: true };
}

export interface EstadoPapelera {
  error: string | null;
}

/** Cualquier miembro puede borrar/restaurar (RLS ya lo permite); la página que llama a esto es solo del admin. */
export async function restaurarItemAction(
  slug: string,
  tipo: "persona" | "recuerdo",
  id: string
): Promise<EstadoPapelera> {
  const { supabase } = await requerirMiembro(slug);

  const tabla = tipo === "persona" ? "personas" : "recuerdos";
  const { error } = await supabase
    .from(tabla)
    .update({ borrado_en: null, borrado_por: null })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/admin/${slug}/ajustes`);
  return { error: null };
}

export async function cambiarMiContrasenaAction(
  _estadoPrevio: EstadoAjustes,
  formData: FormData
): Promise<EstadoAjustes> {
  const nueva = String(formData.get("nueva") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");

  if (nueva.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres.", exito: false };
  }
  if (nueva !== confirmacion) {
    return { error: "Las dos contraseñas no coinciden.", exito: false };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { error: error.message, exito: false };

  return { error: null, exito: true };
}
