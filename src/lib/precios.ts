import { diaSemana } from "./fecha";

export type ServicioPrecio = {
  precio: number;
  precio_promo: number | null;
  dias_promo: number[];
};

/** ¿Ese día rige el precio promo? (por defecto lunes a jueves) */
export const esDiaPromo = (s: ServicioPrecio, fecha: string) =>
  s.precio_promo !== null && s.dias_promo.includes(diaSemana(fecha));

/** Precio que paga el cliente en esa fecha. */
export const precioPara = (s: ServicioPrecio, fecha: string): number =>
  esDiaPromo(s, fecha) ? (s.precio_promo as number) : s.precio;
