import { formatearDiaMes } from "./meses";

// Todo el cálculo se hace contra la fecha de hoy en America/Bogota, no en
// la zona horaria del servidor (en Vercel corre en UTC): si no, cerca de
// medianoche en Colombia el texto podría mostrar el día equivocado.
export function hoyEnBogota(): { anio: number; mes: number; dia: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const num = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return { anio: num("year"), mes: num("month"), dia: num("day") };
}

function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

export type EstadoEdad = "hoy" | "cumplio" | "cumple";

/**
 * Compara hoy (en Bogotá) contra el día y mes de la persona. El 29 de
 * febrero, en un año que no es bisiesto, se trata como si el cumpleaños
 * cayera el 28 — el texto que se muestra siempre dice "29 de febrero";
 * esto solo decide cuándo se considera que "ya pasó".
 */
export function calcularEdad(
  anioNacimiento: number,
  mes: number,
  dia: number
): { estado: EstadoEdad; edad: number } {
  const hoy = hoyEnBogota();
  const diaComparar = mes === 2 && dia === 29 && !esBisiesto(hoy.anio) ? 28 : dia;
  const edad = hoy.anio - anioNacimiento;

  if (hoy.mes === mes && hoy.dia === diaComparar) {
    return { estado: "hoy", edad };
  }
  if (hoy.mes > mes || (hoy.mes === mes && hoy.dia > diaComparar)) {
    return { estado: "cumplio", edad };
  }
  return { estado: "cumple", edad };
}

/** Mes de hoy y los días de nacimiento que cuentan como "hoy" (28 de feb. suma al 29 en año no bisiesto). */
export function fechasQueCuentanComoHoy(): { mes: number; dias: number[] } {
  const hoy = hoyEnBogota();
  const dias = hoy.mes === 2 && hoy.dia === 28 && !esBisiesto(hoy.anio) ? [28, 29] : [hoy.dia];
  return { mes: hoy.mes, dias };
}

/** Días de calendario (Bogotá) hasta el próximo cumpleaños; 0 si es hoy. */
export function diasParaCumple(mes: number, dia: number): number {
  const hoy = hoyEnBogota();
  const hoyUtc = Date.UTC(hoy.anio, hoy.mes - 1, hoy.dia);
  for (const anio of [hoy.anio, hoy.anio + 1]) {
    const diaEfectivo = mes === 2 && dia === 29 && !esBisiesto(anio) ? 28 : dia;
    const candidato = Date.UTC(anio, mes - 1, diaEfectivo);
    if (candidato >= hoyUtc) return Math.round((candidato - hoyUtc) / 86_400_000);
  }
  return 0;
}

/** "Faltan 12 días para su cumpleaños"; null si es hoy (ya lo dice "Hoy cumple…"). */
export function textoDiasParaCumple(mes: number, dia: number): string | null {
  const dias = diasParaCumple(mes, dia);
  if (dias === 0) return null;
  return dias === 1 ? "Falta 1 día para su cumpleaños" : `Faltan ${dias} días para su cumpleaños`;
}

/** "Cumple 34 años el 14 de enero" / "Cumplió…" / "Hoy cumple 34 años". */
export function textoEdad(anioNacimiento: number, mes: number, dia: number): string {
  const { estado, edad } = calcularEdad(anioNacimiento, mes, dia);
  if (estado === "hoy") return `Hoy cumple ${edad} años`;
  const diaMesTexto = formatearDiaMes(dia, mes);
  return estado === "cumplio" ? `Cumplió ${edad} años el ${diaMesTexto}` : `Cumple ${edad} años el ${diaMesTexto}`;
}
