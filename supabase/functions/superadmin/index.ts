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

  // 4) Eliminar una barbería por completo. Pide la clave del superadmin y borra datos, archivos y cuentas.
  if (b.accion === "eliminar_barberia") {
    const barberiaId = texto(b.barberia_id);
    const clave = typeof b.clave === "string" ? b.clave : "";
    if (!barberiaId) return json({ error: "Falta la barbería" }, 400);
    if (!clave) return json({ error: "Escribe tu clave" }, 400);

    // La clave se comprueba contra tu cuenta, en el servidor.
    const comprobar = createClient(URL_SUPABASE, Deno.env.get("SUPABASE_ANON_KEY") ?? "", { auth: { persistSession: false } });
    const { error: errClave } = await comprobar.auth.signInWithPassword({ email: u.user.email ?? "", password: clave });
    if (errClave) return json({ error: "Tu clave no es correcta" }, 403);

    const { data: bar } = await admin.from("barberias").select("id").eq("id", barberiaId).maybeSingle();
    if (!bar) return json({ error: "No existe esa barbería" }, 404);

    // Antes de borrar, se anota qué cuentas y archivos tiene (después ya no se puede saber).
    const { data: perfiles } = await admin.from("perfiles").select("id").eq("barberia_id", barberiaId);
    const { data: supers } = await admin.from("superadmins").select("usuario_id");
    const protegidos = new Set<string>([u.user.id, ...(supers ?? []).map((x: { usuario_id: string }) => x.usuario_id)]);
    const cuentas = (perfiles ?? []).map((p: { id: string }) => p.id).filter((id: string) => !protegidos.has(id));

    const { data: citas } = await admin.from("citas").select("comprobante_path").eq("barberia_id", barberiaId).not("comprobante_path", "is", null);
    const comprobantes = (citas ?? []).map((c: { comprobante_path: string }) => c.comprobante_path).filter(Boolean);
    const listar = async (bucket: string, carpeta: string) => {
      const { data } = await admin.storage.from(bucket).list(carpeta, { limit: 1000 });
      return (data ?? []).filter((f: { id: string | null }) => f.id).map((f: { name: string }) => `${carpeta}/${f.name}`);
    };
    const fotosPagina = await listar("paginas", barberiaId);
    const fotosPerfil: string[] = [];
    for (const id of cuentas) fotosPerfil.push(...(await listar("avatares", id)));

    // 1) Base de datos (todo o nada).
    const { error: errBd } = await admin.rpc("eliminar_barberia_datos", { p_id: barberiaId });
    if (errBd) return json({ error: "No se pudo borrar: " + errBd.message }, 500);

    // 2) Archivos y cuentas. Si algo falla aquí, los datos ya se borraron: se avisa qué quedó.
    const pendientes: string[] = [];
    const borrar = async (bucket: string, rutas: string[]) => {
      for (let i = 0; i < rutas.length; i += 100) {
        const { error } = await admin.storage.from(bucket).remove(rutas.slice(i, i + 100));
        if (error) pendientes.push(`archivos de «${bucket}»`);
      }
    };
    await borrar("paginas", fotosPagina);
    await borrar("comprobantes", comprobantes);
    await borrar("avatares", fotosPerfil);
    for (const id of cuentas) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) pendientes.push("una cuenta de acceso");
    }
    return json({ ok: true, pendientes: [...new Set(pendientes)] });
  }

  return json({ error: "Acción no válida" }, 400);
});
