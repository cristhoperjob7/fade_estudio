-- =====================================================================
-- Fade Studio · paso03.sql · Reserva online, comprobante y revisión
--
-- Ejecutar DESPUÉS de paso01.sql. Se puede ejecutar más de una vez.
--
-- Qué hace:
--   * Funciones públicas para la reserva (el visitante NO lee tablas directo):
--       datos_publicos, barberos_publicos, horas_disponibles, crear_reserva, datos_pago,
--       registrar_comprobante, estado_reserva
--   * Funciones del dueño: aprobar_cita, rechazar_cita
--   * Permiso para que el cliente suba su comprobante al bucket privado,
--     solo mientras su reserva está esperando el pago.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Utilidades
-- ---------------------------------------------------------------------
-- "+56 9 3214 1976", "932141976", "09 3214 1976" -> "56932141976" (o '' si no es válido)
create or replace function public.normalizar_telefono(p_texto text) returns text
language plpgsql immutable set search_path = '' as $$
declare d text := regexp_replace(coalesce(p_texto, ''), '\D', '', 'g');
begin
  d := regexp_replace(d, '^0+', '');
  if d like '56%' then d := substr(d, 3); end if;
  if length(d) = 8 then d := '9' || d; end if;
  if d ~ '^9\d{8}$' then return '56' || d; end if;
  return '';
end $$;

-- Barbería de una dirección (slug), solo si está al día con su suscripción.
create or replace function public.barberia_por_slug(p_slug text) returns uuid
language sql stable security definer set search_path = '' as $$
  select b.id from public.barberias b
  where b.slug = lower(btrim(coalesce(p_slug, ''))) and public.barberia_vigente(b.id)
$$;

-- Las horas guardadas sin comprobante que ya vencieron se liberan.
create or replace function public.expirar_holds() returns void
language sql security definer set search_path = '' as $$
  update public.citas set estado = 'expirada'
  where estado = 'pendiente_pago' and hold_hasta is not null and hold_hasta < now();
$$;

-- ---------------------------------------------------------------------
-- 2. Lo que ve el visitante
-- ---------------------------------------------------------------------
-- Todo lo que necesita la página pública de una barbería, en una sola llamada.
-- Devuelve null si la dirección no existe. 'activa' = false si no está recibiendo reservas.
create or replace function public.datos_publicos(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'slug', b.slug,
    'activa', public.barberia_vigente(b.id),
    'nombre', a.nombre, 'direccion', a.direccion, 'whatsapp', a.whatsapp,
    'hora_apertura', a.hora_apertura, 'hora_cierre', a.hora_cierre,
    'dias_agenda', a.dias_agenda, 'tolerancia_min', a.tolerancia_min,
    'servicios', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'nombre', s.nombre, 'descripcion', s.descripcion, 'duracion_min', s.duracion_min,
               'precio', s.precio, 'precio_promo', s.precio_promo, 'dias_promo', s.dias_promo,
               'activo', s.activo, 'orden', s.orden) order by s.orden, s.precio)
      from public.servicios s where s.barberia_id = b.id and s.activo), '[]'::jsonb))
  from public.barberias b join public.ajustes a on a.barberia_id = b.id
  where b.slug = lower(btrim(coalesce(p_slug, '')))
$$;

