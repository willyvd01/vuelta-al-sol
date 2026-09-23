import { NOMBRE_PRODUCTO } from "@/lib/producto";
import { ordinalFemenino } from "@/lib/numeros";
import { RuedaSolar } from "./RuedaSolar";
import styles from "./Portada.module.css";

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function Portada({
  nombreFamilia,
  monograma,
  numeroEdicion,
}: {
  nombreFamilia: string;
  monograma: string | null;
  numeroEdicion: number;
}) {
  return (
    <section className={styles.portada}>
      <p className={styles.nombreFamilia}>{nombreFamilia}</p>

      <RuedaSolar className={styles.rueda} />

      <div className={styles.bloqueTitulo}>
        <p className={styles.nuestra}>Nuestra</p>
        <h1 className={styles.tituloGrande}>{NOMBRE_PRODUCTO}</h1>
        <p className={styles.subtitulo}>Cumpleaños y recuerdos de la familia</p>
      </div>

      <div className={styles.pie}>
        {monograma && <span className={styles.monograma}>{monograma}</span>}
        <span className={styles.filete} />
        <span className={styles.edicion}>{capitalizar(ordinalFemenino(numeroEdicion))} edición</span>
      </div>
    </section>
  );
}
