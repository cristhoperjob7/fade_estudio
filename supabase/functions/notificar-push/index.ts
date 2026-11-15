// Edge Function: notificar-push
// Manda un aviso push a los celulares del dueño.
//  - Lo llama la base de datos (con el secreto x-webhook-secret) cuando llega un comprobante.
//  - Lo llama el dueño desde Ajustes (con su sesión) para probar que funciona: { "prueba": true }.
// Subir con:  npx supabase functions deploy notificar-push --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const URL_SUPABASE = Deno.env.get("SUPABASE_URL") ?? "";
const CLAVE_SERVICIO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SECRETO = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";
const VAPID_PUBLICA = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVADA = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_CONTACTO = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const clp = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
function diaLargo(fecha: string) {
  const d = new Date(`${fecha}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}`;
}

/** Comparación que no se corta en la primera diferencia. */
function iguales(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!VAPID_PUBLICA || !VAPID_PRIVADA) return json({ error: "Faltan las claves VAPID en la función" }, 500);

  const admin = createClient(URL_SUPABASE, CLAVE_SERVICIO, { auth: { persistSession: false } });
  const cuerpo = await req.json().catch(() => ({}));

  let usuarios: string[];
  let aviso: { titulo: string; cuerpo: string; etiqueta: string };

  const secretoRecibido = req.headers.get("x-webhook-secret") ?? "";
  if (SECRETO && secretoRecibido && iguales(secretoRecibido, SECRETO)) {
    // Llamada de la base de datos: avisar solo a los dueños activos de ESA barbería.
    const c = cuerpo as { cita_id?: string; barberia_id?: string; cliente?: string; servicio?: string; fecha?: string; inicio_min?: number; monto?: number };
    if (!c.barberia_id) return json({ error: "Falta la barbería" }, 400);
    const { data: duenos } = await admin
      .from("perfiles")
      .select("id")
      .eq("rol", "dueno")
      .eq("activo", true)
      .eq("barberia_id", c.barberia_id);
    usuarios = (duenos ?? []).map((d: { id: string }) => d.id);
    aviso = {
      titulo: "Nuevo comprobante por revisar",
      cuerpo: `${c.cliente ?? "Un cliente"} · ${c.servicio ?? "Reserva"} · ${c.fecha ? diaLargo(c.fecha) : ""} ${
        typeof c.inicio_min === "number" ? hm(c.inicio_min) : ""
      } · ${typeof c.monto === "number" ? clp(c.monto) : ""}`.replace(/\s+·\s*$/, "").trim(),
      etiqueta: `comprobante-${c.cita_id ?? Date.now()}`,
    };
  } else if ((cuerpo as { prueba?: boolean }).prueba === true) {
    // Prueba hecha por el dueño desde Ajustes: solo a sus propios celulares.
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return json({ error: "Sesión no válida" }, 401);
    const { data: perfil } = await admin.from("perfiles").select("rol,activo").eq("id", u.user.id).maybeSingle();
    if (!perfil || perfil.rol !== "dueno" || !perfil.activo) return json({ error: "Solo el dueño puede probar" }, 403);
    usuarios = [u.user.id];
    aviso = { titulo: "Los avisos funcionan", cuerpo: "Así te va a llegar cada comprobante nuevo.", etiqueta: "prueba" };
  } else {
    return json({ error: "No autorizado" }, 401);
  }

  if (usuarios.length === 0) return json({ enviados: 0, eliminados: 0 });
  const { data: subs } = await admin
    .from("push_suscripciones")
    .select("id,endpoint,p256dh,auth")
    .in("usuario_id", usuarios);

  webpush.setVapidDetails(VAPID_CONTACTO, VAPID_PUBLICA, VAPID_PRIVADA);
  const mensaje = JSON.stringify({ ...aviso, url: "/panel/reservas" });
  let enviados = 0;
  const caducadas: string[] = [];

  await Promise.all(
    (subs ?? []).map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, mensaje, {
          TTL: 60 * 60 * 12,
          urgency: "high",
        });
        enviados++;
      } catch (e) {
        const codigo = (e as { statusCode?: number }).statusCode;
        if (codigo === 404 || codigo === 410) caducadas.push(s.id); // el celular ya no recibe: se borra
        else console.error("push falló", codigo, (e as Error).message);
      }
    }),
  );

  if (caducadas.length > 0) await admin.from("push_suscripciones").delete().in("id", caducadas);
  return json({ enviados, eliminados: caducadas.length });
});
