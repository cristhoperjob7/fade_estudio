import { useEffect, useState } from "react";

/** Vibración suave en celulares compatibles. Nunca hace sonido. */
const PATRONES = {
  suave: [8],
  ok: [12, 50, 12],
  error: [30, 60, 30, 60, 30],
} as const;
export type Toque = keyof typeof PATRONES;

const CLAVE = "fs_haptica";
const soportada = () => typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

export function hapticaActiva(): boolean {
  try {
    return localStorage.getItem(CLAVE) !== "0";
  } catch {
    return true;
  }
}

export function guardarHaptica(activa: boolean) {
  try {
    localStorage.setItem(CLAVE, activa ? "1" : "0");
  } catch {
    /* sin almacenamiento: se queda como está */
  }
  window.dispatchEvent(new Event("fs-haptica"));
  if (activa) vibrar("ok");
}

export function vibrar(toque: Toque = "suave") {
  if (!soportada() || !hapticaActiva()) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  try {
    navigator.vibrate([...PATRONES[toque]]);
  } catch {
    /* algunos navegadores lo bloquean: no pasa nada */
  }
}

/** Un toque suave al presionar cualquier botón. Se llama una sola vez al iniciar. */
export function iniciarHaptica() {
  document.addEventListener(
    "pointerdown",
    (e) => {
      const el = (e.target as HTMLElement | null)?.closest?.("button, .btn, [role='button'], [role='tab'], a.lat-item");
      if (!el || (el as HTMLButtonElement).disabled) return;
      if (el.closest("[data-sin-haptica]")) return;
      vibrar("suave");
    },
    { passive: true },
  );
}

export const hapticaDisponible = soportada;

export function useHaptica(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(hapticaActiva);
  useEffect(() => {
    const f = () => setOn(hapticaActiva());
    window.addEventListener("fs-haptica", f);
    return () => window.removeEventListener("fs-haptica", f);
  }, []);
  return [on, guardarHaptica];
}
