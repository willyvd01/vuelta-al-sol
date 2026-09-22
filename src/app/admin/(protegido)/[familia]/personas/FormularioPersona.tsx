"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { crearClienteNavegador } from "@/lib/supabase-browser";
import { MESES, diasDelMes } from "@/lib/meses";
import { crearSubidaFotoAction, guardarPersonaAction } from "./actions";
import { RecortadorFoto } from "./RecortadorFoto";

import styles from "./FormularioPersona.module.css";

export interface PersonaExistente {
  codigo: string;
  nombres: string;
  apellidos: string;
  dia: number;
  mes: number;
  anio: number | null;
  parentesco: string | null;
  fallecida: boolean;
  fotoWebUrl: string | null;
}

const TIPOS_VALIDOS = ["image/jpeg", "image/png", "image/webp"];

export function FormularioPersona({
  slug,
  persona,
}: {
  slug: string;
  persona?: PersonaExistente;
}) {
  const router = useRouter();

  const [mes, setMes] = useState(persona?.mes ?? 1);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [corte, setCorte] = useState<{ x: number; y: number; tamano: number } | null>(null);
  const [errorRecorte, setErrorRecorte] = useState<string | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState(false);

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
      setErrorArchivo(
        "Esa foto está en formato HEIC (típico de iPhone). Compártela o expórtala como JPG e inténtalo de nuevo."
      );
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

  async function enviar(formData: FormData) {
    setError(null);

    if (archivo && (!corte || errorRecorte)) {
      setError("Ajusta el recorte de la foto antes de guardar.");
      return;
    }

    setEnCurso(true);

    if (archivo && corte) {
      const subida = await crearSubidaFotoAction(slug);
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

    const resultado = await guardarPersonaAction(slug, persona?.codigo ?? null, formData);
    if (resultado.error) {
      setError(resultado.error);
      setEnCurso(false);
      return;
    }

    router.push(`/admin/${slug}/personas`);
    router.refresh();
  }

  return (
    <form action={enviar} className={styles.formulario}>
      <label className={styles.etiqueta}>
        Nombres
        <input
          type="text"
          name="nombres"
          defaultValue={persona?.nombres}
          required
          className={styles.campo}
        />
      </label>

      <label className={styles.etiqueta}>
        Apellidos
        <input
          type="text"
          name="apellidos"
          defaultValue={persona?.apellidos}
          className={styles.campo}
        />
      </label>

      <div className={styles.filaFecha}>
        <label className={styles.etiqueta}>
          Mes
          <select
            name="mes"
            defaultValue={persona?.mes ?? 1}
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
          <select name="dia" defaultValue={persona?.dia ?? 1} className={styles.campo}>
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
          defaultValue={persona?.anio ?? ""}
          min={1850}
          max={2100}
          className={styles.campo}
        />
      </label>

      <label className={styles.etiqueta}>
        Parentesco (opcional)
        <input
          type="text"
          name="parentesco"
          defaultValue={persona?.parentesco ?? ""}
          placeholder="Hija, primo, abuela…"
          className={styles.campo}
        />
      </label>

      <label className={styles.casilla}>
        <input type="checkbox" name="fallecida" defaultChecked={persona?.fallecida} />
        Esta persona falleció
      </label>

      <div className={styles.seccionFoto}>
        <p className={styles.etiquetaFoto}>Foto</p>

        {persona?.fotoWebUrl && !archivo && (
          <div className={styles.fotoActual}>
            <Image src={persona.fotoWebUrl} alt="" fill style={{ objectFit: "cover" }} sizes="100px" />
          </div>
        )}

        {archivo ? (
          <RecortadorFoto
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
            Quitar foto nueva
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
