import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { enlaceWhatsapp } from "../lib/whatsapp";
import { ahorroAnual, DIAS_PRUEBA, mesesGratis, usePlanes } from "../lib/planes";
import { CabeceraPortada, Ic, Monto, PiePortada, PLANES_DEF } from "../components/Portada";
import type { Ico } from "../components/Portada";
import "../styles/landing.css";
import "../styles/landing2.css";

const EmoticonesPortada = lazy(() => import("../components/EmoticonesPortada"));

const SOPORTE = ((import.meta.env.VITE_SOPORTE_WHATSAPP as string | undefined) ?? "").replace(/\D/g, "");

/* ---------- Contenido ---------- */
const PANEL: { i: Ico; t: string; d: string }[] = [
  { i: "cal", t: "Reservan solos", d: "A cualquier hora" },
  { i: "cash", t: "Pagan antes", d: "Con comprobante" },
  { i: "users", t: "Un panel por barbero", d: "Cada uno su agenda" },
  { i: "bell", t: "Te avisan al celular", d: "Cuando reservan" },
  { i: "tag", t: "Promos por día", d: "El precio correcto" },
  { i: "chart", t: "Caja y comisiones", d: "Al final del día" },
  { i: "link", t: "Tu link propio", d: "Para Instagram" },
  { i: "phone", t: "Como una app", d: "Sin descargar nada" },
];

const PREGUNTAS: { p: string; r: string }[] = [
  { p: "¿Mis clientes tienen que crear una cuenta?", r: "No. Reservan con su nombre y su teléfono, nada más." },
  { p: "¿Cómo me llega la plata?", r: "Directo a tu cuenta, por transferencia. Tú ves el comprobante y apruebas." },
  { p: "¿Tengo que instalar algo?", r: "No. Funciona desde el navegador y se puede dejar como ícono en el celular." },
  { p: "¿Cómo parto?", r: `Nos escribes por WhatsApp, creamos tu barbería y te entregamos tu link y tu clave. Puedes partir con ${DIAS_PRUEBA} días gratis en el plan Básico.` },
  { p: "¿Qué es el chat de la comunidad?", r: "Un chat dentro de Fade Studio para conversar con barberos de todo Chile. Está incluido en todos los planes; con Pro y VIP tu nombre y tus emoticones se ven distintos." },
];

const PASOS: { i: Ico; t: string }[] = [
  { i: "cal", t: "Reserva" },
  { i: "img", t: "Comprobante" },
  { i: "check", t: "Apruebas" },
  { i: "star", t: "Confirmada" },
];

