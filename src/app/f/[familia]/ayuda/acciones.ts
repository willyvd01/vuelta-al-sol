"use server";

import { verificarAcceso, obtenerIp, hashIp } from "@/lib/acceso";
import { obtenerMes } from "@/lib/meses";
import {
  TIPOS_SOLICITUD,
  crearSolicitud,
  obtenerSinImprimirPorMes,
  registrarEnvioSolicitud,
  verificarLimiteSolicitudes,
  type TipoSolicitud,
} from "@/lib/supabase-admin";

export interface EstadoSolicitud {
  error: string | null;
  enviada: boolean;
}

function textoSinImprimir(total: number, meses: number[]): string {
  if (total === 0) return "— Sin imprimir: ninguna persona pendiente.";
  const personas = total === 1 ? "1 persona" : `${total} personas`;
  const enMeses = meses.map((m) => obtenerMes(m).nombre.toLowerCase()).join(", ");
  return `— Sin imprimir: ${personas} (${enMeses})`;
}

export async function enviarSolicitudAction(
  slug: string,
  _estadoPrevio: EstadoSolicitud,
  formData: FormData
): Promise<EstadoSolicitud> {
  // El id de la familia sale SOLO de la cookie verificada, nunca del formulario.
  const acceso = await verificarAcceso(slug);
  if (!acceso) return { error: "No tienes acceso a este álbum.", enviada: false };

  const tipo = String(formData.get("tipo") ?? "") as TipoSolicitud;
  const autorNombre = String(formData.get("autorNombre") ?? "").trim();
  const contacto = String(formData.get("contacto") ?? "").trim();
  let mensaje = String(formData.get("mensaje") ?? "").trim();

  if (!TIPOS_SOLICITUD.includes(tipo)) return { error: "Elige el tipo de solicitud.", enviada: false };
  if (!autorNombre) return { error: "Escribe tu nombre.", enviada: false };
  if (!contacto) return { error: "Déjanos un WhatsApp o un correo para responderte.", enviada: false };
  if (!mensaje && tipo !== "imprimir_de_nuevo") return { error: "Cuéntanos qué necesitas.", enviada: false };
  if (autorNombre.length > 100 || contacto.length > 200 || mensaje.length > 2000) {
    return { error: "Alguno de los textos es demasiado largo.", enviada: false };
  }

  const limite = await verificarLimiteSolicitudes(acceso.familiaId);
  if (!limite.permitido) return { error: limite.mensaje, enviada: false };

  if (tipo === "imprimir_de_nuevo") {
    const { total, meses } = await obtenerSinImprimirPorMes(acceso.familiaId);
    const base = mensaje || "Quiero que se imprima de nuevo el calendario.";
    mensaje = `${base}\n\n${textoSinImprimir(total, meses)}`;
  }

  await crearSolicitud(acceso.familiaId, { tipo, mensaje, contacto, autorNombre });
  await registrarEnvioSolicitud(await hashIp(await obtenerIp()), acceso.familiaId);

  return { error: null, enviada: true };
}
