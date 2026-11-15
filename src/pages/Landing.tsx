import { useState } from "react";
import { Link } from "react-router-dom";
import { FadeMark } from "../components/FadeLogo";
import { enlaceWhatsapp } from "../lib/whatsapp";
import "../styles/landing.css";

const SOPORTE = ((import.meta.env.VITE_SOPORTE_WHATSAPP as string | undefined) ?? "").replace(/\D/g, "");

/* ---------- Íconos (trazo simple) ---------- */
const ICONOS = {
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  bell: '<path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>',
  link: '<path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
  users: '<path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8"/>',
  tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  chart: '<path d="M3 3v18h18M7 15l4-4 3 3 5-6"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  crown: '<path d="M3 19h18M4 7l4 4 4-6 4 6 4-4-2 12H6z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 01-12.4 7.4L3 20l1.2-5.4A8.4 8.4 0 1121 11.5z"/>',
  store: '<path d="M3 9l1-5h16l1 5M4 9v11h16V9M9 20v-6h6v6"/>',
  img: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="M21 16l-5-5L5 21"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  star: '<path d="M12 3l2.7 5.7 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3 1.2-6.2L3 9.5l6.3-.8z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  gift: '<rect x="3" y="8" width="18" height="4"/><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 010-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 010 5"/>',
} as const;
type Ico = keyof typeof ICONOS;

function Ic({ n, s = 24, sw = 1.8 }: { n: Ico; s?: number; sw?: number }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONOS[n] }}
    />
  );
}

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

type Hab = { i: Ico; t: string };
type Plan = {
  nombre: string;
  rareza: string;
  lema: string;
  mensual: string;
  anual: string;
  ahorro: string;
  stats: [string, number][];
  incluye: string;
  hab: Hab[];
};
const PLANES: Plan[] = [
  {
    nombre: "Básico",
    rareza: "COMÚN",
    lema: "Para partir ordenado",
    mensual: "$12.990",
    anual: "$129.900",
    ahorro: "$25.980",
    stats: [["Barberos", 2], ["Sucursales", 1], ["Atención", 1]],
    incluye: "",
    hab: [
      { i: "cal", t: "Reservas con tu link" },
      { i: "cash", t: "Pago con comprobante" },
      { i: "users", t: "Agenda por barbero" },
    ],
  },
  {
    nombre: "Pro",
    rareza: "LEGENDARIO",
    lema: "Para barberías con equipo",
    mensual: "$24.990",
    anual: "$249.900",
    ahorro: "$49.980",
    stats: [["Barberos", 4], ["Sucursales", 1], ["Atención", 3]],
    incluye: "Incluye todo lo Básico",
    hab: [
      { i: "bell", t: "Avisos al celular" },
      { i: "tag", t: "Promos por día" },
      { i: "chart", t: "Caja y comisiones" },
      { i: "img", t: "Tu logo y colores" },
      { i: "chat", t: "Recordatorios por WhatsApp" },
    ],
  },
  {
    nombre: "VIP",
    rareza: "ÉPICO",
    lema: "Para marcas con varias sedes",
    mensual: "$39.990",
    anual: "$399.900",
    ahorro: "$79.980",
    stats: [["Barberos", 5], ["Sucursales", 5], ["Atención", 5]],
    incluye: "Incluye todo lo Pro",
    hab: [
      { i: "list", t: "Lista de espera" },
      { i: "gift", t: "Clientes frecuentes y premios" },
      { i: "store", t: "Varias sucursales" },
      { i: "globe", t: "Tu propio dominio" },
    ],
  },
];