/* ---------- Celular con la animación de aprobar (en bucle) ---------- */
function Celular() {
  return (
    <div className="fs-vis" role="img" aria-label="Ejemplo: llega una reserva, la apruebas con un toque y queda confirmada">
      <div className="fs-aviso">
        <Ic n="bell" s={20} />
        <div>
          <b>Nueva reserva</b>
          <small>Diego M. · 12:30</small>
        </div>
      </div>

      <div className="fs-tel">
        <div className="fs-tel-cab">
          <b>Hoy · sábado 15</b>
          <span>6 citas</span>
        </div>
        <div className="fs-fila">
          <time>10:00</time>
          <div>
            <b>Matías R.</b>
            <small>Corte + cejas</small>
          </div>
          <em className="fs-ok"><Ic n="check" s={13} sw={2.6} /></em>
        </div>
        <div className="fs-fila">
          <time>11:00</time>
          <div>
            <b>Felipe A.</b>
            <small>Corte + barba</small>
          </div>
          <em className="fs-ok"><Ic n="check" s={13} sw={2.6} /></em>
        </div>
        <div className="fs-fila fs-nueva">
          <time>12:30</time>
          <div>
            <b>Diego M.</b>
            <small>Corte · $9.990</small>
          </div>
          <span className="fs-estado">
            <em className="fs-rev">Por aprobar</em>
            <em className="fs-ok fs-oro"><Ic n="check" s={13} sw={2.6} /></em>
          </span>
          <i className="fs-chispa" style={{ ["--dx" as string]: "14px", ["--dy" as string]: "-22px" }} />
          <i className="fs-chispa" style={{ ["--dx" as string]: "26px", ["--dy" as string]: "-4px" }} />
          <i className="fs-chispa" style={{ ["--dx" as string]: "18px", ["--dy" as string]: "20px" }} />
          <i className="fs-chispa" style={{ ["--dx" as string]: "-4px", ["--dy" as string]: "-26px" }} />
        </div>
        <div className="fs-fila">
          <time>15:00</time>
          <div>
            <b>Joaquín P.</b>
            <small>Corte niño</small>
          </div>
          <em className="fs-ok"><Ic n="check" s={13} sw={2.6} /></em>
        </div>

        <div className="fs-apr">
          <span>Diego M. envió el comprobante</span>
          <b className="fs-apr-btn">Aprobar</b>
          <i className="fs-dedo" />
        </div>

        <div className="fs-caja">
          <span>Caja de hoy</span>
          <span className="fs-monto">
            <b className="fs-m1">$49.950</b>
            <b className="fs-m2">$59.940</b>
          </span>
        </div>
      </div>

      <div className="fs-pasos">
        {PASOS.map((p, k) => (
          <div key={p.t} className={`fs-paso fs-paso${k + 1}`}>
            <span>
              <Ic n={p.i} s={20} />
            </span>
            <small>{p.t}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Texto de los mensajes de la conversación de ejemplo. */
const CHAT: { de: "tu" | "fs"; t: string }[] = [
  { de: "tu", t: `Hola, quiero probar el plan Básico ${DIAS_PRUEBA} días` },
  { de: "fs", t: "¡Hola! ¿Cómo se llama tu barbería?" },
  { de: "tu", t: "Barbería Don Mario" },
  { de: "fs", t: "Listo. Tu link ya está activo: …/b/don-mario" },
];

/** Portada de Fade Studio: para vender el sistema a dueños de barberías. */
export default function Landing() {
  const [anual, setAnual] = useState(false);
  const [activa, setActiva] = useState(0);
  const riel = useRef<HTMLDivElement>(null);
  const precios = usePlanes();
  const gratis = Math.max(0, ...precios.map(mesesGratis));
  const enlace = (texto: string) => (SOPORTE ? enlaceWhatsapp(SOPORTE, texto) : "");
  const quiero = enlace("Hola, quiero conocer Fade Studio para mi barbería");
  const pruebaWsp = enlace(`Hola, quiero probar el plan Básico de Fade Studio ${DIAS_PRUEBA} días gratis en mi barbería`);

  /** Qué carta del carrusel está centrada (para los puntitos). */
  useEffect(() => {
    const el = riel.current;
    if (!el) return;
    const alMover = () => {
      const c = el.children[0] as HTMLElement | undefined;
      if (!c) return;
      const paso = c.offsetWidth + 14;
      setActiva(Math.max(0, Math.min(2, Math.round(el.scrollLeft / paso))));
    };
    el.addEventListener("scroll", alMover, { passive: true });
    return () => el.removeEventListener("scroll", alMover);
  }, []);
  const irA = (k: number) => {
    const el = riel.current;
    const c = el?.children[k] as HTMLElement | undefined;
    if (el && c) el.scrollTo({ left: k * (c.offsetWidth + 14), behavior: "smooth" });
  };

  /** Botón de prueba gratis: por WhatsApp si está configurado; si no, al formulario. */
  const BotonPrueba = ({ clase = "fs-btn fs-btn-oro" }: { clase?: string }) =>
    pruebaWsp ? (
      <a className={clase} href={pruebaWsp} target="_blank" rel="noreferrer">
        <Ic n="chat" s={20} /> Probar {DIAS_PRUEBA} días gratis
      </a>
    ) : (
      <Link className={clase} to="/contratar?ciclo=prueba">
        Probar {DIAS_PRUEBA} días gratis
      </Link>
    );

  return (
    <div className="fs-landing lp">
      <CabeceraPortada />

      <main>
        {/* ---------- Portada ---------- */}
        <section className="lp-hero">
          <span className="lp-tag">
            <u /> Comunidad de barberos de todo Chile
          </span>
          <h1>
            Donde los barberos <span>se hacen notar.</span>
          </h1>
          <p className="lp-lead">La agenda, los pagos y tu propia página. Y una comunidad de colegas en todo Chile.</p>
          <div className="lp-row">
            <BotonPrueba clase="fs-btn fs-btn-oro lp-cta" />
            <a className="lp-ghost" href="#planes" aria-label="Ver los planes">
              <Ic n="back" s={22} />
            </a>
          </div>
          <p className="fs-nota">
            <b>{DIAS_PRUEBA} días gratis en el plan Básico</b> · sin tarjeta · listo en minutos
          </p>
        </section>

        <div className="lp-tick" aria-hidden="true">
          <div>
            {[0, 1].map((n) => (
              <span key={n}>
                Reservas 24/7 <b>✦</b> Pago con comprobante <b>✦</b> Página propia <b>✦</b> Chat de barberos <b>✦</b> Avisos al celular <b>✦</b>{" "}
              </span>
            ))}
          </div>
        </div>

        {/* ---------- Planes ---------- */}
        <section id="planes" className="lp-sec" aria-labelledby="planes-t">
          <div className="lp-kick">Planes</div>
          <h2 id="planes-t" className="lp-h2">
            Elige tu nivel. <em>Desliza.</em>
          </h2>

          <div className="fs-toggle lp-toggle" role="group" aria-label="Forma de pago">
            <div className={`fs-toggle-in${anual ? " anual" : ""}`}>
              <i className="fs-toggle-ind" aria-hidden="true" />
              <button type="button" aria-pressed={!anual} className={!anual ? "on" : ""} onClick={() => setAnual(false)}>
                Mensual
              </button>
              <button type="button" aria-pressed={anual} className={anual ? "on" : ""} onClick={() => setAnual(true)}>
                Anual {gratis > 0 && <em>{gratis} {gratis === 1 ? "mes gratis" : "meses gratis"}</em>}
              </button>
            </div>
          </div>

          <div className="lp-riel" ref={riel} role="list">
            {PLANES_DEF.map((d) => {
              const p = precios.find((x) => x.clave === d.clave);
              if (!p) return null;
              const ahorro = ahorroAnual(p);
              const boton =
                d.clave === "basico" ? (
                  <Link className="lp-btn" to="/contratar?plan=basico&ciclo=prueba">
                    Empezar {DIAS_PRUEBA} días gratis
                  </Link>
                ) : (
                  <Link className="lp-btn" to={`/contratar?plan=${d.clave}&ciclo=${anual ? "anual" : "mensual"}`}>
                    {d.clave === "pro" ? "Subir a Pro" : "Quiero VIP hoy"}
                  </Link>
                );
              const cuerpo = (
                <>
                  <div className="lp-top">
                    {d.clave === "vip" ? <span className="lp-badge">{d.rareza}</span> : <small>{d.rareza}</small>}
                    {d.clave === "vip" && <span className="lp-corona" aria-hidden="true">👑</span>}
                  </div>
                  <h3>{p.nombre}</h3>
                  <div className="lp-precio">
                    <b>
                      <Monto valor={anual ? p.precio_anual : p.precio_mensual} />
                    </b>
                    <span key={anual ? "a" : "m"} className="fs-fundir">
                      {anual ? "/año" : "/mes"}
                    </span>
                  </div>
                  <div className={`fs-ahorro${anual && ahorro > 0 ? " on" : ""}`} aria-live="polite">
                    <div>
                      <span>
                        <Ic n="check" s={14} sw={2.8} /> Ahorras <Monto valor={ahorro} /> al año
                      </span>
                    </div>
                  </div>
                  <ul className="lp-ul">
                    {d.incluye && <li>{d.incluye}</li>}
                    {d.hab.map((h) => (
                      <li key={h.t}>{h.t}</li>
                    ))}
                    <li className="lp-chat-li">{d.chat}</li>
                  </ul>
                  {boton}
                  {d.clave === "vip" && <p className="lp-save">Se nota desde el primer mensaje ✨</p>}
                </>
              );
              return (
                <article key={d.clave} role="listitem" className={`lp-pl lp-pl-${d.clave}`}>
                  {d.clave === "pro" && (
                    <>
                      <i className="lp-spark" style={{ right: 22, top: 58 }}>✦</i>
                      <i className="lp-spark" style={{ right: 52, top: 94, animationDelay: ".8s", fontSize: 10 }}>✦</i>
                    </>
                  )}
                  {d.clave === "vip" ? <div className="lp-in">{cuerpo}</div> : cuerpo}
                </article>
              );
            })}
          </div>
          <div className="lp-dots" role="tablist" aria-label="Planes">
            {[0, 1, 2].map((k) => (
              <button key={k} type="button" role="tab" aria-selected={activa === k} aria-label={PLANES_DEF[k]?.clave} className={activa === k ? "on" : ""} onClick={() => irA(k)} />
            ))}
          </div>
          <p className="fs-sinperm">
            <Ic n="shield" s={20} /> Sin permanencia · Cancelas cuando quieras
          </p>
        </section>

        {/* ---------- Comunidad: el chat ---------- */}
        <section className="lp-sec" aria-labelledby="com-t">
          <div className="lp-kick">Comunidad</div>
          <h2 id="com-t" className="lp-h2">
            Tus colegas <em>ya están adentro.</em>
          </h2>
          <div className="lp-fonowrap">
            <span className="lp-fl lp-fl1" aria-hidden="true">🔥</span>
            <span className="lp-fl lp-fl2" aria-hidden="true">💈</span>
            <div className="lp-phone" role="img" aria-label="Ejemplo del chat de barberos: nombres en rojo, dorado, celeste y gris según el plan">
              <div className="lp-ph-top">
                <i /> Chat de barberos · <em>en vivo</em>
              </div>
              <div className="lp-ph-body">
                <p className="lp-m lp-m1">
                  <b style={{ color: "#ff3b3b" }}>Fade Studio</b>
                  <span>Bienvenidos al chat, ojo con los nuevos planes 🔥</span>
                </p>
                <p className="lp-m lp-m2">
                  <b style={{ color: "#e0b24a" }}>Don Pato</b>
                  <span>Alguien sabe de una máquina buena para degradé?</span>
                </p>
                <p className="lp-m lp-m3">
                  <b style={{ color: "#7fb4ff" }}>Corte Fino</b>
                  <span>La Wahl Magic Clip, no falla 💈</span>
                </p>
                <p className="lp-m lp-m4">
                  <b style={{ color: "#9aa3b2" }}>Hermanos Vega</b>
                  <span>Gracias! Me paso a Pro esta semana ⭐</span>
                </p>
                <div className="lp-typing" aria-hidden="true">
                  <u /> <u /> <u />
                </div>
              </div>
            </div>
          </div>
          <div className="lp-rangos">
            <span style={{ color: "#ff3b3b", borderColor: "#ff3b3b55" }}>ADM</span>
            <span style={{ color: "#e0b24a", borderColor: "#e0b24a55" }}>Barbero Pro</span>
            <span style={{ color: "#8fc2ff", borderColor: "#8fc2ff55" }}>Barbero VIP</span>
          </div>
          <div className="lp-centro">
            <BotonPrueba clase="fs-btn fs-btn-oro lp-cta lp-ancho" />
          </div>
        </section>

        {/* ---------- Comunidad: emoticones por plan (aparte del chat) ---------- */}
        <section className="lp-sec" aria-labelledby="emo-t">
          <div className="lp-kick">Comunidad</div>
          <h2 id="emo-t" className="lp-h2">
            Tu nivel se <em>nota en el chat.</em>
          </h2>
          <p className="lp-sub">Todos entran al chat. Los emoticones animados suben contigo.</p>
          <Suspense fallback={<div className="lp-emo-carga" />}>
            <EmoticonesPortada />
          </Suspense>
          <p className="lp-hint">
            ¿Ves la diferencia? <b>Con Pro</b> te ven dorado. <b className="lp-hint-vip">Con VIP</b>, brillas.
          </p>
          <div className="lp-centro">
            <a className="fs-btn fs-btn-oro lp-cta lp-ancho" href="#planes">
              Subir mi plan
            </a>
          </div>
        </section>

        {/* ---------- El panel ---------- */}
        <section id="panel" className="fs-sec lp-panel" aria-labelledby="panel-t">
          <div className="lp-kick">Tu panel</div>
          <h2 id="panel-t" className="lp-h2">
            Todo en un <em>solo lugar.</em>
          </h2>
          <Celular />
          <div className="fs-cinta">
            {PANEL.map((f) => (
              <div key={f.t} className="fs-cit">
                <span className="fs-cit-i">
                  <Ic n={f.i} s={34} sw={1.5} />
                </span>
                <b>{f.t}</b>
                <small>{f.d}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="fs-sec fs-faq" aria-labelledby="faq-t">
          <h2 id="faq-t" className="lp-h2">
            Lo que más nos <em>preguntan</em>
          </h2>
          {PREGUNTAS.map((q) => (
            <details key={q.p}>
              <summary>{q.p}</summary>
              <p>{q.r}</p>
            </details>
          ))}
        </section>

        {/* ---------- Contacto: el chat de WhatsApp de siempre ---------- */}
        <section className="fs-final" aria-labelledby="final-t">
          <div className="fs-final-in">
            <div className="fs-final-txt">
              <h2 id="final-t">Escríbenos y en minutos estás recibiendo reservas.</h2>
              <p>Así de simple es partir: una conversación y tu barbería queda lista.</p>
              <BotonPrueba />
              {quiero && (
                <a className="fs-enlace" href={quiero} target="_blank" rel="noreferrer">
                  Prefiero conversar primero
                </a>
              )}
            </div>
            <div className="fs-chat" role="img" aria-label="Ejemplo de conversación por WhatsApp para crear tu barbería">
              <div className="fs-chat-cab">
                <span className="fs-chat-av">FS</span>
                <div>
                  <b>Fade Studio</b>
                  <small>en línea</small>
                </div>
              </div>
              <div className="fs-chat-msgs">
                {CHAT.map((m, i) => (
                  <p key={i} className={`fs-msg fs-msg-${m.de} fs-msg${i + 1}`}>
                    {m.t}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <PiePortada />
    </div>
  );
}
