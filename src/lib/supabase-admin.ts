import "server-only";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
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

export async function obtenerPersonaPorCodigo(
  codigo: string
): Promise<PersonaFicha | null> {
  const { data, error } = await admin
    .from("personas")
    .select(
      "id, codigo, nombres, apellidos, dia, mes, anio, signo, foto_web, familia_id, parentesco, fallecida, impresa_en_edicion"
    )
    .eq("codigo", codigo)
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
    .eq("mes", mes);
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
    .is("impresa_en_edicion", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Al registrar una edición nueva (Fase 7), todo lo que faltaba por imprimir queda marcado con su número. */
export async function marcarPersonasComoImpresas(familiaId: string, numeroEdicion: number): Promise<void> {
  const { error } = await admin
    .from("personas")
    .update({ impresa_en_edicion: numeroEdicion })
    .eq("familia_id", familiaId)
    .is("impresa_en_edicion", null);
  if (error) throw new Error(error.message);
}
