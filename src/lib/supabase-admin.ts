import "server-only";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import type { Database } from "./database.types";

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

const DURACION_URL_FIRMADA = 60 * 10; // 10 minutos, solo dura lo que dura la visita

export async function obtenerPersonasDelMes(
  familiaId: string,
  mes: number
): Promise<Persona[]> {
  const { data, error } = await admin
    .from("personas")
    .select("codigo, nombres, apellidos, dia, mes, anio, signo, foto_web")
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
      "id, codigo, nombres, apellidos, dia, mes, anio, signo, foto_web, familia_id, parentesco, fallecida"
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
  };
}

interface FilaRecuerdo {
  id: string;
  fecha: string;
  titulo: string;
  historia: string | null;
  lugar: string | null;
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
      `id, fecha, titulo, historia, lugar,
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

      return {
        id: fila.id,
        fecha: fila.fecha,
        titulo: fila.titulo,
        historia: fila.historia,
        lugar: fila.lugar,
        fotos: fotos.filter((f) => f.url),
        otrasPersonas,
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
