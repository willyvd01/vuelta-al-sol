-- =====================================================================
-- Migración 006 — Fase 9b: cualquier miembro (no solo el admin) edita el
-- contenido de cualquiera en recuerdos. "Borrar" se queda como estaba
-- (solo admin) hasta la Fase 9d, que construye la papelera.
-- Cómo usarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- =====================================================================

drop policy if exists recuerdos_editar on public.recuerdos;
create policy recuerdos_editar on public.recuerdos for update to authenticated
  using (public.es_miembro(familia_id)) with check (public.es_miembro(familia_id));

drop policy if exists rf_editar on public.recuerdo_fotos;
create policy rf_editar on public.recuerdo_fotos for update to authenticated
  using (public.es_miembro(familia_id)) with check (public.es_miembro(familia_id));

drop policy if exists rp_quitar on public.recuerdo_personas;
create policy rp_quitar on public.recuerdo_personas for delete to authenticated using (
  exists (select 1 from public.recuerdos r
          where r.id = recuerdo_personas.recuerdo_id and public.es_miembro(r.familia_id)));
