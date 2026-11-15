-- =====================================================================
-- Fade Studio · paso01.sql · Base de datos (varias barberías)
-- Pégalo completo en Supabase → SQL Editor → New query → Run.
-- Se puede ejecutar más de una vez sin romper nada.
--
-- Cada barbería tiene sus propios datos, separados de las demás.
-- Roles: superadmin (tú, administra las barberías y sus suscripciones),
--        dueno (todo en su barbería) y barbero (solo su agenda).
-- Tiempo: las horas se guardan como minutos desde las 00:00 (600 = 10:00).
-- Días de la semana: 0 = domingo, 1 = lunes ... 6 = sábado.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------

-- Cada barbería cliente. Aquí vive su plan y hasta cuándo está pagada.
create table if not exists public.barberias (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  nombre         text not null,
  plan           text not null default 'basico' check (plan in ('basico', 'pro', 'vip')),
  precio_mensual int  not null default 0 check (precio_mensual >= 0),
  estado         text not null default 'activa' check (estado in ('activa', 'suspendida')),
  vence_el       date,                                    -- último día pagado (null = sin vencimiento)
  gracia_dias    int  not null default 3 check (gracia_dias between 0 and 30),
  notas          text not null default '',
  creada_en      timestamptz not null default now()
);

-- Tú (y quien tú quieras): administradores de Fade Studio.
create table if not exists public.superadmins (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  creado_en  timestamptz not null default now()
);

-- Pagos de suscripción que registras a mano.
create table if not exists public.pagos_suscripcion (
  id            uuid primary key default gen_random_uuid(),
  barberia_id   uuid not null references public.barberias (id) on delete cascade,
  monto         int  not null check (monto >= 0),
  fecha         date not null default ((now() at time zone 'America/Santiago')::date),
  periodo_hasta date,
  nota          text not null default '',
  creado_en     timestamptz not null default now()
);
create index if not exists pagos_barberia_idx on public.pagos_suscripcion (barberia_id, fecha desc);

-- Datos públicos de cada barbería (una fila por barbería).
create table if not exists public.ajustes (
  barberia_id     uuid primary key references public.barberias (id) on delete cascade,
  nombre          text not null,
  direccion       text not null default '',
  whatsapp        text not null default '',          -- WhatsApp del dueño, solo dígitos con 56
  hora_apertura   int  not null default 600  check (hora_apertura between 0 and 1439),
  hora_cierre     int  not null default 1200 check (hora_cierre between 1 and 1440),
  paso_min        int  not null default 30   check (paso_min in (15, 30, 60)),
  dias_agenda     int  not null default 15   check (dias_agenda between 1 and 90),
  hold_min        int  not null default 20   check (hold_min between 5 and 120),
  tolerancia_min  int  not null default 15   check (tolerancia_min between 0 and 60),
  actualizado_en  timestamptz not null default now(),
  check (hora_cierre > hora_apertura)
);

-- Datos de transferencia: SOLO el dueño los ve. El cliente los recibe en el paso de pago.
create table if not exists public.datos_transferencia (
  barberia_id   uuid primary key references public.barberias (id) on delete cascade,
  banco         text not null default '',
  tipo_cuenta   text not null default '',
  numero_cuenta text not null default '',
  rut           text not null default '',
  titular       text not null default '',
  correo        text not null default '',
  actualizado_en timestamptz not null default now()
);

-- Personal: el dueño y los barberos. El id es el mismo de Supabase Auth.
create table if not exists public.perfiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  barberia_id  uuid not null references public.barberias (id) on delete cascade,
  rol          text not null check (rol in ('dueno', 'barbero')),
  nombre       text not null,
  iniciales    text not null default '',
  telefono     text not null default '',
  correo       text not null default '',             -- solo informativo (el acceso real está en auth.users)
  comision_pct numeric(5,2) not null default 40 check (comision_pct between 0 and 100),
  activo       boolean not null default true,
  atiende      boolean not null default true,        -- aparece en la reserva online
  creado_en    timestamptz not null default now()
);
create index if not exists perfiles_barberia_idx on public.perfiles (barberia_id);

-- ---------------------------------------------------------------------
-- Funciones de apoyo (van antes de las tablas que las usan)
--    SECURITY DEFINER + search_path vacío: no dependen del usuario que las llama.
-- ---------------------------------------------------------------------
create or replace function public.hoy_chile() returns date
language sql stable set search_path = '' as $$ select (now() at time zone 'America/Santiago')::date $$;

