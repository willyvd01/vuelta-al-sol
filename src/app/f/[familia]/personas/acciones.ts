"use server";

import { revalidatePath } from "next/cache";
import { verificarAcceso, obtenerIp, hashIp } from "@/lib/acceso";
import { resolverAutorEscritura } from "@/lib/autoria";
import {
  crearSubidaFotoPersonaAlbum,
  buscarPersonasParecidas,
  crearPersonaAlbum,
  guardarFotoPersonaAlbum,
  procesarFotoPersona,
  verificarLimiteAportes,
  registrarAporte,
  type PersonaParecida,
} from "@/lib/supabase-admin";
import { mesEnUrl } from "@/lib/meses";

export interface SubidaFirmada {
  path: string;
  token: string;
}

export interface ResultadoGuardarPersona {
  error: string | null;
}

/** Pide una URL de subida firmada. Cualquiera con acceso a la familia puede llamarla. */
export async function crearSubidaFotoPersonaAlbumAction(
  slug: string
): Promise<SubidaFirmada | { error: string }> {
  const acceso = await verificarAcceso(slug);
  if (!acceso) return { error: "No tienes acceso a este álbum." };
  return crearSubidaFotoPersonaAlbum(acceso.familiaId);
}

/**
 * Se llama antes de subir ninguna foto: mismo día y mes, nombre parecido.
 * No bloquea nada — la pantalla decide si muestra un aviso y deja
 * confirmar igual.
 */
export async function buscarDuplicadosAction(
  slug: string,
  nombres: string,
  apellidos: string,
  dia: number,
  mes: number
): Promise<PersonaParecida[]> {
  const acceso = await verificarAcceso(slug);
  if (!acceso || !nombres.trim() || !dia || !mes) return [];
  return buscarPersonasParecidas(acceso.familiaId, nombres, apellidos, dia, mes);
}

export async function guardarPersonaAlbumAction(
  slug: string,
  formData: FormData
): Promise<ResultadoGuardarPersona> {
  const acceso = await verificarAcceso(slug);
  if (!acceso) return { error: "No tienes acceso a este álbum." };
  const familiaId = acceso.familiaId;

  const nombres = String(formData.get("nombres") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const dia = Number(formData.get("dia"));
  const mes = Number(formData.get("mes"));
  const anioCrudo = String(formData.get("anio") ?? "").trim();
  const anio = anioCrudo ? Number(anioCrudo) : null;
  const parentesco = String(formData.get("parentesco") ?? "").trim() || null;
  const nombreVisitante = String(formData.get("nombreVisitante") ?? "");
  const rutaTemporal = String(formData.get("rutaTemporal") ?? "") || null;
  const corteCrudo = String(formData.get("corte") ?? "");

  if (!nombres) return { error: "El nombre es obligatorio." };
  if (!dia || !mes) return { error: "Elige el día y el mes." };
  if (anioCrudo && (!Number.isInteger(anio) || anio! < 1850 || anio! > 2100)) {
    return { error: "El año no parece válido." };
  }

  const autor = await resolverAutorEscritura(slug, familiaId, nombreVisitante);
  if ("error" in autor) return autor;

  const limite = await verificarLimiteAportes(familiaId);
  if (!limite.permitido) return { error: limite.mensaje };

  const personaId = await crearPersonaAlbum(familiaId, { nombres, apellidos, dia, mes, anio, parentesco }, autor);

  if (rutaTemporal && corteCrudo) {
    try {
      const corte = JSON.parse(corteCrudo) as { x: number; y: number; tamano: number };
      const { original, web } = await procesarFotoPersona(familiaId, personaId, rutaTemporal, corte);
      await guardarFotoPersonaAlbum(personaId, original, web);
    } catch (e) {
      return {
        error: e instanceof Error ? `No se pudo procesar la foto: ${e.message}` : "No se pudo procesar la foto.",
      };
    }
  }

  const ip = await obtenerIp();
  await registrarAporte(await hashIp(ip), familiaId);

  revalidatePath(`/f/${slug}/${mesEnUrl(mes)}`);

  return { error: null };
}
