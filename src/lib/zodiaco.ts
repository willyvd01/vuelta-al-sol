// Signos zodiacales: cálculo, rangos de fechas e íconos de línea.
// La función SQL public.signo_zodiacal() usa exactamente los mismos cortes.

import { diasDelMes, obtenerMes } from './meses';

export type SignoClave =
  | 'aries' | 'tauro' | 'geminis' | 'cancer' | 'leo' | 'virgo'
  | 'libra' | 'escorpio' | 'sagitario' | 'capricornio' | 'acuario' | 'piscis';

export interface Signo {
  clave: SignoClave;
  nombre: string;
  desde: { mes: number; dia: number };
  hasta: { mes: number; dia: number };
}

export const SIGNOS: Record<SignoClave, Signo> = {
  aries:       { clave: 'aries',       nombre: 'Aries',       desde: { mes: 3,  dia: 21 }, hasta: { mes: 4,  dia: 19 } },
  tauro:       { clave: 'tauro',       nombre: 'Tauro',       desde: { mes: 4,  dia: 20 }, hasta: { mes: 5,  dia: 20 } },
  geminis:     { clave: 'geminis',     nombre: 'Géminis',     desde: { mes: 5,  dia: 21 }, hasta: { mes: 6,  dia: 20 } },
  cancer:      { clave: 'cancer',      nombre: 'Cáncer',      desde: { mes: 6,  dia: 21 }, hasta: { mes: 7,  dia: 22 } },
  leo:         { clave: 'leo',         nombre: 'Leo',         desde: { mes: 7,  dia: 23 }, hasta: { mes: 8,  dia: 22 } },
  virgo:       { clave: 'virgo',       nombre: 'Virgo',       desde: { mes: 8,  dia: 23 }, hasta: { mes: 9,  dia: 22 } },
  libra:       { clave: 'libra',       nombre: 'Libra',       desde: { mes: 9,  dia: 23 }, hasta: { mes: 10, dia: 22 } },
  escorpio:    { clave: 'escorpio',    nombre: 'Escorpio',    desde: { mes: 10, dia: 23 }, hasta: { mes: 11, dia: 21 } },
  sagitario:   { clave: 'sagitario',   nombre: 'Sagitario',   desde: { mes: 11, dia: 22 }, hasta: { mes: 12, dia: 21 } },
  capricornio: { clave: 'capricornio', nombre: 'Capricornio', desde: { mes: 12, dia: 22 }, hasta: { mes: 1,  dia: 19 } },
  acuario:     { clave: 'acuario',     nombre: 'Acuario',     desde: { mes: 1,  dia: 20 }, hasta: { mes: 2,  dia: 18 } },
  piscis:      { clave: 'piscis',      nombre: 'Piscis',      desde: { mes: 2,  dia: 19 }, hasta: { mes: 3,  dia: 20 } },
};

export function signoZodiacal(mes: number, dia: number): SignoClave {
  const md = mes * 100 + dia;
  if (md >= 321 && md <= 419) return 'aries';
  if (md >= 420 && md <= 520) return 'tauro';
  if (md >= 521 && md <= 620) return 'geminis';
  if (md >= 621 && md <= 722) return 'cancer';
  if (md >= 723 && md <= 822) return 'leo';
  if (md >= 823 && md <= 922) return 'virgo';
  if (md >= 923 && md <= 1022) return 'libra';
  if (md >= 1023 && md <= 1121) return 'escorpio';
  if (md >= 1122 && md <= 1221) return 'sagitario';
  if (md >= 1222 || md <= 119) return 'capricornio';
  if (md >= 120 && md <= 218) return 'acuario';
  return 'piscis'; // 19 feb – 20 mar
}

/** Los signos que tocan un mes, en orden. Enero → [Capricornio, Acuario]. */
export function signosDelMes(numero: number): Signo[] {
  const primero = signoZodiacal(numero, 1);
  const ultimo = signoZodiacal(numero, diasDelMes(numero));
  return primero === ultimo ? [SIGNOS[primero]] : [SIGNOS[primero], SIGNOS[ultimo]];
}

