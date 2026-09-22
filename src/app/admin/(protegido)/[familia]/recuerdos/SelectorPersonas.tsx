"use client";

import { useState } from "react";
import styles from "./FormularioRecuerdo.module.css";

export interface PersonaOpcion {
  id: string;
  nombres: string;
  apellidos: string;
}

export function SelectorPersonas({
  personas,
  seleccionadas,
  bloqueadas,
  onCambio,
}: {
  personas: PersonaOpcion[];
  seleccionadas: Set<string>;
  bloqueadas: Set<string>;
  onCambio: (seleccionadas: Set<string>) => void;
}) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = personas.filter((p) =>
    `${p.nombres} ${p.apellidos}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  function alternar(id: string) {
    if (bloqueadas.has(id)) return;
    const nuevas = new Set(seleccionadas);
    if (nuevas.has(id)) nuevas.delete(id);
    else nuevas.add(id);
    onCambio(nuevas);
  }

  return (
    <div className={styles.selectorPersonas}>
      <input
        type="text"
        placeholder="Buscar persona…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className={styles.campo}
      />
      <div className={styles.listaPersonasSelector}>
        {filtradas.length === 0 && <p className={styles.sinResultados}>Sin resultados.</p>}
        {filtradas.map((p) => (
          <label key={p.id} className={styles.casillaPersona}>
            <input
              type="checkbox"
              checked={seleccionadas.has(p.id)}
              disabled={bloqueadas.has(p.id)}
              onChange={() => alternar(p.id)}
            />
            {p.nombres} {p.apellidos}
          </label>
        ))}
      </div>
    </div>
  );
}
