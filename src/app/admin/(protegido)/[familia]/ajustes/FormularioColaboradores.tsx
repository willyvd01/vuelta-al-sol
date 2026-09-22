"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { crearColaboradorAction, quitarMiembroAction, type EstadoColaborador } from "./actions";
import styles from "./page.module.css";

export interface MiembroLista {
  userId: string;
  rol: string;
  correo: string;
  nombre: string | null;
  esUsuarioActual: boolean;
}

const estadoInicial: EstadoColaborador = { error: null, exito: null };

export function FormularioColaboradores({
  slug,
  miembros,
}: {
  slug: string;
  miembros: MiembroLista[];
}) {
  return (
    <div className={styles.listaMiembros}>
      <ul className={styles.listaMiembrosItems}>
        {miembros.map((m) => (
          <FilaMiembro key={m.userId} slug={slug} miembro={m} />
        ))}
      </ul>
      <FormularioNuevoColaborador slug={slug} />
    </div>
  );
}

function FilaMiembro({ slug, miembro }: { slug: string; miembro: MiembroLista }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function quitar() {
    setEnCurso(true);
    const resultado = await quitarMiembroAction(slug, miembro.userId);
    if (resultado.error) {
      setError(resultado.error);
      setEnCurso(false);
      return;
    }
    router.refresh();
  }

  return (
    <li className={styles.filaMiembro}>
      <div>
        <p className={styles.nombreMiembro}>
          {miembro.nombre ?? miembro.correo}
          {miembro.esUsuarioActual && " (tú)"}
        </p>
        <p className={styles.metaMiembro}>
          {miembro.correo} ·{" "}
          <span className={styles.rol}>{miembro.rol === "admin" ? "Admin" : "Colaborador"}</span>
        </p>
      </div>

      {!confirmando && (
        <button type="button" className={styles.botonTexto} onClick={() => setConfirmando(true)}>
          Quitar
        </button>
      )}
      {confirmando && (
        <div className={styles.accionesPersona}>
          {error ? (
            <span className={styles.errorChico}>{error}</span>
          ) : (
            <span className={styles.errorChico}>¿Quitar?</span>
          )}
          <button type="button" onClick={quitar} disabled={enCurso}>
            {enCurso ? "Quitando…" : "Sí"}
          </button>
          <button type="button" onClick={() => setConfirmando(false)} disabled={enCurso}>
            Cancelar
          </button>
        </div>
      )}
    </li>
  );
}

function FormularioNuevoColaborador({ slug }: { slug: string }) {
  const accion = crearColaboradorAction.bind(null, slug);
  const [estado, enviar, enCurso] = useActionState(accion, estadoInicial);
  const [abierto, setAbierto] = useState(false);

  if (estado.exito) {
    return (
      <div className={`${styles.advertencia} ${styles.revelarClave}`}>
        <p>
          Colaborador creado. Comparte estos datos fuera de la app — no se van a volver a
          mostrar:
        </p>
        <p className={styles.credencial}>Correo: {estado.exito.correo}</p>
        <p className={styles.credencial}>Contraseña temporal: {estado.exito.contrasenaTemporal}</p>
        <p>Puede cambiarla apenas entre, en Ajustes → Tu cuenta.</p>
      </div>
    );
  }

  if (!abierto) {
    return (
      <button type="button" className={styles.botonSecundario} onClick={() => setAbierto(true)}>
        Crear colaborador
      </button>
    );
  }

  return (
    <form action={enviar} className={styles.formulario}>
      <label className={styles.etiqueta}>
        Nombre
        <input type="text" name="nombre" required className={styles.campo} />
      </label>
      <label className={styles.etiqueta}>
        Correo
        <input type="email" name="correo" required className={styles.campo} />
      </label>
      {estado.error && <p className={styles.error}>{estado.error}</p>}
      <div className={styles.filaBotones}>
        <button type="submit" className={styles.boton} disabled={enCurso}>
          {enCurso ? "Creando…" : "Crear colaborador"}
        </button>
        <button
          type="button"
          className={styles.botonSecundario}
          onClick={() => setAbierto(false)}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
