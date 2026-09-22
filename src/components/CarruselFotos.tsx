"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./CarruselFotos.module.css";

export function CarruselFotos({
  fotos,
  alt,
}: {
  fotos: { url: string; ancho: number | null; alto: number | null }[];
  alt: string;
}) {
  const [abierta, setAbierta] = useState<number | null>(null);

  if (fotos.length === 0) return null;

  return (
    <>
      {fotos.length === 1 ? (
        <button
          type="button"
          className={styles.fotoUnica}
          onClick={() => setAbierta(0)}
          aria-label="Ver foto en grande"
        >
          <Image src={fotos[0].url} alt={alt} fill style={{ objectFit: "cover" }} />
        </button>
      ) : (
        <div className={styles.carrusel}>
          {fotos.map((foto, i) => (
            <button
              key={foto.url}
              type="button"
              className={styles.miniatura}
              onClick={() => setAbierta(i)}
              aria-label={`Ver foto ${i + 1} de ${fotos.length} en grande`}
            >
              <Image src={foto.url} alt={alt} fill style={{ objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}

      {abierta !== null && (
        <div
          className={styles.visor}
          role="dialog"
          aria-modal="true"
          onClick={() => setAbierta(null)}
        >
          <button
            type="button"
            className={styles.cerrar}
            onClick={() => setAbierta(null)}
            aria-label="Cerrar"
          >
            ✕
          </button>
          <div className={styles.visorImagen}>
            <Image
              src={fotos[abierta].url}
              alt={alt}
              fill
              style={{ objectFit: "contain" }}
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </>
  );
}
