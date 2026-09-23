const ORDINALES_FEMENINOS = [
  "", "primera", "segunda", "tercera", "cuarta", "quinta", "sexta", "séptima",
  "octava", "novena", "décima", "undécima", "duodécima", "decimotercera",
  "decimocuarta", "decimoquinta", "decimosexta", "decimoséptima",
  "decimoctava", "decimonovena", "vigésima",
];

/** "primera", "segunda"… hasta 20; de ahí en adelante, "edición 21". */
export function ordinalFemenino(n: number): string {
  return ORDINALES_FEMENINOS[n] ?? `edición ${n}`;
}
