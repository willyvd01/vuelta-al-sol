import Link from "next/link";

import { crearClienteServidor } from "@/lib/supabase-server";

/**
 * "Solicitudes (N)" con las nuevas de todas las familias del usuario (RLS ya
 * filtra). Si la consulta falla (p. ej. la migración 010 aún no se corrió),
 * muestra el enlace sin número en vez de romper la barra del panel.
 */
export async function EnlaceSolicitudes({ className }: { className?: string }) {
  const supabase = await crearClienteServidor();
  const { count, error } = await supabase
    .from("solicitudes")
    .select("id", { count: "exact", head: true })
    .eq("estado", "nueva")
    .is("borrado_en", null);

  const nuevas = error ? 0 : (count ?? 0);
  return (
    <Link href="/admin/solicitudes" className={className}>
      {nuevas > 0 ? `Solicitudes (${nuevas})` : "Solicitudes"}
    </Link>
  );
}
