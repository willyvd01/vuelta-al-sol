"use client";

import Image from "next/image";
import { generarId } from "@/lib/id";
import styles from "./FormularioRecuerdoAlbum.module.css";

export interface FotoExistente {
  id: string;
  url: string;
}

export interface FotoNueva {
  clave: string;
  file: File;
  previewUrl: string;
}

export type FotoItem =
  | { tipo: "existente"; datos: FotoExistente }
  | { tipo: "nueva"; datos: FotoNueva };

const TIPOS_VALIDOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_FOTOS = 10;
const MAX_BYTES = 15 * 1024 * 1024;

export function GaleriaFotosAlbum({
  fotos,
  onCambio,
  onError,
}: {
  fotos: FotoItem[];
  onCambio: (fotos: FotoItem[]) => void;
  onError: (mensaje: string) => void;
}) {
  function agregarArchivos(lista: FileList | null) {
    if (!lista) return;
    try {
      const nuevas: FotoItem[] = [];
      for (const file of Array.from(lista)) {
        if (fotos.length + nuevas.length >= MAX_FOTOS) {
          onError(`Máximo ${MAX_FOTOS} fotos por recuerdo.`);
          break;
        }
        const nombre = file.name.toLowerCase();
        const esHeic =
          file.type === "image/heic" ||
          file.type === "image/heif" ||
          nombre.endsWith(".heic") ||
          nombre.endsWith(".heif");
        if (esHeic) {
          onError(`"${file.name}" está en formato HEIC (típico de iPhone). Compártela como JPG e inténtalo de nuevo.`);
          continue;
        }
        if (!TIPOS_VALIDOS.includes(file.type)) {
          onError(`"${file.name}" no es JPG, PNG ni WebP.`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          onError(`"${file.name}" pesa más de 15 MB.`);
          continue;
        }
        nuevas.push({
          tipo: "nueva",
          datos: { clave: generarId(), file, previewUrl: URL.createObjectURL(file) },
        });
      }
      if (nuevas.length > 0) onCambio([...fotos, ...nuevas]);
    } catch (e) {
      onError(
        e instanceof Error ? `No se pudieron agregar las fotos: ${e.message}` : "No se pudieron agregar las fotos."
      );
    }
  }

  function quitar(indice: number) {
    const item = fotos[indice];
    if (item.tipo === "nueva") URL.revokeObjectURL(item.datos.previewUrl);
    onCambio(fotos.filter((_, i) => i !== indice));
  }

  return (
    <div className={styles.galeria}>
      {fotos.length === 0 && <p className={styles.sinFotos}>Todavía no hay fotos.</p>}
      <ul className={styles.listaFotos}>
        {fotos.map((item, indice) => {
          const url = item.tipo === "existente" ? item.datos.url : item.datos.previewUrl;
          const key = item.tipo === "existente" ? item.datos.id : item.datos.clave;
          return (
            <li key={key} className={styles.fotoItem}>
              <div className={styles.fotoMiniatura}>
                <Image src={url} alt="" fill style={{ objectFit: "cover" }} sizes="90px" />
                {indice === 0 && <span className={styles.etiquetaPortada}>Portada</span>}
              </div>
              <button type="button" onClick={() => quitar(indice)} className={styles.botonQuitar}>
                Quitar
              </button>
            </li>
          );
        })}
      </ul>
      {fotos.length < MAX_FOTOS && (
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,.heic,.heif"
          multiple
          onChange={(e) => {
            agregarArchivos(e.target.files);
            e.target.value = "";
          }}
          className={styles.campoArchivo}
        />
      )}
    </div>
  );
}
