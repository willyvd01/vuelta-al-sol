import "server-only";
import QRCode from "qrcode";

/** SVG del código QR como marcado listo para insertar; no es contenido de usuarios. */
export async function generarQrSvg(texto: string, colorPrimario: string): Promise<string> {
  return QRCode.toString(texto, {
    type: "svg",
    margin: 0,
    color: { dark: colorPrimario, light: "#00000000" },
  });
}
