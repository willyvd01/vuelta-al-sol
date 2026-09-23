"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import styles from "./ErrorBoundary.module.css";

interface Props {
  children: ReactNode;
  // Mensaje que se muestra arriba del genérico, p. ej. para nombrar el formulario afectado.
  titulo?: string;
}

interface State {
  error: Error | null;
}

// Solo un componente de clase puede ser error boundary en React: no hay
// equivalente con hooks. Captura errores de render en los hijos (por
// ejemplo un componente que revienta al procesar props inesperadas) para
// mostrar un mensaje en español en vez de dejar la pantalla en blanco o
// congelada.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error atrapado por ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className={styles.contenedor}>
          {this.props.titulo && <p className={styles.titulo}>{this.props.titulo}</p>}
          <p className={styles.mensaje}>
            Algo salió mal y no se pudo mostrar esta sección. Intenta recargar la página; si
            vuelve a pasar, avísale a quien administra el calendario.
          </p>
          <button
            type="button"
            className={styles.boton}
            onClick={() => this.setState({ error: null })}
          >
            Intentar de nuevo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
