"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

/**
 * Fase 10b: envuelve la navegación en document.startViewTransition() cuando
 * el navegador lo soporta — así el cambio de mes desliza (con `direccion`,
 * ver animaciones.css) y la apertura de una persona hace crecer su foto
 * desde la casilla hasta la ficha (mismo view-transition-name en los dos
 * lados). Sin soporte, o con clic modificado (abrir en pestaña nueva,
 * etc.), es una navegación normal.
 */
export function EnlaceAnimado({
  href,
  direccion,
  className,
  children,
  ...resto
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  direccion?: "siguiente" | "anterior";
  children: ReactNode;
}) {
  const router = useRouter();

  function manejarClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();

    if (typeof document === "undefined" || !("startViewTransition" in document)) {
      router.push(href);
      return;
    }

    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (direccion && !prefiereMenosMovimiento) {
      document.documentElement.dataset.vsDireccion = direccion;
    } else {
      delete document.documentElement.dataset.vsDireccion;
    }

    document.startViewTransition(() => {
      return new Promise<void>((resolve) => {
        startTransition(() => {
          router.push(href);
          resolve();
        });
      });
    });
  }

  return (
    <a href={href} onClick={manejarClick} className={className} {...resto}>
      {children}
    </a>
  );
}
