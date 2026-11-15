-- =====================================================================
-- Fade Studio · paso08-limite-barberos.sql · Límite de barberos por plan
--
-- Plan Básico: el dueño + 1 barbero adicional.
-- Pro y VIP: por ahora sin límite (se definen cuando programemos esos planes).
-- Ejecutar DESPUÉS de paso01 a paso07. Se puede ejecutar más de una vez.
-- =====================================================================

-- 1. Cuántos barberos adicionales permite cada plan (null = sin límite)
create or replace function public.limite_barberos(p_plan text)
returns int
language sql immutable set search_path = '' as $$
  select case p_plan when 'basico' then 1 else null end
$$;

-- 2. Cuántos lleva usados mi barbería
create or replace function public.cupo_equipo()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_bar uuid;
  v_plan text;
begin
  select p.barberia_id into v_bar from public.perfiles p where p.id = auth.uid() and p.activo;
  if v_bar is null then return null; end if;
  select b.plan into v_plan from public.barberias b where b.id = v_bar;
  return jsonb_build_object(
    'plan', v_plan,
    'limite', public.limite_barberos(v_plan),
    'usados', (select count(*) from public.perfiles x where x.barberia_id = v_bar and x.rol = 'barbero' and x.activo)
  );
end $$;

revoke all on function public.cupo_equipo() from public, anon, authenticated;
grant execute on function public.cupo_equipo() to authenticated;
revoke all on function public.limite_barberos(text) from public, anon;
grant execute on function public.limite_barberos(text) to authenticated, service_role;

-- 3. Candado: no se puede agregar ni reactivar un barbero si el plan ya está lleno.
--    (Las barberías que ya tenían más barberos no se tocan: solo se bloquea sumar otro.)
create or replace function public.validar_limite_barberos()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_plan text;
  v_limite int;
  v_usados int;
begin
  if new.rol <> 'barbero' or not new.activo then return new; end if;
  if tg_op = 'UPDATE' and old.rol = 'barbero' and old.activo then return new; end if;

  select b.plan into v_plan from public.barberias b where b.id = new.barberia_id;
  v_limite := public.limite_barberos(v_plan);
  if v_limite is null then return new; end if;

  select count(*) into v_usados from public.perfiles x
   where x.barberia_id = new.barberia_id and x.rol = 'barbero' and x.activo and x.id <> new.id;
  if v_usados >= v_limite then
    raise exception 'LIMITE_PLAN: Tu plan Básico permite % barbero adicional. Pásate a Pro para sumar más.', v_limite
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists trg_limite_barberos on public.perfiles;
create trigger trg_limite_barberos
  before insert or update of rol, activo on public.perfiles
  for each row execute function public.validar_limite_barberos();

select 'Listo: plan Básico limitado a 1 barbero adicional' as resultado;
