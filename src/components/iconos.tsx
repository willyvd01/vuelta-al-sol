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
