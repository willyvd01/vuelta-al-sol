"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { crearClienteNavegador } from "@/lib/supabase-browser";
import { MESES, diasDelMes } from "@/lib/meses";
import type { PersonaParecida } from "@/lib/supabase-admin";
import { RecortadorFoto } from "../../../admin/(protegido)/[familia]/personas/RecortadorFoto";
import {
  crearSubidaFotoPersonaAlbumAction,
  buscarDuplicadosAction,
  guardarPersonaAlbumAction,
  actualizarPersonaAlbumAction,
} from "./acciones";

import styles from "./FormularioPersonaAlbum.module.css";

const TIPOS_VALIDOS = ["image/jpeg", "image/png", "image/webp"];

export interface PersonaAlbumExistente {
  codigo: string;
  nombres: string;
  apellidos: string;
  dia: number;
  mes: number;
  anio: number | null;
  parentesco: string | null;
  fotoWebUrl: string | null;
}

export function FormularioPersonaAlbum({
  slug,
  volverA,
  pedirNombre,
  mesInicial,
  personaExistente,
}: {
  slug: string;
  volverA: string;
  pedirNombre: boolean;
  mesInicial: number;
  personaExistente?: PersonaAlbumExistente;
}) {
  const router = useRouter();

  const [nombreVisitante, setNombreVisitante] = useState("");
  const [nombres, setNombres] = useState(personaExistente?.nombres ?? "");
  const [apellidos, setApellidos] = useState(personaExistente?.apellidos ?? "");
  const [mes, setMes] = useState(personaExistente?.mes ?? mesInicial);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [corte, setCorte] = useState<{ x: number; y: number; tamano: number } | null>(null);
  const [errorRecorte, setErrorRecorte] = useState<string | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState(false);
  const [duplicados, setDuplicados] = useState<PersonaParecida[] | null>(null);
  const [formPendiente, setFormPendiente] = useState<FormData | null>(null);

  function elegirArchivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const file = evento.target.files?.[0];
    evento.target.value = "";
    if (!file) return;

    setErrorArchivo(null);
    setCorte(null);
    setErrorRecorte(null);

    const nombre = file.name.toLowerCase();
    const esHeic =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      nombre.endsWith(".heic") ||
      nombre.endsWith(".heif");
    if (esHeic) {
      setErrorArchivo("Esa foto está en formato HEIC (típico de iPhone). Compártela como JPG e inténtalo de nuevo.");
      setArchivo(null);
      return;
    }
    if (!TIPOS_VALIDOS.includes(file.type)) {
      setErrorArchivo("Solo se aceptan fotos JPG, PNG o WebP.");
      setArchivo(null);
      return;
    }
    setArchivo(file);
  }

  async function subirYGuardar(formData: FormData) {
    if (archivo && corte) {
      const subida = await crearSubidaFotoPersonaAlbumAction(slug);
      if ("error" in subida) {
        setError(subida.error);
        setEnCurso(false);
        return;
      }
      const navegador = crearClienteNavegador();
      const { error: errorSubida } = await navegador.storage
        .from("fotos")
        .uploadToSignedUrl(subida.path, subida.token, archivo);
      if (errorSubida) {
        setError(`No se pudo subir la foto: ${errorSubida.message}`);
        setEnCurso(false);
        return;
      }
      formData.set("rutaTemporal", subida.path);
      formData.set("corte", JSON.stringify(corte));
    }
    formData.set("nombreVisitante", nombreVisitante);

    const resultado = personaExistente
      ? await actualizarPersonaAlbumAction(slug, personaExistente.codigo, formData)
      : await guardarPersonaAlbumAction(slug, formData);
    if (resultado.error) {
      setError(resultado.error);
      setEnCurso(false);
      return;
    }

    router.push(volverA);
    router.refresh();
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
      if (archivo && (!corte || errorRecorte)) {
        setError("Ajusta el recorte de la foto antes de guardar.");
        setEnCurso(false);
        return;
      }

      if (!personaExistente) {
        const dia = Number(formData.get("dia"));
        const parecidos = await buscarDuplicadosAction(slug, nombres, apellidos, dia, mes);
        if (parecidos.length > 0) {
          setDuplicados(parecidos);
          setFormPendiente(formData);
          setEnCurso(false);
          return;
        }
      }

      await subirYGuardar(formData);
    } catch (e) {
      setError(e instanceof Error ? `No se pudo guardar: ${e.message}` : "No se pudo guardar.");
      setEnCurso(false);
    }
  }

  async function confirmarDeTodosModos() {
    if (!formPendiente) return;
    setEnCurso(true);
    try {
      await subirYGuardar(formPendiente);
    } catch (e) {
      setError(e instanceof Error ? `No se pudo guardar: ${e.message}` : "No se pudo guardar.");
      setEnCurso(false);
    }
  }

  if (duplicados) {
    return (
      <div className={styles.avisoDuplicado}>
        <p className={styles.tituloAviso}>Ya hay alguien parecido</p>
        <ul className={styles.listaDuplicados}>
          {duplicados.map((p) => (
            <li key={p.codigo}>
              {p.nombres} {p.apellidos}
            </li>
          ))}
        </ul>
        <p className={styles.textoAviso}>¿Agregas a esta persona de todos modos, o cancelas?</p>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.filaBotones}>
          <button type="button" className={styles.boton} onClick={confirmarDeTodosModos} disabled={enCurso}>
            {enCurso ? "Guardando…" : "Sí, agregar de todos modos"}
          </button>
          <button
            type="button"
            className={styles.botonSecundario}
            onClick={() => {
              setDuplicados(null);
              setFormPendiente(null);
            }}
            disabled={enCurso}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
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
        Nombres
        <input
          type="text"
          name="nombres"
          value={nombres}
          onChange={(e) => setNombres(e.target.value)}
          required
          className={styles.campo}
        />
      </label>

      <label className={styles.etiqueta}>
        Apellidos
        <input
          type="text"
          name="apellidos"
          value={apellidos}
          onChange={(e) => setApellidos(e.target.value)}
          className={styles.campo}
        />
      </label>

      <div className={styles.filaFecha}>
        <label className={styles.etiqueta}>
          Mes
          <select
            name="mes"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className={styles.campo}
          >
            {MESES.map((m) => (
              <option key={m.numero} value={m.numero}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.etiqueta}>
          Día
          <select name="dia" defaultValue={personaExistente?.dia ?? 1} className={styles.campo}>
            {Array.from({ length: diasDelMes(mes) }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={styles.etiqueta}>
        Año de nacimiento (opcional)
        <input
          type="number"
          name="anio"
          min={1850}
          max={2100}
          defaultValue={personaExistente?.anio ?? ""}
          className={styles.campo}
        />
        <span className={styles.ayuda}>Si lo pones, el álbum mostrará la edad que cumple cada año.</span>
      </label>

      <label className={styles.etiqueta}>
        Parentesco (opcional)
        <input
          type="text"
          name="parentesco"
          defaultValue={personaExistente?.parentesco ?? ""}
          placeholder="Hija, primo, abuela…"
          className={styles.campo}
        />
      </label>

      <div className={styles.seccionFoto}>
        <p className={styles.tituloSeccion}>Foto (opcional)</p>

        {personaExistente?.fotoWebUrl && !archivo && (
          <div className={styles.fotoActual}>
            <Image src={personaExistente.fotoWebUrl} alt="" fill style={{ objectFit: "cover" }} sizes="100px" />
          </div>
        )}

        {archivo ? (
          <RecortadorFoto
            key={`${archivo.name}-${archivo.lastModified}-${archivo.size}`}
            archivo={archivo}
            onCambio={(c, e) => {
              setCorte(c);
              setErrorRecorte(e);
            }}
          />
        ) : (
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,.heic,.heif"
            onChange={elegirArchivo}
            className={styles.campoArchivo}
          />
        )}

        {archivo && (
          <button
            type="button"
            className={styles.botonSecundario}
            onClick={() => {
              setArchivo(null);
              setCorte(null);
              setErrorRecorte(null);
            }}
          >
            Quitar foto
          </button>
        )}

        {errorArchivo && <p className={styles.error}>{errorArchivo}</p>}
        {errorRecorte && <p className={styles.error}>{errorRecorte}</p>}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" className={styles.boton} disabled={enCurso}>
        {enCurso ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
