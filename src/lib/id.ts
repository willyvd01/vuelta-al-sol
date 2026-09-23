/**
 * Identificador único para usar como key de React o nombre temporal de
 * archivo, sin depender de crypto.randomUUID(): esa función del
 * navegador solo existe en contextos seguros (HTTPS o localhost), y esta
 * app se prueba seguido por la IP de la red local sobre HTTP simple,
 * donde no está disponible. No necesita ser criptográficamente segura,
 * solo distinta cada vez.
 */
export function generarId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
