import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { configurado, supabase } from "../lib/supabase";
import { enlaceWhatsapp, formatearTelefono, normalizarTelefono } from "../lib/whatsapp";
import { ahorroAnual, DIAS_PRUEBA, usePlanes } from "../lib/planes";
import type { PlanClave } from "../lib/planes";
import { CabeceraPortada, Ic, Monto, PiePortada, PLANES_DEF } from "../components/Portada";
import "../styles/landing.css";

const SOPORTE = ((import.meta.env.VITE_SOPORTE_WHATSAPP as string | undefined) ?? "").replace(/\D/g, "");
type Ciclo = "mensual" | "anual" | "prueba";

const CLAVES: PlanClave[] = ["basico", "pro", "vip"];
const esPlan = (x: string | null): x is PlanClave => !!x && (CLAVES as string[]).includes(x);
const esCiclo = (x: string | null): x is Ciclo => x === "mensual" || x === "anual" || x === "prueba";

const CICLOS_PAGO: { v: Ciclo; t: string }[] = [
  { v: "mensual", t: "Mensual" },
  { v: "anual", t: "Anual" },
];
/** La prueba gratis es solo para el plan Básico. */
const CICLO_PRUEBA: { v: Ciclo; t: string } = { v: "prueba", t: `Probar ${DIAS_PRUEBA} días` };

