"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Fase 10b: envuelve next/image y muestra un brillo sutil (ver
 * .vs-esqueleto en animaciones.css) mientras la foto carga, en vez de que
 * aparezca de golpe. El contenedor ya tiene su tamaño fijo (aspect-ratio),
 * así que esto no mueve nada — solo cubre el espacio hasta que hay foto.
 */
export function FotoConEsqueleto({
  src,
  alt,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const [cargada, setCargada] = useState(false);

  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        style={{ objectFit: "cover" }}
        priority={priority}
        onLoad={() => setCargada(true)}
      />
      {!cargada && <span className="vs-esqueleto" aria-hidden="true" />}
    </>
  );
}
