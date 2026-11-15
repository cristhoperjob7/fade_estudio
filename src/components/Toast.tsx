import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

type Avisar = (mensaje: string, tipo?: "ok" | "error") => void;
const Ctx = createContext<Avisar>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ texto: string; tipo: "ok" | "error" } | null>(null);
  const timer = useRef<number>();

  const avisar = useCallback<Avisar>((texto, tipo = "ok") => {
    setMsg({ texto, tipo });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 3200);
  }, []);

  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div className={`toast ${msg ? "show" : ""} ${msg?.tipo === "error" ? "error" : ""}`} role="status" aria-live="polite">
        {msg?.texto}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