-- ¿Esta barbería está al día? (activa y con la suscripción pagada, contando los días de gracia)
create or replace function public.barberia_vigente(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.barberias b
    where b.id = p_id and b.estado = 'activa'
      and (b.vence_el is null or b.vence_el + b.gracia_dias >= public.hoy_chile())
  )
$$;

-- Barbería de la persona que tiene la sesión abierta (null si no es personal activo).
-- Es plpgsql a propósito: así se puede usar como valor por defecto antes de que existan todas las tablas.
create or replace function public.mi_barberia() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare r uuid;
begin
  select p.barberia_id into r from public.perfiles p where p.id = auth.uid() and p.activo;
  return r;
end $$;

create or replace function public.es_superadmin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.superadmins s where s.usuario_id = auth.uid())
$$;

create or replace function public.es_dueno() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = auth.uid() and p.rol = 'dueno' and p.activo and public.barberia_vigente(p.barberia_id)
  )
$$;

create or replace function public.es_personal() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfiles p
    where p.id = auth.uid() and p.activo and public.barberia_vigente(p.barberia_id)
  )
$$;

create table if not exists public.servicios (
  id           uuid primary key default gen_random_uuid(),
  barberia_id  uuid not null default public.mi_barberia() references public.barberias (id) on delete cascade,
  nombre       text not null,
  descripcion  text not null default '',
  duracion_min int  not null check (duracion_min > 0),
  precio       int  not null check (precio >= 0),
  precio_promo int  check (precio_promo >= 0),
  dias_promo   int[] not null default '{1,2,3,4}',   -- promo de lunes a jueves
  activo       boolean not null default true,
  orden        int not null default 0,
  creado_en    timestamptz not null default now(),
  unique (barberia_id, nombre)
);

create table if not exists public.clientes (
  id        uuid primary key default gen_random_uuid(),
  barberia_id uuid not null default public.mi_barberia() references public.barberias (id) on delete cascade,
  nombre    text not null,
  telefono  text not null,
  email     text not null default '',
  notas     text not null default '',
  creado_en timestamptz not null default now(),
  unique (barberia_id, telefono)
);

-- Horario semanal de cada barbero. Si un barbero no tiene filas, rige el horario de ajustes.
create table if not exists public.horarios (
  id         uuid primary key default gen_random_uuid(),
  barberia_id uuid not null default public.mi_barberia() references public.barberias (id) on delete cascade,
  barbero_id uuid not null references public.perfiles (id) on delete cascade,
  dia_semana int  not null check (dia_semana between 0 and 6),
  desde_min  int  not null check (desde_min between 0 and 1439),
  hasta_min  int  not null check (hasta_min between 1 and 1440),
  unique (barbero_id, dia_semana),
  check (hasta_min > desde_min)
);

-- Horas bloqueadas (vacaciones, trámites, descansos).
create table if not exists public.bloqueos (
  id         uuid primary key default gen_random_uuid(),
  barberia_id uuid not null default public.mi_barberia() references public.barberias (id) on delete cascade,
  barbero_id uuid not null references public.perfiles (id) on delete cascade,
  fecha      date not null,
  desde_min  int  not null check (desde_min between 0 and 1439),
  hasta_min  int  not null check (hasta_min between 1 and 1440),
  motivo     text not null default '',
  check (hasta_min > desde_min)
);

create table if not exists public.citas (
  id                  uuid primary key default gen_random_uuid(),
  barberia_id uuid not null default public.mi_barberia() references public.barberias (id) on delete cascade,
  codigo              text not null unique,           -- lo ve el cliente, ej. FS-7K2Q9
  token_seguimiento   text not null default replace(gen_random_uuid()::text, '-', ''),
  barbero_id          uuid not null references public.perfiles (id),
  cliente_id          uuid references public.clientes (id),
  servicio_id         uuid references public.servicios (id) on delete set null,
  servicio_nombre     text not null,                  -- copia por si el servicio cambia
  precio              int  not null check (precio >= 0),   -- precio cobrado (ya con promo)
  fecha               date not null,
  inicio_min          int  not null check (inicio_min between 0 and 1439),
  dur_min             int  not null check (dur_min > 0),
  cliente_nombre      text not null,
  cliente_telefono    text not null,
  cliente_email       text not null default '',
  estado              text not null default 'pendiente_pago'
                      check (estado in ('pendiente_pago', 'por_revisar', 'confirmada', 'atendida',
                                        'rechazada', 'cancelada', 'no_llego', 'expirada')),
  origen              text not null default 'online' check (origen in ('online', 'interna')),
  hold_hasta          timestamptz,                    -- hasta cuándo se guarda la hora sin comprobante
  comprobante_path    text,
  comprobante_en      timestamptz,
  revisada_por        uuid references public.perfiles (id),
  revisada_en         timestamptz,
  motivo_rechazo      text not null default '',
  creada_en           timestamptz not null default now(),
  actualizada_en      timestamptz not null default now()
);

