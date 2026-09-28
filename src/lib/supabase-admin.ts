import "server-only";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import archiver from "archiver";
import sharp from "sharp";
import { fechasQueCuentanComoHoy } from "./edad";
import type { Database } from "./database.types";
import type { AutorAlbum } from "./autoria";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local"
  );
}

// Cliente de administrador: se salta la seguridad por fila (RLS).
// Solo se importa desde código de servidor ("server-only" lo garantiza en el build).
// Lo usan las páginas públicas del álbum para leer datos sin exigir sesión.
const admin = createClient<Database>(url, serviceRoleKey, {
  auth: { persistSession: false },
});

export interface Persona {
  codigo: string;
  nombres: string;
  apellidos: string;
  dia: number;
  mes: number;
  anio: number | null;
  signo: string;
  fotoWebUrl: string | null;
  impresa: boolean;
}

export interface PersonaFicha extends Persona {
  id: string;
  familiaId: string;
  parentesco: string | null;
  fallecida: boolean;
  autorToken: string | null;
}

export interface FotoRecuerdo {
  url: string;
  ancho: number | null;
  alto: number | null;
}

export interface PersonaEnRecuerdo {
  codigo: string;
  nombres: string;
  apellidos: string;
}

export interface Recuerdo {
  id: string;
  fecha: string;
  titulo: string;
  historia: string | null;
  lugar: string | null;
  fotos: FotoRecuerdo[];
  otrasPersonas: PersonaEnRecuerdo[];
  autorNombre: string | null;
  creadoPor: string | null;
  autorToken: string | null;
}

