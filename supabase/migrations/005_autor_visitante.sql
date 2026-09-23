-- =====================================================================
-- Migración 005 — Identidad del visitante y límite de aportes (Fase 9a).
-- Cómo usarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- (En un proyecto nuevo no hace falta: ya está en schema.sql.)
-- =====================================================================

-- Vacías en lo creado desde /admin (ahí ya existe creado_por). Las llena
-- un visitante sin sesión que aporta desde el álbum.
alter table public.personas  add column if not exists autor_nombre text;
alter table public.personas  add column if not exists autor_token  text;
alter table public.recuerdos add column if not exists autor_nombre text;
alter table public.recuerdos add column if not exists autor_token  text;

-- Reutiliza intentos_acceso para el límite de aportes por familia y por
-- hora: las filas nuevas (tipo = 'aporte') no compiten con el conteo de
-- intentos de código (tipo = 'acceso', el valor por defecto).
alter table public.intentos_acceso add column if not exists tipo text not null default 'acceso';
alter table public.intentos_acceso add constraint intentos_acceso_tipo_valido check (tipo in ('acceso', 'aporte'));

create index if not exists intentos_acceso_familia_tipo_creado
  on public.intentos_acceso (familia_id, tipo, creado_en);
