-- Contraseña provisoria: cuando el admin genera una, la persona tiene que elegir la suya al entrar
alter table public.profiles add column if not exists debe_cambiar_clave boolean not null default false;

create or replace function public.clave_cambiada() returns void
language sql security definer set search_path = public as $$
  update public.profiles set debe_cambiar_clave = false where id = auth.uid();
$$;
grant execute on function public.clave_cambiada() to authenticated;
