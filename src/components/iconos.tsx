// Íconos de línea propios (viewBox 0 0 24 24, trazo 1.2), mismo estilo que ZODIACO_ICONOS.
// No son contenido de usuarios: es seguro insertarlos con dangerouslySetInnerHTML.

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconoFlecha({
  direccion,
  className,
}: {
  direccion: "izquierda" | "derecha";
  className?: string;
}) {
  const d = direccion === "izquierda" ? "M15 5L8 12L15 19" : "M9 5L16 12L9 19";
  return (
    <svg {...base} className={className}>
      <path d={d} />
    </svg>
  );
}

export function IconoPersona({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20C5 15.5 8 13 12 13C16 13 19 15.5 19 20" />
    </svg>
  );
}

// Versión pequeña del sol de la portada A: un círculo con rayos cortos.
export function IconoSol({ className }: { className?: string }) {
  const rayos = Array.from({ length: 8 }, (_, i) => {
    const angulo = (i * Math.PI * 2) / 8;
    const x1 = 12 + Math.cos(angulo) * 8.5;
    const y1 = 12 + Math.sin(angulo) * 8.5;
    const x2 = 12 + Math.cos(angulo) * 11;
    const y2 = 12 + Math.sin(angulo) * 11;
    return (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
    );
  });
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="5.5" />
      {rayos}
    </svg>
  );
}
