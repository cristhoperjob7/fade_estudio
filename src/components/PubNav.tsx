import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { urlPagina, useBarberiaPublica, useEsPlantilla, useMarcaPropia, useRutas } from "../lib/publico";
import { FadeMark } from "./FadeLogo";

/** Barra superior de las páginas públicas. */
export default function PubNav({ completa = false, inicio = false }: { completa?: boolean; inicio?: boolean }) {
  const { datos, aj } = useBarberiaPublica();
  const rutas = useRutas();
  const propia = useMarcaPropia();
  const plantilla = useEsPlantilla();
  const navegar = useNavigate();
  const reloj = useRef<number | undefined>(undefined);
  const largo = useRef(false);
  const logo = datos?.plan !== "basico" ? urlPagina(datos?.pagina?.logo_path) : null;

  // Plantilla Pro: sin botones de «Volver al inicio» ni «Ingresar». El acceso queda escondido:
  // mantener presionado el logo 1,5 segundos lleva al inicio de sesión.
  if (plantilla) {
    const soltar = () => window.clearTimeout(reloj.current);
    return (
      <header className="pb-nav pp-nav">
        <div className="pp-nav-in">
          {inicio ? (
            <span className="pp-nav-lado" aria-hidden="true" />
          ) : (
            <Link to={rutas.inicio} className="pp-nav-lado pp-atras" aria-label="Volver">
              ‹
            </Link>
          )}
          <Link
            to={rutas.inicio}
            className="pb-marca pp-marca"
            onPointerDown={() => {
              largo.current = false;
              reloj.current = window.setTimeout(() => {
                largo.current = true;
                navegar("/login");
              }, 1500);
            }}
            onPointerUp={soltar}
            onPointerLeave={soltar}
            onPointerCancel={soltar}
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => largo.current && e.preventDefault()}
          >
            {logo ? <img src={logo} alt="" width={36} height={36} draggable={false} /> : null}
            <b>{aj.nombre}</b>
          </Link>
          <span className="pp-nav-lado" aria-hidden="true" />
        </div>
      </header>
    );
  }

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
          {logo ? <img src={logo} alt="" width={44} height={44} /> : propia ? <img src="/logo.png" alt="" width={44} height={44} /> : <FadeMark size={34} />}
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
