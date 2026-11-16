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

/** Plantilla Pro «Clásica»: blanco y negro. Portada grande, logo, servicios, fotos de trabajos y mapa. La edita el dueño en Ajustes → Mi página. */
export default function PaginaPro() {
  const slug = useSlug();
  const rutas = useRutas();
  const tema = useTemaPublico();
  const { datos, aj } = useBarberiaPublica();
  const [equipo, setEquipo] = useState<Barbero[]>([]);
  const pag = datos?.pagina;
  const portada = urlPagina(pag?.portada_path);
  const logo = urlPagina(pag?.logo_path);
  const fotos = pag?.fotos ?? [];

  useEffect(() => {
    cargarBarberos(slug)
      .then(setEquipo)
      .catch(() => setEquipo([]));
  }, [slug]);

  const servicios = datos?.servicios ?? [];
  const lugar = [aj.direccion, datos?.comuna].filter(Boolean).join(", ");
  const mapa = lugar ? `https://maps.google.com/maps?q=${encodeURIComponent(`${lugar}, Chile`)}&z=16&output=embed` : "";
  const abrirMapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lugar || aj.nombre}, Chile`)}`;

  return (
    <div className="pb pp pp-home" style={tema}>
      <PubNav inicio />
      {datos && !datos.activa && (
        <p className="pb-aviso-cerrada" role="status">
          Esta barbería no está recibiendo reservas por ahora. Escríbenos por WhatsApp.
        </p>
      )}

      <div className="pp-portada" role="img" aria-label={`Portada de ${aj.nombre}`} style={portada ? { backgroundImage: `url(${portada})` } : undefined} />

      <div className="pp-cuerpo">
        <div className="pp-logo" aria-hidden="true">
          {logo ? <img src={logo} alt="" /> : <span>{iniciales(aj.nombre)}</span>}
        </div>
        <h1 className="pp-nombre">{aj.nombre}</h1>
        {pag?.descripcion && <p className="pp-desc">{pag.descripcion}</p>}
        <Link to={rutas.reservar} className="pp-reservar-uno">
          Reservar hora
        </Link>

        <section id="servicios" className="pp-sec">
          <h2>Servicios</h2>
          <ul className="pp-servicios">
            {servicios.map((s) => (
              <li key={s.id}>
                <b>{s.nombre}</b>
                <i aria-hidden="true" />
                <small>{s.duracion_min} min</small>
                <span className="pp-precio">
                  {s.precio_promo !== null && <s>{clp(s.precio)}</s>}
                  {clp(s.precio_promo ?? s.precio)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {fotos.length > 0 && (
          <section id="trabajos" className="pp-sec">
            <h2>Trabajos</h2>
            <ul className="pp-galeria">
              {fotos.map((f, n) => (
                <li key={f}>
                  <img src={urlPagina(f) ?? ""} alt={`Trabajo ${n + 1} de ${aj.nombre}`} loading="lazy" />
                </li>
              ))}
            </ul>
          </section>
        )}

        {equipo.length > 1 && (
          <section id="equipo" className="pp-sec">
            <h2>Equipo</h2>
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

        <section id="llegar" className="pp-sec">
          <h2>Cómo llegar</h2>
          {mapa && <iframe className="pp-mapa" title={`Mapa de ${aj.nombre}`} src={mapa} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />}
          <p className="pp-dir">
            {lugar && <span>{lugar}</span>}
            <span>Todos los días · {hm(aj.hora_apertura)} a {hm(aj.hora_cierre)}</span>
          </p>
          <div className="pp-links">
            <a className="pp-pildora" href={abrirMapa} target="_blank" rel="noreferrer">
              Abrir en Google Maps
            </a>
            {aj.whatsapp && (
              <a className="pp-pildora" href={enlaceWhatsapp(aj.whatsapp, "Hola, quiero consultar por una hora")} target="_blank" rel="noreferrer">
                WhatsApp {formatearTelefono(aj.whatsapp)}
              </a>
            )}
          </div>
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
