import { useState } from "react";
import { Link } from "react-router-dom";
import { enlaceWhatsapp } from "../lib/whatsapp";
import { ahorroAnual, DIAS_PRUEBA, mesesGratis, usePlanes } from "../lib/planes";
import { CabeceraPortada, Ic, Monto, PiePortada, PLANES_DEF } from "../components/Portada";
import type { Ico } from "../components/Portada";
import "../styles/landing.css";

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
  { p: "¿Cómo parto?", r: "Nos escribes por WhatsApp, creamos tu barbería y te entregamos tu link y tu clave. Puedes partir con 7 días gratis en el plan Básico." },
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
  { de: "tu", t: "Hola, quiero probar el plan Básico 7 días" },
  { de: "fs", t: "¡Hola! ¿Cómo se llama tu barbería?" },
  { de: "tu", t: "Barbería Don Mario" },
  { de: "fs", t: "Listo. Tu link ya está activo: …/b/don-mario" },
];

/** Portada de Fade Studio: para vender el sistema a dueños de barberías. */
export default function Landing() {
  const [anual, setAnual] = useState(false);
  const precios = usePlanes();
  const gratis = Math.max(0, ...precios.map(mesesGratis));
  const enlace = (texto: string) => (SOPORTE ? enlaceWhatsapp(SOPORTE, texto) : "");
  const quiero = enlace("Hola, quiero conocer Fade Studio para mi barbería");
  const pruebaWsp = enlace(`Hola, quiero probar el plan Básico de Fade Studio ${DIAS_PRUEBA} días gratis en mi barbería`);

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
    <div className="fs-landing">
      <CabeceraPortada />

      <main>
        <section className="fs-hero">
          <div className="fs-hero-txt">
            <h1>
              Que tus clientes reserven solos. <i>Tú, a cortar.</i>
            </h1>
            <p className="fs-lead">La agenda de tu barbería, en el celular. Reservan, pagan y tú apruebas con un toque.</p>
            <div className="fs-botones">
              <BotonPrueba />
              <a className="fs-btn fs-btn-borde" href="#panel">
                Ver cómo funciona
              </a>
            </div>
            <p className="fs-nota">
              <b>{DIAS_PRUEBA} días gratis en el plan Básico</b> · sin tarjeta · listo en minutos
            </p>
          </div>
          <Celular />
        </section>

        <section className="fs-prueba" aria-labelledby="prueba-t">
          <div className="fs-prueba-in">
            <div className="fs-prueba-txt">
              <span className="fs-sello">
                <Ic n="gift" s={18} /> Gratis · sin tarjeta
              </span>
              <h2 id="prueba-t">
                Prueba el plan Básico <b>{DIAS_PRUEBA} días gratis</b>
              </h2>
              <p>Escríbenos por WhatsApp y en minutos tienes tu link listo para recibir reservas. La prueba es del plan Básico; Pro y VIP se contratan directo.</p>
              <BotonPrueba />
            </div>
            <ol className="fs-prueba-pasos" aria-label="Cómo empezar la prueba">
              <li>
                <span>
                  <Ic n="chat" s={26} />
                </span>
                <b>Nos escribes</b>
                <small>Por WhatsApp</small>
              </li>
              <li>
                <span>
                  <Ic n="store" s={26} />
                </span>
                <b>Creamos tu barbería</b>
                <small>En minutos</small>
              </li>
              <li>
                <span>
                  <Ic n="link" s={26} />
                </span>
                <b>Compartes tu link</b>
                <small>Y reciben reservas</small>
              </li>
            </ol>
          </div>
        </section>

        <section id="panel" className="fs-sec" aria-labelledby="panel-t">
          <h2 id="panel-t" className="fs-h2">
            Todo en un solo panel
          </h2>
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

        <section id="planes" className="fs-sec" aria-labelledby="planes-t">
          <h2 id="planes-t" className="fs-h2">
            Elige tu carta
          </h2>
          <div className="fs-toggle" role="group" aria-label="Forma de pago">
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

          <div className="fs-cartas">
            {PLANES_DEF.map((d, k) => {
              const p = precios.find((x) => x.clave === d.clave);
              if (!p) return null;
              const ahorro = ahorroAnual(p);
              return (
                <article key={d.clave} className={`fs-carta fs-carta${k}`}>
                  {k === 1 && <div className="fs-elegido">El más elegido</div>}
                  <div className="fs-carta-in">
                    <span className="fs-rareza">{d.rareza}</span>
                    <h3>
                      {p.nombre}
                      {k > 0 && <Ic n="crown" s={32} sw={1.6} />}
                    </h3>
                    <p className="fs-lema">{d.lema}</p>
                    <div className="fs-precio">
                      <b>
                        <Monto valor={anual ? p.precio_anual : p.precio_mensual} />
                      </b>
                      <small key={anual ? "a" : "m"} className="fs-fundir">
                        {anual ? "/año" : "/mes"}
                      </small>
                    </div>
                    <div className={`fs-ahorro${anual && ahorro > 0 ? " on" : ""}`} aria-live="polite">
                      <div>
                        <span>
                          <Ic n="check" s={14} sw={2.8} /> Ahorras <Monto valor={ahorro} /> al año
                        </span>
                      </div>
                    </div>
                    <div className="fs-stats">
                      {d.stats.map(([a, v]) => (
                        <div key={a} className="fs-stat">
                          <span>{a}</span>
                          <div className="fs-bar">
                            {[0, 1, 2, 3, 4].map((n) => (
                              <i key={n} className={n < v ? "on" : ""} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {d.incluye && <p className="fs-incluye">{d.incluye}</p>}
                    <ul className="fs-hab">
                      {d.hab.map((h) => (
                        <li key={h.t}>
                          <span>
                            <Ic n={h.i} s={18} sw={2} />
                          </span>
                          {h.t}
                        </li>
                      ))}
                    </ul>
                    <Link className="fs-btn-plan" to={`/contratar?plan=${d.clave}&ciclo=${anual ? "anual" : "mensual"}`}>
                      Elegir {p.nombre}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="fs-sinperm">
            <Ic n="shield" s={20} /> Sin permanencia · Cancelas cuando quieras
          </p>
        </section>

        <section className="fs-sec fs-faq" aria-labelledby="faq-t">
          <h2 id="faq-t" className="fs-h2">
            Lo que más nos preguntan
          </h2>
          {PREGUNTAS.map((q) => (
            <details key={q.p}>
              <summary>{q.p}</summary>
              <p>{q.r}</p>
            </details>
          ))}
        </section>

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
