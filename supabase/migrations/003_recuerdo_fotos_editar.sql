-- =====================================================================
-- Migración 003 — Falta una política para actualizar recuerdo_fotos.
-- Sin ella, nadie puede reordenar las fotos de un recuerdo ya guardado
-- (solo existían políticas para verlas, agregarlas y borrarlas).
-- Mismo criterio que recuerdos_editar: el admin de la familia, o quien
-- creó el recuerdo al que pertenece la foto.
-- Cómo usarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- =====================================================================

create policy rf_editar on public.recuerdo_fotos for update to authenticated
  using (
    public.es_admin(familia_id)
    or exists (
      select 1 from public.recuerdos r
      where r.id = recuerdo_fotos.recuerdo_id and r.creado_por = auth.uid()
    )
  )
  with check (public.es_miembro(familia_id));
