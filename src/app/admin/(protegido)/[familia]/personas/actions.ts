"use server";

import { revalidatePath } from "next/cache";
import { requerirMiembro } from "@/lib/admin";
import { procesarFotoPersona } from "@/lib/supabase-admin";

export interface EstadoPersona {
  error: string | null;
}

export interface SubidaFirmada {
  path: string;
  token: string;
}

/** Pide una URL de subida firmada para que el navegador suba la foto directo a Storage. */
export async function crearSubidaFotoAction(
  slug: string
): Promise<SubidaFirmada | { error: string }> {
  const { supabase, familia } = await requerirMiembro(slug);

  const ruta = `${familia.id}/personas/tmp-${crypto.randomUUID()}`;
  const { data, error } = await supabase.storage.from("fotos").createSignedUploadUrl(ruta);
  if (error) return { error: error.message };

  return { path: data.path, token: data.token };
}

export async function guardarPersonaAction(
  slug: string,
  codigoExistente: string | null,
  formData: FormData
): Promise<EstadoPersona> {
  const { supabase, familia } = await requerirMiembro(slug);

  const nombres = String(formData.get("nombres") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const dia = Number(formData.get("dia"));
  const mes = Number(formData.get("mes"));
  const anioCrudo = String(formData.get("anio") ?? "").trim();
  const anio = anioCrudo ? Number(anioCrudo) : null;
  const parentesco = String(formData.get("parentesco") ?? "").trim() || null;
  const fallecida = formData.get("fallecida") === "on";
  const rutaTemporal = String(formData.get("rutaTemporal") ?? "") || null;
  const corteCrudo = String(formData.get("corte") ?? "");

  if (!nombres) return { error: "El nombre es obligatorio." };
  if (!dia || !mes) return { error: "Elige el día y el mes." };
  if (anioCrudo && (!Number.isInteger(anio) || anio! < 1850 || anio! > 2100)) {
    return { error: "El año no parece válido." };
  }

  const datos = { nombres, apellidos, dia, mes, anio, parentesco, fallecida };

  let personaId: string;

  if (codigoExistente) {
    const { data, error } = await supabase
      .from("personas")
      .update(datos)
      .eq("codigo", codigoExistente)
      .select("id")
      .single();
    if (error) return { error: mensajeError(error) };
    personaId = data.id;
  } else {
    const { data, error } = await supabase
      .from("personas")
      .insert({ ...datos, familia_id: familia.id })
      .select("id")
      .single();
    if (error) return { error: mensajeError(error) };
    personaId = data.id;
  }

  if (rutaTemporal && corteCrudo) {
    try {
      const corte = JSON.parse(corteCrudo) as { x: number; y: number; tamano: number };
      const { original, web } = await procesarFotoPersona(
        familia.id,
        personaId,
        rutaTemporal,
        corte
      );
      const { error: errorFoto } = await supabase
        .from("personas")
        .update({ foto_original: original, foto_web: web })
        .eq("id", personaId);
      if (errorFoto) return { error: errorFoto.message };
    } catch (e) {
      return {
        error: e instanceof Error ? `No se pudo procesar la foto: ${e.message}` : "No se pudo procesar la foto.",
      };
    }
  }

  revalidatePath(`/admin/${slug}/personas`);
  return { error: null };
}

/** No borra de verdad: manda a la papelera (Fase 9d). Cualquier miembro puede. */
export async function borrarPersonaAction(
  slug: string,
  codigo: string
): Promise<EstadoPersona> {
  const { supabase, user } = await requerirMiembro(slug);

  const { data: persona } = await supabase
    .from("personas")
    .select("id")
    .eq("codigo", codigo)
    .maybeSingle();
  if (!persona) return { error: "Esa persona ya no existe." };

  const { error } = await supabase
    .from("personas")
    .update({ borrado_en: new Date().toISOString(), borrado_por: user.id })
    .eq("id", persona.id);
  if (error) return { error: error.message };

  revalidatePath(`/admin/${slug}/personas`);
  return { error: null };
}

function mensajeError(error: { message: string; code?: string }): string {
  if (error.code === "23514") {
    return "Esa combinación de día y mes no existe.";
  }
  return error.message;
}