-- Nunca dos citas activas del mismo barbero que se crucen.
-- La base lo garantiza aunque dos clientes reserven al mismo tiempo.
do $$ begin
  alter table public.citas add constraint citas_sin_cruce
    exclude using gist (
      barbero_id with =,
      fecha with =,
      int4range(inicio_min, inicio_min + dur_min) with &&
    ) where (estado in ('pendiente_pago', 'por_revisar', 'confirmada', 'atendida'));
exception when duplicate_object or duplicate_table then null; end $$;

create index if not exists citas_barberia_idx on public.citas (barberia_id, fecha);
create index if not exists citas_fecha_idx on public.citas (fecha, barbero_id);
create index if not exists citas_estado_idx on public.citas (estado);
create index if not exists citas_telefono_idx on public.citas (cliente_telefono);

create table if not exists public.cierres_caja (
  id               uuid primary key default gen_random_uuid(),
  barberia_id uuid not null default public.mi_barberia() references public.barberias (id) on delete cascade,
  fecha            date not null,
  efectivo         int not null default 0,
  tarjeta          int not null default 0,
  transferencia    int not null default 0,
  efectivo_contado int,
  diferencia       int,
  nota             text not null default '',
  cerrado_por      uuid references public.perfiles (id),
  creado_en        timestamptz not null default now(),
  unique (barberia_id, fecha)
);

create table if not exists public.cobros (
  id             uuid primary key default gen_random_uuid(),
  barberia_id uuid not null default public.mi_barberia() references public.barberias (id) on delete cascade,
  cita_id        uuid references public.citas (id) on delete set null,
  barbero_id     uuid not null references public.perfiles (id),
  cliente_id     uuid references public.clientes (id),
  monto          int  not null check (monto >= 0),
  metodo         text not null check (metodo in ('efectivo', 'tarjeta', 'transferencia')),
  fecha          date not null default ((now() at time zone 'America/Santiago')::date),
  comision_pct   numeric(5,2),                         -- se copia del barbero al cobrar
  comision_monto int,
  cierre_id      uuid references public.cierres_caja (id),
  creado_en      timestamptz not null default now()
);
create index if not exists cobros_fecha_idx on public.cobros (fecha, barbero_id);

