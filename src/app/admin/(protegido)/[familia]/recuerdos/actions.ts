"use server";

import { revalidatePath } from "next/cache";
import { requerirMiembro } from "@/lib/admin";
import { procesarFotoRecuerdo, borrarFotosDeRecuerdo } from "@/lib/supabase-admin";

export interface EstadoRecuerdo {
  error: string | null;
}

export interface SubidaFirmada {
  path: string;
  token: string;
}

type FotoEntrada =
  | { tipo: "existente"; id: string }
  | { tipo: "nueva"; rutaTemporal: string };

/** Pide una URL de subida firmada para una foto de recuerdo (sin recorte). */
export async function crearSubidaFotoRecuerdoAction(
  slug: string
): Promise<SubidaFirmada | { error: string }> {
  const { supabase, familia } = await requerirMiembro(slug);

  const ruta = `${familia.id}/recuerdos/tmp-${crypto.randomUUID()}`;
  const { data, error } = await supabase.storage.from("fotos").createSignedUploadUrl(ruta);
  if (error) return { error: error.message };

  return { path: data.path, token: data.token };
}

export async function guardarRecuerdoAction(
  slug: string,
  recuerdoIdExistente: string | null,
  formData: FormData
): Promise<EstadoRecuerdo> {
  const { supabase, familia } = await requerirMiembro(slug);

  const fecha = String(formData.get("fecha") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const historia = String(formData.get("historia") ?? "").trim() || null;
  const lugar = String(formData.get("lugar") ?? "").trim() || null;
  const personas = JSON.parse(String(formData.get("personas") ?? "[]")) as string[];
  const fotosFinal = JSON.parse(String(formData.get("fotos") ?? "[]")) as FotoEntrada[];
  const fotosBorradas = JSON.parse(String(formData.get("fotosBorradas") ?? "[]")) as string[];

  if (!fecha) return { error: "Elige una fecha." };
  if (!titulo) return { error: "El título es obligatorio." };

  const datos = { fecha, titulo, historia, lugar };
  let recuerdoId: string;

  if (recuerdoIdExistente) {
    const { data, error } = await supabase
      .from("recuerdos")
      .update(datos)
      .eq("id", recuerdoIdExistente)
      .select("id")
      .single();
    if (error) {
      return {
        error: "No se pudo guardar. Revisa que tengas permiso para editar este recuerdo.",
      };
    }
    recuerdoId = data.id;
  } else {
    const { data, error } = await supabase
      .from("recuerdos")
      .insert({ ...datos, familia_id: familia.id })
      .select("id")
      .single();
    if (error) return { error: error.message };
    recuerdoId = data.id;
  }

  // --- personas etiquetadas ---
  const { data: actuales } = await supabase
    .from("recuerdo_personas")
    .select("persona_id")
    .eq("recuerdo_id", recuerdoId);
  const idsActuales = new Set((actuales ?? []).map((r) => r.persona_id));
  const idsNuevos = new Set(personas);

  const aAgregar = personas.filter((id) => !idsActuales.has(id));
  if (aAgregar.length > 0) {
    await supabase
      .from("recuerdo_personas")
      .insert(aAgregar.map((persona_id) => ({ recuerdo_id: recuerdoId, persona_id })));
  }
  const aQuitar = [...idsActuales].filter((id) => !idsNuevos.has(id));
  if (aQuitar.length > 0) {
    // Solo el admin puede quitar (rp_quitar); si no tiene permiso, RLS lo bloquea sin romper el resto.
    await supabase
      .from("recuerdo_personas")
      .delete()
      .eq("recuerdo_id", recuerdoId)
      .in("persona_id", aQuitar);
  }

  // --- fotos borradas ---
  if (fotosBorradas.length > 0) {
    const { data: aBorrar } = await supabase
      .from("recuerdo_fotos")
      .select("id, ruta_original, ruta_web")
      .in("id", fotosBorradas);
    const { error: errorBorrar } = await supabase
      .from("recuerdo_fotos")
      .delete()
      .in("id", fotosBorradas);
    if (!errorBorrar && aBorrar) {
      await borrarFotosDeRecuerdo(aBorrar.flatMap((f) => [f.ruta_original, f.ruta_web]));
    }
  }

  // --- orden final: reordena existentes, procesa y guarda las nuevas ---
  for (let i = 0; i < fotosFinal.length; i++) {
    const entrada = fotosFinal[i];
    if (entrada.tipo === "existente") {
      await supabase.from("recuerdo_fotos").update({ orden: i }).eq("id", entrada.id);
    } else {
      try {
        const fotoId = crypto.randomUUID();
        const { original, web, ancho, alto } = await procesarFotoRecuerdo(
          familia.id,
          recuerdoId,
          fotoId,
          entrada.rutaTemporal
        );
        const { error: errorFoto } = await supabase.from("recuerdo_fotos").insert({
          id: fotoId,
          recuerdo_id: recuerdoId,
          familia_id: familia.id,
          ruta_original: original,
          ruta_web: web,
          ancho,
          alto,
          orden: i,
        });
        if (errorFoto) return { error: errorFoto.message };
      } catch (e) {
        return {
          error: e instanceof Error ? `No se pudo procesar una foto: ${e.message}` : "No se pudo procesar una foto.",
        };
      }
    }
  }

  revalidatePath(`/admin/${slug}/recuerdos`);
  return { error: null };
}

export async function borrarRecuerdoAction(
  slug: string,
  recuerdoId: string
): Promise<EstadoRecuerdo> {
  const { supabase, esAdmin } = await requerirMiembro(slug);
  if (!esAdmin) return { error: "Solo un administrador puede borrar recuerdos." };

  const { data: fotos } = await supabase
    .from("recuerdo_fotos")
    .select("ruta_original, ruta_web")
    .eq("recuerdo_id", recuerdoId);

  const { error } = await supabase.from("recuerdos").delete().eq("id", recuerdoId);
  if (error) return { error: error.message };

  if (fotos && fotos.length > 0) {
    await borrarFotosDeRecuerdo(fotos.flatMap((f) => [f.ruta_original, f.ruta_web]));
  }

  revalidatePath(`/admin/${slug}/recuerdos`);
  return { error: null };
}
