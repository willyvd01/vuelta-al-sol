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

-- =====================================================================
-- Recuerdos de ejemplo — para probar /f/[familia]/p/[codigo].
-- Cuatro recuerdos en dos años distintos: uno compartido por dos personas
-- (los dos Wilson Tabares), uno sin fotos, uno con varias fotos y uno normal.
-- Las fotos de relleno se suben aparte con un script (no son parte del SQL);
-- estas filas solo describen sus rutas en Storage.
-- =====================================================================

with fam as (
  select id from public.familias where slug = 'demo'
),
p_wilson19 as (
  select personas.id from public.personas, fam
  where familia_id = fam.id and nombres = 'Wilson' and apellidos = 'Tabares' and dia = 19
),
p_wilson20 as (
  select personas.id from public.personas, fam
  where familia_id = fam.id and nombres = 'Wilson' and apellidos = 'Tabares' and dia = 20
),
p_amparo as (
  select personas.id from public.personas, fam
  where familia_id = fam.id and nombres = 'Amparo' and apellidos = 'Castaño'
),
p_jhon as (
  select personas.id from public.personas, fam
  where familia_id = fam.id and nombres = 'Jhon' and apellidos = 'Castaño'
),
p_yorla as (
  select personas.id from public.personas, fam where familia_id = fam.id and nombres = 'Yorla'
),
r1 as (
  insert into public.recuerdos (familia_id, fecha, titulo, historia, lugar)
  select fam.id, date '2025-01-20', 'Celebración doble',
    'Como cumplen un día después del otro, este año decidimos hacer una sola fiesta para los dos Wilson. Torta doble, una vela por cada año.',
    'Casa de la familia'
  from fam
  returning id
),
r2 as (
  insert into public.recuerdos (familia_id, fecha, titulo, historia, lugar)
  select fam.id, date '2024-11-10', 'Domingo donde la abuela',
    'Un almuerzo largo, de esos que empiezan a las doce y terminan cuando se va el sol. Nadie tomó fotos ese día, pero nadie lo olvida.',
    'Casa de la abuela'
  from fam
  returning id
),
r3 as (
  insert into public.recuerdos (familia_id, fecha, titulo, historia, lugar)
  select fam.id, date '2025-06-15', 'Paseo de río',
    'Todo el día metidos en el agua. Volvimos quemados y felices.',
    'Río Claro'
  from fam
  returning id
),
r4 as (
  insert into public.recuerdos (familia_id, fecha, titulo, historia, lugar)
  select fam.id, date '2024-03-08', 'Primer viaje sola',
    'Su primer viaje sin la familia. Llamó todos los días, pero volvió queriendo repetirlo.',
    'Cartagena'
  from fam
  returning id
),
personas_en_recuerdos as (
  insert into public.recuerdo_personas (recuerdo_id, persona_id)
  select r1.id, p_wilson19.id from r1, p_wilson19
  union all select r1.id, p_wilson20.id from r1, p_wilson20
  union all select r2.id, p_amparo.id   from r2, p_amparo
  union all select r3.id, p_jhon.id     from r3, p_jhon
  union all select r4.id, p_yorla.id    from r4, p_yorla
  returning recuerdo_id
),
fotos as (
  -- 1 foto para r1, 4 para r3 (relleno), 1 para r4. r2 se queda sin fotos.
  select gen_random_uuid() as id, fam.id as familia_id, r1.id as recuerdo_id, 1 as orden from r1, fam
  union all
  select gen_random_uuid(), fam.id, r3.id, n from generate_series(1, 4) as n, r3, fam
  union all
  select gen_random_uuid(), fam.id, r4.id, 1 from r4, fam
)
insert into public.recuerdo_fotos (id, recuerdo_id, familia_id, ruta_original, ruta_web, orden)
select
  id, recuerdo_id, familia_id,
  familia_id || '/recuerdos/' || recuerdo_id || '/' || id || '-original.jpg',
  familia_id || '/recuerdos/' || recuerdo_id || '/' || id || '-web.webp',
  orden
from fotos;
