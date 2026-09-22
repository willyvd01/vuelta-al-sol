// Meses del calendario y sus traducciones.
// En la cabecera de cada mes se muestran las traducciones en este orden,
// omitiendo las que son idénticas al nombre en español o ya aparecieron.

export const ORDEN_IDIOMAS = ['pt', 'fr', 'en', 'nl', 'it', 'zh', 'ja'] as const;
export type Idioma = (typeof ORDEN_IDIOMAS)[number];

export interface Mes {
  numero: number; // 1 a 12
  nombre: string; // "Enero"
  abreviatura: string; // "ENE" (tira de meses del pie)
  romano: string; // "I"
  traducciones: Record<Idioma, string>;
}

export const MESES: Mes[] = [
  { numero: 1, nombre: 'Enero', abreviatura: 'ENE', romano: 'I', traducciones: { pt: 'Janeiro', fr: 'Janvier', en: 'January', nl: 'Januari', it: 'Gennaio', zh: '一月', ja: '1月' } },
  { numero: 2, nombre: 'Febrero', abreviatura: 'FEB', romano: 'II', traducciones: { pt: 'Fevereiro', fr: 'Février', en: 'February', nl: 'Februari', it: 'Febbraio', zh: '二月', ja: '2月' } },
  { numero: 3, nombre: 'Marzo', abreviatura: 'MAR', romano: 'III', traducciones: { pt: 'Março', fr: 'Mars', en: 'March', nl: 'Maart', it: 'Marzo', zh: '三月', ja: '3月' } },
  { numero: 4, nombre: 'Abril', abreviatura: 'ABR', romano: 'IV', traducciones: { pt: 'Abril', fr: 'Avril', en: 'April', nl: 'April', it: 'Aprile', zh: '四月', ja: '4月' } },
  { numero: 5, nombre: 'Mayo', abreviatura: 'MAY', romano: 'V', traducciones: { pt: 'Maio', fr: 'Mai', en: 'May', nl: 'Mei', it: 'Maggio', zh: '五月', ja: '5月' } },
  { numero: 6, nombre: 'Junio', abreviatura: 'JUN', romano: 'VI', traducciones: { pt: 'Junho', fr: 'Juin', en: 'June', nl: 'Juni', it: 'Giugno', zh: '六月', ja: '6月' } },
  { numero: 7, nombre: 'Julio', abreviatura: 'JUL', romano: 'VII', traducciones: { pt: 'Julho', fr: 'Juillet', en: 'July', nl: 'Juli', it: 'Luglio', zh: '七月', ja: '7月' } },
  { numero: 8, nombre: 'Agosto', abreviatura: 'AGO', romano: 'VIII', traducciones: { pt: 'Agosto', fr: 'Août', en: 'August', nl: 'Augustus', it: 'Agosto', zh: '八月', ja: '8月' } },
  { numero: 9, nombre: 'Septiembre', abreviatura: 'SEP', romano: 'IX', traducciones: { pt: 'Setembro', fr: 'Septembre', en: 'September', nl: 'September', it: 'Settembre', zh: '九月', ja: '9月' } },
  { numero: 10, nombre: 'Octubre', abreviatura: 'OCT', romano: 'X', traducciones: { pt: 'Outubro', fr: 'Octobre', en: 'October', nl: 'Oktober', it: 'Ottobre', zh: '十月', ja: '10月' } },
  { numero: 11, nombre: 'Noviembre', abreviatura: 'NOV', romano: 'XI', traducciones: { pt: 'Novembro', fr: 'Novembre', en: 'November', nl: 'November', it: 'Novembre', zh: '十一月', ja: '11月' } },
  { numero: 12, nombre: 'Diciembre', abreviatura: 'DIC', romano: 'XII', traducciones: { pt: 'Dezembro', fr: 'Décembre', en: 'December', nl: 'December', it: 'Dicembre', zh: '十二月', ja: '12月' } },
];

export function obtenerMes(numero: number): Mes {
  const mes = MESES[numero - 1];
  if (!mes) throw new Error(`Mes inválido: ${numero}`);
  return mes;
}

/** Traducciones a mostrar en la cabecera, sin repetir ni duplicar el español. */
export function traduccionesVisibles(numero: number): string[] {
  const mes = obtenerMes(numero);
  const vistas = new Set([mes.nombre.toLowerCase()]);
  const resultado: string[] = [];
  for (const idioma of ORDEN_IDIOMAS) {
    const texto = mes.traducciones[idioma];
    const clave = texto.toLowerCase();
    if (!vistas.has(clave)) {
      vistas.add(clave);
      resultado.push(texto);
    }
  }
  return resultado;
}

/** Días del mes. Febrero cuenta 29: el calendario no depende del año. */
export function diasDelMes(numero: number): number {
  return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][numero - 1];
}

/** "01" … "12", el formato usado en las URL de los QR. */
export function mesEnUrl(numero: number): string {
  return String(numero).padStart(2, '0');
}

/** "14 de enero" */
export function formatearDiaMes(dia: number, mes: number): string {
  return `${dia} de ${obtenerMes(mes).nombre.toLowerCase()}`;
}

/**
 * "24 de enero de 2025". Recibe la fecha como texto "AAAA-MM-DD" (la que
 * entrega Postgres) y la parte a mano para no depender de Date/huso horario.
 */
export function formatearFechaLarga(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  return `${formatearDiaMes(dia, mes)} de ${anio}`;
}

/** Año como texto, de la misma fecha "AAAA-MM-DD", sin pasar por Date. */
export function anioDeFecha(fechaISO: string): number {
  return Number(fechaISO.split('-')[0]);
}
