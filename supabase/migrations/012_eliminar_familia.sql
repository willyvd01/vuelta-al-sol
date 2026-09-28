-- =====================================================================
-- Migración 012 — Eliminar una familia: borrado suave (30 días,
-- restaurable) igual que personas/recuerdos/solicitudes.
-- Cómo usarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- =====================================================================

alter table public.familias add column if not exists borrado_en timestamptz;
alter table public.familias add column if not exists borrado_por uuid references auth.users(id) on delete set null;

create index if not exists familias_borrado_en on public.familias (borrado_en);

-- Una familia eliminada no debe poder abrirse con su código, aunque sea
-- el correcto — el QR impreso deja de funcionar desde el momento en que
-- se borra, no solo después de los 30 días.
create or replace function public.verificar_codigo_familia(p_slug text, p_codigo text)
returns table(id uuid, codigo_version int)
language sql stable security definer set search_path = public, extensions as $$
  select familias.id, familias.codigo_version from familias
  where slug = p_slug
    and borrado_en is null
    and codigo_acceso_hash = crypt(public.normalizar_codigo(p_codigo), codigo_acceso_hash);
$$;
