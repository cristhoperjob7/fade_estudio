-- Fade Studio · paso07-prueba-basico.sql
-- La prueba gratis de 7 días es solo para el plan Básico. Se puede ejecutar más de una vez.
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
  if p_ciclo = 'prueba' and p_plan <> 'basico' then raise exception 'La prueba gratis es solo del plan Básico'; end if;
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

revoke all on function public.crear_solicitud_plan(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.crear_solicitud_plan(text, text, text, text, text, text) to anon, authenticated;
select 'Listo: prueba gratis solo en Básico' as resultado;
