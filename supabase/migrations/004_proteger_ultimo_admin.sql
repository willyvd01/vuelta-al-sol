-- =====================================================================
-- Migración 004 — Protege al último administrador de una familia con un
-- trigger, no solo con la validación en pantalla de quitarMiembroAction.
-- Bloquea tanto borrar la fila de un admin como cambiarle el rol, si es
-- el único administrador que le queda a esa familia.
--
-- Excepción: si la familia entera se está borrando (la fila ya no existe
-- en `familias` dentro de la misma transacción), deja pasar el borrado
-- en cascada de sus miembros — ahí no hay nada que proteger.
--
-- Cómo usarla: Supabase → SQL Editor → New query → pegar todo → Run.
-- =====================================================================

create or replace function public.proteger_ultimo_admin()
returns trigger language plpgsql as $$
declare
  quedan_admins int;
  familia_existe boolean;
begin
  if OLD.rol <> 'admin' then
    if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
  end if;

  select exists(select 1 from public.familias where id = OLD.familia_id) into familia_existe;
  if not familia_existe then
    if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
  end if;

  select count(*) into quedan_admins
  from public.miembros
  where familia_id = OLD.familia_id
    and rol = 'admin'
    and user_id <> OLD.user_id;

  if TG_OP = 'UPDATE' and NEW.rol = 'admin' then
    quedan_admins := quedan_admins + 1;
  end if;

  if quedan_admins = 0 then
    raise exception 'No se puede quitar al último administrador de la familia.';
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end $$;

drop trigger if exists miembros_proteger_ultimo_admin on public.miembros;

create trigger miembros_proteger_ultimo_admin
  before delete or update on public.miembros
  for each row execute function public.proteger_ultimo_admin();
