-- =====================================================================
-- Migración 011 — Fase 10d (huella): borrado suave para solicitudes, con
-- el mismo mecanismo de personas y recuerdos (Fase 9d / migración 008).
-- Cómo usarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- =====================================================================

alter table public.solicitudes add column if not exists borrado_en timestamptz;
alter table public.solicitudes add column if not exists borrado_por uuid references auth.users(id) on delete set null;

create index if not exists solicitudes_borrado_en on public.solicitudes (familia_id, borrado_en);
