import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { clp } from "../../lib/dinero";
import { fechaLarga } from "../../lib/fecha";
import { PLAN_LABEL } from "../../lib/types";
import type { Plan } from "../../lib/types";
import Hoja from "../../components/Hoja";

type PlanFila = { clave: Plan; nombre: string; precio_mensual: number; precio_anual: number };
type Pendiente = { plan: Plan; ciclo: "mensual" | "anual"; creada_en: string } | null;
const ORDEN: Plan[] = ["basico", "pro", "vip"];
const BARBEROS: Record<Plan, string> = { basico: "1 adicional", pro: "Sin límite", vip: "Sin límite" };

/** Mi plan: plan actual, comparación y pedido de cambio (sin volver a llenar datos). */
export default function PlanDueno() {
  const { barberia } = useAuth();
  const [planes, setPlanes] = useState<PlanFila[]>([]);
  const [pendiente, setPendiente] = useState<Pendiente | undefined>(undefined);
  const [ciclo, setCiclo] = useState<"mensual" | "anual">("mensual");
  const [elegido, setElegido] = useState<Plan | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  async function cargar() {
    const [a, b] = await Promise.all([supabase.rpc("planes_publicos"), supabase.rpc("mi_solicitud_plan")]);
    setPlanes(((a.data ?? []) as PlanFila[]).sort((x, y) => ORDEN.indexOf(x.clave) - ORDEN.indexOf(y.clave)));
    setPendiente((b.data as Pendiente) ?? null);
  }
  useEffect(() => {
    void cargar();
  }, []);

  const actual = barberia?.plan ?? "basico";
  const precio = (p: PlanFila) => (ciclo === "mensual" ? `${clp(p.precio_mensual)}/mes` : `${clp(p.precio_anual)}/año`);
  const puede = (p: Plan) => ORDEN.indexOf(p) > ORDEN.indexOf(actual) && !pendiente;

  async function enviar() {
    if (!elegido) return;
    setEnviando(true);
    setError("");
    const { error: err } = await supabase.rpc("solicitar_cambio_plan", { p_plan: elegido, p_ciclo: ciclo });
    setEnviando(false);
    if (err) return setError(err.message);
    setListo(true);
    void cargar();
  }

  function cerrar() {
    setElegido(null);
    setListo(false);
    setError("");
  }

  const elegidoFila = planes.find((p) => p.clave === elegido);

  return (
    <>
      <h1 className="titulo">Mi plan</h1>
      <p className="suave">
        Hoy tienes el plan <b>{PLAN_LABEL[actual]}</b>
        {barberia?.vence_el ? ` · vence el ${fechaLarga(barberia.vence_el)}` : ""}.
      </p>

      {pendiente && (
        <p className="aviso">
          Pediste pasar a <b>{PLAN_LABEL[pendiente.plan]}</b> ({pendiente.ciclo}). Te contactaremos por WhatsApp para coordinar el pago.
        </p>
      )}

      <div className="pestanitas" role="tablist" aria-label="Pago">
        <button role="tab" aria-selected={ciclo === "mensual"} className={ciclo === "mensual" ? "on" : ""} onClick={() => setCiclo("mensual")}>
          Mensual
        </button>
        <button role="tab" aria-selected={ciclo === "anual"} className={ciclo === "anual" ? "on" : ""} onClick={() => setCiclo("anual")}>
          Anual
        </button>
      </div>

      <div className="tabla-planes" role="table" aria-label="Comparación de planes">
        <div className="tp-fila tp-cab" role="row">
          <span />
          {planes.map((p) => (
            <b key={p.clave} className={p.clave === actual ? "actual" : ""} role="columnheader">
              {p.nombre}
              {p.clave === actual && <small>Tu plan</small>}
            </b>
          ))}
        </div>
        <div className="tp-fila" role="row">
          <span>Precio</span>
          {planes.map((p) => (
            <span key={p.clave} className="num">
              {precio(p)}
            </span>
          ))}
        </div>
        <div className="tp-fila" role="row">
          <span>Barberos</span>
          {planes.map((p) => (
            <span key={p.clave}>{BARBEROS[p.clave]}</span>
          ))}
        </div>
        <div className="tp-fila" role="row">
          <span>Reservas online</span>
          {planes.map((p) => (
            <span key={p.clave}>✓</span>
          ))}
        </div>
      </div>

      <div className="tp-botones">
        {planes
          .filter((p) => p.clave !== "basico")
          .map((p) => (
            <button
              key={p.clave}
              className={`btn ${p.clave === "pro" ? "btn-primario" : "btn-borde"}`}
              disabled={!puede(p.clave)}
              onClick={() => setElegido(p.clave)}
            >
              {p.clave === actual ? `Ya tienes ${p.nombre}` : `Elegir ${p.nombre}`}
            </button>
          ))}
      </div>
      <p className="suave" style={{ marginTop: 12 }}>
        No necesitas llenar tus datos otra vez. El pago se coordina por WhatsApp y el plan cambia cuando lo confirmamos.
      </p>

      {elegido && elegidoFila && (
        <Hoja titulo={listo ? "Solicitud enviada" : `Pasar a ${elegidoFila.nombre}`} onCerrar={cerrar}>
          {listo ? (
            <>
              <p>Recibimos tu solicitud. Te escribiremos por WhatsApp para coordinar el pago y activar el plan.</p>
              <button className="btn btn-primario btn-ancho" style={{ marginTop: 14 }} onClick={cerrar}>
                Listo
              </button>
            </>
          ) : (
            <>
              <div className="tarjeta">
                <p>
                  Plan <b>{elegidoFila.nombre}</b> · {ciclo}
                </p>
                <p className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                  {precio(elegidoFila)}
                </p>
              </div>
              {error && (
                <p className="aviso error" role="alert">
                  {error}
                </p>
              )}
              <button className="btn btn-primario btn-ancho" style={{ marginTop: 14 }} disabled={enviando} onClick={() => void enviar()}>
                {enviando ? "Enviando…" : "Enviar solicitud"}
              </button>
            </>
          )}
        </Hoja>
      )}
    </>
  );
}
