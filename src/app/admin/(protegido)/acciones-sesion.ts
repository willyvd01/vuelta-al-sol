"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase-server";

export async function cerrarSesionAction() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/admin/entrar");
}
