-- =====================================================================
-- Migración 008 — Fase 9d: papelera (borrado suave) para personas y
-- recuerdos.
-- Cómo usarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- =====================================================================

alter table public.personas  add column if not exists borrado_en timestamptz;
alter table public.personas  add column if not exists borrado_por uuid references auth.users(id) on delete set null;
alter table public.recuerdos add column if not exists borrado_en timestamptz;
alter table public.recuerdos add column if not exists borrado_por uuid references auth.users(id) on delete set null;

create index if not exists personas_borrado_en  on public.personas  (familia_id, borrado_en);
create index if not exists recuerdos_borrado_en on public.recuerdos (familia_id, borrado_en);
