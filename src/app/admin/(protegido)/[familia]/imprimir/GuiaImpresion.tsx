import styles from "./GuiaImpresion.module.css";

export function GuiaImpresion() {
  return (
    <div className={styles.guia}>
      <p className={styles.titulo}>Guía de impresión</p>
      <p className={styles.bloque}>
        <strong>En Chrome, al guardar como PDF:</strong> Destino → Guardar como PDF · Márgenes →
        Ninguno · Gráficos de fondo → activado (si no, los colores de fondo y los filetes no
        salen).
      </p>
      <p className={styles.bloque}>
        <strong>Para la imprenta:</strong> A3, 297 × 420 mm. Papel opalina o algodón mate de 250 a
        300 g. Anillado metálico en la parte superior, con la perforación dentro de la franja
        blanca de 17 mm (no perforar sobre el contenido impreso).
      </p>
    </div>
  );
}
