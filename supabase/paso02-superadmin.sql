-- =====================================================================
-- Fade Studio · paso02-superadmin.sql · Tu cuenta de superadmin y el panel de suscripciones
--
-- Ejecutar DESPUÉS de paso01.sql. Se puede ejecutar más de una vez.
--
-- ANTES de ejecutarlo:
--   1) Supabase → Authentication → Users → Add user → Create new user.
--      Tu correo y una clave, marcando "Auto Confirm User".
--   2) Cambia el correo de más abajo (sección 3) por ese MISMO correo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Lo que ve el superadmin
-- ---------------------------------------------------------------------
-- Lista de barberías con su estado de suscripción y un poco de uso.
create or replace function public.admin_barberias()
returns table (
  id uuid, slug text, nombre text, plan text, precio_mensual int, estado text, vence_el date,
  gracia_dias int, notas text, creada_en timestamptz, vigente boolean,
  citas_30d int, ultimo_pago date, dueno_nombre text, dueno_correo text
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.es_superadmin() then raise exception 'No autorizado'; end if;
  return query
  select b.id, b.slug, b.nombre, b.plan, b.precio_mensual, b.estado, b.vence_el,
         b.gracia_dias, b.notas, b.creada_en, public.barberia_vigente(b.id),
         (select count(*)::int from public.citas c
           where c.barberia_id = b.id and c.estado in ('confirmada', 'atendida')
             and c.fecha >= public.hoy_chile() - 30),
         (select max(p.fecha) from public.pagos_suscripcion p where p.barberia_id = b.id),
         (select d.nombre from public.perfiles d where d.barberia_id = b.id and d.rol = 'dueno' order by d.creado_en limit 1),
         (select d.correo from public.perfiles d where d.barberia_id = b.id and d.rol = 'dueno' order by d.creado_en limit 1)
  from public.barberias b
  order by b.nombre;
end $$;

-- Ingresos por mes (últimos 6 meses, incluidos los meses sin pagos).
create or replace function public.admin_ingresos_mensuales()
returns table (mes date, total int, pagos int)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.es_superadmin() then raise exception 'No autorizado'; end if;
  return query
  select m.mes::date,
         coalesce(sum(p.monto), 0)::int,
         count(p.id)::int
  from generate_series(date_trunc('month', public.hoy_chile())::date - interval '5 months',
                       date_trunc('month', public.hoy_chile())::date, interval '1 month') as m(mes)
  left join public.pagos_suscripcion p on date_trunc('month', p.fecha) = m.mes
  group by m.mes
  order by m.mes;
end $$;

-- ---------------------------------------------------------------------
-- 2. Lo que hace el superadmin
-- ---------------------------------------------------------------------
-- Registrar un pago: alarga el vencimiento y deja la barbería activa.
-- Si aún está al día, los meses se suman al vencimiento actual; si ya venció, se cuentan desde hoy.
create or replace function public.admin_registrar_pago(
  p_barberia uuid, p_monto int, p_meses int default 1, p_fecha date default null, p_nota text default ''
) returns date
language plpgsql security definer set search_path = '' as $$
declare b public.barberias; base date; nuevo date; hoy date := public.hoy_chile();
begin
  if not public.es_superadmin() then raise exception 'No autorizado'; end if;
  if p_monto is null or p_monto < 0 then raise exception 'El monto no es válido'; end if;
  if p_meses is null or p_meses < 1 or p_meses > 24 then raise exception 'Los meses deben ser entre 1 y 24'; end if;
  select * into b from public.barberias x where x.id = p_barberia for update;
  if b.id is null then raise exception 'No existe esa barbería'; end if;
  base := case when b.vence_el is null or b.vence_el < hoy then hoy else b.vence_el end;
  nuevo := (base + make_interval(months => p_meses))::date;
  update public.barberias set vence_el = nuevo, estado = 'activa' where id = b.id;
  insert into public.pagos_suscripcion (barberia_id, monto, fecha, periodo_hasta, nota)
  values (b.id, p_monto, coalesce(p_fecha, hoy), nuevo, left(btrim(coalesce(p_nota, '')), 300));
  return nuevo;
end $$;

-- Crea una barbería completa con su dueño. La llama la función "superadmin" (clave de servicio),
-- que antes crea la cuenta de acceso del dueño. No se puede llamar desde la app.
create or replace function public.crear_barberia_completa(
  p_nombre text, p_slug text, p_plan text, p_precio int, p_vence date,
  p_dueno_id uuid, p_dueno_nombre text, p_dueno_correo text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; nombre text := btrim(coalesce(p_nombre, ''));
begin
  if char_length(nombre) < 2 then raise exception 'Escribe el nombre de la barbería'; end if;
  insert into public.barberias (slug, nombre, plan, precio_mensual, vence_el)
  values (lower(btrim(p_slug)), nombre, p_plan, p_precio, p_vence)
  returning id into v_id;

  insert into public.ajustes (barberia_id, nombre) values (v_id, nombre);
  insert into public.datos_transferencia (barberia_id) values (v_id);
  insert into public.perfiles (id, barberia_id, rol, nombre, iniciales, correo, comision_pct, atiende, activo)
  values (p_dueno_id, v_id, 'dueno', btrim(p_dueno_nombre),
          upper(left(regexp_replace(btrim(p_dueno_nombre), '\s.*$', ''), 1) ||
                coalesce(nullif(left(regexp_replace(btrim(p_dueno_nombre), '^\S+\s*', ''), 1), ''), substr(btrim(p_dueno_nombre), 2, 1))),
          lower(btrim(p_dueno_correo)), 0, false, true);

  -- Servicios de ejemplo (el dueño los cambia en Ajustes > Servicios).
  insert into public.servicios (barberia_id, nombre, descripcion, duracion_min, precio, precio_promo, dias_promo, orden) values
    (v_id, 'Corte',        'Corte a tu gusto, terminación limpia.', 60, 10000, null, '{}', 1),
    (v_id, 'Corte + barba', 'Cabello y barba perfilados.',          90, 14000, null, '{}', 2),
    (v_id, 'Barba',        'Perfilado y cuidado de barba.',         30,  6000, null, '{}', 3),
    (v_id, 'Corte niño',   'Corte para los más chicos.',            60,  8000, null, '{}', 4);
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- 3. Quién puede llamar qué
-- ---------------------------------------------------------------------
revoke all on function public.admin_barberias(), public.admin_ingresos_mensuales(),
  public.admin_registrar_pago(uuid, int, int, date, text),
  public.crear_barberia_completa(text, text, text, int, date, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_barberias(), public.admin_ingresos_mensuales(),
  public.admin_registrar_pago(uuid, int, int, date, text) to authenticated;
grant execute on function public.crear_barberia_completa(text, text, text, int, date, uuid, text, text) to service_role;

-- ---------------------------------------------------------------------
-- 4. CAMBIA EL CORREO: te convierte en superadmin
-- ---------------------------------------------------------------------
insert into public.superadmins (usuario_id)
select id from auth.users where lower(email) = lower('CAMBIA-ESTE@CORREO.CL')
on conflict (usuario_id) do nothing;

-- Debe mostrar tu correo. Si sale vacío, el correo no coincide con el del usuario creado.
select u.email, s.creado_en
from public.superadmins s join auth.users u on u.id = s.usuario_id;

notify pgrst, 'reload schema';
