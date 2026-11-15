-- =====================================================================
-- Fade Studio · paso06-perfiles.sql · Datos personales y foto de perfil
--
-- Ejecutar DESPUÉS de paso01 a paso03. Se puede ejecutar más de una vez.
-- Sirve para el Dueño, los Barberos y el Superadmin.
-- =====================================================================

-- 1. Más datos en los perfiles (dueño y barberos)
alter table public.perfiles add column if not exists apellidos   text not null default '';
alter table public.perfiles add column if not exists edad        smallint check (edad is null or edad between 10 and 110);
alter table public.perfiles add column if not exists avatar_path text;

-- 2. Los mismos datos para el superadmin
alter table public.superadmins add column if not exists nombre      text not null default '';
alter table public.superadmins add column if not exists apellidos   text not null default '';
alter table public.superadmins add column if not exists telefono    text not null default '';
alter table public.superadmins add column if not exists edad        smallint check (edad is null or edad between 10 and 110);
alter table public.superadmins add column if not exists avatar_path text;

-- 3. Ver mis datos (sirve para cualquier rol)
create or replace function public.mi_perfil_datos()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r jsonb;
  v_correo text;
begin
  if auth.uid() is null then return null; end if;
  select u.email into v_correo from auth.users u where u.id = auth.uid();

  select jsonb_build_object('rol', p.rol, 'nombre', p.nombre, 'apellidos', p.apellidos,
                            'telefono', p.telefono, 'correo', coalesce(nullif(p.correo, ''), v_correo),
                            'edad', p.edad, 'avatar_path', p.avatar_path)
    into r from public.perfiles p where p.id = auth.uid();
  if r is not null then return r; end if;

  select jsonb_build_object('rol', 'superadmin', 'nombre', s.nombre, 'apellidos', s.apellidos,
                            'telefono', s.telefono, 'correo', v_correo,
                            'edad', s.edad, 'avatar_path', s.avatar_path)
    into r from public.superadmins s where s.usuario_id = auth.uid();
  return r;
end $$;

-- 4. Guardar mis datos
create or replace function public.guardar_mi_perfil(p_nombre text, p_apellidos text, p_telefono text, p_edad int)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_apellidos text := btrim(coalesce(p_apellidos, ''));
  v_tel text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  v_ini text;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if char_length(v_nombre) < 2 or char_length(v_nombre) > 60 then raise exception 'Escribe tu nombre'; end if;
  if char_length(v_apellidos) > 60 then raise exception 'Los apellidos son muy largos'; end if;
  if v_tel <> '' and (char_length(v_tel) < 8 or char_length(v_tel) > 15) then raise exception 'Revisa tu número de celular'; end if;
  if p_edad is not null and (p_edad < 10 or p_edad > 110) then raise exception 'Revisa tu edad'; end if;

  v_ini := upper(case when v_apellidos <> '' then left(v_nombre, 1) || left(v_apellidos, 1) else left(v_nombre, 2) end);

  update public.perfiles
     set nombre = v_nombre, apellidos = v_apellidos, telefono = v_tel, edad = p_edad, iniciales = v_ini
   where id = auth.uid();
  if found then return; end if;

  update public.superadmins
     set nombre = v_nombre, apellidos = v_apellidos, telefono = v_tel, edad = p_edad
   where usuario_id = auth.uid();
  if not found then raise exception 'No tienes un perfil'; end if;
end $$;

-- 5. Guardar (o quitar) mi foto. La ruta debe empezar con mi propio id.
create or replace function public.guardar_mi_foto(p_path text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if p_path is not null and (p_path not like auth.uid()::text || '/%' or char_length(p_path) > 200) then
    raise exception 'Foto no válida';
  end if;
  update public.perfiles set avatar_path = p_path where id = auth.uid();
  if found then return; end if;
  update public.superadmins set avatar_path = p_path where usuario_id = auth.uid();
  if not found then raise exception 'No tienes un perfil'; end if;
end $$;

revoke all on function public.mi_perfil_datos() from public, anon, authenticated;
revoke all on function public.guardar_mi_perfil(text, text, text, int) from public, anon, authenticated;
revoke all on function public.guardar_mi_foto(text) from public, anon, authenticated;
grant execute on function public.mi_perfil_datos() to authenticated;
grant execute on function public.guardar_mi_perfil(text, text, text, int) to authenticated;
grant execute on function public.guardar_mi_foto(text) to authenticated;

-- 6. Bucket de fotos de perfil (público para mostrarlas; cada persona solo sube a su carpeta)
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('avatares', 'avatares', true)
    on conflict (id) do update set public = true;
    begin
      update storage.buckets
         set file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
       where id = 'avatares';
    exception when undefined_column then null;
    end;

    execute 'drop policy if exists "avatares sube su foto" on storage.objects';
    execute $p$ create policy "avatares sube su foto" on storage.objects for insert to authenticated
               with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text) $p$;
    execute 'drop policy if exists "avatares cambia su foto" on storage.objects';
    execute $p$ create policy "avatares cambia su foto" on storage.objects for update to authenticated
               using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text) $p$;
    execute 'drop policy if exists "avatares borra su foto" on storage.objects';
    execute $p$ create policy "avatares borra su foto" on storage.objects for delete to authenticated
               using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text) $p$;
  end if;
end $$;

select 'Listo: perfiles con foto y datos personales' as resultado;
