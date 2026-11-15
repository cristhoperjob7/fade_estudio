import { fechaLarga, hm } from "./fecha";

/**
 * Normaliza un teléfono chileno a solo dígitos con 56 adelante.
 * "+56 9 3214 1976" | "9 3214 1976" | "93214197 6" -> "56932141976"
 * Devuelve "" si no parece un celular chileno válido.
 */
export function normalizarTelefono(entrada: string): string {
  let d = entrada.replace(/\D/g, "").replace(/^0+/, "");
  if (d.startsWith("56")) d = d.slice(2);
  if (d.length === 8) d = "9" + d; // lo escribieron sin el 9
  return /^9\d{8}$/.test(d) ? "56" + d : "";
}

/** "56932141976" -> "+56 9 3214 1976" (si no es un celular válido, lo deja tal cual) */
export function formatearTelefono(entrada: string): string {
  const t = normalizarTelefono(entrada);
  return t ? `+56 9 ${t.slice(3, 7)} ${t.slice(7)}` : entrada;
}

/** Enlace que abre WhatsApp con el mensaje ya escrito. */
export function enlaceWhatsapp(telefono: string, texto: string): string {
  const tel = normalizarTelefono(telefono);
  const base = tel ? `https://wa.me/${tel}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(texto)}`;
}

type DatosCita = {
  cliente: string;
  servicio: string;
  fecha: string; // 2026-11-17
  inicioMin: number;
};

/** Cliente -> dueño, al enviar el comprobante. */
export function mensajeAvisoAlDueno(c: DatosCita & { codigo: string }): string {
  return (
    `Hola, soy ${c.cliente}. Agendé y pagué una hora para ${c.servicio} ` +
    `el ${fechaLarga(c.fecha)} a las ${hm(c.inicioMin)} (código ${c.codigo}). ` +
    `Ya envié el comprobante para su revisión.`
  );
}

/** Dueño -> cliente, después de aprobar el comprobante. */
export function mensajeConfirmacion(
  c: DatosCita & { barbero: string; direccion: string; toleranciaMin: number },
): string {
  const lineas = [
    `Hola ${c.cliente}, tu hora ha sido agendada correctamente ✅`,
    "",
    `Servicio: ${c.servicio}`,
    `Barbero: ${c.barbero}`,
    `Día: ${fechaLarga(c.fecha)}`,
    `Hora: ${hm(c.inicioMin)}`,
  ];
  if (c.direccion) lineas.push(`Dirección: ${c.direccion}`);
  lineas.push(
    "",
    `Si llegas con más de ${c.toleranciaMin} minutos de atraso, la hora se libera. ¡Te esperamos!`,
  );
  return lineas.join("\n");
}

/** Dueño -> cliente, cuando rechaza el comprobante. */
export function mensajeRechazo(c: DatosCita & { motivo: string }): string {
  const motivo = c.motivo.trim() ? ` Motivo: ${c.motivo.trim()}.` : "";
  return (
    `Hola ${c.cliente}, no pudimos confirmar tu hora de ${c.servicio} del ` +
    `${fechaLarga(c.fecha)} a las ${hm(c.inicioMin)}.${motivo} ` +
    `Si quieres, puedes volver a reservar.`
  );
}

/** Barbero -> cliente que todavía no llega. */
export function mensajeClienteNoLlega(c: DatosCita & { barbero: string; barberia: string }): string {
  return (
    `Hola ${c.cliente}, soy ${c.barbero} de ${c.barberia}. ` +
    `Tu hora de ${c.servicio} es a las ${hm(c.inicioMin)}. ¿Vienes en camino?`
  );
}
