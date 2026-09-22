import "server-only";
import { cookies, headers } from "next/headers";

import { obtenerFamiliaPorId } from "./supabase-admin";
import { crearClienteServidor } from "./supabase-server";
import { mesEnUrl } from "./meses";

const NOMBRE_COOKIE = "acceso";
const UN_ANIO_EN_SEGUNDOS = 60 * 60 * 24 * 365;

function secreto(): string {
  const valor = process.env.ACCESO_SECRETO;
  if (!valor) throw new Error("Falta ACCESO_SECRETO en .env.local");
  return valor;
}

async function claveHmac(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function aBase64Url(bytes: ArrayBuffer): string {
  let binario = "";
  for (const b of new Uint8Array(bytes)) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array {
  const relleno = "=".repeat((4 - (texto.length % 4)) % 4);
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/") + relleno;
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

interface CargaAcceso {
  f: string; // id de familia
  v: number; // codigo_version en el momento de firmar
}

async function firmar(payload: CargaAcceso): Promise<string> {
  const payloadB64 = aBase64Url(new TextEncoder().encode(JSON.stringify(payload)).buffer);
  const firma = await crypto.subtle.sign(
    "HMAC",
    await claveHmac(),
    new TextEncoder().encode(payloadB64)
  );
  return `${payloadB64}.${aBase64Url(firma)}`;
}

async function verificarFirma(valor: string): Promise<CargaAcceso | null> {
  const [payloadB64, firmaB64] = valor.split(".");
  if (!payloadB64 || !firmaB64) return null;

  const firmaEsperada = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      await claveHmac(),
      new TextEncoder().encode(payloadB64)
    )
  );
  const firmaRecibida = deBase64Url(firmaB64);
  if (firmaRecibida.length !== firmaEsperada.length) return null;

  let diferencia = 0;
  for (let i = 0; i < firmaEsperada.length; i++) {
    diferencia |= firmaRecibida[i] ^ firmaEsperada[i];
  }
  if (diferencia !== 0) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(deBase64Url(payloadB64)));
    if (typeof payload.f !== "string" || typeof payload.v !== "number") return null;
    return payload as CargaAcceso;
  } catch {
    return null;
  }
}

/** Firma y guarda la cookie de acceso para una familia, tras verificar su código. */
export async function establecerCookieAcceso(
  familiaId: string,
  codigoVersion: number,
  slug: string
): Promise<void> {
  const valor = await firmar({ f: familiaId, v: codigoVersion });
  const tienda = await cookies();
  tienda.set(NOMBRE_COOKIE, valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/f/${slug}`,
    maxAge: UN_ANIO_EN_SEGUNDOS,
  });
}

export interface Acceso {
  familiaId: string;
  slug: string;
  nombre: string;
  monograma: string | null;
}

/**
 * ¿El usuario tiene sesión de Supabase Auth y es miembro (admin o
 * colaborador) de esta familia? La propia consulta ya queda filtrada por
 * RLS: si no hay sesión o no es miembro, vuelve vacía — no hace falta
 * repetir esa lógica aquí.
 */
async function verificarAccesoPorSesion(slug: string): Promise<Acceso | null> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("familias")
    .select("id, nombre, slug, monograma")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return null;
  return {
    familiaId: data.id,
    slug: data.slug,
    nombre: data.nombre,
    monograma: data.monograma,
  };
}

/**
 * Confirma el acceso a `slug`, primero por sesión (admin o colaborador
 * con cuenta) y, si no, por el código con cookie firmada: firma correcta,
 * familia que de verdad existe, y codigo_version que todavía coincide (si
 * el código cambió, la cookie vieja deja de servir). El id de familia sale
 * de aquí, nunca del slug de la URL sin verificar.
 */
export async function verificarAcceso(slug: string): Promise<Acceso | null> {
  const porSesion = await verificarAccesoPorSesion(slug);
  if (porSesion) return porSesion;

  const tienda = await cookies();
  const valor = tienda.get(NOMBRE_COOKIE)?.value;
  if (!valor) return null;

  const carga = await verificarFirma(valor);
  if (!carga) return null;

  const familia = await obtenerFamiliaPorId(carga.f);
  if (!familia) return null;
  if (familia.slug !== slug) return null;
  if (familia.codigoVersion !== carga.v) return null;

  return {
    familiaId: familia.id,
    slug: familia.slug,
    nombre: familia.nombre,
    monograma: familia.monograma,
  };
}

/** Solo deja pasar rutas dentro de la misma familia; si no, un destino por defecto. */
export function siguienteValido(siguiente: string | null | undefined, slug: string): string {
  const base = `/f/${slug}/`;
  if (siguiente && siguiente.startsWith(base)) return siguiente;
  return `/f/${slug}/${mesEnUrl(new Date().getMonth() + 1)}`;
}

export async function obtenerIp(): Promise<string> {
  const h = await headers();
  const adelante = h.get("x-forwarded-for");
  if (adelante) return adelante.split(",")[0].trim();
  return h.get("x-real-ip") ?? "desconocida";
}

export async function hashIp(ip: string): Promise<string> {
  const datos = new TextEncoder().encode(`${secreto()}:${ip}`);
  const hash = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
