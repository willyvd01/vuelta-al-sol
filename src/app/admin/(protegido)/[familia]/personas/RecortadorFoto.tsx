"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Cropper, { type Area } from "react-easy-crop";
import styles from "./RecortadorFoto.module.css";

const TAMANO_MINIMO = 1000;

export function RecortadorFoto({
  archivo,
  onCambio,
}: {
  archivo: File;
  onCambio: (
    corte: { x: number; y: number; tamano: number } | null,
    error: string | null
  ) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const url = useMemo(() => URL.createObjectURL(archivo), [archivo]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const onCropComplete = useCallback(
    (_areaPorcentaje: Area, areaPixeles: Area) => {
      const tamano = Math.round(areaPixeles.width);
      if (tamano < TAMANO_MINIMO) {
        onCambio(
          null,
          `Aleja un poco el zoom: la selección cubre ${tamano} × ${tamano} px de la foto original y se necesitan al menos ${TAMANO_MINIMO} × ${TAMANO_MINIMO} px.`
        );
      } else {
        onCambio(
          { x: Math.round(areaPixeles.x), y: Math.round(areaPixeles.y), tamano },
          null
        );
      }
    },
    [onCambio]
  );

  return (
    <div className={styles.contenedor}>
      <div className={styles.area}>
        <Cropper
          image={url}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="rect"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <input
        type="range"
        min={1}
        max={4}
        step={0.01}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        className={styles.zoom}
        aria-label="Acercar o alejar"
      />
    </div>
  );
}
