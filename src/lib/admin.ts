import { hoyChile } from "./fecha";
import type { BarberiaAdmin } from "./types";

/** Días de calendario desde hoy hasta una fecha "AAAA-MM-DD" (negativo si ya pasó). */
export function diasHasta(fecha: string, hoy = hoyChile()): number {
  const a = Date.parse(`${hoy}T12:00:00Z`);
  const b = Date.parse(`${fecha}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export type TonoSus = "ok" | "aviso" | "mal" | "gris";

/** Cómo está la suscripción de una barbería, en palabras simples. */
export function estadoSuscripcion(b: Pick<BarberiaAdmin, "estado" | "vence_el" | "gracia_dias" | "vigente">): { texto: string; tono: TonoSus } {
  if (b.estado === "suspendida") return { texto: "Suspendida", tono: "gris" };
  if (!b.vence_el) return { texto: "Sin vencimiento", tono: "gris" };
  const d = diasHasta(b.vence_el);
  if (d < 0) {
    return b.vigente
      ? { texto: `Venció hace ${-d} ${-d === 1 ? "día" : "días"} (en gracia)`, tono: "aviso" }
      : { texto: "Vencida · bloqueada", tono: "mal" };
  }
  if (d === 0) return { texto: "Vence hoy", tono: "aviso" };
  if (d <= 7) return { texto: `Vence en ${d} ${d === 1 ? "día" : "días"}`, tono: "aviso" };
  return { texto: "Al día", tono: "ok" };
}

/** "mi barbería 593" -> "mi-barberia-593" */
export function aSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** "2026-12-15" -> "15 dic 2026" */
export function fechaMes(f: string): string {
  const [a, m, d] = f.split("-").map(Number);
  return `${d} ${MES_CORTO[m - 1]} ${a}`;
}
