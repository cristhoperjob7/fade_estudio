import { Link } from "react-router-dom";
import { FadeMark } from "../components/FadeLogo";
import { enlaceWhatsapp } from "../lib/whatsapp";
import "../styles/landing.css";

const SOPORTE = ((import.meta.env.VITE_SOPORTE_WHATSAPP as string | undefined) ?? "").replace(/\D/g, "");
const MENSAJE = "Hola, quiero conocer Fade Studio para mi barbería";

const FUNCIONES: { t: string; d: string }[] = [
  { t: "Reservas a cualquier hora", d: "Tus clientes agendan desde el celular a las 2 de la mañana si quieren. Tú no contestas nada." },
  { t: "Pago por adelantado", d: "Para reservar, transfieren y suben el comprobante. Se acabaron los clientes que no llegan." },
  { t: "Tú apruebas con un toque", d: "Ves el comprobante, lo apruebas y la hora queda confirmada. Si algo no calza, la rechazas." },
  { t: "Agenda por barbero", d: "Cada uno ve solo sus citas del día, con su propia clave. Nadie se pisa la hora." },
  { t: "Aviso al celular", d: "Cada vez que alguien reserva, te llega una notificación. Sin estar mirando la pantalla." },
  { t: "Promos por día", d: "Un corte a $9.990 de lunes a jueves, por ejemplo. El sistema cobra el precio correcto según el día." },
  { t: "Tu horario y tus días libres", d: "Defines a qué hora abres, cuándo almuerzas y qué días no atiendes. Solo se pueden reservar horas libres." },
  { t: "Caja del día y comisiones", d: "Sabes cuánto se cobró, quién lo cortó y cuánto le toca a cada barbero." },
  { t: "Tu link propio", d: "Una dirección con el nombre de tu barbería para poner en Instagram y WhatsApp." },
  { t: "Se usa como una app", d: "Se instala en el celular desde el navegador. No hay que bajar nada de ninguna tienda." },
];

const PASOS: { t: string; d: string }[] = [
  { t: "El cliente elige", d: "Entra a tu link, escoge el servicio, el barbero y una hora libre." },
  { t: "Paga y sube el comprobante", d: "Transfiere a tu cuenta y adjunta la foto. Queda esperando tu revisión." },
  { t: "Tú lo apruebas", d: "Te llega el aviso, revisas y confirmas. El cliente ve su hora confirmada." },
];

const PREGUNTAS: { p: string; r: string }[] = [
  {
    p: "¿Mis clientes tienen que crear una cuenta?",
    r: "No. Reservan con su nombre y su teléfono, nada más.",
  },
  {
    p: "¿Cómo me llega la plata?",
    r: "Directo a tu cuenta, por transferencia. Fade Studio no toca tu dinero: tú ves el comprobante y apruebas.",
  },
  {
    p: "¿Puedo tener varios barberos?",
    r: "Sí. Creas a cada uno desde tu panel y les das su clave. Cada uno ve solo su agenda.",
  },
  {
    p: "¿Tengo que instalar algo?",
    r: "No. Funciona desde el navegador del celular o del computador, y se puede dejar como ícono en la pantalla de inicio.",
  },
  {
    p: "¿Cómo parto?",
    r: "Nos escribes por WhatsApp, creamos tu barbería y te entregamos tu link y tu clave. Parte con una prueba gratis.",
  },
];

const BARRAS = [100, 82, 64, 46, 30, 18, 10];

function Barras() {
  return (
    <div className="fs-barras" aria-hidden="true">
      {BARRAS.map((h, i) => (
        <span key={i} style={{ height: `${h}%`, ["--i" as string]: i }} />
      ))}
    </div>
  );
}

