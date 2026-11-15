export type Rol = "dueno" | "barbero";

export const ROL_LABEL: Record<Rol, string> = {
  dueno: "Dueño",
  barbero: "Barbero",
};

export type Perfil = {
  id: string;
  barberia_id: string;
  rol: Rol;
  nombre: string;
  apellidos?: string;
  avatar_path?: string | null;
  iniciales: string;
  correo: string;
  telefono: string;
  comision_pct: number;
  activo: boolean;
  atiende: boolean;
};

export type Ajustes = {
  barberia_id: string;
  nombre: string;
  direccion: string;
  whatsapp: string;
  hora_apertura: number;
  hora_cierre: number;
  paso_min: number;
  dias_agenda: number;
  hold_min: number;
  tolerancia_min: number;
};

export type DatosTransferencia = {
  barberia_id: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  rut: string;
  titular: string;
  correo: string;
};

export type EstadoCita =
  | "pendiente_pago"
  | "por_revisar"
  | "confirmada"
  | "atendida"
  | "rechazada"
  | "cancelada"
  | "no_llego"
  | "expirada";

export type Cita = {
  id: string;
  codigo: string;
  barbero_id: string;
  servicio_nombre: string;
  precio: number;
  fecha: string;
  inicio_min: number;
  dur_min: number;
  cliente_nombre: string;
  cliente_telefono: string;
  estado: EstadoCita;
};

export const ESTADO_LABEL: Record<EstadoCita, string> = {
  pendiente_pago: "Pendiente de pago",
  por_revisar: "Por revisar",
  confirmada: "Confirmada",
  atendida: "Atendida",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
  no_llego: "No llegó",
  expirada: "Expirada",
};

export type Servicio = {
  id: string;
  nombre: string;
  descripcion: string;
  duracion_min: number;
  precio: number;
  precio_promo: number | null;
  dias_promo: number[];
  activo: boolean;
  orden: number;
};

export type Barbero = { id: string; nombre: string; iniciales: string };

export type Plan = "basico" | "pro" | "vip";
export const PLAN_LABEL: Record<Plan, string> = { basico: "Básico", pro: "Pro", vip: "VIP" };

/** Estado de la suscripción de la barbería de quien inició sesión. */
export type BarberiaInfo = {
  id: string;
  slug: string;
  nombre: string;
  plan: Plan;
  estado: "activa" | "suspendida";
  vence_el: string | null;
  vigente: boolean;
};

/** Fila de la lista del superadmin. */
export type BarberiaAdmin = {
  id: string;
  slug: string;
  nombre: string;
  plan: Plan;
  precio_mensual: number;
  estado: "activa" | "suspendida";
  vence_el: string | null;
  gracia_dias: number;
  notas: string;
  creada_en: string;
  vigente: boolean;
  citas_30d: number;
  ultimo_pago: string | null;
  dueno_nombre: string | null;
  dueno_correo: string | null;
};

export type PagoSuscripcion = {
  id: string;
  barberia_id: string;
  monto: number;
  fecha: string;
  periodo_hasta: string | null;
  nota: string;
};
