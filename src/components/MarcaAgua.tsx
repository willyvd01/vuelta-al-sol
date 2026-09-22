// Monograma de la familia repetido en filas alternadas, detrás del contenido.
// Mismo recurso que en la impresión (ver CLAUDE.md), aquí a menor escala y muy sutil.

export function MarcaAgua({ monograma }: { monograma: string }) {
  const ancho = 170;
  const alto = 120;

  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        opacity: 0.55,
      }}
    >
      <defs>
        <pattern
          id="marca-agua-mes"
          width={ancho}
          height={alto}
          patternUnits="userSpaceOnUse"
        >
          <text
            x={ancho * 0.25}
            y={alto * 0.35}
            textAnchor="middle"
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: "15px",
              fill: "var(--marca-agua)",
            }}
          >
            {monograma}
          </text>
          <text
            x={ancho * 0.75}
            y={alto * 0.82}
            textAnchor="middle"
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: "15px",
              fill: "var(--marca-agua)",
            }}
          >
            {monograma}
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#marca-agua-mes)" />
    </svg>
  );
}
