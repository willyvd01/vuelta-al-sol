"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper, { type Area } from "react-easy-crop";
import styles from "./RecortadorFoto.module.css";

const TAMANO_MINIMO = 1000;
const MENSAJE_ERROR_CARGA =
  "No se pudo abrir esta foto. Si es de un iPhone, revisa que esté en formato JPG (no HEIC) e inténtalo de nuevo.";

type EstadoCarga = "cargando" | "listo" | "error";

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
  // El padre debe montar este componente con un key distinto por archivo
  // (ver FormularioPersona), así cada foto nueva arranca "cargando" de
  // verdad en vez de necesitar reiniciar el estado a mano en un efecto.
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [estado, setEstado] = useState<EstadoCarga>("cargando");
  const [url, setUrl] = useState<string | null>(null);

  // El URL del objeto se crea y se revoca dentro del mismo efecto a
  // propósito: en desarrollo, React monta cada efecto dos veces (Strict
  // Mode) para detectar código no idempotente. Antes, el URL se creaba
  // con useMemo (una sola vez) y se revocaba en un efecto aparte; la
  // primera pasada de Strict Mode revocaba ese URL compartido antes de
  // que la imagen llegara a cargar, y por eso el recorte se veía negro
  // con "0 × 0 px" — no porque las dimensiones tardaran en llegar. Con
  // el URL atado 1 a 1 a su propio efecto, cada montaje crea el suyo.
  useEffect(() => {
    const objectUrl = URL.createObjectURL(archivo);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- crear el URL es el efecto en sí: no hay nada que calcular en el render.
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [archivo]);

  // Se precarga la imagen a mano: solo así se sabe con certeza que el
  // navegador pudo decodificarla (si no, es probable que sea un HEIC que
  // se coló) y que sus dimensiones reales ya están disponibles antes de
  // dársela al recortador. Sin esto, react-easy-crop puede calcular un
  // primer recorte de 0 × 0 mientras la imagen todavía está cargando.
  useEffect(() => {
    if (!url) return;
    let cancelado = false;
    const img = new window.Image();

    img.onload = () => {
      if (!cancelado) setEstado("listo");
    };
    img.onerror = () => {
      if (!cancelado) setEstado("error");
    };
    img.src = url;

    return () => {
      cancelado = true;
    };
  }, [url]);

  useEffect(() => {
    if (estado === "error") onCambio(null, MENSAJE_ERROR_CARGA);
  }, [estado, onCambio]);

  const onCropComplete = useCallback(
    (_areaPorcentaje: Area, areaPixeles: Area) => {
      // Mientras las dimensiones reales no se conocen, react-easy-crop
      // puede reportar un área de 0 × 0: se ignora en vez de mostrarlo
      // como si la selección fuera insuficiente.
      if (areaPixeles.width === 0 || areaPixeles.height === 0) return;

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

  if (estado === "cargando" || !url) {
    return <p className={styles.cargando}>Cargando foto…</p>;
  }

  if (estado === "error") {
    return null;
  }

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
