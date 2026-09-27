-- =====================================================================
-- Migración 010 — Fase 10d: centro de ayuda y solicitudes.
-- Cómo usarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- =====================================================================

-- El límite de solicitudes por familia y por hora reutiliza intentos_acceso
-- (tipo = 'solicitud'), igual que el de aportes de la Fase 9.
alter table public.intentos_acceso drop constraint if exists intentos_acceso_tipo_valido;
alter table public.intentos_acceso drop constraint if exists intentos_acceso_tipo_check;
alter table public.intentos_acceso add constraint intentos_acceso_tipo_valido
  check (tipo in ('acceso', 'aporte', 'solicitud'));

create table if not exists public.solicitudes (
  id           uuid primary key default gen_random_uuid(),
  familia_id   uuid not null references public.familias(id) on delete cascade,
  tipo         text not null check (tipo in ('imprimir_de_nuevo', 'corregir_datos', 'agregar_personas', 'otra')),
  mensaje      text not null check (char_length(mensaje) between 1 and 3000),
  contacto     text not null check (char_length(contacto) between 1 and 200),
  autor_nombre text not null check (char_length(autor_nombre) between 1 and 100),
  estado       text not null default 'nueva' check (estado in ('nueva', 'en_proceso', 'resuelta')),
  creada_en    timestamptz not null default now()
);
create index if not exists solicitudes_familia_estado_creada
  on public.solicitudes (familia_id, estado, creada_en desc);

-- Los visitantes no escriben acá directo: solo el servidor (service role),
-- después de verificar la cookie de acceso. Los miembros la leen y cambian
-- su estado desde el panel.
alter table public.solicitudes enable row level security;

create policy solicitudes_ver on public.solicitudes for select to authenticated
  using (public.es_miembro(familia_id));
create policy solicitudes_editar on public.solicitudes for update to authenticated
  using (public.es_miembro(familia_id)) with check (public.es_miembro(familia_id));