create or replace function public.barberos_publicos(p_slug text)
returns table (id uuid, nombre text, iniciales text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nombre, p.iniciales
  from public.perfiles p
  where p.barberia_id = public.barberia_por_slug(p_slug) and p.activo and p.atiende
  order by p.nombre
$$;

-- Horas libres de un día. Si p_barbero es null, devuelve las de todos los barberos.
create or replace function public.horas_disponibles(p_slug text, p_fecha date, p_servicio uuid, p_barbero uuid default null)
returns table (barbero_id uuid, inicio_min int)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  a    public.ajustes;
  dur  int;
  hoy  date := (now() at time zone 'America/Santiago')::date;
  ahora int := extract(hour from (now() at time zone 'America/Santiago'))::int * 60
             + extract(minute from (now() at time zone 'America/Santiago'))::int;
  dow  int;
  v_bid uuid := public.barberia_por_slug(p_slug);
begin
  if v_bid is null then return; end if;
  perform public.expirar_holds();
  select * into a from public.ajustes where barberia_id = v_bid;
  select s.duracion_min into dur from public.servicios s where s.id = p_servicio and s.activo and s.barberia_id = v_bid;
  if dur is null or p_fecha is null then return; end if;
  if p_fecha < hoy or p_fecha > hoy + a.dias_agenda then return; end if;
  dow := extract(dow from p_fecha)::int;

  return query
  with barberos as (
    select p.id as bid from public.perfiles p
    where p.barberia_id = v_bid and p.activo and p.atiende and (p_barbero is null or p.id = p_barbero)
  ),
  ventanas as (
    -- Si el barbero tiene horario propio se usa ese; si no, el general de la barbería.
    select b.bid,
           coalesce(h.desde_min, a.hora_apertura) as desde,
           coalesce(h.hasta_min, a.hora_cierre)   as hasta
    from barberos b
    left join public.horarios h on h.barbero_id = b.bid and h.dia_semana = dow
    where h.id is not null
       or not exists (select 1 from public.horarios h2 where h2.barbero_id = b.bid)
  ),
  candidatos as (
    select v.bid, g.ini
    from ventanas v, generate_series(v.desde, v.hasta - dur, a.paso_min) as g(ini)
  )
  select c.bid, c.ini
  from candidatos c
  where (p_fecha > hoy or c.ini >= ahora + 15)
    and not exists (
      select 1 from public.citas ci
      where ci.barbero_id = c.bid and ci.fecha = p_fecha
        and ci.estado in ('pendiente_pago', 'por_revisar', 'confirmada', 'atendida')
        and int4range(ci.inicio_min, ci.inicio_min + ci.dur_min) && int4range(c.ini, c.ini + dur))
    and not exists (
      select 1 from public.bloqueos bl
      where bl.barbero_id = c.bid and bl.fecha = p_fecha
        and int4range(bl.desde_min, bl.hasta_min) && int4range(c.ini, c.ini + dur))
  order by c.ini, c.bid;
end $$;

-- Guarda la hora (por hold_min minutos) mientras el cliente paga.
create or replace function public.crear_reserva(
  p_slug text, p_servicio uuid, p_barbero uuid, p_fecha date, p_inicio int, p_nombre text, p_telefono text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a         public.ajustes;
  s         public.servicios;
  nombre    text := btrim(coalesce(p_nombre, ''));
  tel       text := public.normalizar_telefono(p_telefono);
  v_barbero uuid;
  v_precio  int;
  v_cliente uuid;
  v_codigo  text;
  v_token   text;
  v_hold    timestamptz;
  bid       uuid := public.barberia_por_slug(p_slug);
begin
  if bid is null then raise exception 'Esta barbería no está recibiendo reservas por ahora'; end if;
  perform public.expirar_holds();
  select * into a from public.ajustes where barberia_id = bid;
  select * into s from public.servicios sv where sv.id = p_servicio and sv.activo and sv.barberia_id = bid;
  if s.id is null then raise exception 'Ese servicio no está disponible'; end if;
  if char_length(nombre) < 2 or char_length(nombre) > 80 then raise exception 'Escribe tu nombre'; end if;
  if tel = '' then raise exception 'El WhatsApp no es válido'; end if;
  if (select count(*) from public.citas ci where ci.barberia_id = bid and ci.cliente_telefono = tel and ci.estado = 'pendiente_pago') >= 3 then
    raise exception 'Tienes varias reservas sin pagar. Termina una o espera unos minutos';
  end if;

  select h.barbero_id into v_barbero
  from public.horas_disponibles(p_slug, p_fecha, p_servicio, p_barbero) h
  where h.inicio_min = p_inicio
  order by random() limit 1;
  if v_barbero is null then raise exception 'Esa hora ya no está disponible'; end if;

  v_precio := case when s.precio_promo is not null and extract(dow from p_fecha)::int = any (s.dias_promo)
                   then s.precio_promo else s.precio end;

  insert into public.clientes (barberia_id, nombre, telefono) values (bid, nombre, tel)
  on conflict (barberia_id, telefono) do update set telefono = excluded.telefono
  returning id into v_cliente;

  loop
    v_codigo := 'FS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));
    exit when not exists (select 1 from public.citas ci where ci.codigo = v_codigo);
  end loop;
  v_hold := now() + make_interval(mins => a.hold_min);

  begin
    insert into public.citas (barberia_id, codigo, barbero_id, cliente_id, servicio_id, servicio_nombre, precio, fecha,
                              inicio_min, dur_min, cliente_nombre, cliente_telefono, estado, origen, hold_hasta)
    values (bid, v_codigo, v_barbero, v_cliente, s.id, s.nombre, v_precio, p_fecha,
            p_inicio, s.duracion_min, nombre, tel, 'pendiente_pago', 'online', v_hold)
    returning token_seguimiento into v_token;
  exception when exclusion_violation then
    raise exception 'Esa hora ya no está disponible';
  end;

  return jsonb_build_object('codigo', v_codigo, 'token', v_token, 'hold_hasta', v_hold,
                            'monto', v_precio, 'barbero_id', v_barbero);
end $$;

-- Datos para pagar. Solo si la reserva existe, es del cliente (token) y sigue vigente.
create or replace function public.datos_pago(p_codigo text, p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.citas; t public.datos_transferencia;
begin
  perform public.expirar_holds();
  select * into c from public.citas ci
  where ci.codigo = upper(btrim(p_codigo)) and ci.token_seguimiento = p_token and ci.estado = 'pendiente_pago';
  if c.id is null then raise exception 'La reserva venció o no existe'; end if;
  select * into t from public.datos_transferencia where barberia_id = c.barberia_id;
  return jsonb_build_object(
    'monto', c.precio, 'hold_hasta', c.hold_hasta,
    'banco', t.banco, 'tipo_cuenta', t.tipo_cuenta, 'numero_cuenta', t.numero_cuenta,
    'rut', t.rut, 'titular', t.titular, 'correo', t.correo);
end $$;

-- Ruta que debe tener el archivo: <codigo>/<token>...  (así nadie sube a la reserva de otro)
create or replace function public.puede_subir_comprobante(p_nombre text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.citas ci
    where ci.estado = 'pendiente_pago' and ci.hold_hasta > now()
      and ci.codigo = split_part(p_nombre, '/', 1)
      and starts_with(split_part(p_nombre, '/', 2), ci.token_seguimiento)
  )
$$;

-- El cliente ya subió el archivo: pasa a revisión del dueño.
create or replace function public.registrar_comprobante(p_codigo text, p_token text, p_ruta text) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.citas;
begin
  perform public.expirar_holds();
  select * into c from public.citas ci
  where ci.codigo = upper(btrim(p_codigo)) and ci.token_seguimiento = p_token and ci.estado = 'pendiente_pago';
  if c.id is null then raise exception 'La reserva venció o no existe'; end if;
  if split_part(p_ruta, '/', 1) <> c.codigo or not starts_with(split_part(p_ruta, '/', 2), c.token_seguimiento) then
    raise exception 'Archivo no válido';
  end if;
  if to_regclass('storage.objects') is not null then
    if not exists (select 1 from storage.objects o where o.bucket_id = 'comprobantes' and o.name = p_ruta) then
      raise exception 'No encontramos el archivo. Vuelve a subirlo';
    end if;
  end if;
  update public.citas
     set estado = 'por_revisar', comprobante_path = p_ruta, comprobante_en = now(), hold_hasta = null
   where id = c.id;
end $$;

-- Seguimiento: el cliente ve cómo va su reserva con su código y su token.
create or replace function public.estado_reserva(p_codigo text, p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.citas; a public.ajustes; b text;
begin
  perform public.expirar_holds();
  select * into c from public.citas ci
  where ci.codigo = upper(btrim(p_codigo)) and ci.token_seguimiento = p_token;
  if c.id is null then return null; end if;
  select * into a from public.ajustes where barberia_id = c.barberia_id;
  select p.nombre into b from public.perfiles p where p.id = c.barbero_id;
  return jsonb_build_object(
    'slug', (select x.slug from public.barberias x where x.id = c.barberia_id),
    'codigo', c.codigo, 'estado', c.estado, 'servicio', c.servicio_nombre, 'barbero', b,
    'fecha', c.fecha, 'inicio_min', c.inicio_min, 'dur_min', c.dur_min, 'precio', c.precio,
    'cliente', c.cliente_nombre, 'motivo_rechazo', c.motivo_rechazo, 'hold_hasta', c.hold_hasta,
    'direccion', a.direccion, 'whatsapp', a.whatsapp, 'tolerancia_min', a.tolerancia_min);
end $$;

-- ---------------------------------------------------------------------
-- 3. Lo que hace el dueño
-- ---------------------------------------------------------------------
-- Aprobar: la hora queda confirmada y se registra el cobro por transferencia.
create or replace function public.aprobar_cita(p_cita uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.citas;
begin
  if not public.es_dueno() then raise exception 'Solo el dueño puede aprobar'; end if;
  select * into c from public.citas ci where ci.id = p_cita and ci.barberia_id = public.mi_barberia() for update;
  if c.id is null or c.estado <> 'por_revisar' then raise exception 'Esta reserva ya fue revisada'; end if;
  update public.citas set estado = 'confirmada', revisada_por = auth.uid(), revisada_en = now(), motivo_rechazo = ''
   where id = c.id;
  insert into public.cobros (barberia_id, cita_id, barbero_id, cliente_id, monto, metodo)
  values (c.barberia_id, c.id, c.barbero_id, c.cliente_id, c.precio, 'transferencia');
end $$;

-- Rechazar: la hora se libera.
create or replace function public.rechazar_cita(p_cita uuid, p_motivo text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare c public.citas;
begin
  if not public.es_dueno() then raise exception 'Solo el dueño puede rechazar'; end if;
  select * into c from public.citas ci where ci.id = p_cita and ci.barberia_id = public.mi_barberia() for update;
  if c.id is null or c.estado <> 'por_revisar' then raise exception 'Esta reserva ya fue revisada'; end if;
  update public.citas
     set estado = 'rechazada', revisada_por = auth.uid(), revisada_en = now(),
         motivo_rechazo = left(btrim(coalesce(p_motivo, '')), 300)
   where id = c.id;
end $$;

-- ---------------------------------------------------------------------
-- 4. Quién puede llamar qué
-- (Supabase da permiso a anon y authenticated por defecto: se quita y se da solo lo necesario)
-- ---------------------------------------------------------------------
revoke all on function public.normalizar_telefono(text), public.expirar_holds(), public.barberia_por_slug(text),
  public.datos_publicos(text), public.barberos_publicos(text), public.horas_disponibles(text, date, uuid, uuid),
  public.crear_reserva(text, uuid, uuid, date, int, text, text), public.datos_pago(text, text),
  public.puede_subir_comprobante(text), public.registrar_comprobante(text, text, text),
  public.estado_reserva(text, text), public.aprobar_cita(uuid), public.rechazar_cita(uuid, text)
  from public, anon, authenticated;

grant execute on function public.datos_publicos(text), public.barberos_publicos(text),
  public.horas_disponibles(text, date, uuid, uuid),
  public.crear_reserva(text, uuid, uuid, date, int, text, text), public.datos_pago(text, text),
  public.puede_subir_comprobante(text), public.registrar_comprobante(text, text, text),
  public.estado_reserva(text, text) to anon, authenticated;
grant execute on function public.aprobar_cita(uuid), public.rechazar_cita(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Subida del comprobante (bucket privado)
-- ---------------------------------------------------------------------
do $$ begin
  if to_regclass('storage.buckets') is not null then
    -- Máximo 5 MB y solo imágenes o PDF.
    begin
      update storage.buckets
         set file_size_limit = 5242880,
             allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
       where id = 'comprobantes';
    exception when undefined_column then null; end;

    execute 'drop policy if exists "comprobantes cliente sube" on storage.objects';
    execute $p$ create policy "comprobantes cliente sube" on storage.objects for insert to anon, authenticated
               with check (bucket_id = 'comprobantes' and public.puede_subir_comprobante(name)) $p$;
  end if;
end $$;

-- Avisa a la API de Supabase que hay funciones nuevas.
notify pgrst, 'reload schema';
