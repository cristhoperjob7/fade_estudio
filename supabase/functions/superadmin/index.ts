// Edge Function: superadmin
// Crea barberías nuevas (con la cuenta de su dueño) y cambia la clave de un dueño.
// Solo la puede usar un superadmin (con su sesión).
// Subir con:  npx supabase functions deploy superadmin
import { createClient } from "npm:@supabase/supabase-js@2";

const URL_SUPABASE = Deno.env.get("SUPABASE_URL") ?? "";
const CLAVE_SERVICIO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const admin = createClient(URL_SUPABASE, CLAVE_SERVICIO, { auth: { persistSession: false } });

  // 1) Solo un superadmin.
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) return json({ error: "Sesión no válida" }, 401);
  const { data: sa } = await admin.from("superadmins").select("usuario_id").eq("usuario_id", u.user.id).maybeSingle();
  if (!sa) return json({ error: "Solo el superadmin puede hacer esto" }, 403);

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  // 2) Crear una barbería con su dueño.
  if (b.accion === "crear_barberia") {
    const nombre = texto(b.nombre);
    const slug = texto(b.slug).toLowerCase();
    const plan = texto(b.plan);
    const precio = Number(b.precio_mensual);
    const vence = texto(b.vence_el) || null;
    const duenoNombre = texto(b.dueno_nombre);
    const duenoCorreo = texto(b.dueno_correo).toLowerCase();
    const clave = typeof b.clave === "string" ? b.clave : "";
    if (nombre.length < 2 || nombre.length > 80) return json({ error: "Escribe el nombre de la barbería" }, 400);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 40)
      return json({ error: "La dirección solo puede tener letras minúsculas, números y guiones (mínimo 3)" }, 400);
    if (plan !== "basico" && plan !== "pro" && plan !== "vip") return json({ error: "Elige un plan" }, 400);
    if (!Number.isFinite(precio) || precio < 0) return json({ error: "El precio no es válido" }, 400);
    if (vence && !/^\d{4}-\d{2}-\d{2}$/.test(vence)) return json({ error: "La fecha de vencimiento no es válida" }, 400);
    if (duenoNombre.length < 2) return json({ error: "Escribe el nombre del dueño" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(duenoCorreo)) return json({ error: "El correo del dueño no es válido" }, 400);
    if (clave.length < 8) return json({ error: "La clave debe tener al menos 8 caracteres" }, 400);

    const { data: yaExiste } = await admin.from("barberias").select("id").eq("slug", slug).maybeSingle();
    if (yaExiste) return json({ error: "Esa dirección ya está en uso" }, 400);

    const nuevo = await admin.auth.admin.createUser({ email: duenoCorreo, password: clave, email_confirm: true });
    if (nuevo.error || !nuevo.data.user) {
      const ya = /already|registered|exists/i.test(nuevo.error?.message ?? "");
      return json({ error: ya ? "Ese correo ya tiene una cuenta" : "No se pudo crear la cuenta del dueño" }, 400);
    }
    const duenoId = nuevo.data.user.id;
    const { data: id, error } = await admin.rpc("crear_barberia_completa", {
      p_nombre: nombre, p_slug: slug, p_plan: plan, p_precio: Math.round(precio), p_vence: vence,
      p_dueno_id: duenoId, p_dueno_nombre: duenoNombre, p_dueno_correo: duenoCorreo,
    });
    if (error) {
      await admin.auth.admin.deleteUser(duenoId); // no dejar una cuenta a medias
      return json({ error: "No se pudo crear la barbería" }, 500);
    }
    return json({ ok: true, barberia_id: id });
  }

  // 3) Cambiar la clave del dueño de una barbería.
  if (b.accion === "clave_dueno") {
    const barberiaId = texto(b.barberia_id);
    const clave = typeof b.clave === "string" ? b.clave : "";
    if (clave.length < 8) return json({ error: "La clave debe tener al menos 8 caracteres" }, 400);
    const { data: d } = await admin
      .from("perfiles").select("id").eq("barberia_id", barberiaId).eq("rol", "dueno").order("creado_en").limit(1).maybeSingle();
    if (!d) return json({ error: "No encontramos al dueño" }, 404);
    const { error } = await admin.auth.admin.updateUserById(d.id, { password: clave });
    if (error) return json({ error: "No se pudo cambiar la clave" }, 500);
    return json({ ok: true });
  }

  return json({ error: "Acción no válida" }, 400);
});
