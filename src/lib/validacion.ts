/** Validaciones del formulario de contratación. Cada una devuelve "" si está bien, o el mensaje de error. */

export const DOMINIOS_CORREO = ["gmail.com", "gmail.cl", "hotmail.com", "outlook.com", "outlook.es"] as const;

const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;
const NOMBRE_NEGOCIO = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .,'&-]+$/;
const USUARIO_CORREO = /^[a-z0-9._%+-]+$/;

/** Quita espacios de más: "  juan   perez " -> "juan perez". */
export const limpiar = (s: string) => s.replace(/\s+/g, " ").trim();

export function validarNombre(v: string, que: string): string {
  const t = limpiar(v);
  if (!t) return `Escribe ${que}.`;
  if (t.length < 2) return `${que[0]!.toUpperCase()}${que.slice(1)} es muy corto.`;
  if (!SOLO_LETRAS.test(t)) return "Usa solo letras, sin números ni símbolos.";
  return "";
}

export function validarBarberia(v: string): string {
  const t = limpiar(v);
  if (!t) return "Escribe el nombre de tu barbería.";
  if (t.length < 2) return "El nombre es muy corto.";
  if (!NOMBRE_NEGOCIO.test(t)) return "Usa solo letras, números y . , ' & -";
  return "";
}

/** Deja solo los 8 números que siguen al +569. También acepta que peguen el número completo. */
export function soloOchoDigitos(entrada: string): string {
  let d = entrada.replace(/\D/g, "");
  if (d.startsWith("569") && d.length > 8) d = d.slice(3);
  else if (d.startsWith("56") && d.length > 8) d = d.slice(2);
  if (d.length === 9 && d.startsWith("9")) d = d.slice(1);
  return d.slice(0, 8);
}

export function validarCelular(d: string): string {
  if (!d) return "Escribe tu número.";
  if (!/^\d{8}$/.test(d)) return `Faltan ${8 - d.length} números (son 8 después del +569).`;
  return "";
}

export function validarCorreo(v: string): string {
  const t = v.trim().toLowerCase();
  if (!t) return "Escribe tu correo.";
  const partes = t.split("@");
  if (partes.length !== 2 || !partes[0] || !partes[1]) return "Escribe un correo válido, por ejemplo nombre@gmail.com.";
  if (!USUARIO_CORREO.test(partes[0]) || partes[0].startsWith(".") || partes[0].endsWith(".") || partes[0].includes("..")) {
    return "Revisa lo que va antes del @.";
  }
  if (!(DOMINIOS_CORREO as readonly string[]).includes(partes[1])) {
    return `Solo aceptamos correos ${DOMINIOS_CORREO.map((d) => "@" + d).join(", ")}.`;
  }
  return "";
}

export const validarObligatorio = (v: string, mensaje: string) => (v ? "" : mensaje);
