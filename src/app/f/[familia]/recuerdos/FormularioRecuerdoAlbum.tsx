"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { crearClienteNavegador } from "@/lib/supabase-browser";
import type { PersonaOpcion } from "@/lib/supabase-admin";
import { crearSubidaFotoRecuerdoAlbumAction, guardarRecuerdoAlbumAction } from "./acciones";
import { SelectorPersonasAlbum } from "./SelectorPersonasAlbum";
import { GaleriaFotosAlbum, type FotoItem } from "./GaleriaFotosAlbum";

import styles from "./FormularioRecuerdoAlbum.module.css";

export interface RecuerdoAlbumExistente {
  id: string;
  fecha: string;
  titulo: string;
  historia: string | null;
  personaIds: string[];
  fotos: { id: string; url: string }[];
}

export function FormularioRecuerdoAlbum({
  slug,
  volverA,
  personaPrincipalId,
  personasDisponibles,
  pedirNombre,
  recuerdo,
}: {
  slug: string;
  volverA: string;
  personaPrincipalId: string;
  personasDisponibles: PersonaOpcion[];
  pedirNombre: boolean;
  recuerdo?: RecuerdoAlbumExistente;
}) {
  const router = useRouter();

  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(
    new Set(recuerdo?.personaIds ?? [personaPrincipalId])
  );
  const [fotos, setFotos] = useState<FotoItem[]>(
    (recuerdo?.fotos ?? []).map((f) => ({ tipo: "existente" as const, datos: f }))
  );
  const [fotosBorradas, setFotosBorradas] = useState<string[]>([]);
  const [nombreVisitante, setNombreVisitante] = useState("");
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState(false);

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

    try {
      if (pedirNombre && !nombreVisitante.trim()) {
        setError("Escribe tu nombre antes de guardar.");
        setEnCurso(false);
        return;
      }

      const fotosFinal: (
        | { tipo: "existente"; id: string }
        | { tipo: "nueva"; rutaTemporal: string }
      )[] = [];

      for (const item of fotos) {
        if (item.tipo === "existente") {
          fotosFinal.push({ tipo: "existente", id: item.datos.id });
          continue;
        }
        const subida = await crearSubidaFotoRecuerdoAlbumAction(slug);
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
      formData.set("nombreVisitante", nombreVisitante);

      const resultado = await guardarRecuerdoAlbumAction(slug, recuerdo?.id ?? null, formData);
      if (resultado.error) {
        setError(resultado.error);
        setEnCurso(false);
        return;
      }

      router.push(volverA);
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
      {pedirNombre && (
        <label className={styles.etiqueta}>
          Tu nombre
          <input
            type="text"
            value={nombreVisitante}
            onChange={(e) => setNombreVisitante(e.target.value)}
            placeholder="¿Quién eres?"
            required
            className={styles.campo}
          />
        </label>
      )}

      <label className={styles.etiqueta}>
        Fecha
        <input type="date" name="fecha" defaultValue={recuerdo?.fecha} required className={styles.campo} />
      </label>

      <label className={styles.etiqueta}>
        Título
        <input type="text" name="titulo" defaultValue={recuerdo?.titulo} required className={styles.campo} />
      </label>

      <label className={styles.etiqueta}>
        Historia (opcional)
        <textarea name="historia" defaultValue={recuerdo?.historia ?? ""} rows={4} className={styles.campo} />
      </label>

      <div className={styles.seccion}>
        <p className={styles.tituloSeccion}>Personas</p>
        <SelectorPersonasAlbum
          personas={personasDisponibles}
          seleccionadas={seleccionadas}
          bloqueada={personaPrincipalId}
          onCambio={setSeleccionadas}
        />
      </div>

      <div className={styles.seccion}>
        <p className={styles.tituloSeccion}>Fotos</p>
        <GaleriaFotosAlbum fotos={fotos} onCambio={cambiarFotos} onError={setErrorFoto} />
        {errorFoto && <p className={styles.error}>{errorFoto}</p>}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" className={styles.boton} disabled={enCurso}>
        {enCurso ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
