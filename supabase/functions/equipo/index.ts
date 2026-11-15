// Edge Function: equipo
// Crea cuentas de barberos y cambia claves. Solo la puede usar el dueño (con su sesión).
// Hace falta porque crear usuarios requiere la clave secreta de Supabase, que nunca va en la app.
// Subir con:  npx supabase functions deploy equipo
import { createClient } from "npm:@supabase/supabase-js@2";

const URL_SUPABASE = Deno.env.get("SUPABASE_URL") ?? "";
const CLAVE_SERVICIO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function iniciales(nombre: string): string {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  const r = p.length >= 2 ? p[0][0] + p[1][0] : (p[0] ?? "??").slice(0, 2);
  return r.toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const admin = createClient(URL_SUPABASE, CLAVE_SERVICIO, { auth: { persistSession: false } });

  // 1) Solo el dueño activo.
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) return json({ error: "Sesión no válida" }, 401);
  const { data: yo } = await admin.from("perfiles").select("rol,activo,barberia_id").eq("id", u.user.id).maybeSingle();
  if (!yo || yo.rol !== "dueno" || !yo.activo) return json({ error: "Solo el dueño puede hacer esto" }, 403);
  const { data: vigente } = await admin.rpc("barberia_vigente", { p_id: yo.barberia_id });
  if (!vigente) return json({ error: "La suscripción de la barbería está vencida" }, 403);

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  // 2) Crear un barbero.
  if (b.accion === "crear") {
    const nombre = texto(b.nombre);
    const correo = texto(b.correo).toLowerCase();
    const clave = typeof b.clave === "string" ? b.clave : "";
    const comision = Number(b.comision_pct);
    const telefono = texto(b.telefono).slice(0, 20);
    if (nombre.length < 2 || nombre.length > 60) return json({ error: "Escribe el nombre del barbero" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return json({ error: "El correo no es válido" }, 400);
    if (clave.length < 8) return json({ error: "La clave debe tener al menos 8 caracteres" }, 400);
    if (!Number.isFinite(comision) || comision < 0 || comision > 100) return json({ error: "La comisión debe estar entre 0 y 100" }, 400);

    const nuevo = await admin.auth.admin.createUser({ email: correo, password: clave, email_confirm: true });
    if (nuevo.error || !nuevo.data.user) {
      const ya = /already|registered|exists/i.test(nuevo.error?.message ?? "");
      return json({ error: ya ? "Ese correo ya tiene una cuenta" : "No se pudo crear la cuenta" }, 400);
    }
    const id = nuevo.data.user.id;
    const { error } = await admin.from("perfiles").insert({
      id, barberia_id: yo.barberia_id, rol: "barbero", nombre, iniciales: iniciales(nombre), correo, telefono,
      comision_pct: comision, atiende: true, activo: true,
    });
    if (error) {
      await admin.auth.admin.deleteUser(id); // no dejar una cuenta a medias
      return json({ error: "No se pudo guardar al barbero" }, 500);
    }
    return json({ ok: true, usuario_id: id });
  }

  // 3) Cambiar la clave de alguien del equipo.
  if (b.accion === "clave") {
    const id = texto(b.usuario_id);
    const clave = typeof b.clave === "string" ? b.clave : "";
    if (clave.length < 8) return json({ error: "La clave debe tener al menos 8 caracteres" }, 400);
    // Solo gente de SU barbería.
    const { data: p } = await admin.from("perfiles").select("id").eq("id", id).eq("barberia_id", yo.barberia_id).maybeSingle();
    if (!p) return json({ error: "No encontramos a esa persona" }, 404);
    const { error } = await admin.auth.admin.updateUserById(id, { password: clave });
    if (error) return json({ error: "No se pudo cambiar la clave" }, 500);
    return json({ ok: true });
  }

  return json({ error: "Acción no válida" }, 400);
});
