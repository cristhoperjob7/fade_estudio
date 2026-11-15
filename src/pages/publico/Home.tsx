import { Link } from "react-router-dom";
import PubNav from "../../components/PubNav";
import { diasTexto } from "../../lib/reserva";
import { useBarberiaPublica, useMarcaPropia, useRutas } from "../../lib/publico";
import { clp } from "../../lib/dinero";
import { hm } from "../../lib/fecha";
import { enlaceWhatsapp, formatearTelefono } from "../../lib/whatsapp";
import NoEncontrada from "./NoEncontrada";

const FOTOS = [
  { src: "/img/corte-1.jpg", pie: "Clásico peinado" },
  { src: "/img/corte-2.jpg", pie: "Fade con barba" },
  { src: "/img/corte-3.jpg", pie: "Diseño lateral" },
  { src: "/img/corte-4.jpg", pie: "Degradado texturado" },
];

export default function Home() {
  const { datos, estado, aj } = useBarberiaPublica();
  const rutas = useRutas();
  const propia = useMarcaPropia();
  const servicios = datos?.servicios ?? [];

  if (estado === "no_existe") return <NoEncontrada />;

  const promos = servicios.filter((s) => s.precio_promo !== null);
  const principal = [...promos].sort((a, b) => b.nombre.length - a.nombre.length)[0];
  const otros = promos.filter((s) => s !== principal).map((s) => s.nombre);
  const diasPromo = principal ? diasTexto(principal.dias_promo) : "";

  return (
    <div className="pb">
      <PubNav completa />
      {datos && !datos.activa && (
        <p className="pb-aviso-cerrada" role="status">
          Esta barbería no está recibiendo reservas por ahora. Escríbenos por WhatsApp.
        </p>
      )}

      <div className="pb-polo" aria-hidden="true" />
      <section className="pb-hero">
        {propia && <img src="/img/corte-3.jpg" alt="" className="pb-hero-img" />}
        <div className="pb-w pb-hero-txt">
          <p className="pb-kick">Barbería · {aj.direccion}</p>
          <h1>
            Corte
            <br />
            de <span>primera.</span>
          </h1>
          <p className="pb-lead">Reserva tu hora, elige a tu barbero y llega sin esperas. Atendemos de {hm(aj.hora_apertura)} a {hm(aj.hora_cierre)}.</p>
          <Link to={rutas.reservar} className="pb-btn pb-btn-azul">
            Reservar mi hora
          </Link>
        </div>
      </section>
      <div className="pb-polo" aria-hidden="true" />

      {principal && (
        <section className="pb-ticket-sec">
          <div className="pb-w">
            <div className="pb-ticket">
              <div>
                <p className="pb-ticket-a">
                  Oferta VIP · {diasPromo.charAt(0).toUpperCase() + diasPromo.slice(1)}
                </p>
                <h2>{principal.nombre}</h2>
                <p className="pb-ticket-n">
                  {otros.length > 0 ? `También vale: ${otros.join(", ")}. ` : ""}Reserva online y paga por transferencia.
                </p>
              </div>
              <div className="pb-ticket-pr">
                <s>Normal {clp(principal.precio)}</s>
                <b>{clp(principal.precio_promo ?? principal.precio)}</b>
                <Link to={rutas.reservar} className="pb-btn pb-btn-negro">
                  Reservar con oferta
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="pb-sec" id="servicios">
        <div className="pb-w">
          <h2 className="pb-h2">
            La carta<i>de servicios</i>
          </h2>
          <div className="pb-pizarra">
            <ul className="pb-menu">
              {servicios.map((s) => (
                <li key={s.id} className={s.precio_promo !== null ? "hot" : ""}>
                  <span className="n">
                    {s.nombre}
                    <small>{s.duracion_min} min</small>
                  </span>
                  <i />
                  <span className="p">
                    {s.precio_promo !== null && <s>{clp(s.precio)}</s>}
                    <b>{clp(s.precio_promo ?? s.precio)}</b>
                    {s.precio_promo !== null && <em>{diasTexto(s.dias_promo, true)}</em>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {principal && (
            <p className="pb-nota">
              Los otros días el precio normal de {principal.nombre.toLowerCase()} es {clp(principal.precio)}.
            </p>
          )}
        </div>
      </section>

      {propia && (
      <section className="pb-sec pb-sec-foto" id="galeria">
        <div className="pb-w">
          <h2 className="pb-h2">
            Trabajos<i>de la casa</i>
          </h2>
          <div className="pb-fotos">
            {FOTOS.map((f) => (
              <figure key={f.src}>
                <img src={f.src} alt={f.pie} loading="lazy" />
                <figcaption>{f.pie}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
      )}

      <section className="pb-sec" id="nosotros">
        <div className={`pb-w pb-quien${propia ? "" : " pb-sin-foto"}`}>
          {propia && <img src="/img/jefe.jpg" alt="Dueño de la barbería" loading="lazy" />}
          <div>
            <em>Quién te atiende</em>
            <h2>
              El oficio
              <br />
              bien hecho
            </h2>
            <p>
              En {aj.nombre} reservas tu hora, llegas y te atendemos puntual. Cortes bien hechos, buen ambiente y un trato
              cuidado de principio a fin.
            </p>
            <Link to={rutas.reservar} className="pb-btn pb-btn-azul">
              Reservar mi hora
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-pie" id="contacto">
        <div className="pb-w">
          <div className="pb-cont">
            <div>
              <small>Dirección</small>
              <b>{aj.direccion}</b>
            </div>
            <div>
              <small>WhatsApp</small>
              <b>
                <a href={enlaceWhatsapp(aj.whatsapp, "Hola, quiero consultar por una hora")} target="_blank" rel="noreferrer">
                  {formatearTelefono(aj.whatsapp)}
                </a>
              </b>
            </div>
            <div>
              <small>Horario</small>
              <b>
                {propia ? "Todos los días" : "Horario de atención"}
                <br />
                {hm(aj.hora_apertura)} a {hm(aj.hora_cierre)}
              </b>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
