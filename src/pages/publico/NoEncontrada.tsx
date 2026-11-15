import { Link } from "react-router-dom";
import FadeLogo from "../../components/FadeLogo";

/** Dirección que no existe (por ejemplo, /b/algo-mal-escrito). */
export default function NoEncontrada() {
  return (
    <div className="login">
      <div className="login-caja">
        <FadeLogo size={44} />
        <h1>No encontramos esta barbería</h1>
        <p className="suave">Revisa que la dirección esté bien escrita.</p>
        <Link to="/" className="enlace-volver">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