-- Registro de avisos (hoy manual por WhatsApp; mañana lo usará el bot).
create table if not exists public.avisos (
  id        uuid primary key default gen_random_uuid(),
  barberia_id uuid not null default public.mi_barberia() references public.barberias (id) on delete cascade,
  cita_id   uuid references public.citas (id) on delete cascade,
  canal     text not null check (canal in ('whatsapp', 'correo', 'app')),
  tipo      text not null,                            -- ej. reserva_nueva, aprobada, rechazada
  estado    text not null default 'pendiente' check (estado in ('pendiente', 'enviado', 'error')),
  detalle   jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Funciones de apoyo
--    SECURITY DEFINER + search_path vacío: no dependen del usuario que las llama.
-- ---------------------------------------------------------------------
create or replace function public.tocar_actualizado() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'citas' then new.actualizada_en := now(); else new.actualizado_en := now(); end if;
  return new;
end $$;

drop trigger if exists ajustes_tocar on public.ajustes;
create trigger ajustes_tocar before update on public.ajustes for each row execute function public.tocar_actualizado();
drop trigger if exists transferencia_tocar on public.datos_transferencia;
create trigger transferencia_tocar before update on public.datos_transferencia for each row execute function public.tocar_actualizado();
drop trigger if exists citas_tocar on public.citas;
create trigger citas_tocar before update on public.citas for each row execute function public.tocar_actualizado();

-- El barbero solo puede cambiar el ESTADO de sus citas (atendida / no llegó).
-- El dueño, el SQL Editor y el servidor (sin sesión de usuario) pueden cambiar todo.
create or replace function public.citas_limitar_barbero() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.es_dueno() then return new; end if;
  if (to_jsonb(new) - 'estado' - 'actualizada_en') is distinct from (to_jsonb(old) - 'estado' - 'actualizada_en') then
    raise exception 'Solo puedes cambiar el estado de la cita';
  end if;
  if new.estado not in ('confirmada', 'atendida', 'no_llego') then
    raise exception 'Estado no permitido para un barbero';
  end if;
  return new;
end $$;
drop trigger if exists citas_limitar on public.citas;
create trigger citas_limitar before update on public.citas for each row execute function public.citas_limitar_barbero();

-- Al registrar un cobro se copia el % de comisión del barbero (queda fijo aunque el % cambie después).
create or replace function public.cobros_comision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.comision_pct is null then
    select p.comision_pct into new.comision_pct from public.perfiles p where p.id = new.barbero_id;
  end if;
  new.comision_monto := round(new.monto * coalesce(new.comision_pct, 0) / 100.0);
  return new;
end $$;
drop trigger if exists cobros_comision_t on public.cobros;
create trigger cobros_comision_t before insert on public.cobros for each row execute function public.cobros_comision();

-- Un barbero solo puede aparecer en datos de SU barbería (evita mezclar barberías).
create or replace function public.validar_barbero_barberia() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.perfiles p where p.id = new.barbero_id and p.barberia_id = new.barberia_id) then
    raise exception 'Ese barbero no pertenece a esta barbería';
  end if;
  return new;
end $$;
drop trigger if exists citas_valida_barbero on public.citas;
create trigger citas_valida_barbero before insert or update of barbero_id, barberia_id on public.citas
  for each row execute function public.validar_barbero_barberia();
drop trigger if exists cobros_valida_barbero on public.cobros;
create trigger cobros_valida_barbero before insert or update of barbero_id, barberia_id on public.cobros
  for each row execute function public.validar_barbero_barberia();
drop trigger if exists horarios_valida_barbero on public.horarios;
create trigger horarios_valida_barbero before insert or update of barbero_id, barberia_id on public.horarios
  for each row execute function public.validar_barbero_barberia();
drop trigger if exists bloqueos_valida_barbero on public.bloqueos;
create trigger bloqueos_valida_barbero before insert or update of barbero_id, barberia_id on public.bloqueos
  for each row execute function public.validar_barbero_barberia();

-- ---------------------------------------------------------------------
-- 3. Seguridad por filas (RLS)
--    Regla de oro: cada persona solo ve y toca lo de SU barbería.
-- ---------------------------------------------------------------------
alter table public.barberias           enable row level security;
alter table public.superadmins         enable row level security;
alter table public.pagos_suscripcion   enable row level security;
alter table public.ajustes             enable row level security;
alter table public.datos_transferencia enable row level security;
alter table public.perfiles            enable row level security;
alter table public.servicios           enable row level security;
alter table public.clientes            enable row level security;
alter table public.horarios            enable row level security;
alter table public.bloqueos            enable row level security;
alter table public.citas               enable row level security;
alter table public.cobros              enable row level security;
alter table public.cierres_caja        enable row level security;
alter table public.avisos              enable row level security;

-- Superadmin: administra barberías y pagos. NO ve las citas ni los clientes de las barberías.
drop policy if exists "superadmins yo" on public.superadmins;
create policy "superadmins yo" on public.superadmins for select to authenticated using (usuario_id = auth.uid());
drop policy if exists "barberias superadmin" on public.barberias;
create policy "barberias superadmin" on public.barberias for all to authenticated
  using (public.es_superadmin()) with check (public.es_superadmin());
drop policy if exists "pagos superadmin" on public.pagos_suscripcion;
create policy "pagos superadmin" on public.pagos_suscripcion for all to authenticated
  using (public.es_superadmin()) with check (public.es_superadmin());

-- ajustes: el personal ve los de su barbería; solo el dueño los edita.
-- (El visitante los recibe por la función datos_publicos, no leyendo la tabla.)
drop policy if exists "ajustes lectura" on public.ajustes;
create policy "ajustes lectura" on public.ajustes for select to authenticated
  using (barberia_id = public.mi_barberia() and public.es_personal());
