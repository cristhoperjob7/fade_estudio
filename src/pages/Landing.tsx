import { Link } from "react-router-dom";
import Cartel from "../components/Cartel";
import FadeLogo from "../components/FadeLogo";
import { enlaceWhatsapp } from "../lib/whatsapp";

const SOPORTE = ((import.meta.env.VITE_SOPORTE_WHATSAPP as string | undefined) ?? "").replace(/\D/g, "");

/** Portada de Fade Studio (cuando el sitio no tiene una barbería por defecto). */
export default function Landing() {
  return (
    <div className="acceso">
      <Cartel grande />
      <main className="acceso-form">
        <div className="acceso-caja">
          <span className="acceso-solo-movil">
            <FadeLogo size={30} />
          </span>
          <p className="acceso-kicker">Sistema para barberías</p>
          <h1>Reservas, pagos y comisiones, en un solo lugar.</h1>
          <ul className="portada-lista">
            <li>Tus clientes reservan solos, a cualquier hora.</li>
            <li>Pagan por adelantado y tú apruebas el comprobante.</li>
            <li>Agenda por barbero y avisos en tu celular.</li>
          </ul>
          <Link to="/login" className="btn btn-primario">
            Ingresar
          </Link>
          {SOPORTE && (
            <a
              className="btn btn-borde"
              target="_blank"
              rel="noreferrer"
              href={enlaceWhatsapp(SOPORTE, "Hola, quiero conocer Fade Studio para mi barbería")}
            >
              Quiero Fade Studio
            </a>
          )}
        </div>
      </main>
    </div>
  );
}
