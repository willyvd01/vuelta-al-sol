import styles from "./not-found.module.css";

export default function NoEncontrado() {
  return (
    <main className={styles.main}>
      <p className={styles.rotulo}>Vuelta al Sol</p>
      <h1 className={styles.titulo}>Página no encontrada</h1>
      <p className={styles.texto}>
        Revisa el enlace o el código QR que usaste para llegar aquí.
      </p>
    </main>
  );
}
