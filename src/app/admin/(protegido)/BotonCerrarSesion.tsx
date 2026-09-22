import { cerrarSesionAction } from "./acciones-sesion";

export function BotonCerrarSesion({ className }: { className?: string }) {
  return (
    <form action={cerrarSesionAction}>
      <button type="submit" className={className}>
        Cerrar sesión
      </button>
    </form>
  );
}
