"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase-server";

export interface EstadoEntradaAdmin {
  error: string | null;
}

export async function iniciarSesionAction(
  _estadoPrevio: EstadoEntradaAdmin,
  formData: FormData
): Promise<EstadoEntradaAdmin> {
  const correo = String(formData.get("correo") ?? "").trim();
  const contrasena = String(formData.get("contrasena") ?? "");

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  });

  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect("/admin");
}