/** Proceso de contratación: elegir plan, dejar tus datos y listo. */
export default function Contratar() {
  const [q] = useSearchParams();
  const precios = usePlanes();
  const planInicial: PlanClave = esPlan(q.get("plan")) ? (q.get("plan") as PlanClave) : q.get("ciclo") === "prueba" ? "basico" : "pro";
  const cicloPedido: Ciclo = esCiclo(q.get("ciclo")) ? (q.get("ciclo") as Ciclo) : "mensual";
  const [plan, setPlanSel] = useState<PlanClave>(planInicial);
  const [ciclo, setCiclo] = useState<Ciclo>(cicloPedido === "prueba" && planInicial !== "basico" ? "mensual" : cicloPedido);
  const cambiarPlan = (c: PlanClave) => {
    setPlanSel(c);
    if (c !== "basico" && ciclo === "prueba") setCiclo("mensual");
  };
  const CICLOS = plan === "basico" ? [...CICLOS_PAGO, CICLO_PRUEBA] : CICLOS_PAGO;
  const [barberia, setBarberia] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const k = Math.max(0, PLANES_DEF.findIndex((d) => d.clave === plan));
  const def = PLANES_DEF[k]!;
  const p = precios.find((x) => x.clave === plan) ?? precios[0]!;
  const paso = enviado ? 3 : 2;

  const resumen = `Plan ${p.nombre} · ${ciclo === "prueba" ? `prueba de ${DIAS_PRUEBA} días gratis` : ciclo === "anual" ? "pago anual" : "pago mensual"}`;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const tel = normalizarTelefono(telefono);
    if (!tel) return setError("Revisa tu número de WhatsApp. Ejemplo: 9 1234 5678.");
    setEnviando(true);
    const { error: err } = await supabase.rpc("crear_solicitud_plan", {
      p_barberia: barberia,
      p_contacto: nombre,
      p_telefono: tel,
      p_correo: correo,
      p_plan: plan,
      p_ciclo: ciclo,
    });
    setEnviando(false);
    if (err) return setError(err.message.length < 120 ? err.message : "No pudimos enviar tu solicitud. Intenta de nuevo.");
    setEnviado(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const aviso = SOPORTE
    ? enlaceWhatsapp(SOPORTE, `Hola, soy ${nombre} de ${barberia}. Acabo de enviar mi solicitud en Fade Studio: ${resumen}.`)
    : "";

  return (
    <div className="fs-landing">
      <CabeceraPortada />
      <main className="fs-con">
        <Link to="/fade-studio#planes" className="fs-volver">
          <Ic n="back" s={20} /> Volver a los planes
        </Link>

        <ol className="fs-etapas" aria-label="Pasos">
          {["Tu plan", "Tus datos", "Listo"].map((t, i) => (
            <li key={t} className={i + 1 === paso ? "on" : i + 1 < paso ? "hecho" : ""}>
              <span>{i + 1 < paso ? <Ic n="check" s={16} sw={3} /> : i + 1}</span>
              {t}
            </li>
          ))}
        </ol>

        {enviado ? (
          <section className="fs-gracias" aria-live="polite">
            <span className="fs-gracias-i">
              <Ic n="check" s={34} sw={2.4} />
            </span>
            <h1>¡Recibimos tu solicitud!</h1>
            <p className="fs-lead">
              {resumen}. Te escribimos por WhatsApp al <b>{formatearTelefono(telefono)}</b> para dejar todo listo.
            </p>
            <ol className="fs-sigue">
              <li>
                <span>
                  <Ic n="chat" s={22} />
                </span>
                <div>
                  <b>Te escribimos</b>
                  <small>Para confirmar tus datos.</small>
                </div>
              </li>
              <li>
                <span>
                  <Ic n="store" s={22} />
                </span>
                <div>
                  <b>Creamos tu barbería</b>
                  <small>Te damos tu link y tu clave de acceso.</small>
                </div>
              </li>
              <li>
                <span>
                  <Ic n="cash" s={22} />
                </span>
                <div>
                  <b>{ciclo === "prueba" ? "Pruebas sin pagar" : "Coordinamos el pago"}</b>
                  <small>{ciclo === "prueba" ? `${DIAS_PRUEBA} días con todo incluido.` : "Por transferencia, cuando tu barbería ya esté lista."}</small>
                </div>
              </li>
            </ol>
            {aviso && (
              <a className="fs-btn fs-btn-oro" href={aviso} target="_blank" rel="noreferrer">
                <Ic n="chat" s={20} /> Avisar por WhatsApp para ir más rápido
              </a>
            )}
            <Link className="fs-enlace" to="/fade-studio">
              Volver al inicio
            </Link>
          </section>
        ) : (
          <div className="fs-con-grid">
            <section className="fs-con-plan" aria-labelledby="tu-plan">
              <h1 id="tu-plan">Empieza con Fade Studio</h1>

              <div className="fs-opciones" role="radiogroup" aria-label="Plan">
                {PLANES_DEF.map((d) => {
                  const pr = precios.find((x) => x.clave === d.clave);
                  if (!pr) return null;
                  return (
                    <button
                      key={d.clave}
                      type="button"
                      role="radio"
                      aria-checked={plan === d.clave}
                      className={`fs-opc fs-opc-${d.clave}${plan === d.clave ? " on" : ""}`}
                      onClick={() => cambiarPlan(d.clave)}
                    >
                      <b>{pr.nombre}</b>
                      <small>
                        <Monto valor={pr.precio_mensual} />
                        /mes
                      </small>
                    </button>
                  );
                })}
              </div>

              <div className="fs-ciclos" role="radiogroup" aria-label="Forma de pago" style={{ gridTemplateColumns: `repeat(${CICLOS.length}, 1fr)` }}>
                {CICLOS.map((c) => (
                  <button
                    key={c.v}
                    type="button"
                    role="radio"
                    aria-checked={ciclo === c.v}
                    className={ciclo === c.v ? "on" : ""}
                    onClick={() => setCiclo(c.v)}
                  >
                    {c.t}
                  </button>
                ))}
              </div>
              {plan !== "basico" && (
                <p className="fs-nota-prueba">La prueba gratis de {DIAS_PRUEBA} días es solo del plan Básico. Puedes pasarte a Pro o VIP cuando quieras.</p>
              )}

              <article className={`fs-carta fs-carta${k} fs-carta-resumen`}>
                <div className="fs-carta-in">
                  <span className="fs-rareza">{def.rareza}</span>
                  <h3>
                    {p.nombre}
                    {k > 0 && <Ic n="crown" s={32} sw={1.6} />}
                  </h3>
                  <p className="fs-lema">{def.lema}</p>
                  <div className="fs-precio">
                    <b>
                      <Monto valor={ciclo === "prueba" ? 0 : ciclo === "anual" ? p.precio_anual : p.precio_mensual} />
                    </b>
                    <small>{ciclo === "prueba" ? `por ${DIAS_PRUEBA} días` : ciclo === "anual" ? "/año" : "/mes"}</small>
                  </div>
                  <p className="fs-resumen-nota">
                    {ciclo === "prueba" && (
                      <>
                        Después: <Monto valor={p.precio_mensual} sufijo="/mes" />. Puedes cancelar antes y no pagas nada.
                      </>
                    )}
                    {ciclo === "anual" && ahorroAnual(p) > 0 && (
                      <>
                        Ahorras <Monto valor={ahorroAnual(p)} /> al año.
                      </>
                    )}
                    {ciclo === "mensual" && "Sin permanencia. Cancelas cuando quieras."}
                  </p>
                  <div className="fs-stats">
                    {def.stats.map(([n, v]) => (
                      <div key={n} className="fs-stat">
                        <span>{n}</span>
                        <div className="fs-bar">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <i key={i} className={i < v ? "on" : ""} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <ul className="fs-hab" style={{ marginBottom: 0 }}>
                    {[...(plan === "basico" ? [] : [{ i: "check" as const, t: def.incluye }]), ...def.hab].map((h) => (
                      <li key={h.t}>
                        <span>
                          <Ic n={h.i} s={18} sw={2} />
                        </span>
                        {h.t}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </section>

            <form className="fs-form" onSubmit={enviar} noValidate>
              <h2>Tus datos</h2>
              <p className="fs-form-sub">Con esto creamos tu barbería. Te escribimos por WhatsApp.</p>
              {!configurado && (
                <p className="fs-error" role="alert">
                  Falta conectar Supabase en este sitio.
                </p>
              )}
              <label>
                <span>Nombre de tu barbería</span>
                <input value={barberia} onChange={(e) => setBarberia(e.target.value)} maxLength={80} required autoComplete="organization" />
              </label>
              <label>
                <span>Tu nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} required autoComplete="name" />
              </label>
              <label>
                <span>Tu WhatsApp</span>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="9 1234 5678"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  required
                  autoComplete="tel"
                />
              </label>
              <label>
                <span>
                  Correo <em>(opcional)</em>
                </span>
                <input type="email" inputMode="email" value={correo} onChange={(e) => setCorreo(e.target.value)} maxLength={120} autoComplete="email" />
              </label>
              {error && (
                <p className="fs-error" role="alert">
                  {error}
                </p>
              )}
              <button className="fs-btn fs-btn-oro" type="submit" disabled={enviando || !configurado || !barberia || !nombre || !telefono}>
                {enviando ? "Enviando…" : ciclo === "prueba" ? `Empezar mi prueba de ${DIAS_PRUEBA} días` : "Enviar solicitud"}
              </button>
              <p className="fs-form-pie">
                <Ic n="shield" s={18} /> {ciclo === "prueba" ? "No pagas nada ahora." : "Todavía no pagas: primero te escribimos."}
              </p>
            </form>
          </div>
        )}
      </main>
      <PiePortada />
    </div>
  );
}
