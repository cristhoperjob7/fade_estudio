import { supabase } from "./supabase";

/** Llama a una función del servidor (equipo, superadmin). Devuelve "" si salió bien, o el motivo. */
export async function llamarFuncion(nombre: string, cuerpo: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke(nombre, { body: cuerpo });
  if (!error && data && (data as { ok?: boolean }).ok) return "";
  // Cuando la función responde con error, el detalle viene dentro de error.context (una Response).
  const ctx = (error as { context?: unknown } | null)?.context;
  if (ctx instanceof Response) {
    try {
      const j = (await ctx.clone().json()) as { error?: string };
      if (j.error) return j.error;
    } catch {
      /* sigue abajo */
    }
    if (ctx.status === 404) return `Falta subir la función «${nombre}» a Supabase (mira la guía).`;
  }
  if (data && (data as { error?: string }).error) return (data as { error: string }).error;
  return `No pudimos conectar con el servidor. Revisa tu conexión y que la función «${nombre}» esté subida.`;
}

/** Crear barbero / cambiar clave (función «equipo»). */
export const llamarEquipo = (cuerpo: Record<string, unknown>) => llamarFuncion("equipo", cuerpo);

/** Clave fácil de dictar: sin letras que se confunden (l, I, O, 0, 1). */
export function claveAleatoria(largo = 10): string {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(largo));
  return Array.from(bytes, (b) => letras[b % letras.length]).join("");
}
