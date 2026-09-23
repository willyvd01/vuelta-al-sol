"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { crearClienteNavegador } from "@/lib/supabase-browser";
import { crearSubidaFotoRecuerdoAction, guardarRecuerdoAction } from "./actions";
import { SelectorPersonas, type PersonaOpcion } from "./SelectorPersonas";
import { GaleriaFotos, type FotoItem } from "./GaleriaFotos";

import styles from "./FormularioRecuerdo.module.css";

export interface RecuerdoExistente {
  id: string;
  fecha: string;
  titulo: string;
  historia: string | null;
  lugar: string | null;
  personas: string[];
  fotos: { id: string; url: string }[];
}

export function FormularioRecuerdo({
  slug,
  personasDisponibles,
  recuerdo,
}: {
  slug: string;
  personasDisponibles: PersonaOpcion[];
  recuerdo?: RecuerdoExistente;
}) {
  const router = useRouter();

  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(
    new Set(recuerdo?.personas ?? [])
  );
  const [fotos, setFotos] = useState<FotoItem[]>(
    (recuerdo?.fotos ?? []).map((f) => ({ tipo: "existente" as const, datos: f }))
  );
  const [fotosBorradas, setFotosBorradas] = useState<string[]>([]);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState(false);

  const bloqueadas = new Set<string>();

  function cambiarFotos(nuevas: FotoItem[]) {
    const idsExistentesNuevos = new Set(
      nuevas.filter((f) => f.tipo === "existente").map((f) => f.datos.id)
    );
    const idsExistentesAntes = fotos.filter((f) => f.tipo === "existente").map((f) => f.datos.id);
    const quitados = idsExistentesAntes.filter((id) => !idsExistentesNuevos.has(id));
    if (quitados.length > 0) setFotosBorradas((prev) => [...prev, ...quitados]);
    setFotos(nuevas);
  }

  async function enviar(formData: FormData) {
    setError(null);
    setEnCurso(true);

    // Todo el cuerpo va envuelto en try/catch: un error inesperado (de red,
    // del navegador, etc.) no debe dejar el botón "Guardar" trabado en
    // "Guardando…" para siempre.
    try {
      const fotosFinal: (
        | { tipo: "existente"; id: string }
        | { tipo: "nueva"; rutaTemporal: string }
      )[] = [];

      for (const item of fotos) {
        if (item.tipo === "existente") {
          fotosFinal.push({ tipo: "existente", id: item.datos.id });
          continue;
        }
        const subida = await crearSubidaFotoRecuerdoAction(slug);
        if ("error" in subida) {
          setError(subida.error);
          setEnCurso(false);
          return;
        }
        const navegador = crearClienteNavegador();
        const { error: errorSubida } = await navegador.storage
          .from("fotos")
          .uploadToSignedUrl(subida.path, subida.token, item.datos.file);
        if (errorSubida) {
          setError(`No se pudo subir una foto: ${errorSubida.message}`);
          setEnCurso(false);
          return;
        }
        fotosFinal.push({ tipo: "nueva", rutaTemporal: subida.path });
      }

      formData.set("personas", JSON.stringify([...seleccionadas]));
      formData.set("fotos", JSON.stringify(fotosFinal));
      formData.set("fotosBorradas", JSON.stringify(fotosBorradas));

      const resultado = await guardarRecuerdoAction(slug, recuerdo?.id ?? null, formData);
      if (resultado.error) {
        setError(resultado.error);
        setEnCurso(false);
        return;
      }

      router.push(`/admin/${slug}/recuerdos`);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? `No se pudo guardar el recuerdo: ${e.message}` : "No se pudo guardar el recuerdo."
      );
      setEnCurso(false);
    }
  }

  return (
    <form action={enviar} className={styles.formulario}>
      <label className={styles.etiqueta}>
        Fecha
        <input
          type="date"
          name="fecha"
          defaultValue={recuerdo?.fecha}
          required
          className={styles.campo}
        />
      </label>

      <label className={styles.etiqueta}>
        Título
        <input
          type="text"
          name="titulo"
          defaultValue={recuerdo?.titulo}
          required
          className={styles.campo}
        />
      </label>

      <label className={styles.etiqueta}>
        Lugar (opcional)
        <input
          type="text"
          name="lugar"
          defaultValue={recuerdo?.lugar ?? ""}
          className={styles.campo}
        />
      </label>

      <label className={styles.etiqueta}>
        Historia (opcional)
        <textarea
          name="historia"
          defaultValue={recuerdo?.historia ?? ""}
          rows={5}
          className={styles.campo}
        />
      </label>

      <div className={styles.seccion}>
        <p className={styles.etiquetaSeccion}>Personas</p>
        <SelectorPersonas
          personas={personasDisponibles}
          seleccionadas={seleccionadas}
          bloqueadas={bloqueadas}
          onCambio={setSeleccionadas}
        />
      </div>

      <div className={styles.seccion}>
        <p className={styles.etiquetaSeccion}>Fotos</p>
        <GaleriaFotos
          fotos={fotos}
          onCambio={cambiarFotos}
          puedeQuitarExistentes={true}
          onError={setErrorFoto}
        />
        {errorFoto && <p className={styles.error}>{errorFoto}</p>}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" className={styles.boton} disabled={enCurso}>
        {enCurso ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
