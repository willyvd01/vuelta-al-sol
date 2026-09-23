import { MESES } from "@/lib/meses";
import { ZODIACO_ICONOS, type SignoClave } from "@/lib/zodiaco";

const CENTRO = 380;
const ORO = "#B9A57E";

const ORDEN_ZODIACO: SignoClave[] = [
  "capricornio", "acuario", "piscis", "aries", "tauro", "geminis",
  "cancer", "leo", "virgo", "libra", "escorpio", "sagitario",
];

function punto(radio: number, anguloGrados: number, centro = CENTRO) {
  const rad = (anguloGrados * Math.PI) / 180;
  return { x: centro + radio * Math.cos(rad), y: centro + radio * Math.sin(rad) };
}

// Geometría exacta descrita en CLAUDE.md ("Vista de impresión" → portada):
// viewBox 0 0 760 760, centro 380,380, todo en trazo oro salvo el sol y el
// planeta (rellenos) y las abreviaturas de los meses (texto relleno).
export function RuedaSolar({ className }: { className?: string }) {
  const iconosZodiaco = ORDEN_ZODIACO.map((clave, i) => {
    const { x, y } = punto(312, -105 + 30 * i);
    return (
      <g
        key={clave}
        transform={`translate(${x - 22} ${y - 22}) scale(1.833)`}
        fill="none"
        stroke={ORO}
        strokeWidth={0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: ZODIACO_ICONOS[clave] }}
      />
    );
  });

  const marcas = Array.from({ length: 60 }, (_, i) => {
    const angulo = -105 + 6 * i;
    const esMayor = i % 5 === 0;
    const radioInterno = esMayor ? 250 : 258;
    const a = punto(radioInterno, angulo);
    const b = punto(266, angulo);
    return (
      <line
        key={i}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={ORO}
        strokeWidth={esMayor ? 1.1 : 0.6}
      />
    );
  });

  const meses = MESES.map((mes) => {
    const { x, y } = punto(226, -90 + 30 * (mes.numero - 1));
    return (
      <text
        key={mes.numero}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-jost)"
        fontSize={13}
        letterSpacing={2.5}
        fill={ORO}
      >
        {mes.abreviatura}
      </text>
    );
  });

  const planeta = punto(154, -38);

  const rayos = Array.from({ length: 24 }, (_, i) => {
    const angulo = -90 + 15 * i;
    const largo = i % 2 === 0;
    const a = punto(64, angulo);
    const b = punto(largo ? 100 : 84, angulo);
    return (
      <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={ORO} strokeWidth={1.5} />
    );
  });

  return (
    <svg viewBox="0 0 760 760" className={className} role="img" aria-label="Rueda solar con los meses y los signos del zodiaco">
      <circle cx={CENTRO} cy={CENTRO} r={366} fill="none" stroke={ORO} strokeWidth={1.1} />
      <circle cx={CENTRO} cy={CENTRO} r={356} fill="none" stroke={ORO} strokeWidth={0.6} />
      {iconosZodiaco}
      <circle cx={CENTRO} cy={CENTRO} r={266} fill="none" stroke={ORO} strokeWidth={0.9} />
      {marcas}
      {meses}
      <circle cx={CENTRO} cy={CENTRO} r={200} fill="none" stroke={ORO} strokeWidth={0.6} />
      <circle
        cx={CENTRO}
        cy={CENTRO}
        r={154}
        fill="none"
        stroke={ORO}
        strokeWidth={1.2}
        strokeDasharray="0.1 7"
        strokeLinecap="round"
      />
      <circle cx={planeta.x} cy={planeta.y} r={7} fill="#F3EEE4" />
      {rayos}
      <circle cx={CENTRO} cy={CENTRO} r={50} fill="#C9B28A" />
    </svg>
  );
}
