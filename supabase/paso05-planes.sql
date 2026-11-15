-- =====================================================================
-- Fade Studio · paso05-planes.sql · Planes (Básico, Pro, VIP) con precios editables
--                                    y solicitudes de contratación desde la portada
--
-- Ejecutar DESPUÉS de paso01, paso02 y paso03. Se puede ejecutar más de una vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Los planes de una barbería pasan a ser: basico, pro, vip
--    (lo que antes era "completo" pasa a "pro")
-- ---------------------------------------------------------------------
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.barberias'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%plan%'
  loop
    execute format('alter table public.barberias drop constraint %I', c);
  end loop;
end $$;
update public.barberias set plan = 'pro' where plan = 'completo';
alter table public.barberias add constraint barberias_plan_check check (plan in ('basico', 'pro', 'vip'));

-- ---------------------------------------------------------------------
-- 2. Precios de los planes (los edita el superadmin desde su panel)
-- ---------------------------------------------------------------------
create table if not exists public.planes (
  clave           text primary key check (clave in ('basico', 'pro', 'vip')),
  nombre          text not null,
  precio_mensual  int  not null check (precio_mensual >= 0),
  precio_anual    int  not null check (precio_anual >= 0),
  orden           int  not null default 0,
  actualizado_en  timestamptz not null default now()
);
alter table public.planes enable row level security; -- sin políticas: solo se usa por las funciones de abajo

insert into public.planes (clave, nombre, precio_mensual, precio_anual, orden) values
  ('basico', 'Básico', 12990, 129900, 1),
  ('pro',    'Pro',    24990, 249900, 2),
  ('vip',    'VIP',    39990, 399900, 3)
on conflict (clave) do nothing;

-- Lo que ve la portada (público)
create or replace function public.planes_publicos()
returns table (clave text, nombre text, precio_mensual int, precio_anual int)
language sql stable security definer set search_path = '' as $$
  select p.clave, p.nombre, p.precio_mensual, p.precio_anual
  from public.planes p order by p.orden;
$$;

-- Guardar los precios de un plan (solo superadmin)
create or replace function public.admin_guardar_plan(p_clave text, p_mensual int, p_anual int)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_superadmin() then raise exception 'No autorizado'; end if;
  if p_mensual is null or p_mensual < 0 or p_mensual > 10000000 then raise exception 'Precio mensual no válido'; end if;
  if p_anual is null or p_anual < 0 or p_anual > 100000000 then raise exception 'Precio anual no válido'; end if;
  update public.planes
     set precio_mensual = p_mensual, precio_anual = p_anual, actualizado_en = now()
   where clave = p_clave;
  if not found then raise exception 'Plan no encontrado'; end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Solicitudes de contratación (llegan desde la portada)
-- ---------------------------------------------------------------------
create table if not exists public.solicitudes_plan (
  id               uuid primary key default gen_random_uuid(),
  creada_en        timestamptz not null default now(),
  nombre_barberia  text not null check (char_length(nombre_barberia) between 2 and 80),
  contacto         text not null check (char_length(contacto) between 2 and 80),
  telefono         text not null check (char_length(telefono) between 8 and 15),
  correo           text check (correo is null or char_length(correo) <= 120),
  plan             text not null check (plan in ('basico', 'pro', 'vip')),
  ciclo            text not null check (ciclo in ('mensual', 'anual', 'prueba')),
  estado           text not null default 'nueva' check (estado in ('nueva', 'contactada', 'creada', 'descartada')),
  notas            text
);
create index if not exists solicitudes_plan_estado_idx on public.solicitudes_plan (estado, creada_en desc);
alter table public.solicitudes_plan enable row level security; -- sin políticas

-- Crear una solicitud (público). Tope de 3 por teléfono cada 24 horas.
create or replace function public.crear_solicitud_plan(
  p_barberia text, p_contacto text, p_telefono text, p_correo text, p_plan text, p_ciclo text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_tel text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  v_id uuid;
begin
  if char_length(btrim(coalesce(p_barberia, ''))) < 2 then raise exception 'Escribe el nombre de tu barbería'; end if;
  if char_length(btrim(coalesce(p_contacto, ''))) < 2 then raise exception 'Escribe tu nombre'; end if;
  if char_length(v_tel) < 8 or char_length(v_tel) > 15 then raise exception 'Revisa tu número de WhatsApp'; end if;
  if p_plan not in ('basico', 'pro', 'vip') then raise exception 'Elige un plan'; end if;
  if p_ciclo not in ('mensual', 'anual', 'prueba') then raise exception 'Elige cómo pagar'; end if;
  if (select count(*) from public.solicitudes_plan s
       where s.telefono = v_tel and s.creada_en > now() - interval '24 hours') >= 3 then
    raise exception 'Ya recibimos tus solicitudes. Te contactaremos pronto';
  end if;
  insert into public.solicitudes_plan (nombre_barberia, contacto, telefono, correo, plan, ciclo)
  values (left(btrim(p_barberia), 80), left(btrim(p_contacto), 80), v_tel,
          nullif(left(btrim(coalesce(p_correo, '')), 120), ''), p_plan, p_ciclo)
  returning id into v_id;
  return v_id;
end $$;

-- Lista para el superadmin
create or replace function public.admin_solicitudes()
returns table (
  id uuid, creada_en timestamptz, nombre_barberia text, contacto text, telefono text,
  correo text, plan text, ciclo text, estado text, notas text
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.es_superadmin() then raise exception 'No autorizado'; end if;
  return query
  select s.id, s.creada_en, s.nombre_barberia, s.contacto, s.telefono, s.correo, s.plan, s.ciclo, s.estado, s.notas
  from public.solicitudes_plan s
  order by (s.estado = 'nueva') desc, s.creada_en desc
  limit 300;
end $$;

-- Cambiar el estado de una solicitud
create or replace function public.admin_estado_solicitud(p_id uuid, p_estado text, p_notas text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_superadmin() then raise exception 'No autorizado'; end if;
  if p_estado not in ('nueva', 'contactada', 'creada', 'descartada') then raise exception 'Estado no válido'; end if;
  update public.solicitudes_plan
     set estado = p_estado, notas = coalesce(p_notas, notas)
   where id = p_id;
  if not found then raise exception 'Solicitud no encontrada'; end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. Permisos
-- ---------------------------------------------------------------------
revoke all on function public.planes_publicos() from public, anon, authenticated;
revoke all on function public.admin_guardar_plan(text, int, int) from public, anon, authenticated;
revoke all on function public.crear_solicitud_plan(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_solicitudes() from public, anon, authenticated;
revoke all on function public.admin_estado_solicitud(uuid, text, text) from public, anon, authenticated;

grant execute on function public.planes_publicos() to anon, authenticated;
grant execute on function public.crear_solicitud_plan(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.admin_guardar_plan(text, int, int) to authenticated;
grant execute on function public.admin_solicitudes() to authenticated;
grant execute on function public.admin_estado_solicitud(uuid, text, text) to authenticated;

select 'Listo: planes y solicitudes creados' as resultado,
       (select count(*) from public.planes) as planes;