export async function obtenerFamiliaPorSlug(slug: string) {
  const { data, error } = await admin
    .from("familias")
    .select("id, nombre, slug, monograma")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

// Para usar después de verificar el acceso: nunca confíes en el slug de la
// URL para decidir qué datos mostrar, solo en el id que trae la cookie firmada.
export async function obtenerFamiliaPorId(id: string) {
  const { data, error } = await admin
    .from("familias")
    .select("id, nombre, slug, monograma, codigo_version")
    .eq("id", id)
    // Una familia eliminada (borrado suave) no abre el álbum, ni con una
    // cookie de acceso ya firmada de antes de borrarla.
    .is("borrado_en", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    nombre: data.nombre,
    slug: data.slug,
    monograma: data.monograma,
    codigoVersion: data.codigo_version,
  };
}

export async function verificarCodigoFamilia(
  slug: string,
  codigo: string
): Promise<{ id: string; codigoVersion: number } | null> {
  const { data, error } = await admin.rpc("verificar_codigo_familia", {
    p_slug: slug,
    p_codigo: codigo,
  });
  if (error) throw new Error(error.message);
  const fila = data?.[0];
  if (!fila) return null;
  return { id: fila.id, codigoVersion: fila.codigo_version };
}

export async function registrarIntentoAcceso(
  ipHash: string,
  familiaId: string | null,
  exitoso: boolean
): Promise<void> {
  const { error } = await admin
    .from("intentos_acceso")
    .insert({ ip_hash: ipHash, familia_id: familiaId, exitoso });
  if (error) throw new Error(error.message);
}

export async function contarFallosPorIp(
  ipHash: string,
  desde: string
): Promise<number> {
  const { count, error } = await admin
    .from("intentos_acceso")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("exitoso", false)
    .gte("creado_en", desde);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function contarFallosPorFamilia(
  familiaId: string,
  desde: string
): Promise<number> {
  const { count, error } = await admin
    .from("intentos_acceso")
    .select("id", { count: "exact", head: true })
    .eq("familia_id", familiaId)
    .eq("exitoso", false)
    .gte("creado_en", desde);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function limpiarIntentosViejos(): Promise<void> {
  const haceUnDia = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await admin.from("intentos_acceso").delete().lt("creado_en", haceUnDia);
}

const MENSAJE_BLOQUEO = "Demasiados intentos. Vuelve a intentarlo en 15 minutos.";

export async function verificarLimiteIntentos(
  ipHash: string,
  familiaId: string | null
): Promise<{ permitido: true } | { permitido: false; mensaje: string }> {
  await limpiarIntentosViejos();

  const hace15min = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const fallosIp = await contarFallosPorIp(ipHash, hace15min);
  if (fallosIp >= 5) return { permitido: false, mensaje: MENSAJE_BLOQUEO };

  if (familiaId) {
    const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const fallosFamilia = await contarFallosPorFamilia(familiaId, haceUnaHora);
    if (fallosFamilia >= 30) return { permitido: false, mensaje: MENSAJE_BLOQUEO };
  }

  return { permitido: true };
}

// ---------------------------------------------------------------------
// Límite de aportes (Fase 9): cuántos recuerdos y personas se agregan
// desde el álbum, por familia y por hora. Misma tabla que los intentos de
// código (tipo = 'aporte' en vez de 'acceso'), así que también se limpia
// sola con limpiarIntentosViejos().
// ---------------------------------------------------------------------

export async function registrarAporte(ipHash: string, familiaId: string): Promise<void> {
  const { error } = await admin
    .from("intentos_acceso")
    .insert({ ip_hash: ipHash, familia_id: familiaId, exitoso: true, tipo: "aporte" });
  if (error) throw new Error(error.message);
}

export async function contarAportesPorFamilia(
  familiaId: string,
  desde: string
): Promise<number> {
  const { count, error } = await admin
    .from("intentos_acceso")
    .select("id", { count: "exact", head: true })
    .eq("familia_id", familiaId)
    .eq("tipo", "aporte")
    .gte("creado_en", desde);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

const LIMITE_APORTES_POR_HORA = 20;
const MENSAJE_LIMITE_APORTES =
  "Ya se agregaron muchos recuerdos y personas en la última hora. Intenta de nuevo más tarde.";

export async function verificarLimiteAportes(
  familiaId: string
): Promise<{ permitido: true } | { permitido: false; mensaje: string }> {
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const aportes = await contarAportesPorFamilia(familiaId, haceUnaHora);
  if (aportes >= LIMITE_APORTES_POR_HORA) {
    return { permitido: false, mensaje: MENSAJE_LIMITE_APORTES };
  }
  return { permitido: true };
}

// ---------------------------------------------------------------------
// Solicitudes del centro de ayuda (Fase 10d). Los visitantes no escriben
// con sesión: solo esta función, con la service role key, y siempre
// después de que la acción del servidor verificó la cookie de acceso.
// ---------------------------------------------------------------------

export const TIPOS_SOLICITUD = [
  "imprimir_de_nuevo",
  "corregir_datos",
  "agregar_personas",
  "otra",
] as const;
export type TipoSolicitud = (typeof TIPOS_SOLICITUD)[number];

export async function crearSolicitud(
  familiaId: string,
  datos: { tipo: TipoSolicitud; mensaje: string; contacto: string; autorNombre: string }
): Promise<void> {
  const { error } = await admin.from("solicitudes").insert({
    familia_id: familiaId,
    tipo: datos.tipo,
    mensaje: datos.mensaje,
    contacto: datos.contacto,
    autor_nombre: datos.autorNombre,
  });
  if (error) throw new Error(error.message);
}

const LIMITE_SOLICITUDES_POR_HORA = 5;

export async function registrarEnvioSolicitud(ipHash: string, familiaId: string): Promise<void> {
  const { error } = await admin
    .from("intentos_acceso")
    .insert({ ip_hash: ipHash, familia_id: familiaId, exitoso: true, tipo: "solicitud" });
  if (error) throw new Error(error.message);
}

export async function verificarLimiteSolicitudes(
  familiaId: string
): Promise<{ permitido: true } | { permitido: false; mensaje: string }> {
  await limpiarIntentosViejos();
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("intentos_acceso")
    .select("id", { count: "exact", head: true })
    .eq("familia_id", familiaId)
    .eq("tipo", "solicitud")
    .gte("creado_en", haceUnaHora);
  if (error) throw new Error(error.message);
  if ((count ?? 0) >= LIMITE_SOLICITUDES_POR_HORA) {
    return {
      permitido: false,
      mensaje: "Ya se enviaron varias solicitudes en la última hora. Intenta de nuevo más tarde.",
    };
  }
  return { permitido: true };
}

/** Cuántas personas faltan por imprimir y en qué meses (números 1–12, sin repetir, en orden). */
export async function obtenerSinImprimirPorMes(
  familiaId: string
): Promise<{ total: number; meses: number[] }> {
  const { data, error } = await admin
    .from("personas")
    .select("mes")
    .eq("familia_id", familiaId)
    .is("impresa_en_edicion", null)
    .is("borrado_en", null);
  if (error) throw new Error(error.message);
  const meses = [...new Set((data ?? []).map((p) => p.mes))].sort((a, b) => a - b);
  return { total: data?.length ?? 0, meses };
}

const DURACION_URL_FIRMADA = 60 * 10; // 10 minutos, solo dura lo que dura la visita

export interface PersonaOpcion {
  id: string;
  codigo: string;
  nombres: string;
  apellidos: string;
}

/** Lista liviana (sin fotos) de toda la familia, para etiquetar personas en un recuerdo. */
export async function obtenerTodasLasPersonas(familiaId: string): Promise<PersonaOpcion[]> {
  const { data, error } = await admin
    .from("personas")
    .select("id, codigo, nombres, apellidos")
    .eq("familia_id", familiaId)
    .is("borrado_en", null)
    .order("nombres", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function obtenerPersonasDelMes(
  familiaId: string,
  mes: number
): Promise<Persona[]> {
  const { data, error } = await admin
    .from("personas")
    .select("codigo, nombres, apellidos, dia, mes, anio, signo, foto_web, impresa_en_edicion")
    .eq("familia_id", familiaId)
    .eq("mes", mes)
    .is("borrado_en", null)
    .order("dia", { ascending: true })
    .order("anio", { ascending: true })
    .order("apellidos", { ascending: true });

  if (error) throw new Error(error.message);
  if (!data) return [];

  return Promise.all(
    data.map(async (persona) => {
      let fotoWebUrl: string | null = null;
      if (persona.foto_web) {
        const { data: firmada } = await admin.storage
          .from("fotos")
          .createSignedUrl(persona.foto_web, DURACION_URL_FIRMADA);
        fotoWebUrl = firmada?.signedUrl ?? null;
      }
      return {
        codigo: persona.codigo,
        nombres: persona.nombres,
        apellidos: persona.apellidos,
        dia: persona.dia,
        mes: persona.mes,
        anio: persona.anio,
        signo: persona.signo ?? "",
        fotoWebUrl,
        impresa: persona.impresa_en_edicion !== null,
      };
    })
  );
}

export interface CumpleaneroHoy {
  codigo: string;
  nombres: string;
  apellidos: string;
  anio: number | null;
}

/** Quién cumple años hoy (en Bogotá) en esta familia; sin fallecidos ni borrados. */
export const obtenerCumpleanerosDeHoy = cache(
  async (familiaId: string): Promise<CumpleaneroHoy[]> => {
    const { mes, dias } = fechasQueCuentanComoHoy();
    const { data, error } = await admin
      .from("personas")
      .select("codigo, nombres, apellidos, anio")
      .eq("familia_id", familiaId)
      .eq("mes", mes)
      .in("dia", dias)
      .eq("fallecida", false)
      .is("borrado_en", null)
      .order("apellidos", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }
);

export async function obtenerPersonaPorCodigo(
  codigo: string
): Promise<PersonaFicha | null> {
  const { data, error } = await admin
    .from("personas")
    .select(
      "id, codigo, nombres, apellidos, dia, mes, anio, signo, foto_web, familia_id, parentesco, fallecida, impresa_en_edicion, autor_token"
    )
    .eq("codigo", codigo)
    .is("borrado_en", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  let fotoWebUrl: string | null = null;
  if (data.foto_web) {
    const { data: firmada } = await admin.storage
      .from("fotos")
      .createSignedUrl(data.foto_web, DURACION_URL_FIRMADA);
    fotoWebUrl = firmada?.signedUrl ?? null;
  }

  return {
    id: data.id,
    codigo: data.codigo,
    nombres: data.nombres,
    apellidos: data.apellidos,
    dia: data.dia,
    mes: data.mes,
    anio: data.anio,
    signo: data.signo ?? "",
    fotoWebUrl,
    familiaId: data.familia_id,
    parentesco: data.parentesco,
    fallecida: data.fallecida,
    impresa: data.impresa_en_edicion !== null,
    autorToken: data.autor_token,
  };
}

interface FilaRecuerdo {
  id: string;
  fecha: string;
  titulo: string;
  historia: string | null;
  lugar: string | null;
  creado_por: string | null;
  autor_nombre: string | null;
  autor_token: string | null;
  recuerdo_fotos: {
    ruta_web: string;
    ancho: number | null;
    alto: number | null;
  }[];
  participantes: {
    personas: { codigo: string; nombres: string; apellidos: string } | null;
  }[];
}

export async function obtenerRecuerdosDePersona(
  familiaId: string,
  personaId: string,
  codigoPersona: string
): Promise<Recuerdo[]> {
  const { data, error } = await admin
    .from("recuerdos")
    .select(
      `id, fecha, titulo, historia, lugar, creado_por, autor_nombre, autor_token,
       recuerdo_fotos ( ruta_web, ancho, alto, orden ),
       participantes:recuerdo_personas ( personas ( codigo, nombres, apellidos ) ),
       filtro:recuerdo_personas!inner ( persona_id )`
    )
    .eq("familia_id", familiaId)
    .eq("filtro.persona_id", personaId)
    .is("borrado_en", null)
    .order("fecha", { ascending: false })
    .order("orden", { referencedTable: "recuerdo_fotos", ascending: true });

  if (error) throw new Error(error.message);
  if (!data) return [];

  const filas = data as unknown as FilaRecuerdo[];

  // Los "agregado por [nombre]" de quien tiene cuenta salen de su perfil,
  // no de una columna propia: se resuelven todos de una vez.
  const idsUsuarios = [...new Set(filas.map((f) => f.creado_por).filter((id): id is string => !!id))];
  const nombresUsuarios = idsUsuarios.length > 0 ? await obtenerDatosDeUsuarios(idsUsuarios) : new Map();

  return Promise.all(
    filas.map(async (fila) => {
      const fotos = await Promise.all(
        fila.recuerdo_fotos.map(async (foto) => {
          const { data: firmada } = await admin.storage
            .from("fotos")
            .createSignedUrl(foto.ruta_web, DURACION_URL_FIRMADA);
          return {
            url: firmada?.signedUrl ?? "",
            ancho: foto.ancho,
            alto: foto.alto,
          };
        })
      );

      const otrasPersonas = fila.participantes
        .map((p) => p.personas)
        .filter(
          (p): p is PersonaEnRecuerdo => !!p && p.codigo !== codigoPersona
        )
        .sort((a, b) => a.nombres.localeCompare(b.nombres, "es"));

      const autorNombre =
        fila.autor_nombre ?? (fila.creado_por ? nombresUsuarios.get(fila.creado_por)?.nombre ?? null : null);

      return {
        id: fila.id,
        fecha: fila.fecha,
        titulo: fila.titulo,
        historia: fila.historia,
        lugar: fila.lugar,
        fotos: fotos.filter((f) => f.url),
        otrasPersonas,
        autorNombre,
        creadoPor: fila.creado_por,
        autorToken: fila.autor_token,
      };
    })
  );
}

// ---------------------------------------------------------------------
// Fotos: el navegador sube el archivo original a una ruta temporal con
// una URL de subida firmada (evita el límite de ~4.5 MB de Vercel).
// Desde aquí, siempre con la service role key y solo después de
// comprobar que quien lo pide es admin, sharp procesa esa foto: corrige
// la orientación EXIF, recorta si aplica, quita todos los metadatos
// (nunca se llama a withMetadata(), así que la ubicación GPS también
// se pierde) y guarda las versiones finales.
// ---------------------------------------------------------------------

async function descargarFoto(ruta: string): Promise<Buffer> {
  const { data, error } = await admin.storage.from("fotos").download(ruta);
  if (error) throw new Error(error.message);
  return Buffer.from(await data.arrayBuffer());
}

async function subirFotoProcesada(
  ruta: string,
  datos: Buffer,
  contentType: string
): Promise<void> {
  const { error } = await admin.storage
    .from("fotos")
    .upload(ruta, datos, { contentType, upsert: true });
  if (error) throw new Error(error.message);
}

async function borrarFotos(rutas: string[]): Promise<void> {
  if (rutas.length === 0) return;
  await admin.storage.from("fotos").remove(rutas);
}

export interface RectanguloCorte {
  x: number;
  y: number;
  tamano: number;
}

/**
 * Recorte cuadrado de una persona: guarda original.jpg a la resolución
 * del recorte (para imprimir) y web.webp de 800 px (para el álbum).
 */
export async function procesarFotoPersona(
  familiaId: string,
  personaId: string,
  rutaTemporal: string,
  corte: RectanguloCorte
): Promise<{ original: string; web: string }> {
  const crudo = await descargarFoto(rutaTemporal);

  const orientada = sharp(crudo).rotate(); // corrige la orientación EXIF

  const original = await orientada
    .extract({
      left: Math.round(corte.x),
      top: Math.round(corte.y),
      width: Math.round(corte.tamano),
      height: Math.round(corte.tamano),
    })
    .jpeg({ quality: 92 })
    .toBuffer();

  const web = await sharp(original).resize(800, 800).webp({ quality: 85 }).toBuffer();

  const rutaOriginal = `${familiaId}/personas/${personaId}/original.jpg`;
  const rutaWeb = `${familiaId}/personas/${personaId}/web.webp`;

  await subirFotoProcesada(rutaOriginal, original, "image/jpeg");
  await subirFotoProcesada(rutaWeb, web, "image/webp");
  await borrarFotos([rutaTemporal]);

  return { original: rutaOriginal, web: rutaWeb };
}

export async function borrarFotosDePersona(familiaId: string, personaId: string): Promise<void> {
  await borrarFotos([
    `${familiaId}/personas/${personaId}/original.jpg`,
    `${familiaId}/personas/${personaId}/web.webp`,
  ]);
}

/**
 * Foto de un recuerdo: sin recorte. Guarda original.jpg a resolución
 * completa (solo corrige orientación) y web.webp con el lado mayor a
 * 1600 px, sin agrandar fotos más pequeñas.
 */
export async function procesarFotoRecuerdo(
  familiaId: string,
  recuerdoId: string,
  fotoId: string,
  rutaTemporal: string,
  limiteBytes?: number
): Promise<{ original: string; web: string; ancho: number; alto: number }> {
  const crudo = await descargarFoto(rutaTemporal);
  if (limiteBytes && crudo.length > limiteBytes) {
    await borrarFotos([rutaTemporal]);
    throw new Error(`Esa foto pesa más de ${Math.round(limiteBytes / (1024 * 1024))} MB.`);
  }

  const original = await sharp(crudo).rotate().jpeg({ quality: 92 }).toBuffer();
  const web = await sharp(original)
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  const metaWeb = await sharp(web).metadata();

  const rutaOriginal = `${familiaId}/recuerdos/${recuerdoId}/${fotoId}-original.jpg`;
  const rutaWeb = `${familiaId}/recuerdos/${recuerdoId}/${fotoId}-web.webp`;

  await subirFotoProcesada(rutaOriginal, original, "image/jpeg");
  await subirFotoProcesada(rutaWeb, web, "image/webp");
  await borrarFotos([rutaTemporal]);

  return { original: rutaOriginal, web: rutaWeb, ancho: metaWeb.width ?? 0, alto: metaWeb.height ?? 0 };
}

export async function borrarFotosDeRecuerdo(rutas: string[]): Promise<void> {
  await borrarFotos(rutas);
}

// ---------------------------------------------------------------------
// Recuerdos desde el álbum (Fase 9b): a diferencia del panel, quien
// escribe puede no tener sesión — así que todo esto usa la service role
// key y cada función valida explícitamente lo que le toca (familia, en
// vez de RLS). Son funciones angostas a propósito: mejor varias
// pequeñas y explícitas que una que reciba el cliente de servicio suelto.
// ---------------------------------------------------------------------

export async function crearSubidaFotoRecuerdoAlbum(
  familiaId: string
): Promise<{ path: string; token: string }> {
  const ruta = `${familiaId}/recuerdos/tmp-${crypto.randomUUID()}`;
  const { data, error } = await admin.storage.from("fotos").createSignedUploadUrl(ruta);
  if (error) throw new Error(error.message);
  return { path: data.path, token: data.token };
}

/**
 * Filtra una lista de ids de persona a solo los que de verdad son de esa
 * familia, devolviendo también su código (para revalidar su ficha).
 */
export async function validarPersonasDeFamilia(
  familiaId: string,
  personaIds: string[]
): Promise<Map<string, string>> {
  if (personaIds.length === 0) return new Map();
  const { data, error } = await admin
    .from("personas")
    .select("id, codigo")
    .eq("familia_id", familiaId)
    .is("borrado_en", null)
    .in("id", personaIds);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((p) => [p.id, p.codigo]));
}

export async function crearRecuerdoAlbum(
  familiaId: string,
  datos: { fecha: string; titulo: string; historia: string | null; personaIds: string[] },
  autor: AutorAlbum
): Promise<string> {
  const { data, error } = await admin
    .from("recuerdos")
    .insert({
      familia_id: familiaId,
      fecha: datos.fecha,
      titulo: datos.titulo,
      historia: datos.historia,
      creado_por: autor.creadoPor,
      autor_nombre: autor.autorNombre,
      autor_token: autor.autorToken,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (datos.personaIds.length > 0) {
    const { error: errorTags } = await admin
      .from("recuerdo_personas")
      .insert(datos.personaIds.map((persona_id) => ({ recuerdo_id: data.id, persona_id })));
    if (errorTags) throw new Error(errorTags.message);
  }
  return data.id;
}

export interface RecuerdoParaEditarAlbum {
  id: string;
  familiaId: string;
  fecha: string;
  titulo: string;
  historia: string | null;
  creadoPor: string | null;
  autorToken: string | null;
  personaIds: string[];
  fotos: { id: string; url: string }[];
}

/** Trae lo necesario para editar: nadie puede editar sin ver esto primero, así que aquí no se filtra por permiso — eso lo decide quien llama. */
export async function obtenerRecuerdoParaEditarAlbum(
  recuerdoId: string
): Promise<RecuerdoParaEditarAlbum | null> {
  const { data, error } = await admin
    .from("recuerdos")
    .select(
      `id, familia_id, fecha, titulo, historia, creado_por, autor_token,
       recuerdo_personas ( persona_id ),
       recuerdo_fotos ( id, ruta_web, orden )`
    )
    .eq("id", recuerdoId)
    .is("borrado_en", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const fotosOrdenadas = [...data.recuerdo_fotos].sort((a, b) => a.orden - b.orden);
  const fotosConUrl = await Promise.all(
    fotosOrdenadas.map(async (f) => {
      const { data: firmada } = await admin.storage
        .from("fotos")
        .createSignedUrl(f.ruta_web, DURACION_URL_FIRMADA);
      return { id: f.id, url: firmada?.signedUrl ?? "" };
    })
  );

  return {
    id: data.id,
    familiaId: data.familia_id,
    fecha: data.fecha,
    titulo: data.titulo,
    historia: data.historia,
    creadoPor: data.creado_por,
    autorToken: data.autor_token,
    personaIds: data.recuerdo_personas.map((p) => p.persona_id),
    fotos: fotosConUrl.filter((f) => f.url),
  };
}

export async function actualizarRecuerdoAlbum(
  recuerdoId: string,
  datos: { fecha: string; titulo: string; historia: string | null; personaIds: string[] }
): Promise<void> {
  const { error } = await admin
    .from("recuerdos")
    .update({ fecha: datos.fecha, titulo: datos.titulo, historia: datos.historia })
    .eq("id", recuerdoId);
  if (error) throw new Error(error.message);

  const { data: actuales } = await admin
    .from("recuerdo_personas")
    .select("persona_id")
    .eq("recuerdo_id", recuerdoId);
  const idsActuales = new Set((actuales ?? []).map((r) => r.persona_id));
  const idsNuevos = new Set(datos.personaIds);

  const aAgregar = datos.personaIds.filter((id) => !idsActuales.has(id));
  if (aAgregar.length > 0) {
    await admin
      .from("recuerdo_personas")
      .insert(aAgregar.map((persona_id) => ({ recuerdo_id: recuerdoId, persona_id })));
  }
  const aQuitar = [...idsActuales].filter((id) => !idsNuevos.has(id));
  if (aQuitar.length > 0) {
    await admin.from("recuerdo_personas").delete().eq("recuerdo_id", recuerdoId).in("persona_id", aQuitar);
  }
}

export async function contarFotosRecuerdo(recuerdoId: string): Promise<number> {
  const { count, error } = await admin
    .from("recuerdo_fotos")
    .select("id", { count: "exact", head: true })
    .eq("recuerdo_id", recuerdoId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function guardarFotoRecuerdoAlbum(datos: {
  fotoId: string;
  recuerdoId: string;
  familiaId: string;
  original: string;
  web: string;
  ancho: number;
  alto: number;
  orden: number;
}): Promise<void> {
  const { error } = await admin.from("recuerdo_fotos").insert({
    id: datos.fotoId,
    recuerdo_id: datos.recuerdoId,
    familia_id: datos.familiaId,
    ruta_original: datos.original,
    ruta_web: datos.web,
    ancho: datos.ancho,
    alto: datos.alto,
    orden: datos.orden,
  });
  if (error) throw new Error(error.message);
}

export async function reordenarFotoRecuerdoAlbum(fotoId: string, orden: number): Promise<void> {
  const { error } = await admin.from("recuerdo_fotos").update({ orden }).eq("id", fotoId);
  if (error) throw new Error(error.message);
}

export async function borrarFotosRecuerdoAlbumPorId(fotoIds: string[]): Promise<void> {
  if (fotoIds.length === 0) return;
  const { data: aBorrar } = await admin
    .from("recuerdo_fotos")
    .select("id, ruta_original, ruta_web")
    .in("id", fotoIds);
  const { error } = await admin.from("recuerdo_fotos").delete().in("id", fotoIds);
  if (error) throw new Error(error.message);
  if (aBorrar) await borrarFotosDeRecuerdo(aBorrar.flatMap((f) => [f.ruta_original, f.ruta_web]));
}

// ---------------------------------------------------------------------
// Colaboradores: crear la cuenta es lo único de esta sección que usa la
// service role key (el navegador no puede crear usuarios), y siempre
// después de que la página ya comprobó que quien lo pide es admin.
// ---------------------------------------------------------------------

export async function crearUsuarioColaborador(
  correo: string,
  nombre: string
): Promise<{ userId: string; contrasenaTemporal: string }> {
  const contrasenaTemporal = randomBytes(9).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({
    email: correo,
    password: contrasenaTemporal,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (error) throw new Error(error.message);
  return { userId: data.user.id, contrasenaTemporal };
}

export interface DatosUsuario {
  correo: string;
  nombre: string | null;
}

/** Resuelve correo y nombre de una lista de user_id ya confirmados como miembros de la familia. */
export async function obtenerDatosDeUsuarios(
  userIds: string[]
): Promise<Map<string, DatosUsuario>> {
  const resultado = new Map<string, DatosUsuario>();
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data.user) {
        resultado.set(id, {
          correo: data.user.email ?? "",
          nombre: (data.user.user_metadata?.nombre as string | undefined) ?? null,
        });
      }
    })
  );
  return resultado;
}

// ---------------------------------------------------------------------
// Almacenamiento (Fase 9b): se calcula al vuelo listando Storage en vez
// de llevar un contador aparte — con el tamaño de familia de este
// producto (decenas o cientos de fotos, no miles) es rápido, y así nunca
// se puede desincronizar de lo que de verdad hay guardado.
// ---------------------------------------------------------------------

export const UMBRAL_STORAGE_AVISO_BYTES = 800 * 1024 * 1024; // 800 MB: deja margen antes del 1 GB del plan Free

async function tamanoDeCarpeta(prefijo: string): Promise<number> {
  const { data, error } = await admin.storage.from("fotos").list(prefijo, { limit: 1000 });
  if (error || !data) return 0;

  let total = 0;
  for (const item of data) {
    if (item.id) {
      total += item.metadata?.size ?? 0;
    } else {
      // Sin id ni metadata: es una subcarpeta (personas/{id}, recuerdos/{id}).
      total += await tamanoDeCarpeta(`${prefijo}/${item.name}`);
    }
  }
  return total;
}

export async function calcularStorageUsadoFamilia(familiaId: string): Promise<number> {
  const [personas, recuerdos] = await Promise.all([
    tamanoDeCarpeta(`${familiaId}/personas`),
    tamanoDeCarpeta(`${familiaId}/recuerdos`),
  ]);
  return personas + recuerdos;
}

// ---------------------------------------------------------------------
// Personas desde el álbum (Fase 9c): misma idea que los recuerdos del
// álbum — service role key con validación manual, porque un visitante no
// tiene sesión que RLS pueda usar.
// ---------------------------------------------------------------------

function normalizarNombre(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function sonParecidos(nombreA: string, nombreB: string): boolean {
  const a = normalizarNombre(nombreA);
  const b = normalizarNombre(nombreB);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export interface PersonaParecida {
  codigo: string;
  nombres: string;
  apellidos: string;
}

/** Mismo día y mes, y un nombre completo parecido (no exacto): para avisar antes de crear un duplicado. */
export async function buscarPersonasParecidas(
  familiaId: string,
  nombres: string,
  apellidos: string,
  dia: number,
  mes: number
): Promise<PersonaParecida[]> {
  const { data, error } = await admin
    .from("personas")
    .select("codigo, nombres, apellidos")
    .eq("familia_id", familiaId)
    .eq("dia", dia)
    .eq("mes", mes)
    .is("borrado_en", null);
  if (error) throw new Error(error.message);

  const nombreCompleto = `${nombres} ${apellidos}`;
  return (data ?? []).filter((p) => sonParecidos(`${p.nombres} ${p.apellidos}`, nombreCompleto));
}

export async function crearSubidaFotoPersonaAlbum(
  familiaId: string
): Promise<{ path: string; token: string }> {
  const ruta = `${familiaId}/personas/tmp-${crypto.randomUUID()}`;
  const { data, error } = await admin.storage.from("fotos").createSignedUploadUrl(ruta);
  if (error) throw new Error(error.message);
  return { path: data.path, token: data.token };
}

export async function crearPersonaAlbum(
  familiaId: string,
  datos: {
    nombres: string;
    apellidos: string;
    dia: number;
    mes: number;
    anio: number | null;
    parentesco: string | null;
  },
  autor: { autorNombre: string | null; autorToken: string | null }
): Promise<string> {
  const { data, error } = await admin
    .from("personas")
    .insert({
      familia_id: familiaId,
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      dia: datos.dia,
      mes: datos.mes,
      anio: datos.anio,
      parentesco: datos.parentesco,
      autor_nombre: autor.autorNombre,
      autor_token: autor.autorToken,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/**
 * `resetearImpresa` se pone en true cuando cambia el día o el mes de
 * alguien que ya había salido en algún calendario impreso: vuelve a
 * quedar sin imprimir (cambió de hoja física), y eso reaparece solo en
 * el aviso de "personas sin imprimir" que ya existe en el panel.
 */
export async function actualizarPersonaAlbum(
  personaId: string,
  datos: {
    nombres: string;
    apellidos: string;
    dia: number;
    mes: number;
    anio: number | null;
    parentesco: string | null;
  },
  resetearImpresa: boolean
): Promise<void> {
  const { error } = await admin
    .from("personas")
    .update({
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      dia: datos.dia,
      mes: datos.mes,
      anio: datos.anio,
      parentesco: datos.parentesco,
      ...(resetearImpresa ? { impresa_en_edicion: null } : {}),
    })
    .eq("id", personaId);
  if (error) throw new Error(error.message);
}

export async function guardarFotoPersonaAlbum(
  personaId: string,
  original: string,
  web: string
): Promise<void> {
  const { error } = await admin
    .from("personas")
    .update({ foto_original: original, foto_web: web })
    .eq("id", personaId);
  if (error) throw new Error(error.message);
}

/** Cuántas personas de la familia todavía no han salido en ningún calendario impreso. */
export async function contarPersonasSinImprimir(familiaId: string): Promise<number> {
  const { count, error } = await admin
    .from("personas")
    .select("id", { count: "exact", head: true })
    .eq("familia_id", familiaId)
    .is("impresa_en_edicion", null)
    .is("borrado_en", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Al registrar una edición nueva (Fase 7), todo lo que faltaba por imprimir queda marcado con su número. */
export async function marcarPersonasComoImpresas(familiaId: string, numeroEdicion: number): Promise<void> {
  const { error } = await admin
    .from("personas")
    .update({ impresa_en_edicion: numeroEdicion })
    .eq("familia_id", familiaId)
    .is("impresa_en_edicion", null)
    .is("borrado_en", null);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------
// Papelera (Fase 9d): listar lo borrado, borrar de verdad y restaurar
// pasa por el cliente de sesión del panel (RLS ya deja ver y actualizar
// cualquier fila de la familia a cualquier miembro — la página de
// Ajustes es la que decide mostrar esto solo al admin). Lo único que
// necesita la service role key es la purga: hay que borrar también las
// fotos en Storage, y eso es cosa del servidor, no de RLS.
// ---------------------------------------------------------------------

const DIAS_EN_PAPELERA = 30;

/** Se llama de paso cada vez que se abre la papelera, igual que limpiarIntentosViejos(). */
export async function purgarPapeleraVieja(familiaId: string): Promise<void> {
  const limite = new Date(Date.now() - DIAS_EN_PAPELERA * 24 * 60 * 60 * 1000).toISOString();

  const { data: personasViejas } = await admin
    .from("personas")
    .select("id")
    .eq("familia_id", familiaId)
    .lt("borrado_en", limite);
  for (const p of personasViejas ?? []) {
    await borrarFotosDePersona(familiaId, p.id);
  }
  if (personasViejas && personasViejas.length > 0) {
    await admin
      .from("personas")
      .delete()
      .in("id", personasViejas.map((p) => p.id));
  }

  const { data: recuerdosViejos } = await admin
    .from("recuerdos")
    .select("id")
    .eq("familia_id", familiaId)
    .lt("borrado_en", limite);
  for (const r of recuerdosViejos ?? []) {
    const { data: fotos } = await admin
      .from("recuerdo_fotos")
      .select("ruta_original, ruta_web")
      .eq("recuerdo_id", r.id);
    if (fotos && fotos.length > 0) {
      await borrarFotosDeRecuerdo(fotos.flatMap((f) => [f.ruta_original, f.ruta_web]));
    }
  }
  if (recuerdosViejos && recuerdosViejos.length > 0) {
    // recuerdo_fotos y recuerdo_personas se van solos por on delete cascade.
    await admin
      .from("recuerdos")
      .delete()
      .in("id", recuerdosViejos.map((r) => r.id));
  }

  // Solicitudes borradas (Fase 10d): sin fotos que limpiar, solo la fila.
  await admin.from("solicitudes").delete().eq("familia_id", familiaId).lt("borrado_en", limite);
}

// ---------------------------------------------------------------------
// Eliminar una familia: mismo borrado suave (30 días, restaurable) que
// personas/recuerdos/solicitudes, pero además tiene que llevarse toda su
// carpeta de Storage al purgarse — nadie más lo hace por ella.
// ---------------------------------------------------------------------

/** Borra una carpeta de Storage completa, bajando por sus subcarpetas. */
async function borrarCarpetaCompleta(prefijo: string): Promise<void> {
  const { data, error } = await admin.storage.from("fotos").list(prefijo, { limit: 1000 });
  if (error || !data || data.length === 0) return;

  const archivos: string[] = [];
  for (const item of data) {
    if (item.id) {
      archivos.push(`${prefijo}/${item.name}`);
    } else {
      // Sin id ni metadata: es una subcarpeta (personas/{id}, recuerdos/{id}).
      await borrarCarpetaCompleta(`${prefijo}/${item.name}`);
    }
  }
  if (archivos.length > 0) {
    await admin.storage.from("fotos").remove(archivos);
  }
}

/**
 * Se llama de paso al abrir /admin, para las familias eliminadas que
 * administra quien mira la página (igual que purgarPapeleraVieja). Borra
 * primero toda la carpeta de Storage de la familia — no solo lo que
 * queda referenciado en la base, por si algo quedó suelto — y después la
 * fila de `familias`; el resto (personas, recuerdos, recuerdo_fotos,
 * recuerdo_personas, ediciones, solicitudes, miembros, intentos_acceso)
 * se va solo por `on delete cascade`.
 */
export async function purgarFamiliasVencidas(familiaIds: string[]): Promise<void> {
  if (familiaIds.length === 0) return;
  const limite = new Date(Date.now() - DIAS_EN_PAPELERA * 24 * 60 * 60 * 1000).toISOString();

  const { data: vencidas } = await admin
    .from("familias")
    .select("id")
    .in("id", familiaIds)
    .not("borrado_en", "is", null)
    .lt("borrado_en", limite);

  for (const familia of vencidas ?? []) {
    await borrarCarpetaCompleta(familia.id);
    await admin.from("familias").delete().eq("id", familia.id);
  }
}

export interface ResumenBorradoFamilia {
  personas: number;
  recuerdos: number;
  fotos: number;
  solicitudes: number;
  ediciones: number;
}

/** Todo lo que existe hoy para esa familia, incluido lo que ya está en cada papelera: borrar la familia se lo lleva todo. */
export async function obtenerResumenBorradoFamilia(familiaId: string): Promise<ResumenBorradoFamilia> {
  const [personas, recuerdos, fotosPersonas, fotosRecuerdos, solicitudes, ediciones] = await Promise.all([
    admin.from("personas").select("id", { count: "exact", head: true }).eq("familia_id", familiaId),
    admin.from("recuerdos").select("id", { count: "exact", head: true }).eq("familia_id", familiaId),
    admin
      .from("personas")
      .select("id", { count: "exact", head: true })
      .eq("familia_id", familiaId)
      .not("foto_original", "is", null),
    admin.from("recuerdo_fotos").select("id", { count: "exact", head: true }).eq("familia_id", familiaId),
    admin.from("solicitudes").select("id", { count: "exact", head: true }).eq("familia_id", familiaId),
    admin.from("ediciones").select("id", { count: "exact", head: true }).eq("familia_id", familiaId),
  ]);

  return {
    personas: personas.count ?? 0,
    recuerdos: recuerdos.count ?? 0,
    fotos: (fotosPersonas.count ?? 0) + (fotosRecuerdos.count ?? 0),
    solicitudes: solicitudes.count ?? 0,
    ediciones: ediciones.count ?? 0,
  };
}

function nombreDeArchivo(texto: string): string {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "sin-nombre"
  );
}

/**
 * Arma el .zip que se ofrece antes de borrar una familia: familia.json con
 * todos sus datos en texto plano, y las fotos originales de personas y
 * recuerdos. Se arma en memoria (no en streaming a disco): con la escala
 * de este producto (decenas o cientos de fotos por familia) es simple y
 * suficiente; una familia enorme podría acercarse al límite de tiempo de
 * una función de Vercel, pero no es el caso típico.
 */
export async function construirExportacionFamilia(
  familiaId: string,
  nombreFamilia: string
): Promise<Buffer> {
  const archivo = archiver("zip", { zlib: { level: 9 } });
  const trozos: Buffer[] = [];
  archivo.on("data", (trozo: Buffer) => trozos.push(trozo));
  const listo = new Promise<Buffer>((resolve, reject) => {
    archivo.on("end", () => resolve(Buffer.concat(trozos)));
    archivo.on("error", reject);
  });

  const [{ data: personas }, { data: recuerdos }, { data: solicitudes }] = await Promise.all([
    admin
      .from("personas")
      .select("id, codigo, nombres, apellidos, dia, mes, anio, parentesco, fallecida, foto_original, autor_nombre, creada_en")
      .eq("familia_id", familiaId)
      .order("apellidos"),
    admin
      .from("recuerdos")
      .select("id, fecha, titulo, historia, lugar, autor_nombre, creado_en")
      .eq("familia_id", familiaId)
      .order("fecha"),
    admin
      .from("solicitudes")
      .select("tipo, mensaje, contacto, autor_nombre, estado, creada_en")
      .eq("familia_id", familiaId)
      .order("creada_en"),
  ]);

  const recuerdoIds = (recuerdos ?? []).map((r) => r.id);
  const [{ data: fotosRecuerdos }, { data: vinculos }] = await Promise.all([
    recuerdoIds.length > 0
      ? admin
          .from("recuerdo_fotos")
          .select("id, recuerdo_id, ruta_original, orden")
          .in("recuerdo_id", recuerdoIds)
          .order("orden")
      : Promise.resolve({ data: [] as { id: string; recuerdo_id: string; ruta_original: string; orden: number }[] }),
    recuerdoIds.length > 0
      ? admin.from("recuerdo_personas").select("recuerdo_id, persona_id").in("recuerdo_id", recuerdoIds)
      : Promise.resolve({ data: [] as { recuerdo_id: string; persona_id: string }[] }),
  ]);

  const nombrePorPersonaId = new Map((personas ?? []).map((p) => [p.id, `${p.nombres} ${p.apellidos}`.trim()]));

  const datos = {
    familia: { nombre: nombreFamilia, exportada_en: new Date().toISOString() },
    personas: (personas ?? []).map((p) => ({
      codigo: p.codigo,
      nombres: p.nombres,
      apellidos: p.apellidos,
      dia: p.dia,
      mes: p.mes,
      anio: p.anio,
      parentesco: p.parentesco,
      fallecida: p.fallecida,
      tiene_foto: !!p.foto_original,
      agregada_por: p.autor_nombre,
      creada_en: p.creada_en,
    })),
    recuerdos: (recuerdos ?? []).map((r) => ({
      fecha: r.fecha,
      titulo: r.titulo,
      historia: r.historia,
      lugar: r.lugar,
      con: (vinculos ?? [])
        .filter((v) => v.recuerdo_id === r.id)
        .map((v) => nombrePorPersonaId.get(v.persona_id))
        .filter((n): n is string => !!n),
      fotos: (fotosRecuerdos ?? []).filter((f) => f.recuerdo_id === r.id).length,
      agregado_por: r.autor_nombre,
      creado_en: r.creado_en,
    })),
    solicitudes: (solicitudes ?? []).map((s) => ({
      tipo: s.tipo,
      mensaje: s.mensaje,
      contacto: s.contacto,
      autor: s.autor_nombre,
      estado: s.estado,
      creada_en: s.creada_en,
    })),
  };

  archivo.append(JSON.stringify(datos, null, 2), { name: "familia.json" });
  archivo.append(
    "Exportación de Vuelta al Sol\n\n" +
      "familia.json tiene todos los datos en texto plano.\n" +
      "Las fotos originales están en la carpeta fotos/, organizadas por persona y por recuerdo.\n",
    { name: "LEEME.txt" }
  );

  for (const p of personas ?? []) {
    if (!p.foto_original) continue;
    const { data: bytes } = await admin.storage.from("fotos").download(p.foto_original);
    if (!bytes) continue;
    const nombre = `${nombreDeArchivo(p.apellidos)}-${nombreDeArchivo(p.nombres)}-${p.codigo}.jpg`;
    archivo.append(Buffer.from(await bytes.arrayBuffer()), { name: `fotos/personas/${nombre}` });
  }

  for (const r of recuerdos ?? []) {
    const fotos = (fotosRecuerdos ?? []).filter((f) => f.recuerdo_id === r.id);
    if (fotos.length === 0) continue;
    const carpeta = `${r.fecha}-${nombreDeArchivo(r.titulo)}`;
    for (const f of fotos) {
      const { data: bytes } = await admin.storage.from("fotos").download(f.ruta_original);
      if (!bytes) continue;
      archivo.append(Buffer.from(await bytes.arrayBuffer()), {
        name: `fotos/recuerdos/${carpeta}/${f.orden + 1}.jpg`,
      });
    }
  }

  archivo.finalize();
  return listo;
}
