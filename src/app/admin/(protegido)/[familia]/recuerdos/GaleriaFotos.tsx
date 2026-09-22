"use client";

import Image from "next/image";
import styles from "./FormularioRecuerdo.module.css";

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

export function GaleriaFotos({
  fotos,
  onCambio,
  puedeQuitarExistentes,
  onError,
}: {
  fotos: FotoItem[];
  onCambio: (fotos: FotoItem[]) => void;
  puedeQuitarExistentes: boolean;
  onError: (mensaje: string) => void;
}) {
  function agregarArchivos(lista: FileList | null) {
    if (!lista) return;
    const nuevas: FotoItem[] = [];
    for (const file of Array.from(lista)) {
      const nombre = file.name.toLowerCase();
      const esHeic =
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        nombre.endsWith(".heic") ||
        nombre.endsWith(".heif");
      if (esHeic) {
        onError(
          `"${file.name}" está en formato HEIC (típico de iPhone). Compártela o expórtala como JPG e inténtalo de nuevo.`
        );
        continue;
      }
      if (!TIPOS_VALIDOS.includes(file.type)) {
        onError(`"${file.name}" no es JPG, PNG ni WebP.`);
        continue;
      }
      nuevas.push({
        tipo: "nueva",
        datos: { clave: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) },
      });
    }
    if (nuevas.length > 0) onCambio([...fotos, ...nuevas]);
  }

  function mover(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= fotos.length) return;
    const copia = [...fotos];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    onCambio(copia);
  }

  function quitar(indice: number) {
    const item = fotos[indice];
    if (item.tipo === "nueva") URL.revokeObjectURL(item.datos.previewUrl);
    onCambio(fotos.filter((_, i) => i !== indice));
  }

  return (
    <div className={styles.galeria}>
      {fotos.length === 0 && <p className={styles.sinResultados}>Todavía no hay fotos.</p>}
      <ul className={styles.listaFotos}>
        {fotos.map((item, indice) => {
          const url = item.tipo === "existente" ? item.datos.url : item.datos.previewUrl;
          const key = item.tipo === "existente" ? item.datos.id : item.datos.clave;
          const puedeQuitar = item.tipo === "nueva" || puedeQuitarExistentes;
          return (
            <li key={key} className={styles.fotoItem}>
              <div className={styles.fotoMiniatura}>
                <Image src={url} alt="" fill style={{ objectFit: "cover" }} sizes="90px" />
                {indice === 0 && <span className={styles.etiquetaPortada}>Portada</span>}
              </div>
              <div className={styles.fotoAcciones}>
                <button type="button" onClick={() => mover(indice, -1)} disabled={indice === 0}>
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => mover(indice, 1)}
                  disabled={indice === fotos.length - 1}
                >
                  ↓
                </button>
                {puedeQuitar && (
                  <button type="button" onClick={() => quitar(indice)}>
                    Quitar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
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
    </div>
  );
}
