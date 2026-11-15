import { useEffect, useRef, useState } from "react";
import { configurado, supabase } from "./supabase";

export type PlanClave = "basico" | "pro" | "vip";
export type PlanPrecio = { clave: PlanClave; nombre: string; precio_mensual: number; precio_anual: number };

/** Días de prueba gratis que se ofrecen en la portada. */
export const DIAS_PRUEBA = 7;

/** Precios de respaldo: se usan mientras cargan los reales (los edita el superadmin). */
export const PLANES_BASE: PlanPrecio[] = [
  { clave: "basico", nombre: "Básico", precio_mensual: 12990, precio_anual: 129900 },
  { clave: "pro", nombre: "Pro", precio_mensual: 24990, precio_anual: 249900 },
  { clave: "vip", nombre: "VIP", precio_mensual: 39990, precio_anual: 399900 },
];

/** Precios actuales de los planes (públicos). */
export function usePlanes(): PlanPrecio[] {
  const [planes, setPlanes] = useState<PlanPrecio[]>(PLANES_BASE);
  useEffect(() => {
    if (!configurado) return;
    let vivo = true;
    void supabase.rpc("planes_publicos").then(({ data, error }) => {
      if (!vivo || error || !Array.isArray(data) || data.length === 0) return;
      setPlanes(data as PlanPrecio[]);
    });
    return () => {
      vivo = false;
    };
  }, []);
  return planes;
}

/** Cuántos meses se ahorra pagando el año completo (0 si no hay ahorro). */
export function mesesGratis(p: PlanPrecio): number {
  if (p.precio_mensual <= 0) return 0;
  return Math.max(0, Math.round((p.precio_mensual * 12 - p.precio_anual) / p.precio_mensual));
}

/** Lo que se ahorra en un año pagando todo junto. */
export function ahorroAnual(p: PlanPrecio): number {
  return Math.max(0, p.precio_mensual * 12 - p.precio_anual);
}

/** Cuenta suavemente hasta un número (para que los precios no salten de golpe). */
export function useContar(objetivo: number, ms = 500): number {
  const [v, setV] = useState(objetivo);
  const actual = useRef<number>(objetivo);
  useEffect(() => {
    const quieto = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (quieto || actual.current === objetivo) {
      actual.current = objetivo;
      setV(objetivo);
      return;
    }
    const desde: number = actual.current ?? objetivo;
    const t0 = performance.now();
    let raf = 0;
    const paso = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const suave = 1 - Math.pow(1 - p, 3);
      const x = Math.round(desde + (objetivo - desde) * suave);
      actual.current = x;
      setV(x);
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [objetivo, ms]);
  return v;
}
