-- =====================================================================
-- Vuelta al Sol — esquema de base de datos (Supabase / PostgreSQL)
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- Multifamilia desde el día uno: todo pertenece a una familia y
-- la seguridad por filas (RLS) está activada en todas las tablas.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------

-- Código corto y permanente para la URL de cada persona (sin 0/o, 1/l/i).
create or replace function public.codigo_corto(n int default 6)
returns text language plpgsql volatile as $$
declare
  alfabeto constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  resultado text := '';
begin
  for i in 1..n loop
    resultado := resultado || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
  end loop;
  return resultado;
end $$;

-- ¿Existe esa combinación de día y mes? (29 de febrero se acepta)
create or replace function public.fecha_valida(m smallint, d smallint)
returns boolean language plpgsql immutable as $$
begin
  perform make_date(2000, m, d);
  return true;
exception when others then
  return false;
end $$;

-- Sin espacios en los extremos, en minúsculas. La usan crear_familia,
-- cambiar_codigo_acceso y verificar_codigo_familia.
create or replace function public.normalizar_codigo(texto text)
returns text language sql immutable as $$
  select lower(trim(texto));
$$;

-- Mismos cortes que signoZodiacal() en src/lib/zodiaco.ts
create or replace function public.signo_zodiacal(m smallint, d smallint)
returns text language sql immutable as $$
  select case
    when m * 100 + d between 321  and 419  then 'aries'
    when m * 100 + d between 420  and 520  then 'tauro'
    when m * 100 + d between 521  and 620  then 'geminis'
    when m * 100 + d between 621  and 722  then 'cancer'
    when m * 100 + d between 723  and 822  then 'leo'
    when m * 100 + d between 823  and 922  then 'virgo'
    when m * 100 + d between 923  and 1022 then 'libra'
    when m * 100 + d between 1023 and 1121 then 'escorpio'
    when m * 100 + d between 1122 and 1221 then 'sagitario'
    when m * 100 + d >= 1222 or m * 100 + d <= 119 then 'capricornio'
    when m * 100 + d between 120  and 218  then 'acuario'
    else 'piscis'
  end
$$;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table public.familias (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  slug               text not null unique
                     check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),   -- va en la URL del QR
  monograma          text,                                        -- p. ej. 'W&W' para la marca de agua
  codigo_acceso_hash text not null,                               -- nunca guardar el código en claro
  codigo_version     int not null default 1,                      -- sube al cambiar el código; invalida cookies viejas
  creada_en          timestamptz not null default now()
);

