import { Link } from "react-router-dom";
import Cartel, { Tira } from "../components/Cartel";
import FadeLogo from "../components/FadeLogo";
import { enlaceWhatsapp } from "../lib/whatsapp";

const SOPORTE = ((import.meta.env.VITE_SOPORTE_WHATSAPP as string | undefined) ?? "").replace(/\D/g, "");

/** Portada de Fade Studio (cuando el sitio no tiene una barbería por defecto). */
export default function Landing() {
  return (
    <div className="acceso">
      <Cartel />
      <main className="acceso-form">
        <div className="acceso-caja">
          <div className="acceso-movil">
            <FadeLogo size={34} />
            <Tira />
          </div>
          <p className="acceso-kicker">Sistema para barberías</p>
          <h1>Reservas, pagos y comisiones, en un solo lugar.</h1>
          <p className="acceso-sub">Tus clientes reservan solos, pagan por adelantado y tú apruebas el comprobante desde el celular.</p>
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
