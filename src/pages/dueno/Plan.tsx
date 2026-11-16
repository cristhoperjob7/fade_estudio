import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { clp } from "../../lib/dinero";
import { fechaLarga } from "../../lib/fecha";
import { diasHasta } from "../../lib/admin";
import { PLAN_LABEL } from "../../lib/types";
import type { Plan } from "../../lib/types";
import Hoja from "../../components/Hoja";
import Pestanitas from "../../components/Pestanitas";
import CodigoDescuento from "../../components/CodigoDescuento";
import type { CodigoValido } from "../../components/CodigoDescuento";

type PlanFila = { clave: Plan; nombre: string; precio_mensual: number; precio_anual: number };
type Pendiente = { plan: Plan; ciclo: "mensual" | "anual"; creada_en: string } | null;
const ORDEN: Plan[] = ["basico", "pro", "vip"];
const FRASE: Record<Plan, string> = {
  basico: "Tu barbería ya recibe reservas online. Con Pro tendrás página propia y avisos al celular.",
  pro: "Tu barbería ya tiene página propia y avisos al celular. Gracias por confiar en Fade Studio.",
  vip: "Tu barbería tiene una página hecha a medida y atención directa. Gracias por confiar en Fade Studio.",
};
const BENEFICIOS: Record<Plan, string[]> = {
  basico: ["Reservas online con pago por transferencia", "Agenda por barbero", "Tu equipo: 1 barbero adicional"],
  pro: ["Equipo sin límite de barberos", "Página propia con tu logo, portada y color", "Avisos al celular cuando llega un comprobante", "Reservas online con pago por transferencia"],
  vip: ["Todo lo del plan Pro", "Página a medida, diseñada contigo", "Atención directa para tus cambios", "Funciones nuevas primero"],
};
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
  const [desc, setDesc] = useState<CodigoValido | null>(null);

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
  const puede = (p: Plan) => ORDEN.indexOf(p) > ORDEN.indexOf(actual) && !(pendiente && pendiente.plan !== actual);

  async function enviar() {
    if (!elegido) return;
    setEnviando(true);
    setError("");
    const { error: err } = await supabase.rpc("solicitar_cambio_plan", { p_plan: elegido, p_ciclo: ciclo, p_codigo: desc?.codigo ?? null });
    setEnviando(false);
    if (err) return setError(err.message);
    setListo(true);
    void cargar();
  }

  function cerrar() {
    setElegido(null);
    setDesc(null);
    setListo(false);
    setError("");
  }

  const elegidoFila = planes.find((p) => p.clave === elegido);

  const f = planes.find((x) => x.clave === actual);
  const dias = barberia?.vence_el ? diasHasta(barberia.vence_el) : null;
  const total = 30;
  const avance = dias === null ? 100 : Math.max(4, Math.min(100, Math.round((Math.max(0, dias) / total) * 100)));
  const pedido = pendiente && pendiente.plan !== actual ? pendiente : null;

  return (
    <>
      <h1 className="titulo">Mi plan</h1>

      {pedido && (
        <p className="aviso">
          <b>Solicitud en revisión.</b> Pediste pasar a {PLAN_LABEL[pedido.plan]} ({pedido.ciclo}). Te escribiremos por WhatsApp para coordinar el pago.
        </p>
      )}

      <section className={`mi-plan mi-plan-${actual}`} aria-label="Tu plan">
        <div className="mi-plan-cab">
          <span className="chip">Plan activo</span>
          {barberia?.vence_el && (
            <span className="suave chico">
              Vence el {fechaLarga(barberia.vence_el)}
              {dias !== null && dias >= 0 ? ` · quedan ${dias} ${dias === 1 ? "día" : "días"}` : ""}
            </span>
          )}
        </div>
        <div className="mi-plan-nombre">{PLAN_LABEL[actual]}</div>
        <p className="suave" style={{ margin: 0 }}>{FRASE[actual]}</p>
        {dias !== null && (
          <div className="mi-plan-barra" aria-hidden="true">
            <i style={{ width: `${avance}%` }} />
          </div>
        )}
        {f && <p className="suave chico" style={{ margin: 0 }}>Plan mensual · {clp(f.precio_mensual)} al mes</p>}
      </section>

      <section className="tarjeta" aria-labelledby="mp-inc">
        <h2 id="mp-inc">Lo que incluye tu plan</h2>
        <ul className="mi-plan-lista">
          {BENEFICIOS[actual].map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      {actual === "basico" && (
        <>
          <Pestanitas
            etiqueta="Pago"
            valor={ciclo}
            onCambio={setCiclo}
            opciones={[
              { valor: "mensual", etiqueta: "Mensual" },
              { valor: "anual", etiqueta: "Anual" },
            ]}
          />
          <div className="tabla-planes" role="table" aria-label="Comparación de planes">
            <div className="tp-fila tp-cab" role="row">
              <span />
              {planes.map((p) => (
                <b key={p.clave} className={`tp-${p.clave}${p.clave === actual ? " actual" : ""}`} role="columnheader">
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
              <span>Página propia</span>
              {planes.map((p) => (
                <span key={p.clave}>{p.clave === "basico" ? "—" : p.clave === "pro" ? "Plantilla" : "A medida"}</span>
              ))}
            </div>
            <div className="tp-fila" role="row">
              <span>Avisos al celular</span>
              {planes.map((p) => (
                <span key={p.clave}>{p.clave === "basico" ? "—" : "✓"}</span>
              ))}
            </div>
          </div>
          <div className="tp-botones">
            {planes
              .filter((p) => p.clave !== "basico")
              .map((p) => (
                <button key={p.clave} className={`btn ${p.clave === "pro" ? "btn-primario" : "btn-borde"}`} disabled={!puede(p.clave)} onClick={() => setElegido(p.clave)}>
                  {`Elegir ${p.nombre}`}
                </button>
              ))}
          </div>
          <p className="suave" style={{ marginTop: 12 }}>
            No necesitas llenar tus datos otra vez. El pago se coordina por WhatsApp y el plan cambia cuando lo confirmamos.
          </p>
        </>
      )}

      {actual === "pro" && (
        <section className="mi-plan-mas">
          <div>
            <b>¿Quieres más? Plan VIP</b>
            <p className="suave chico" style={{ margin: "2px 0 0" }}>
              Página hecha a medida, lista de espera y estadísticas.
            </p>
          </div>
          <button className="btn btn-borde btn-chico" disabled={!puede("vip")} onClick={() => setElegido("vip")}>
            {pedido ? "Solicitud enviada" : "Conocer VIP"}
          </button>
        </section>
      )}
      {actual === "vip" && <p className="suave">Estás en el plan más completo. Si necesitas algo especial para tu página, escríbenos.</p>}

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
              <CodigoDescuento valor={desc} onCambio={setDesc} />
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
