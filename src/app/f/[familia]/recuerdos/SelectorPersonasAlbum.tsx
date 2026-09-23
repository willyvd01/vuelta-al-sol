"use client";

import { useState } from "react";
import styles from "./FormularioRecuerdoAlbum.module.css";
import type { PersonaOpcion } from "@/lib/supabase-admin";

export function SelectorPersonasAlbum({
  personas,
  seleccionadas,
  bloqueada,
  onCambio,
}: {
  personas: PersonaOpcion[];
  seleccionadas: Set<string>;
  bloqueada: string;
  onCambio: (seleccionadas: Set<string>) => void;
}) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = personas.filter((p) =>
    `${p.nombres} ${p.apellidos}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  function alternar(id: string) {
    if (id === bloqueada) return;
    const nuevas = new Set(seleccionadas);
    if (nuevas.has(id)) nuevas.delete(id);
    else nuevas.add(id);
    onCambio(nuevas);
  }

  return (
    <div className={styles.selector}>
      {personas.length > 8 && (
        <input
          type="text"
          placeholder="Buscar persona…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={styles.campo}
        />
      )}
      <div className={styles.listaSelector}>
        {filtradas.map((p) => (
          <label key={p.id} className={styles.casillaPersona}>
            <input
              type="checkbox"
              checked={seleccionadas.has(p.id)}
              disabled={p.id === bloqueada}
              onChange={() => alternar(p.id)}
            />
            {p.nombres} {p.apellidos}
          </label>
        ))}
      </div>
    </div>
  );
}
