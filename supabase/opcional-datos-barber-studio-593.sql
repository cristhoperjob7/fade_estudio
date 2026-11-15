-- =====================================================================
-- Fade Studio · opcional-datos-barber-studio-593.sql
--
-- Carga los datos reales de Barber Studio 593 (dirección, WhatsApp, carta de servicios
-- y la oferta de $9.990 de lunes a jueves).
-- Ejecútalo DESPUÉS de crear la barbería "barber-studio-593" desde el panel de superadmin.
-- Se puede ejecutar más de una vez: deja siempre la misma carta.
-- =====================================================================
do $$
declare v uuid := (select id from public.barberias where slug = 'barber-studio-593');
begin
  if v is null then
    raise exception 'Primero crea la barbería con la dirección barber-studio-593 desde el panel de superadmin';
  end if;

  update public.ajustes
     set nombre = 'Barber Studio 593', direccion = 'Av. Américo Vespucio 7983', whatsapp = '56932141976',
         hora_apertura = 600, hora_cierre = 1200
   where barberia_id = v;

  delete from public.servicios where barberia_id = v;
  insert into public.servicios (barberia_id, nombre, descripcion, duracion_min, precio, precio_promo, dias_promo, orden) values
    (v, 'Corte',                            'Corte a tu gusto, terminación limpia.', 60, 11990, 9990, '{1,2,3,4}', 1),
    (v, 'Corte + cejas + mascarilla negra', 'El combo de la casa.',                  60, 11990, 9990, '{1,2,3,4}', 2),
    (v, 'Corte + barba',                    'Cabello y barba perfilados.',           90, 15990, null, '{}',        3),
    (v, 'Barba',                            'Perfilado y cuidado de barba.',         30,  7990, null, '{}',        4),
    (v, 'Corte niño',                       'Corte para los más chicos.',            60,  8990, null, '{}',        5),
    (v, 'Diseño',                           'Cortes con diseño y degradados.',       90, 14990, null, '{}',        6),
    (v, 'Color',                            'Cambio de color.',                     120, 29990, null, '{}',        7);
end $$;

select s.nombre, s.duracion_min, s.precio, s.precio_promo
from public.servicios s join public.barberias b on b.id = s.barberia_id
where b.slug = 'barber-studio-593' order by s.orden;
