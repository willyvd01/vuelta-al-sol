-- =====================================================================
-- Migración 002 — Acceso al álbum: código versionado, normalización
-- del código y límite de intentos.
-- Cómo usarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Normalización del código: sin espacios en los extremos, en minúsculas.
-- La usan crear_familia, cambiar_codigo_acceso y verificar_codigo_familia.
-- ---------------------------------------------------------------------

create or replace function public.normalizar_codigo(texto text)
returns text language sql immutable as $$
  select lower(trim(texto));
$$;

-- ---------------------------------------------------------------------
-- familias.codigo_version: cambiar el código invalida las sesiones activas
-- (la cookie firmada lleva esta versión; si no coincide, ya no sirve).
-- ---------------------------------------------------------------------

alter table public.familias add column if not exists codigo_version int not null default 1;

-- ---------------------------------------------------------------------
-- crear_familia: normaliza el código antes de guardarlo.
-- ---------------------------------------------------------------------

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

-- ---------------------------------------------------------------------
-- cambiar_codigo_acceso: normaliza el código nuevo e incrementa
-- codigo_version, para que el cambio cierre la sesión en todos los
-- teléfonos que tenían la cookie anterior.
-- ---------------------------------------------------------------------

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

-- ---------------------------------------------------------------------
-- verificar_codigo_familia: normaliza el código recibido y ahora también
-- devuelve codigo_version, para firmar la cookie de sesión con ella.
-- Cambia el tipo de retorno (antes uuid): hay que recrear la función.
-- ---------------------------------------------------------------------

drop function if exists public.verificar_codigo_familia(text, text);

create function public.verificar_codigo_familia(p_slug text, p_codigo text)
returns table(id uuid, codigo_version int)
language sql stable security definer set search_path = public, extensions as $$
  select familias.id, familias.codigo_version from familias
  where slug = p_slug
    and codigo_acceso_hash = crypt(public.normalizar_codigo(p_codigo), codigo_acceso_hash);
$$;

revoke execute on function public.verificar_codigo_familia(text, text) from public, anon, authenticated;
grant  execute on function public.verificar_codigo_familia(text, text) to service_role;

-- ---------------------------------------------------------------------
-- intentos_acceso: límite de intentos al código de cada familia.
-- La IP se guarda como hash, nunca en claro. RLS activado y sin
-- políticas: nadie la lee ni escribe salvo el servidor con la
-- service role key (que se salta RLS).
-- ---------------------------------------------------------------------

create table if not exists public.intentos_acceso (
  id         uuid primary key default gen_random_uuid(),
  ip_hash    text not null,
  familia_id uuid references public.familias(id) on delete cascade,
  exitoso    boolean not null,
  creado_en  timestamptz not null default now()
);
create index if not exists intentos_acceso_ip_creado      on public.intentos_acceso (ip_hash, creado_en);
create index if not exists intentos_acceso_familia_creado on public.intentos_acceso (familia_id, creado_en);

alter table public.intentos_acceso enable row level security;