function Telefono() {
  return (
    <div className="fs-tel" role="img" aria-label="Ejemplo de la agenda del día en el celular">
      <div className="fs-tel-cab">
        <b>Hoy, sábado 15</b>
        <span>6 citas</span>
      </div>
      <ul>
        <li>
          <time>10:00</time>
          <div>
            <b>Matías R.</b>
            <small>Corte + cejas + mascarilla</small>
          </div>
          <em className="ok">Confirmada</em>
        </li>
        <li>
          <time>11:00</time>
          <div>
            <b>Felipe A.</b>
            <small>Corte + barba</small>
          </div>
          <em className="ok">Confirmada</em>
        </li>
        <li className="nueva">
          <time>12:30</time>
          <div>
            <b>Diego M.</b>
            <small>Corte · comprobante enviado</small>
          </div>
          <em className="rev">Por aprobar</em>
        </li>
        <li>
          <time>15:00</time>
          <div>
            <b>Joaquín P.</b>
            <small>Corte niño</small>
          </div>
          <em className="ok">Confirmada</em>
        </li>
      </ul>
      <div className="fs-tel-aprobar">
        <span>Aprobar a Diego</span>
        <b>Aprobar</b>
      </div>
    </div>
  );
}

/** Portada de Fade Studio: para vender el sistema a dueños de barberías. */
export default function Landing() {
  const quiero = SOPORTE ? enlaceWhatsapp(SOPORTE, MENSAJE) : "";

  return (
    <div className="fs-landing">
      <header className="fs-cab">
        <Link to="/" className="fs-marca" aria-label="Fade Studio">
          <FadeMark size={30} />
          <span>Fade Studio</span>
        </Link>
        <Link to="/login" className="fs-ingresar">
          Ingresar
        </Link>
      </header>

      <main>
        <section className="fs-hero">
          <div className="fs-hero-txt">
            <h1>Que tus clientes reserven solos. Tú dedícate a cortar.</h1>
            <p className="fs-lead">
              Fade Studio es la agenda de tu barbería. Reservan desde el celular, pagan por adelantado y tú apruebas el comprobante con un toque.
            </p>
            <div className="fs-botones">
              {quiero ? (
                <a className="fs-btn fs-btn-oro" href={quiero} target="_blank" rel="noreferrer">
                  Quiero Fade Studio
                </a>
              ) : null}
              <a className="fs-btn fs-btn-borde" href="#como">
                Ver cómo funciona
              </a>
            </div>
            <p className="fs-nota">Parte con una prueba gratis. Sin contrato.</p>
          </div>
          <div className="fs-hero-vis">
            <Telefono />
          </div>
        </section>

        <section className="fs-dolor" aria-labelledby="dolor">
          <h2 id="dolor">Esto es lo que te quita tiempo hoy</h2>
          <ul>
            <li>
              <b>Mensajes sin fin.</b> “¿Tienes hora para hoy?”, “¿a qué hora cierras?”, “¿cuánto sale?”. Todo el día contestando lo mismo.
            </li>
            <li>
              <b>Clientes que no llegan.</b> Reservan, no avisan y te dejan la silla vacía. Esa hora no la recuperas.
            </li>
            <li>
              <b>Plata que no sabes si entró.</b> Transferencias perdidas entre chats, y cuentas que se hacen a mano al final del día.
            </li>
          </ul>
        </section>

        <section id="como" className="fs-como" aria-labelledby="como-t">
          <h2 id="como-t">Así funciona, de punta a punta</h2>
          <ol>
            {PASOS.map((p, i) => (
              <li key={p.t}>
                <span className="fs-n">{i + 1}</span>
                <div>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="fs-funciones" aria-labelledby="fun-t">
          <div className="fs-funciones-cab">
            <h2 id="fun-t">Todo lo que trae, dicho simple</h2>
            <Barras />
          </div>
          <dl>
            {FUNCIONES.map((f) => (
              <div key={f.t}>
                <dt>{f.t}</dt>
                <dd>{f.d}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="fs-faq" aria-labelledby="faq-t">
          <h2 id="faq-t">Lo que más nos preguntan</h2>
          {PREGUNTAS.map((q) => (
            <details key={q.p}>
              <summary>{q.p}</summary>
              <p>{q.r}</p>
            </details>
          ))}
        </section>

        <section className="fs-final">
          <h2>Tu barbería con la agenda llena y el celular en silencio.</h2>
          <p>Escríbenos y en poco tiempo tienes tu link listo para compartir.</p>
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
          </div>
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
