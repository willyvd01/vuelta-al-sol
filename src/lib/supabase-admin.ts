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
