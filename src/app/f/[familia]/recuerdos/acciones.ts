"use server";

import { revalidatePath } from "next/cache";
import { verificarAcceso, obtenerIp, hashIp } from "@/lib/acceso";
import { resolverAutorEscritura, puedeEditar } from "@/lib/autoria";
import {
  crearSubidaFotoRecuerdoAlbum,
  validarPersonasDeFamilia,
  crearRecuerdoAlbum,
  obtenerRecuerdoParaEditarAlbum,
  actualizarRecuerdoAlbum,
  contarFotosRecuerdo,
  guardarFotoRecuerdoAlbum,
  reordenarFotoRecuerdoAlbum,
  borrarFotosRecuerdoAlbumPorId,
  procesarFotoRecuerdo,
  verificarLimiteAportes,
  registrarAporte,
} from "@/lib/supabase-admin";

export interface SubidaFirmada {
  path: string;
  token: string;
}

export interface EstadoRecuerdoAlbum {
  error: string | null;
}

const MAX_FOTOS = 10;
const MAX_BYTES_FOTO = 15 * 1024 * 1024;

/** Pide una URL de subida firmada. Cualquiera con acceso a la familia puede llamarla. */
export async function crearSubidaFotoRecuerdoAlbumAction(
  slug: string
): Promise<SubidaFirmada | { error: string }> {
  const acceso = await verificarAcceso(slug);
  if (!acceso) return { error: "No tienes acceso a este álbum." };
  return crearSubidaFotoRecuerdoAlbum(acceso.familiaId);
}

type FotoEntrada = { tipo: "existente"; id: string } | { tipo: "nueva"; rutaTemporal: string };

export async function guardarRecuerdoAlbumAction(
  slug: string,
  recuerdoIdExistente: string | null,
  formData: FormData
): Promise<EstadoRecuerdoAlbum> {
  const acceso = await verificarAcceso(slug);
  if (!acceso) return { error: "No tienes acceso a este álbum." };
  const familiaId = acceso.familiaId;

  const fecha = String(formData.get("fecha") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const historia = String(formData.get("historia") ?? "").trim() || null;
  const nombreVisitante = String(formData.get("nombreVisitante") ?? "");
  const personaIds = JSON.parse(String(formData.get("personas") ?? "[]")) as string[];
  const fotosFinal = JSON.parse(String(formData.get("fotos") ?? "[]")) as FotoEntrada[];
  const fotosBorradas = JSON.parse(String(formData.get("fotosBorradas") ?? "[]")) as string[];

  if (!fecha) return { error: "Elige una fecha." };
  if (!titulo) return { error: "El título es obligatorio." };
  if (personaIds.length === 0) return { error: "Etiqueta al menos a una persona." };
  if (fotosFinal.length > MAX_FOTOS) return { error: `Máximo ${MAX_FOTOS} fotos por recuerdo.` };

  const autor = await resolverAutorEscritura(slug, familiaId, nombreVisitante);
  if ("error" in autor) return autor;

  const personasValidas = await validarPersonasDeFamilia(familiaId, personaIds);
  if (personasValidas.size !== personaIds.length) {
    return { error: "Alguna de las personas etiquetadas ya no existe." };
  }

  let recuerdoId: string;

  if (recuerdoIdExistente) {
    const existente = await obtenerRecuerdoParaEditarAlbum(recuerdoIdExistente);
    if (!existente || existente.familiaId !== familiaId) {
      return { error: "Ese recuerdo ya no existe." };
    }
    if (!puedeEditar(autor, existente)) {
      return { error: "Solo quien lo agregó (o un miembro de la familia) puede editar este recuerdo." };
    }
    await actualizarRecuerdoAlbum(recuerdoIdExistente, { fecha, titulo, historia, personaIds });
    recuerdoId = recuerdoIdExistente;
  } else {
    const limite = await verificarLimiteAportes(familiaId);
    if (!limite.permitido) return { error: limite.mensaje };

    recuerdoId = await crearRecuerdoAlbum(familiaId, { fecha, titulo, historia, personaIds }, autor);
  }

  if (fotosBorradas.length > 0) {
    await borrarFotosRecuerdoAlbumPorId(fotosBorradas);
  }

  const fotosExistentesRestantes = fotosFinal.filter((f) => f.tipo === "existente").length;
  const fotosNuevas = fotosFinal.filter((f) => f.tipo === "nueva").length;
  const totalTrasGuardar = fotosExistentesRestantes + fotosNuevas;
  if (totalTrasGuardar > MAX_FOTOS) {
    return { error: `Máximo ${MAX_FOTOS} fotos por recuerdo.` };
  }
  if (recuerdoIdExistente) {
    // Revisa contra lo que de verdad quedó en la base tras borrar, no solo lo que mandó el formulario.
    const yaGuardadas = await contarFotosRecuerdo(recuerdoIdExistente);
    if (yaGuardadas - fotosBorradas.length + fotosNuevas > MAX_FOTOS) {
      return { error: `Máximo ${MAX_FOTOS} fotos por recuerdo.` };
    }
  }

  for (let i = 0; i < fotosFinal.length; i++) {
    const entrada = fotosFinal[i];
    if (entrada.tipo === "existente") {
      await reordenarFotoRecuerdoAlbum(entrada.id, i);
    } else {
      try {
        const fotoId = crypto.randomUUID();
        const { original, web, ancho, alto } = await procesarFotoRecuerdo(
          familiaId,
          recuerdoId,
          fotoId,
          entrada.rutaTemporal,
          MAX_BYTES_FOTO
        );
        await guardarFotoRecuerdoAlbum({
          fotoId,
          recuerdoId,
          familiaId,
          original,
          web,
          ancho,
          alto,
          orden: i,
        });
      } catch (e) {
        return {
          error: e instanceof Error ? `No se pudo procesar una foto: ${e.message}` : "No se pudo procesar una foto.",
        };
      }
    }
  }

  if (!recuerdoIdExistente) {
    const ip = await obtenerIp();
    await registrarAporte(await hashIp(ip), familiaId);
  }

  for (const codigo of personasValidas.values()) {
    revalidatePath(`/f/${slug}/p/${codigo}`);
  }

  return { error: null };
}
