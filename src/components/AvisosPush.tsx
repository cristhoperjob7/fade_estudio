import { useCallback, useEffect, useState } from "react";
import { activarPush, desactivarPush, estadoPush, probarPush, vincularPush } from "../lib/push";
import type { EstadoPush } from "../lib/push";
import { useToast } from "./Toast";

const TEXTO: Record<EstadoPush, string> = {
  "no-soportado": "Este navegador no permite avisos. Prueba con Chrome en Android, o instala la app en iPhone.",
  "ios-instalar":
    "En iPhone primero instala la app: toca Compartir y luego «Agregar a pantalla de inicio». Abre la app desde su ícono y vuelve aquí.",
  "sin-clave": "Faltan las claves de los avisos en la instalación (VITE_VAPID_PUBLIC_KEY). Mira el README, paso de avisos.",
  bloqueado: "Los avisos están bloqueados en este celular. Permítelos en la configuración del navegador y recarga.",
  inactivo: "Recibe un aviso en este celular cada vez que un cliente envía su comprobante.",
  activo: "Avisos activados en este celular. Te llegará una notificación con cada comprobante nuevo.",
};

/** Tarjeta de Ajustes para activar los avisos push en el celular que se está usando. */
export default function AvisosPush({ para = "dueno" }: { para?: "dueno" | "admin" }) {
  const avisar = useToast();
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [trabajando, setTrabajando] = useState("");

  const leer = useCallback(() => {
    estadoPush()
      .then(async (e) => {
        if (e === "activo") await vincularPush().catch(() => undefined);
        setEstado(e);
      })
      .catch(() => setEstado("no-soportado"));
  }, []);
  useEffect(leer, [leer]);

  const correr = async (clave: string, accion: () => Promise<void>) => {
    setTrabajando(clave);
    try {
      await accion();
    } catch (e) {
      avisar((e as Error).message || "No se pudo completar.", "error");
    } finally {
      setTrabajando("");
      leer();
    }
  };

  return (
    <section className="tarjeta" aria-labelledby="t-avisos">
      <h2 id="t-avisos">Avisos en este celular</h2>
      <p className="suave">
        {estado
          ? para === "admin" && (estado === "inactivo" || estado === "activo")
            ? estado === "activo"
              ? "Avisos activados en este celular. Te llegará una notificación con cada solicitud de plan nueva."
              : "Recibe un aviso en este celular cada vez que alguien pide un plan o un cambio de plan."
            : TEXTO[estado]
          : "Revisando…"}
      </p>
      {estado === "inactivo" && (
        <button className="btn btn-primario" disabled={trabajando !== ""} onClick={() => correr("on", activarPush)}>
          {trabajando === "on" ? "Activando…" : "Activar avisos"}
        </button>
      )}
      {estado === "activo" && (
        <div className="acciones">
          <button
            className="btn btn-borde"
            disabled={trabajando !== ""}
            onClick={() =>
              correr("prueba", async () => {
                const n = await probarPush();
                avisar(n > 0 ? "Aviso de prueba enviado" : "No se envió ningún aviso. Revisa la función en Supabase.", n > 0 ? "ok" : "error");
              })
            }
          >
            {trabajando === "prueba" ? "Enviando…" : "Enviar aviso de prueba"}
          </button>
          <button className="btn btn-texto" disabled={trabajando !== ""} onClick={() => correr("off", desactivarPush)}>
            Desactivar en este celular
          </button>
        </div>
      )}
    </section>
  );
}
