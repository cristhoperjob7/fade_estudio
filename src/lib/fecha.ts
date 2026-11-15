// Todas las fechas y horas del sistema son de Chile (America/Santiago),
// sin importar en qué zona esté el celular o el servidor.
export const TZ = "America/Santiago";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS3 = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Fecha de hoy en Chile: "2026-11-15". */
export function hoyChile(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Minutos transcurridos desde las 00:00 de hoy en Chile. */
export function minutosChile(d: Date = new Date()): number {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const h = Number(partes.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(partes.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

const aUTC = (f: string) => new Date(`${f}T12:00:00Z`);

export function sumarDias(fecha: string, n: number): string {
  const d = aUTC(fecha);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo ... 6 = sábado */
export const diaSemana = (fecha: string) => aUTC(fecha).getUTCDay();

/** "martes 17 de noviembre" */
export function fechaLarga(fecha: string): string {
  const d = aUTC(fecha);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

/** "Dom 15" */
export function fechaCorta(fecha: string): string {
  const d = aUTC(fecha);
  return `${DIAS3[d.getUTCDay()]} ${d.getUTCDate()}`;
}

/** 930 -> "15:30" */
export const hm = (min: number) => `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;

/** "15:30" -> 930 (para los campos de hora) */
export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
