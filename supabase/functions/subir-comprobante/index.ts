// Edge Function: subir-comprobante
// Recibe el comprobante del cliente, lo revisa en el servidor y recién ahí lo guarda y pasa la reserva a revisión.
// El dueño siempre aprueba el pago a mano. Esta función solo evita archivos falsos, repetidos o spam.
// Subir con:  npx supabase functions deploy subir-comprobante --project-ref elqvumcckodpwsqjupji
import { createClient } from "npm:@supabase/supabase-js@2";
import { ipDe, sha256, validarArchivo } from "./validar.ts";

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

  const largo = Number(req.headers.get("content-length") ?? 0);
  if (largo > 6 * 1024 * 1024) return json({ error: "El archivo pesa más de 5 MB." }, 413);

  let form: FormData;
  try { form = await req.formData(); } catch { return json({ error: "Solicitud no válida" }, 400); }
  const codigo = String(form.get("codigo") ?? "").trim().toUpperCase();
  const token = String(form.get("token") ?? "").trim();
  const archivo = form.get("archivo");
  if (!/^FS-[A-Z0-9]{5}$/.test(codigo) || token.length < 8 || token.length > 100 || !(archivo instanceof File)) {
    return json({ error: "Solicitud no válida" }, 400);
  }

  const ip = ipDe(req.headers);
  const admin = createClient(URL_SUPABASE, CLAVE_SERVICIO, { auth: { persistSession: false } });

  // 1) ¿Reserva vigente, de esta persona y con intentos disponibles?
  const { data: pre, error: e1 } = await admin.rpc("comprobante_preparar", { p_codigo: codigo, p_token: token, p_ip: ip });
  if (e1 || !pre) return json({ error: "No pudimos procesar el archivo. Inténtalo de nuevo." }, 500);
  if (!pre.ok) return json({ error: pre.error, codigo: pre.codigo }, pre.codigo === "limite" ? 429 : 409);

  // 2) Revisión real del archivo (no se confía en el tipo que dice el navegador).
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const v = validarArchivo(bytes, archivo.type);
  if (!v.ok) {
    await admin.rpc("comprobante_invalido", { p_ip: ip });
    return json({ error: v.error, codigo: "archivo" }, 422);
  }
  const huella = await sha256(bytes);

  // 3) Se guarda con nombre propio (nunca el del cliente).
  const ruta = `${codigo}/${token}-${Date.now()}.${v.ext}`;
  const sube = await admin.storage.from("comprobantes").upload(ruta, bytes, { contentType: v.mime, upsert: false });
  if (sube.error) return json({ error: "No pudimos guardar el archivo. Inténtalo de nuevo." }, 500);

  // 4) Se registra: aquí se detectan duplicados y se pasa la reserva a revisión.
  const { data: reg, error: e2 } = await admin.rpc("comprobante_registrar", {
    p_cita: pre.cita_id, p_sha: huella, p_mime: v.mime, p_bytes: v.bytes, p_senales: v.senales, p_ruta: ruta, p_ip: ip,
  });
  if (e2 || !reg?.ok) {
    await admin.storage.from("comprobantes").remove([ruta]); // no dejar archivos huérfanos
    if (e2) return json({ error: "No pudimos procesar el archivo. Inténtalo de nuevo." }, 500);
    return json({ error: reg.error, codigo: reg.codigo }, 409);
  }
  return json({ ok: true });
});
