import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
  );
}

// Cliente para el navegador y componentes de servidor sin privilegios especiales.
// Respeta las políticas de seguridad por fila (RLS) de cada tabla.
export const supabase = createClient(url, anonKey);