drop policy if exists "ajustes dueño edita" on public.ajustes;
create policy "ajustes dueño edita" on public.ajustes for update to authenticated
  using (barberia_id = public.mi_barberia() and public.es_dueno())
  with check (barberia_id = public.mi_barberia() and public.es_dueno());

drop policy if exists "transferencia dueño" on public.datos_transferencia;
create policy "transferencia dueño" on public.datos_transferencia for all to authenticated
  using (barberia_id = public.mi_barberia() and public.es_dueno())
  with check (barberia_id = public.mi_barberia() and public.es_dueno());

-- perfiles: cada uno ve el suyo; el dueño ve y administra los de su barbería.
drop policy if exists "perfiles lectura" on public.perfiles;
create policy "perfiles lectura" on public.perfiles for select to authenticated
  using (id = auth.uid() or (barberia_id = public.mi_barberia() and public.es_dueno()));
drop policy if exists "perfiles dueño escribe" on public.perfiles;
create policy "perfiles dueño escribe" on public.perfiles for all to authenticated
  using (barberia_id = public.mi_barberia() and public.es_dueno())
  with check (barberia_id = public.mi_barberia() and public.es_dueno());

drop policy if exists "servicios lectura" on public.servicios;
create policy "servicios lectura" on public.servicios for select to authenticated
  using (barberia_id = public.mi_barberia() and public.es_personal());
drop policy if exists "servicios dueño escribe" on public.servicios;
create policy "servicios dueño escribe" on public.servicios for all to authenticated
  using (barberia_id = public.mi_barberia() and public.es_dueno())
  with check (barberia_id = public.mi_barberia() and public.es_dueno());

-- clientes: el dueño todos los de su barbería; el barbero solo los que tienen cita con él.
drop policy if exists "clientes dueño" on public.clientes;
create policy "clientes dueño" on public.clientes for all to authenticated
  using (barberia_id = public.mi_barberia() and public.es_dueno())
  with check (barberia_id = public.mi_barberia() and public.es_dueno());
drop policy if exists "clientes barbero lee" on public.clientes;
create policy "clientes barbero lee" on public.clientes for select to authenticated
  using (public.es_personal() and exists (select 1 from public.citas c where c.cliente_id = clientes.id and c.barbero_id = auth.uid()));

drop policy if exists "horarios lectura" on public.horarios;
create policy "horarios lectura" on public.horarios for select to authenticated
  using (barberia_id = public.mi_barberia() and public.es_personal());
drop policy if exists "horarios dueño escribe" on public.horarios;
create policy "horarios dueño escribe" on public.horarios for all to authenticated
  using (barberia_id = public.mi_barberia() and public.es_dueno())
  with check (barberia_id = public.mi_barberia() and public.es_dueno());

drop policy if exists "bloqueos dueño" on public.bloqueos;
create policy "bloqueos dueño" on public.bloqueos for all to authenticated
  using (barberia_id = public.mi_barberia() and public.es_dueno())
  with check (barberia_id = public.mi_barberia() and public.es_dueno());
drop policy if exists "bloqueos barbero" on public.bloqueos;
create policy "bloqueos barbero" on public.bloqueos for all to authenticated
  using (barberia_id = public.mi_barberia() and barbero_id = auth.uid() and public.es_personal())
  with check (barberia_id = public.mi_barberia() and barbero_id = auth.uid() and public.es_personal());

-- citas: el dueño todas las de su barbería. El barbero solo las suyas YA APROBADAS.
drop policy if exists "citas dueño" on public.citas;
create policy "citas dueño" on public.citas for all to authenticated
  using (barberia_id = public.mi_barberia() and public.es_dueno())
  with check (barberia_id = public.mi_barberia() and public.es_dueno());
drop policy if exists "citas barbero lee" on public.citas;
create policy "citas barbero lee" on public.citas for select to authenticated
  using (barberia_id = public.mi_barberia() and barbero_id = auth.uid() and public.es_personal()
         and estado in ('confirmada', 'atendida', 'no_llego', 'cancelada'));
drop policy if exists "citas barbero estado" on public.citas;
create policy "citas barbero estado" on public.citas for update to authenticated
  using (barberia_id = public.mi_barberia() and barbero_id = auth.uid() and public.es_personal()
         and estado in ('confirmada', 'atendida', 'no_llego'))
  with check (barberia_id = public.mi_barberia() and barbero_id = auth.uid() and estado in ('confirmada', 'atendida', 'no_llego'));

