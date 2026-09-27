import "server-only";
import { headers } from "next/headers";

/** Base absoluta del sitio: NEXT_PUBLIC_SITIO_URL si existe, si no el origen de la petición. */
export async function obtenerOrigenDelSitio(): Promise<string> {
  const configurado = process.env.NEXT_PUBLIC_SITIO_URL?.replace(/\/+$/, "");
  if (configurado) return configurado;

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}
