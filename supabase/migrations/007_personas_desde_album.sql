-- =====================================================================
-- Migración 007 — Fase 9c: agregar personas desde el álbum.
-- Cómo usarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- =====================================================================

-- Null mientras no ha salido en ningún calendario impreso; se llena con
-- el número de ediciones cuando se registra la siguiente edición
-- (ver registrarEdicionAction, Fase 7).
alter table public.personas add column if not exists impresa_en_edicion int;
alter table public.personas add constraint personas_impresa_en_edicion_fkey
  foreign key (familia_id, impresa_en_edicion) references public.ediciones (familia_id, numero) on delete set null;

-- Cualquier miembro (no solo el admin) agrega y edita personas, tanto
-- desde el álbum como desde el panel. Borrar se queda solo para el admin
-- hasta la Fase 9d (papelera).
drop policy if exists personas_agregar on public.personas;
create policy personas_agregar on public.personas for insert to authenticated with check (public.es_miembro(familia_id));

drop policy if exists personas_editar on public.personas;
create policy personas_editar on public.personas for update to authenticated
  using (public.es_miembro(familia_id)) with check (public.es_miembro(familia_id));
