import "server-only";
import { createClient } from "@supabase/supabase-js";
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
