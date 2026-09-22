import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente para Server Components, Server Actions y Route Handlers: usa la
 * sesión del usuario que llega en las cookies, así que respeta la
 * seguridad por fila (RLS) — cada quien ve y edita solo lo suyo.
 *
 * Un Server Component no puede escribir cookies (solo leerlas); el catch
 * ignora ese caso porque el middleware ya se encarga de refrescar la
 * sesión en cada visita a /admin o /f.
 */
export async function crearClienteServidor() {
  const almacen = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return almacen.getAll();
      },
      setAll(cookiesParaGuardar) {
        try {
          for (const { name, value, options } of cookiesParaGuardar) {
            almacen.set(name, value, options);
          }
        } catch {
          // Server Component de solo lectura; el middleware refresca la sesión.
        }
      },
    },
  });
}
