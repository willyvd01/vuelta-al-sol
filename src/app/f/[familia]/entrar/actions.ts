"use server";

import { redirect } from "next/navigation";

import {
  verificarCodigoFamilia,
  obtenerFamiliaPorSlug,
  registrarIntentoAcceso,
  contarFallosPorIp,
  verificarLimiteIntentos,
} from "@/lib/supabase-admin";
import { establecerCookieAcceso, siguienteValido, obtenerIp, hashIp } from "@/lib/acceso";

export interface EstadoEntrada {
  error: string | null;
}

const MAX_INTENTOS_IP = 5;

export async function verificarCodigoAction(
  familiaSlug: string,
  _estadoPrevio: EstadoEntrada,
  formData: FormData
): Promise<EstadoEntrada> {
  const codigo = String(formData.get("codigo") ?? "");
  const siguiente = siguienteValido(String(formData.get("siguiente") ?? ""), familiaSlug);

  const ip = await obtenerIp();
  const ipHash = await hashIp(ip);

  // Se busca la familia igual para ambos casos (exista o no): la respuesta
  // nunca debe delatar si el slug es real.
  const familia = await obtenerFamiliaPorSlug(familiaSlug);

  const limite = await verificarLimiteIntentos(ipHash, familia?.id ?? null);
  if (!limite.permitido) {
    return { error: limite.mensaje };
  }

  const resultado = await verificarCodigoFamilia(familiaSlug, codigo);

  if (resultado) {
    await registrarIntentoAcceso(ipHash, familia?.id ?? null, true);
    await establecerCookieAcceso(resultado.id, resultado.codigoVersion, familiaSlug);
    redirect(siguiente);
  }

  await registrarIntentoAcceso(ipHash, familia?.id ?? null, false);

  const hace15min = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const fallos = await contarFallosPorIp(ipHash, hace15min);
  const restantes = Math.max(0, MAX_INTENTOS_IP - fallos);

  if (restantes === 0) {
    return { error: "Demasiados intentos. Vuelve a intentarlo en 15 minutos." };
  }
  return {
    error: `Código incorrecto. Te quedan ${restantes} intento${restantes === 1 ? "" : "s"}.`,
  };
}