const PREGUNTAS: { p: string; r: string }[] = [
  { p: "¿Mis clientes tienen que crear una cuenta?", r: "No. Reservan con su nombre y su teléfono, nada más." },
  { p: "¿Cómo me llega la plata?", r: "Directo a tu cuenta, por transferencia. Tú ves el comprobante y apruebas." },
  { p: "¿Tengo que instalar algo?", r: "No. Funciona desde el navegador y se puede dejar como ícono en el celular." },
  { p: "¿Cómo parto?", r: "Nos escribes por WhatsApp, creamos tu barbería y te entregamos tu link y tu clave. Parte con una prueba gratis." },
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

/** Portada de Fade Studio: para vender el sistema a dueños de barberías. */
export default function Landing() {
  const [anual, setAnual] = useState(false);
  const enlace = (texto: string) => (SOPORTE ? enlaceWhatsapp(SOPORTE, texto) : "");
  const quiero = enlace("Hola, quiero conocer Fade Studio para mi barbería");

  return (
    <div className="fs-landing">
      <div className="fs-poste" aria-hidden="true" />
      <header className="fs-cab">
        <Link to="/" className="fs-marca" aria-label="Fade Studio">
          <FadeMark size={32} />
          <span>Fade Studio</span>
        </Link>
        <Link to="/login" className="fs-ingresar">
          Ingresar
        </Link>
      </header>

      <main>
        <section className="fs-hero">
          <div className="fs-hero-txt">
            <h1>
              Que tus clientes reserven solos. <i>Tú, a cortar.</i>
            </h1>
            <p className="fs-lead">La agenda de tu barbería, en el celular. Reservan, pagan y tú apruebas con un toque.</p>
            <div className="fs-botones">
              {quiero ? (
                <a className="fs-btn fs-btn-oro" href={quiero} target="_blank" rel="noreferrer">
                  Quiero Fade Studio
                </a>
              ) : (
                <Link className="fs-btn fs-btn-oro" to="/login">
                  Ingresar
                </Link>
              )}
              <a className="fs-btn fs-btn-borde" href="#panel">
                Ver cómo funciona
              </a>
            </div>
          </div>
          <Celular />
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
            <button type="button" className={!anual ? "on" : ""} onClick={() => setAnual(false)}>
              Mensual
            </button>
            <button type="button" className={anual ? "on" : ""} onClick={() => setAnual(true)}>
              Anual <em>2 meses gratis</em>
            </button>
          </div>

          <div className="fs-cartas">
            {PLANES.map((p, k) => (
              <article key={p.nombre} className={`fs-carta fs-carta${k}`}>
                {k === 1 && <div className="fs-elegido">El más elegido</div>}
                <div className="fs-carta-in">
                  <span className="fs-rareza">{p.rareza}</span>
                  <h3>
                    {p.nombre}
                    {k > 0 && <Ic n="crown" s={32} sw={1.6} />}
                  </h3>
                  <p className="fs-lema">{p.lema}</p>
                  <div className="fs-precio">
                    <b>{anual ? p.anual : p.mensual}</b>
                    <small>{anual ? "/año" : "/mes"}</small>
                  </div>
                  <p className="fs-ahorro">{anual ? `Ahorras ${p.ahorro} al año` : " "}</p>
                  <div className="fs-stats">
                    {p.stats.map(([a, v]) => (
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
                  {p.incluye && <p className="fs-incluye">{p.incluye}</p>}
                  <ul className="fs-hab">
                    {p.hab.map((h) => (
                      <li key={h.t}>
                        <span>
                          <Ic n={h.i} s={18} sw={2} />
                        </span>
                        {h.t}
                      </li>
                    ))}
                  </ul>
                  {SOPORTE ? (
                    <a
                      className="fs-btn-plan"
                      href={enlace(`Hola, quiero el plan ${p.nombre} de Fade Studio para mi barbería`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Empezar
                    </a>
                  ) : (
                    <Link className="fs-btn-plan" to="/login">
                      Empezar
                    </Link>
                  )}
                </div>
              </article>
            ))}
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

        <section className="fs-final">
          <h2 className="fs-h2">Tu barbería con la agenda llena.</h2>
          {quiero ? (
            <a className="fs-btn fs-btn-oro" href={quiero} target="_blank" rel="noreferrer">
              Quiero Fade Studio
            </a>
          ) : (
            <Link className="fs-btn fs-btn-oro" to="/login">
              Ingresar
            </Link>
          )}
        </section>
      </main>

      <footer className="fs-pie">
        <span className="fs-marca">
          <FadeMark size={22} />
          <span>Fade Studio</span>
        </span>
        <Link to="/login">Ingresar</Link>
      </footer>
    </div>
  );
}
