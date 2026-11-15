import { supabase } from "./supabase";
import type { Barbero, EstadoCita } from "./types";

/** Texto de un error de Supabase para mostrárselo al cliente. */
export function textoError(e: unknown): string {
  const m = (e as { message?: string } | null)?.message ?? "";
  if (!m || /fetch|network|failed/i.test(m)) return "No pudimos conectar. Revisa tu internet e inténtalo de nuevo.";
  return m;
}

export async function cargarBarberos(slug: string): Promise<Barbero[]> {
  const { data, error } = await supabase.rpc("barberos_publicos", { p_slug: slug });
  if (error) throw error;
  return (data ?? []) as Barbero[];
}

/** Horas libres de un día (sin repetir si hay varios barberos). */
export async function cargarHoras(slug: string, fecha: string, servicio: string, barbero: string | null): Promise<number[]> {
  const { data, error } = await supabase.rpc("horas_disponibles", {
    p_slug: slug,
    p_fecha: fecha,
    p_servicio: servicio,
    p_barbero: barbero,
  });
  if (error) throw error;
  const horas = (data ?? []) as { inicio_min: number }[];
  return [...new Set(horas.map((h) => h.inicio_min))].sort((a, b) => a - b);
}

export type ReservaCreada = { codigo: string; token: string; hold_hasta: string; monto: number; barbero_id: string };

export async function crearReserva(p: {
  slug: string;
  servicio: string;
  barbero: string | null;
  fecha: string;
  inicio: number;
  nombre: string;
  telefono: string;
}): Promise<ReservaCreada> {
  const { data, error } = await supabase.rpc("crear_reserva", {
    p_slug: p.slug,
    p_servicio: p.servicio,
    p_barbero: p.barbero,
    p_fecha: p.fecha,
    p_inicio: p.inicio,
    p_nombre: p.nombre,
    p_telefono: p.telefono,
  });
  if (error) throw error;
  return data as ReservaCreada;
}

export type DatosPago = {
  monto: number;
  hold_hasta: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  rut: string;
  titular: string;
  correo: string;
};

export async function datosPago(codigo: string, token: string): Promise<DatosPago> {
  const { data, error } = await supabase.rpc("datos_pago", { p_codigo: codigo, p_token: token });
  if (error) throw error;
  return data as DatosPago;
}

export const TIPOS_COMPROBANTE = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_COMPROBANTE = 5 * 1024 * 1024;

/** Sube el archivo al bucket privado y avisa que la reserva pasa a revisión. */
export async function enviarComprobante(codigo: string, token: string, archivo: File): Promise<void> {
  if (!TIPOS_COMPROBANTE.includes(archivo.type)) throw new Error("Sube una foto (JPG, PNG, WEBP) o un PDF.");
  if (archivo.size > MAX_COMPROBANTE) throw new Error("El archivo pesa más de 5 MB.");
  const ext = archivo.type === "application/pdf" ? "pdf" : archivo.type === "image/png" ? "png" : archivo.type === "image/webp" ? "webp" : "jpg";
  const ruta = `${codigo}/${token}-${Date.now()}.${ext}`;
  const sube = await supabase.storage.from("comprobantes").upload(ruta, archivo, { contentType: archivo.type, upsert: false });
  if (sube.error) throw new Error("No pudimos subir el archivo. Revisa que la reserva siga vigente e inténtalo de nuevo.");
  const { error } = await supabase.rpc("registrar_comprobante", { p_codigo: codigo, p_token: token, p_ruta: ruta });
  if (error) throw error;
}

export type EstadoReserva = {
  codigo: string;
  estado: EstadoCita;
  servicio: string;
  barbero: string | null;
  fecha: string;
  inicio_min: number;
  dur_min: number;
  precio: number;
  cliente: string;
  motivo_rechazo: string;
  hold_hasta: string | null;
  direccion: string;
  whatsapp: string;
  tolerancia_min: number;
};

export async function estadoReserva(codigo: string, token: string): Promise<EstadoReserva | null> {
  const { data, error } = await supabase.rpc("estado_reserva", { p_codigo: codigo, p_token: token });
  if (error) throw error;
  return (data as EstadoReserva | null) ?? null;
}

const DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTO = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** [1,2,3,4] -> "lunes a jueves" (o "lunes, martes y sábado" si no son seguidos) */
export function diasTexto(dias: number[], corto = false): string {
  const n = corto ? DIAS_CORTO : DIAS_LARGO;
  const orden = [...dias].sort((a, b) => a - b);
  if (orden.length === 0) return "";
  if (orden.length === 1) return n[orden[0]];
  const seguidos = orden.every((d, i) => i === 0 || d === orden[i - 1] + 1);
  if (seguidos && orden.length > 2) return `${n[orden[0]]} a ${n[orden[orden.length - 1]]}`;
  return orden.length === 2 ? `${n[orden[0]]} y ${n[orden[1]]}` : `${orden.slice(0, -1).map((d) => n[d]).join(", ")} y ${n[orden[orden.length - 1]]}`;
}

/** Hora desde "2026-11-17T20:00:00Z" hasta ahora, en segundos (nunca negativo). */
export const segundosHasta = (iso: string) => Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
