# Fade Studio (Barber Studio 593)

Sistema de reservas y gestión para una barbería. React 18 + Vite (PWA) + Supabase, desplegado en Cloudflare Workers.

## Qué trae
- **Varias barberías** en una sola instalación: cada una con sus datos separados y su dirección `/b/<nombre>`.
- **Superadmin** (tú): crea barberías con su dueño, fija plan y precio, registra pagos, ve ingresos y vencimientos, suspende o reactiva. Si una suscripción vence, la barbería se bloquea sola.
- **Dueño**: Inicio, Agenda general, Reservas (revisión de comprobantes), Equipo, y Ajustes con servicios y precios.
- **Barbero**: Agenda propia y Cuenta.
- Página pública por barbería, reserva online con pago por transferencia y comprobante, avisos de WhatsApp y avisos push al dueño.
- Base de datos: `paso01.sql`, `paso02-superadmin.sql`, `paso03.sql`, `paso04-push.sql`. Funciones: `superadmin`, `equipo` y `notificar-push`.

## Puesta en marcha
Mira **GUIA-RAPIDA.md** (paso a paso, en orden).

## Pendiente para más adelante
- Logo y fotos propias por barbería (hoy solo Barber Studio 593 tiene su marca; las demás usan una plantilla neutra).
- Cobro automático de la suscripción (hoy se registra a mano).
- Recordatorios automáticos por WhatsApp (plan Completo).

## Avisos push al celular del dueño (entrega 3)

Cada vez que un cliente envía un comprobante, al dueño le llega una notificación al celular. No tiene costo mensual.

1. **Claves de los avisos** (una sola vez). En la carpeta del proyecto: `npx web-push generate-vapid-keys`. Entrega una clave pública y una privada. Guárdalas.
2. **Clave pública en la app:** agrégala a `.env.local` como `VITE_VAPID_PUBLIC_KEY=...` y también como variable de build en Cloudflare (con el mismo nombre).
3. **Subir la función a Supabase** (necesitas tener el proyecto creado; todo se hace desde la carpeta del proyecto):
   ```
   npx supabase login
   npx supabase link --project-ref TU-PROYECTO
   npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:tucorreo@gmail.com PUSH_WEBHOOK_SECRET=UNA-CLAVE-LARGA-INVENTADA
   npx supabase functions deploy notificar-push --no-verify-jwt
   ```
   (`TU-PROYECTO` es la parte de la dirección de Supabase antes de `.supabase.co`.)
4. **Base de datos:** abre `supabase/paso04-push.sql`, cambia la dirección de tu proyecto y el secreto (el mismo `PUSH_WEBHOOK_SECRET` del paso anterior) y ejecútalo en el SQL Editor.
5. **Activar en el celular del dueño:** abre el sistema en el celular, entra a Ajustes > "Avisos en este celular" > Activar avisos > Enviar aviso de prueba.
   - Android: funciona desde Chrome; mejor aún si instalas la app ("Agregar a pantalla de inicio").
   - iPhone: primero hay que instalar la app (Compartir > "Agregar a pantalla de inicio"), abrirla desde su ícono, y recién ahí activar.

## Despliegue en Cloudflare
Workers Builds conectado al repositorio de GitHub:
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Variables de build: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_VAPID_PUBLIC_KEY`

## Subir cambios
```
git add .
git commit -m "Fade Studio completo"
git push
```
