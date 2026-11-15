import { Link } from "react-router-dom";
import { useAjustesPublicos, useMarcaPropia, useRutas } from "../lib/publico";
import { FadeMark } from "./FadeLogo";

/** Barra superior de las páginas públicas. */
export default function PubNav({ completa = false }: { completa?: boolean }) {
  const aj = useAjustesPublicos();
  const rutas = useRutas();
  const propia = useMarcaPropia();
  return (
    <header className="pb-nav">
      <div className="pb-w pb-navin">
        {completa ? (
          <nav className="pb-links" aria-label="Secciones">
            <a href="#servicios">Servicios</a>
            <a href="#galeria">Galería</a>
            <a href="#nosotros">Nosotros</a>
            <a href="#contacto">Contacto</a>
          </nav>
        ) : (
          <Link to={rutas.inicio} className="pb-links pb-volver">
            Volver al inicio
          </Link>
        )}
        <Link to={rutas.inicio} className="pb-marca">
          {propia ? <img src="/logo.png" alt="" width={44} height={44} /> : <FadeMark size={34} />}
          <b>{aj.nombre}</b>
        </Link>
        <div className="pb-nav-der">
          <Link to="/login" className="pb-ingresar">
            Ingresar
          </Link>
        </div>
      </div>
    </header>
  );
}