create table public.miembros (
  familia_id uuid not null references public.familias(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  rol        text not null check (rol in ('admin', 'colaborador')),
  creado_en  timestamptz not null default now(),
  primary key (familia_id, user_id)
);

create table public.personas (
  id            uuid primary key default gen_random_uuid(),
  familia_id    uuid not null references public.familias(id) on delete cascade,
  codigo        text not null unique default public.codigo_corto(),
  nombres       text not null,
  apellidos     text not null default '',
  dia           smallint not null,
  mes           smallint not null,
  anio          smallint,                     -- opcional; sirve para desempatar por edad
  parentesco    text,
  foto_original text,                         -- ruta en Storage, para imprimir
  foto_web      text,                         -- ruta en Storage, versión liviana
  fallecida     boolean not null default false,
  signo         text generated always as (public.signo_zodiacal(mes, dia)) stored,
  creada_en     timestamptz not null default now(),
  constraint personas_fecha_valida check (public.fecha_valida(mes, dia)),
  constraint personas_anio_razonable check (anio is null or anio between 1850 and 2100)
);
create index personas_familia_mes on public.personas (familia_id, mes, dia);

create table public.recuerdos (
  id         uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  fecha      date not null,
  titulo     text not null,
  historia   text,
  lugar      text,
  creado_por uuid default auth.uid() references auth.users(id) on delete set null,
  creado_en  timestamptz not null default now()
);
create index recuerdos_familia_fecha on public.recuerdos (familia_id, fecha desc);

-- Un recuerdo puede incluir a varias personas (un viaje, una boda).
create table public.recuerdo_personas (
  recuerdo_id uuid not null references public.recuerdos(id) on delete cascade,
  persona_id  uuid not null references public.personas(id) on delete cascade,
  primary key (recuerdo_id, persona_id)
);
create index recuerdo_personas_persona on public.recuerdo_personas (persona_id);

create table public.recuerdo_fotos (
  id           uuid primary key default gen_random_uuid(),
  recuerdo_id  uuid not null references public.recuerdos(id) on delete cascade,
  familia_id   uuid not null references public.familias(id) on delete cascade,
  ruta_original text not null,
  ruta_web      text not null,
  ancho        int,
  alto         int,
  orden        smallint not null default 0,
  creada_en    timestamptz not null default now()
);
create index recuerdo_fotos_recuerdo on public.recuerdo_fotos (recuerdo_id, orden);

-- Registro de cada calendario impreso.
create table public.ediciones (
  id          uuid primary key default gen_random_uuid(),
  familia_id  uuid not null references public.familias(id) on delete cascade,
  numero      int not null,
  notas       text,
  generada_en timestamptz not null default now(),
  unique (familia_id, numero)
);

-- Límite de intentos al código de acceso. La IP se guarda como hash,
-- nunca en claro. Sin políticas de RLS: solo el servidor, con la
-- service role key, la usa (ver más abajo).
create table public.intentos_acceso (
  id         uuid primary key default gen_random_uuid(),
  ip_hash    text not null,
  familia_id uuid references public.familias(id) on delete cascade,
  exitoso    boolean not null,
  creado_en  timestamptz not null default now()
);
create index intentos_acceso_ip_creado      on public.intentos_acceso (ip_hash, creado_en);
create index intentos_acceso_familia_creado on public.intentos_acceso (familia_id, creado_en);

-- ---------------------------------------------------------------------
-- Identificadores permanentes: están impresos en los QR
-- ---------------------------------------------------------------------

create or replace function public.slug_permanente()
returns trigger language plpgsql as $$
begin
  if new.slug is distinct from old.slug then
    raise exception 'El slug de la familia es permanente: está impreso en los QR';
  end if;
  return new;
end $$;

create trigger familias_slug_permanente
  before update on public.familias
  for each row execute function public.slug_permanente();

create or replace function public.codigo_permanente()
returns trigger language plpgsql as $$
begin
  if new.codigo is distinct from old.codigo then
    raise exception 'El código de la persona es permanente';
  end if;
  if new.familia_id is distinct from old.familia_id then
    raise exception 'Una persona no puede cambiar de familia';
  end if;
  return new;
end $$;

create trigger personas_codigo_permanente
  before update on public.personas
  for each row execute function public.codigo_permanente();

-- ---------------------------------------------------------------------
-- Permisos por familia
-- ---------------------------------------------------------------------

create or replace function public.es_miembro(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros where familia_id = fid and user_id = auth.uid());
$$;

create or replace function public.es_admin(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros where familia_id = fid and user_id = auth.uid() and rol = 'admin');
$$;

-- Crear una familia nueva: quien la crea queda como administrador.
create or replace function public.crear_familia(
  p_nombre text, p_slug text, p_codigo_acceso text, p_monograma text default null
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  nueva uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if length(coalesce(p_codigo_acceso, '')) < 6 then
    raise exception 'El código de acceso debe tener al menos 6 caracteres';
  end if;
  insert into familias (nombre, slug, monograma, codigo_acceso_hash)
  values (p_nombre, p_slug, p_monograma, crypt(public.normalizar_codigo(p_codigo_acceso), gen_salt('bf')))
  returning id into nueva;
  insert into miembros (familia_id, user_id, rol) values (nueva, auth.uid(), 'admin');
  return nueva;
end $$;

-- Cambiar el código de acceso (solo administradores).
create or replace function public.cambiar_codigo_acceso(p_familia uuid, p_codigo text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not es_admin(p_familia) then
    raise exception 'Solo un administrador puede cambiar el código';
  end if;
  if length(coalesce(p_codigo, '')) < 6 then
    raise exception 'El código de acceso debe tener al menos 6 caracteres';
  end if;
  update familias
  set codigo_acceso_hash = crypt(public.normalizar_codigo(p_codigo), gen_salt('bf')),
      codigo_version = codigo_version + 1
  where id = p_familia;
end $$;

-- Verificar el código que escribe quien escanea el QR. Devuelve también
-- codigo_version, para firmar la cookie de sesión con ella.
-- Solo la llama el servidor de Next.js (service role), nunca el navegador.
create or replace function public.verificar_codigo_familia(p_slug text, p_codigo text)
returns table(id uuid, codigo_version int)
language sql stable security definer set search_path = public, extensions as $$
  select familias.id, familias.codigo_version from familias
  where slug = p_slug
    and codigo_acceso_hash = crypt(public.normalizar_codigo(p_codigo), codigo_acceso_hash);
$$;

revoke execute on function public.crear_familia(text, text, text, text) from public, anon;
grant  execute on function public.crear_familia(text, text, text, text) to authenticated;
revoke execute on function public.cambiar_codigo_acceso(uuid, text) from public, anon;
grant  execute on function public.cambiar_codigo_acceso(uuid, text) to authenticated;
revoke execute on function public.verificar_codigo_familia(text, text) from public, anon, authenticated;
grant  execute on function public.verificar_codigo_familia(text, text) to service_role;

-- ---------------------------------------------------------------------
-- Seguridad por filas (RLS)
-- Administrador: todo en su familia. Colaborador: ve todo y añade
-- recuerdos; edita los suyos; no borra. Visitantes del QR: sin acceso
-- directo; el servidor les muestra los datos tras verificar el código.
-- ---------------------------------------------------------------------

alter table public.familias          enable row level security;
alter table public.miembros          enable row level security;
alter table public.personas          enable row level security;
alter table public.recuerdos         enable row level security;
alter table public.recuerdo_personas enable row level security;
alter table public.recuerdo_fotos    enable row level security;
alter table public.ediciones         enable row level security;
alter table public.intentos_acceso   enable row level security;

create policy familias_ver    on public.familias for select to authenticated using (public.es_miembro(id));
create policy familias_editar on public.familias for update to authenticated
  using (public.es_admin(id)) with check (public.es_admin(id));

create policy miembros_ver      on public.miembros for select to authenticated using (public.es_miembro(familia_id));
create policy miembros_agregar  on public.miembros for insert to authenticated with check (public.es_admin(familia_id));
create policy miembros_editar   on public.miembros for update to authenticated
  using (public.es_admin(familia_id)) with check (public.es_admin(familia_id));
create policy miembros_quitar   on public.miembros for delete to authenticated using (public.es_admin(familia_id));

create policy personas_ver     on public.personas for select to authenticated using (public.es_miembro(familia_id));
create policy personas_agregar on public.personas for insert to authenticated with check (public.es_admin(familia_id));
create policy personas_editar  on public.personas for update to authenticated
  using (public.es_admin(familia_id)) with check (public.es_admin(familia_id));
create policy personas_borrar  on public.personas for delete to authenticated using (public.es_admin(familia_id));

create policy recuerdos_ver     on public.recuerdos for select to authenticated using (public.es_miembro(familia_id));
create policy recuerdos_agregar on public.recuerdos for insert to authenticated
  with check (public.es_miembro(familia_id) and creado_por = auth.uid());
create policy recuerdos_editar  on public.recuerdos for update to authenticated
  using (public.es_admin(familia_id) or creado_por = auth.uid())
  with check (public.es_miembro(familia_id));
create policy recuerdos_borrar  on public.recuerdos for delete to authenticated using (public.es_admin(familia_id));

create policy rp_ver on public.recuerdo_personas for select to authenticated using (
  exists (select 1 from public.recuerdos r
          where r.id = recuerdo_personas.recuerdo_id and public.es_miembro(r.familia_id)));
create policy rp_agregar on public.recuerdo_personas for insert to authenticated with check (
  exists (select 1 from public.recuerdos r
          join public.personas p on p.familia_id = r.familia_id
          where r.id = recuerdo_personas.recuerdo_id
            and p.id = recuerdo_personas.persona_id
            and public.es_miembro(r.familia_id)));
create policy rp_quitar on public.recuerdo_personas for delete to authenticated using (
  exists (select 1 from public.recuerdos r
          where r.id = recuerdo_personas.recuerdo_id and public.es_admin(r.familia_id)));

create policy rf_ver on public.recuerdo_fotos for select to authenticated using (public.es_miembro(familia_id));
create policy rf_agregar on public.recuerdo_fotos for insert to authenticated with check (
  public.es_miembro(recuerdo_fotos.familia_id)
  and exists (select 1 from public.recuerdos r
              where r.id = recuerdo_fotos.recuerdo_id and r.familia_id = recuerdo_fotos.familia_id));
create policy rf_borrar on public.recuerdo_fotos for delete to authenticated using (public.es_admin(familia_id));

create policy ediciones_ver     on public.ediciones for select to authenticated using (public.es_miembro(familia_id));
create policy ediciones_agregar on public.ediciones for insert to authenticated with check (public.es_admin(familia_id));

-- ---------------------------------------------------------------------
-- Almacenamiento de fotos (bucket privado)
-- La primera carpeta de cada ruta es el id de la familia:
--   {familia_id}/personas/{persona_id}/original.jpg
--   {familia_id}/personas/{persona_id}/web.webp
--   {familia_id}/recuerdos/{recuerdo_id}/{foto_id}-original.jpg
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

create policy fotos_ver on storage.objects for select to authenticated using (
  bucket_id = 'fotos' and public.es_miembro(((storage.foldername(name))[1])::uuid));
create policy fotos_subir on storage.objects for insert to authenticated with check (
  bucket_id = 'fotos' and public.es_miembro(((storage.foldername(name))[1])::uuid));
create policy fotos_borrar on storage.objects for delete to authenticated using (
  bucket_id = 'fotos' and public.es_admin(((storage.foldername(name))[1])::uuid));
