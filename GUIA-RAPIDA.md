# Guía rápida: dejar Fade Studio funcionando

Sigue los pasos en orden. Tiempo estimado: 45 a 60 minutos.
Necesitas instalado: **Node.js 20 o más** (nodejs.org) y **Git**.

Cómo funciona: **tú eres el superadmin**. Desde tu panel creas cada barbería (con su dueño),
le fijas plan, precio y vencimiento, y registras sus pagos. Cada barbería solo ve sus propios datos.

---

## 1. Abrir el proyecto
1. Descomprime el zip en una carpeta, por ejemplo `Documentos/fade-studio`.
2. Abre una terminal **dentro** de esa carpeta.
3. Ejecuta: `npm install`

## 2. Crear el proyecto en Supabase
1. supabase.com > **New project**. Nombre `fade-studio`, región **South America (São Paulo)**. Guarda la clave de la base de datos.
2. Cuando termine, ve a **Project Settings > API** y copia:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon / publishable key** (la pública; nunca la "secret" ni "service_role")
3. En la carpeta del proyecto, copia `.env.example` como `.env.local` y pega esos dos valores.
   Deja `VITE_BARBERIA_POR_DEFECTO=barber-studio-593` (es la barbería que se ve en la raíz del sitio).

## 3. Base de datos (Supabase > SQL Editor > New query)
Pega el contenido de cada archivo y presiona **Run**, en este orden:
1. `supabase/paso01.sql`
2. Crea **tu usuario**: Authentication > Users > Add user > Create new user, con tu correo y una clave, marcando **Auto Confirm User**.
3. Abre `supabase/paso02-superadmin.sql`, cambia `CAMBIA-ESTE@CORREO.CL` por ese correo y ejecútalo. Al final debe mostrar tu correo.
4. `supabase/paso03.sql`

(`paso04-push.sql` va en el paso 5.)

## 4. Funciones del servidor (crear barberías y barberos)
En la terminal, dentro del proyecto:
```
npx supabase login
npx supabase link --project-ref TU-PROYECTO
npx supabase functions deploy superadmin
npx supabase functions deploy equipo
```
`TU-PROYECTO` es lo que va antes de `.supabase.co` en tu URL.

## 5. Avisos push al celular del dueño (se puede dejar para después)
1. `npx web-push generate-vapid-keys` → entrega una clave pública y una privada.
2. Pon la pública en `.env.local` como `VITE_VAPID_PUBLIC_KEY=...`
3. Sube los secretos y la función:
   ```
   npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:tucorreo@gmail.com PUSH_WEBHOOK_SECRET=UNA-CLAVE-LARGA-INVENTADA
   npx supabase functions deploy notificar-push
   ```
4. Abre `supabase/paso04-push.sql`, cambia `https://TU-PROYECTO.supabase.co` y `CAMBIA-ESTE-SECRETO` (el mismo `PUSH_WEBHOOK_SECRET`) y ejecútalo.

## 6. Probar en tu computador
```
npm run dev
```
1. Abre `http://localhost:5173/login` y entra con tu correo de superadmin. Llegas a tu panel (**Resumen** y **Barberías**).
2. **Barberías > Nueva barbería**. Para la primera usa:
   - Nombre `Barber Studio 593`, dirección web `barber-studio-593`
   - Plan, precio (por ejemplo 10000) y días de prueba
   - Nombre, correo y clave del dueño (apúntalos para entregárselos)
3. En Supabase > SQL Editor ejecuta `supabase/opcional-datos-barber-studio-593.sql` (carga su dirección, WhatsApp y la carta de servicios con la oferta de $9.990).
4. Cierra sesión y entra como el dueño. En **Ajustes** completa WhatsApp y datos de transferencia. En **Equipo > Agregar barbero** crea al menos uno (sin barberos nadie puede reservar).
5. Reserva de prueba en `http://localhost:5173/b/barber-studio-593/reservar`, sube una foto como comprobante y apruébala en **Reservas**.
6. Antes de subir, revisa que no haya errores: `npm run build`

## 7. Subir a GitHub
1. Crea un repositorio **vacío** en github.com (sin README).
2. En la terminal:
```
git init
git add .
git commit -m "Fade Studio completo"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/fade-studio.git
git push -u origin main
```
(`.env.local` no se sube: está protegido en `.gitignore`.)

## 8. Publicar en Cloudflare
1. dash.cloudflare.com > **Workers & Pages > Create > Import a repository** y elige el repo.
2. Configuración:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Variables (build): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`, `VITE_BARBERIA_POR_DEFECTO` (= `barber-studio-593`) y, si quieres, `VITE_SOPORTE_WHATSAPP` (tu WhatsApp, ej. `56912345678`).
3. Cuando termine te da una dirección `https://fade-studio.xxx.workers.dev`.
4. En Supabase > **Authentication > URL Configuration** pon esa dirección en **Site URL**.

## 9. Día a día como superadmin
- **Cobrar:** el cliente te transfiere → entras a **Barberías**, tocas la barbería, **Registrar pago**. El vencimiento se corre solo.
- **Si no paga:** a los días de gracia (3 por defecto) la barbería se bloquea sola: ni el dueño ni los clientes pueden usarla. Sus datos quedan guardados. Al registrar el pago se reactiva al instante.
- **Pausar a mano:** en el detalle de la barbería, activa **Suspender barbería**.
- **Nueva barbería:** **Nueva barbería**. Entrégale al dueño su correo, clave y el enlace `/b/su-direccion`.
- **Cambios de código:**
```
git add .
git commit -m "describe el cambio"
git push
```

---

## Si algo falla
- **"configura Supabase"**: falta `.env.local` o las variables en Cloudflare.
- **Al entrar dice que no tienes acceso**: el correo del paso 3.3 no coincide con el de tu usuario.
- **Resumen dice que no puede cargar**: falta ejecutar `paso02-superadmin.sql`.
- **"Falta subir la función"**: repite el paso 4.
- **No aparecen horas para reservar**: la barbería no tiene barberos que atiendan (Equipo) o no tiene servicios (Ajustes).
- **No llegan avisos**: revisa el paso 5 y, en iPhone, instala primero la app.
