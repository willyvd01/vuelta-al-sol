import "server-only";
import { crearClienteServidor } from "./supabase-server";
import { obtenerIdentidad, obtenerOCrearIdentidad } from "./acceso";

export interface AutorAlbum {
  creadoPor: string | null;
  autorNombre: string | null;
  autorToken: string | null;
}

/** ¿Hay una sesión de Supabase Auth, y esa cuenta es miembro de esta familia? */
export async function obtenerMiembroSesion(familiaId: string): Promise<{ userId: string } | null> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: miembro } = await supabase
    .from("miembros")
    .select("user_id")
    .eq("familia_id", familiaId)
    .eq("user_id", user.id)
    .maybeSingle();
  return miembro ? { userId: user.id } : null;
}

/**
 * Quién es quien está viendo la página ahora mismo, sin crear nada nuevo
 * (no se puede escribir una cookie fuera de una acción de servidor): un
 * miembro con sesión, o la identidad de visitante si ya existe.
 */
export async function identificarVisitante(familiaId: string): Promise<AutorAlbum | null> {
  const miembro = await obtenerMiembroSesion(familiaId);
  if (miembro) return { creadoPor: miembro.userId, autorNombre: null, autorToken: null };

  const identidad = await obtenerIdentidad();
  if (identidad) return { creadoPor: null, autorNombre: identidad.nombre, autorToken: identidad.token };

  return null;
}

/**
 * Quién escribe algo nuevo: si hay sesión de un miembro de esta familia,
 * es esa persona. Si no, es un visitante con el código — su identidad
 * sale de la cookie firmada, creándola si es la primera vez que aporta
 * algo (necesita el nombre que acaba de escribir en el formulario).
 */
export async function resolverAutorEscritura(
  slug: string,
  familiaId: string,
  nombreFormulario: string
): Promise<AutorAlbum | { error: string }> {
  const miembro = await obtenerMiembroSesion(familiaId);
  if (miembro) return { creadoPor: miembro.userId, autorNombre: null, autorToken: null };

  const identidadExistente = await obtenerIdentidad();
  if (identidadExistente) {
    return { creadoPor: null, autorNombre: identidadExistente.nombre, autorToken: identidadExistente.token };
  }

  const nombre = nombreFormulario.trim();
  if (!nombre) return { error: "Escribe tu nombre antes de guardar." };

  const identidad = await obtenerOCrearIdentidad(slug, nombre);
  return { creadoPor: null, autorNombre: identidad.nombre, autorToken: identidad.token };
}

/** Un miembro con sesión edita cualquier cosa; un visitante, solo lo que lleva su mismo autor_token. */
export function puedeEditar(
  autor: AutorAlbum | null,
  existente: { creadoPor: string | null; autorToken: string | null }
): boolean {
  if (!autor) return false;
  if (autor.creadoPor) return true;
  if (existente.creadoPor) return false;
  return !!autor.autorToken && autor.autorToken === existente.autorToken;
}