/** "22 dic — 19 ene" */
export function rangoSigno(signo: Signo): string {
  const f = (x: { mes: number; dia: number }) =>
    `${x.dia} ${obtenerMes(x.mes).abreviatura.toLowerCase()}`;
  return `${f(signo.desde)} — ${f(signo.hasta)}`;
}

/**
 * Íconos de línea (viewBox 0 0 24 24). Dibujar con:
 *   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={1.2}
 *        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
 *        dangerouslySetInnerHTML={{ __html: ZODIACO_ICONOS[clave] }} />
 * Son constantes propias, no contenido de usuarios: es seguro insertarlas así.
 */
export const ZODIACO_ICONOS: Record<SignoClave, string> = {
  aries: '<path d="M12 21V10"/><path d="M12 10C12 5.5 9.5 3.5 7 4.2C4.8 4.8 4.4 7.8 6.4 9.2"/><path d="M12 10C12 5.5 14.5 3.5 17 4.2C19.2 4.8 19.6 7.8 17.6 9.2"/>',
  tauro: '<circle cx="12" cy="15" r="5"/><path d="M4.5 4C5.5 8 8.5 10 12 10C15.5 10 18.5 8 19.5 4"/>',
  geminis: '<path d="M5 4C9 5.8 15 5.8 19 4"/><path d="M5 20C9 18.2 15 18.2 19 20"/><path d="M9 5.3V18.7"/><path d="M15 5.3V18.7"/>',
  cancer: '<circle cx="7" cy="9" r="2.6"/><path d="M4.4 9C4.4 5 10.5 3.6 19.5 6.5"/><circle cx="17" cy="15" r="2.6"/><path d="M19.6 15C19.6 19 13.5 20.4 4.5 17.5"/>',
  leo: '<circle cx="7.5" cy="15" r="3"/><path d="M10.5 15C10.5 11 7.5 9 8.5 5.8C9.5 2.8 15.5 2.8 16.2 6.5C16.9 10.5 13.2 13 13.2 17C13.2 20 16.5 21 18.5 18.8"/>',
  virgo: '<path d="M4 6C5 6 6 7 6 8.5V19"/><path d="M6 9C6 6 10 6 10 9V19"/><path d="M10 9C10 6 14 6 14 9V19"/><path d="M14 13C17 11 20.5 12.5 19 16C17.8 18.8 15 19.5 12.5 21"/>',
  libra: '<path d="M4 19H20"/><path d="M4 15H8.3C6.4 13.4 6 10 8.2 7.8C10.3 5.7 13.7 5.7 15.8 7.8C18 10 17.6 13.4 15.7 15H20"/>',
  escorpio: '<path d="M4 6C5 6 6 7 6 8.5V18"/><path d="M6 9C6 6 10 6 10 9V18"/><path d="M10 9C10 6 14 6 14 9V17C14 19 15.5 20 19 19.5"/><path d="M16.8 17.3L19 19.5L16.8 21.7"/>',
  sagitario: '<path d="M5 19L19 5"/><path d="M12 5H19V12"/><path d="M7.5 11.5L12.5 16.5"/>',
  capricornio: '<path d="M4 5.5L8 17L12 5.5V15C12 18.8 15.5 20.2 17.8 18.4C19.8 16.8 18.6 13.6 16.2 14C13.8 14.4 13.6 18.6 10.8 21"/>',
  acuario: '<path d="M3 10L6.5 7L10 10L13.5 7L17 10L20.5 7"/><path d="M3 17L6.5 14L10 17L13.5 14L17 17L20.5 14"/>',
  piscis: '<path d="M6.5 4C10.5 8 10.5 16 6.5 20"/><path d="M17.5 4C13.5 8 13.5 16 17.5 20"/><path d="M7.8 12H16.2"/>',
};
