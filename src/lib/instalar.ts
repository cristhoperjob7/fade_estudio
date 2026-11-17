import { useEffect, useState } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const esIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalada = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

let guardado: EventoInstalar | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    guardado = e as EventoInstalar;
    window.dispatchEvent(new Event("fs-instalar"));
  });
  window.addEventListener("appinstalled", () => {
    guardado = null;
    window.dispatchEvent(new Event("fs-instalar"));
  });
}

export type EstadoInstalar = "oculto" | "listo" | "ios";

/** Android/PC (Chrome): botón que abre el instalador. iPhone: explica el paso a mano. Si ya está instalada, no muestra nada. */
export function useInstalar(): { estado: EstadoInstalar; instalar: () => Promise<void> } {
  const [, forzar] = useState(0);
  useEffect(() => {
    const f = () => forzar((n) => n + 1);
    window.addEventListener("fs-instalar", f);
    return () => window.removeEventListener("fs-instalar", f);
  }, []);
  const estado: EstadoInstalar = instalada() ? "oculto" : guardado ? "listo" : esIos() ? "ios" : "oculto";
  return {
    estado,
    instalar: async () => {
      if (!guardado) return;
      await guardado.prompt();
      await guardado.userChoice.catch(() => undefined);
      guardado = null;
      forzar((n) => n + 1);
    },
  };
}
