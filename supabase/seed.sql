-- =====================================================================
-- SOLO PARA DESARROLLO — familia de prueba con los cumpleaños de enero
-- del boceto. Ejecutar después de schema.sql.
-- Código de acceso de prueba: enero2027 (no usar en producción).
-- =====================================================================

with f as (
  insert into public.familias (nombre, slug, monograma, codigo_acceso_hash)
  values ('Familia de prueba', 'demo', 'W&W', extensions.crypt('enero2027', extensions.gen_salt('bf')))
  returning id
)
insert into public.personas (familia_id, nombres, apellidos, dia, mes)
select f.id, v.nombres, v.apellidos, v.dia, 1
from f, (values
  ('Orlando',  'Tabares',              14),
  ('Giovanny', 'Zabala',               14),
  ('Yorla',    '[apellido pendiente]', 18),
  ('Wilson',   'Tabares',              19),  -- confirmar: ¿dos Wilson Tabares (19 y 20)?
  ('Wilson',   'Tabares',              20),
  ('Amparo',   'Castaño',              24),
  ('Ligia',    'Castaño',              26),
  ('Jannet',   'Ramírez',              29),
  ('Jhon',     'Castaño',              31)
) as v(nombres, apellidos, dia);

-- Después de crear tu usuario (Supabase → Authentication → Users),
-- hazte administrador de la familia de prueba reemplazando el id:
-- insert into public.miembros (familia_id, user_id, rol)
-- select id, 'PEGA-AQUI-TU-USER-ID', 'admin' from public.familias where slug = 'demo';
