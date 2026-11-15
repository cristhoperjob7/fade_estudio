-- =====================================================================
-- Fade Studio · paso04-push.sql · Avisos push al celular del dueño
--
-- Ejecutar DESPUÉS de paso03.sql. Se puede ejecutar más de una vez.
--
-- ANTES de ejecutarlo cambia estas 2 cosas en la sección 3 (más abajo):
--   * la dirección de tu proyecto (la misma de VITE_SUPABASE_URL)
--   * el secreto (una clave larga inventada por ti; el mismo que pondrás
--     como PUSH_WEBHOOK_SECRET al subir la función. Ver README).
--
-- Qué hace:
--   1) Guarda los celulares del dueño que activaron los avisos.
--   2) Cuando una reserva pasa a "por revisar" (el cliente envió su
--      comprobante), llama a la función "notificar-push", que manda el aviso.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Celulares suscritos
-- ---------------------------------------------------------------------
create table if not exists public.push_suscripciones (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  agente      text not null default '',
  creada_en   timestamptz not null default now()
);
create index if not exists push_susc_usuario_idx on public.push_suscripciones (usuario_id);

alter table public.push_suscripciones enable row level security;
drop policy if exists "push dueño propias" on public.push_suscripciones;
create policy "push dueño propias" on public.push_suscripciones for all to authenticated
  using (usuario_id = auth.uid() and public.es_dueno())
  with check (usuario_id = auth.uid() and public.es_dueno());
revoke all on public.push_suscripciones from anon;

-- ---------------------------------------------------------------------
-- 2. Configuración interna (nadie la puede leer desde la app)
-- ---------------------------------------------------------------------
create table if not exists public.push_config (
  id      int primary key default 1 check (id = 1),
  url     text not null default '',
  secreto text not null default ''
);
alter table public.push_config enable row level security;   -- sin políticas: solo funciones internas
revoke all on public.push_config from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. CAMBIA ESTOS DOS VALORES
-- ---------------------------------------------------------------------
insert into public.push_config (id, url, secreto)
values (1, 'https://TU-PROYECTO.supabase.co', 'CAMBIA-ESTE-SECRETO')
on conflict (id) do update set url = excluded.url, secreto = excluded.secreto
where public.push_config.url = '' or public.push_config.url like '%TU-PROYECTO%'
   or public.push_config.secreto = '' or public.push_config.secreto = 'CAMBIA-ESTE-SECRETO'
   or (excluded.url not like '%TU-PROYECTO%' and excluded.secreto <> 'CAMBIA-ESTE-SECRETO');

-- ---------------------------------------------------------------------
-- 4. Aviso automático cuando llega un comprobante
-- ---------------------------------------------------------------------
do $$ begin
  create extension if not exists pg_net with schema extensions;
exception when others then null; end $$;

create or replace function public.avisar_comprobante() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.push_config;
begin
  if new.estado <> 'por_revisar' or old.estado = 'por_revisar' then return new; end if;
  select * into c from public.push_config where id = 1;
  if c.url = '' or c.url like '%TU-PROYECTO%' or c.secreto in ('', 'CAMBIA-ESTE-SECRETO') then return new; end if;
  if to_regnamespace('net') is null then return new; end if;
  -- Un error al avisar nunca debe impedir que el cliente envíe su comprobante.
  begin
    perform net.http_post(
      url := rtrim(c.url, '/') || '/functions/v1/notificar-push',
      body := jsonb_build_object(
        'cita_id', new.id, 'barberia_id', new.barberia_id, 'cliente', new.cliente_nombre, 'servicio', new.servicio_nombre,
        'fecha', new.fecha, 'inicio_min', new.inicio_min, 'monto', new.precio),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', c.secreto)
    );
  exception when others then null;
  end;
  return new;
end $$;

drop trigger if exists citas_avisar_comprobante on public.citas;
create trigger citas_avisar_comprobante after update of estado on public.citas
  for each row execute function public.avisar_comprobante();

revoke all on function public.avisar_comprobante() from public, anon, authenticated;

notify pgrst, 'reload schema';
