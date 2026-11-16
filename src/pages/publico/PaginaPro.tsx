import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PubNav from "../../components/PubNav";
import { cargarBarberos } from "../../lib/reserva";
import { urlPagina, useBarberiaPublica, useRutas, useSlug, useTemaPublico } from "../../lib/publico";
import { clp } from "../../lib/dinero";
import { hm } from "../../lib/fecha";
import { iniciales } from "../../components/Avatar";
import { enlaceWhatsapp, formatearTelefono } from "../../lib/whatsapp";
import type { Barbero } from "../../lib/types";

/** Plantilla Pro («Portada»): foto grande, logo, color propio, servicios y equipo. La edita el dueño en Ajustes → Mi página. */
export default function PaginaPro() {
  const slug = useSlug();
  const rutas = useRutas();
  const tema = useTemaPublico();
  const { datos, aj } = useBarberiaPublica();
  const [equipo, setEquipo] = useState<Barbero[]>([]);
  const pag = datos?.pagina;
  const portada = urlPagina(pag?.portada_path);
  const logo = urlPagina(pag?.logo_path);

  useEffect(() => {
    cargarBarberos(slug)
      .then(setEquipo)
      .catch(() => setEquipo([]));
  }, [slug]);

  const servicios = datos?.servicios ?? [];
  return (
    <div className="pb pp" style={tema}>
      <PubNav />
      {datos && !datos.activa && (
        <p className="pb-aviso-cerrada" role="status">
          Esta barbería no está recibiendo reservas por ahora. Escríbenos por WhatsApp.
        </p>
      )}

      <section className="pp-portada" style={portada ? { backgroundImage: `url(${portada})` } : undefined}>
        <div className="pp-velo" />
      </section>

      <div className="pb-w pp-cuerpo">
        <div className="pp-logo" aria-hidden="true">
          {logo ? <img src={logo} alt="" /> : <span>{iniciales(aj.nombre)}</span>}
        </div>
        <h1 className="pp-nombre">{aj.nombre}</h1>
        {pag?.descripcion && <p className="pp-desc">{pag.descripcion}</p>}
        <p className="pp-dato">
          {aj.direccion && <>{aj.direccion} · </>}
          {hm(aj.hora_apertura)} a {hm(aj.hora_cierre)}
        </p>

        <div className="pp-pildoras">
          <Link to={rutas.reservar} className="pp-pil on">
            Reservar
          </Link>
          <a href="#servicios" className="pp-pil">
            Servicios
          </a>
          {equipo.length > 1 && (
            <a href="#equipo" className="pp-pil">
              Equipo
            </a>
          )}
          <a href="#contacto" className="pp-pil">
            Contacto
          </a>
        </div>

        <section id="servicios" className="pp-sec">
          <ul className="pp-servicios">
            {servicios.map((s) => (
              <li key={s.id}>
                <span>
                  <b>{s.nombre}</b>
                  <small>{s.duracion_min} min</small>
                </span>
                <span className="pp-precio">
                  {s.precio_promo !== null && <s>{clp(s.precio)}</s>}
                  {clp(s.precio_promo ?? s.precio)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {equipo.length > 1 && (
          <section id="equipo" className="pp-sec">
            <h2>Nuestro equipo</h2>
            <ul className="pp-equipo">
              {equipo.map((b) => (
                <li key={b.id}>
                  <span>{b.iniciales || iniciales(b.nombre)}</span>
                  {b.nombre}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="contacto" className="pp-sec pp-contacto">
          {aj.whatsapp && (
            <a href={enlaceWhatsapp(aj.whatsapp, "Hola, quiero consultar por una hora")} target="_blank" rel="noreferrer">
              WhatsApp {formatearTelefono(aj.whatsapp)}
            </a>
          )}
        </section>
      </div>

      <div className="pp-fijo">
        <Link to={rutas.reservar} className="pp-reservar">
          Reservar hora
        </Link>
      </div>
    </div>
  );
}
