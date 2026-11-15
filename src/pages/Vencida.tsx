import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { enlaceWhatsapp } from "../lib/whatsapp";
import { fechaLarga } from "../lib/fecha";
import FadeLogo from "../components/FadeLogo";

const SOPORTE = ((import.meta.env.VITE_SOPORTE_WHATSAPP as string | undefined) ?? "").replace(/\D/g, "");

/** Se muestra al personal cuando la suscripción de su barbería venció o fue suspendida. */
export default function Vencida() {
  const { perfil, barberia, cerrarSesion } = useAuth();
  const navegar = useNavigate();
  const esDueno = perfil?.rol === "dueno";
  const suspendida = barberia?.estado === "suspendida";

  return (
    <div className="login">
      <div className="login-caja">
        <FadeLogo size={40} />
        <h1>{suspendida ? "Cuenta pausada" : "Suscripción vencida"}</h1>
        <p className="suave">
          {suspendida
            ? `El acceso de ${barberia?.nombre ?? "tu barbería"} está pausado.`
            : `La suscripción de ${barberia?.nombre ?? "tu barbería"} venció${barberia?.vence_el ? ` el ${fechaLarga(barberia.vence_el)}` : ""}.`}{" "}
          {esDueno
            ? "Mientras tanto, la página de reservas y el panel están detenidos. Tus datos están guardados y no se pierden."
            : "Avísale al dueño para que la reactive."}
        </p>
        {esDueno && SOPORTE && (
          <a
            className="btn btn-primario"
            target="_blank"
            rel="noreferrer"
            href={enlaceWhatsapp(SOPORTE, `Hola, soy ${perfil?.nombre ?? ""} de ${barberia?.nombre ?? "mi barbería"}. Quiero reactivar mi suscripción de Fade Studio.`)}
          >
            Hablar con Fade Studio
          </a>
        )}
        <button
          className="btn btn-borde"
          onClick={async () => {
            await cerrarSesion();
            navegar("/login", { replace: true });
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