drop policy if exists "cobros dueño" on public.cobros;
create policy "cobros dueño" on public.cobros for all to authenticated
  using (barberia_id = public.mi_barberia() and public.es_dueno())
  with check (barberia_id = public.mi_barberia() and public.es_dueno());
drop policy if exists "cobros barbero lee" on public.cobros;
create policy "cobros barbero lee" on public.cobros for select to authenticated
  using (barberia_id = public.mi_barberia() and barbero_id = auth.uid() and public.es_personal());
drop policy if exists "cobros barbero crea" on public.cobros;
create policy "cobros barbero crea" on public.cobros for insert to authenticated
  with check (barberia_id = public.mi_barberia() and barbero_id = auth.uid() and public.es_personal() and cierre_id is null);

drop policy if exists "cierres dueño" on public.cierres_caja;
create policy "cierres dueño" on public.cierres_caja for all to authenticated
  using (barberia_id = public.mi_barberia() and public.es_dueno())
  with check (barberia_id = public.mi_barberia() and public.es_dueno());
drop policy if exists "avisos dueño" on public.avisos;
create policy "avisos dueño" on public.avisos for all to authenticated
  using (barberia_id = public.mi_barberia() and public.es_dueno())
  with check (barberia_id = public.mi_barberia() and public.es_dueno());

-- El visitante sin sesión no lee ninguna tabla (todo lo público pasa por funciones).
revoke all on public.barberias, public.superadmins, public.pagos_suscripcion, public.ajustes,
              public.datos_transferencia, public.perfiles, public.servicios, public.clientes, public.horarios,
              public.bloqueos, public.citas, public.cobros, public.cierres_caja, public.avisos from anon;

-- ---------------------------------------------------------------------
-- 4. Datos de la sesión (para que la app sepa quién eres)
-- ---------------------------------------------------------------------
create or replace function public.soy_superadmin() returns boolean
language sql stable security definer set search_path = '' as $$ select public.es_superadmin() $$;

-- Estado de la barbería de quien tiene la sesión abierta (también cuando está vencida).
create or replace function public.mi_barberia_info() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', b.id, 'slug', b.slug, 'nombre', b.nombre, 'plan', b.plan, 'estado', b.estado,
    'vence_el', b.vence_el, 'vigente', public.barberia_vigente(b.id))
  from public.barberias b
  where b.id = public.mi_barberia()
$$;

revoke all on function public.soy_superadmin(), public.mi_barberia_info() from public, anon;
grant execute on function public.soy_superadmin(), public.mi_barberia_info() to authenticated;

-- ---------------------------------------------------------------------
-- 5. Tiempo real y archivos
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['citas', 'cobros'] loop
      if not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- El dueño solo ve los comprobantes de las citas de SU barbería.
create or replace function public.puede_ver_comprobante(p_nombre text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.es_dueno() and exists (
    select 1 from public.citas c
    where c.codigo = split_part(p_nombre, '/', 1) and c.barberia_id = public.mi_barberia()
  )
$$;
revoke all on function public.puede_ver_comprobante(text) from public, anon;
grant execute on function public.puede_ver_comprobante(text) to authenticated;

-- Bucket privado para los comprobantes.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('comprobantes', 'comprobantes', false)
    on conflict (id) do nothing;
    execute 'drop policy if exists "comprobantes dueño lee" on storage.objects';
    execute $p$ create policy "comprobantes dueño lee" on storage.objects for select to authenticated
               using (bucket_id = 'comprobantes' and public.puede_ver_comprobante(name)) $p$;
    execute 'drop policy if exists "comprobantes dueño borra" on storage.objects';
    execute $p$ create policy "comprobantes dueño borra" on storage.objects for delete to authenticated
               using (bucket_id = 'comprobantes' and public.puede_ver_comprobante(name)) $p$;
  end if;
end $$;

-- Comprobación: debe mostrar las 14 tablas.
select count(*) as tablas from information_schema.tables
where table_schema = 'public' and table_name in ('barberias','superadmins','pagos_suscripcion','ajustes',
  'datos_transferencia','perfiles','servicios','clientes','horarios','bloqueos','citas','cobros','cierres_caja','avisos');
