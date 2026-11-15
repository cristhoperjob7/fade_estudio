import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { TipoAcceso } from "../lib/auth";
import { configurado } from "../lib/supabase";
import FadeLogo from "../components/FadeLogo";
import Cartel, { Tira } from "../components/Cartel";
import Icon from "../components/Icon";

export default function Login() {
  const { perfil, esAdmin, sesion, cargando, iniciarSesion, cerrarSesion } = useAuth();
  const navegar = useNavigate();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [tipo, setTipo] = useState<TipoAcceso>("barbero");

  useEffect(() => {
    if (esAdmin && !perfil) navegar("/admin", { replace: true });
    else if (perfil) navegar("/panel", { replace: true });
  }, [perfil, esAdmin, navegar]);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    const mensaje = await iniciarSesion(correo, clave, tipo);
    setEnviando(false);
    if (mensaje) setError(mensaje);
  };

  const sinAcceso = !cargando && sesion && !perfil && !esAdmin;

  const [movido, setMovido] = useState(false);
  const esBarbero = tipo === "barbero";

  return (
    <div className="acceso">
      <Cartel />
      <main className="acceso-form">
        <div className="acceso-caja">
          <div className="acceso-movil">
            <FadeLogo size={34} />
            <Tira />
          </div>

          {!sinAcceso && (
            <div className={`acceso-tipos ${esBarbero ? "es-barbero" : "es-admin"}${movido ? " movido" : ""}`} role="tablist" aria-label="Tipo de acceso">
              <i className="acceso-ind" key={tipo} aria-hidden="true" />
              <button
                type="button"
                role="tab"
                aria-selected={esBarbero}
                className={esBarbero ? "on" : ""}
                onClick={() => {
                  setTipo("barbero");
                  setMovido(true);
                  setError("");
                }}
              >
                <Icon nombre="scissors" size={20} />
                Barbero
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!esBarbero}
                className={!esBarbero ? "on" : ""}
                onClick={() => {
                  setTipo("admin");
                  setMovido(true);
                  setError("");
                }}
              >
                <Icon nombre="shield" size={20} />
                Administración
              </button>
            </div>
          )}

          <h1 key={`h-${tipo}`} className="fundir">{esBarbero ? "Acceso barberos" : "Acceso administración"}</h1>
          <p key={`s-${tipo}`} className="acceso-sub fundir">
            {esBarbero
              ? "Entra para ver tu agenda del día y tus citas."
              : "Para dueños de barbería y administradores de Fade Studio."}
          </p>

          {!configurado && (
            <p className="aviso error" role="alert">
              Falta conectar Supabase: copia <b>.env.example</b> como <b>.env.local</b> y completa los dos valores.
            </p>
          )}

          {sinAcceso ? (
            <>
              <p className="aviso error" role="alert">
                Tu usuario existe, pero todavía no tiene acceso al sistema. Pídele al dueño que active tu cuenta.
              </p>
              <button className="btn btn-borde" onClick={() => void cerrarSesion()}>
                Salir
              </button>
            </>
          ) : (
            <form onSubmit={entrar} noValidate>
              <label className="campo">
                <span>Correo</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                />
              </label>
              <label className="campo">
                <span>Clave</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  required
                />
              </label>
              {error && (
                <p className="aviso error" role="alert">
                  {error}
                </p>
              )}
              <button className="btn btn-primario" type="submit" disabled={enviando || !correo || !clave || !configurado}>
                {enviando ? "Entrando…" : esBarbero ? "Entrar a mi agenda" : "Entrar al panel"}
              </button>
            </form>
          )}

          <p key={`p-${tipo}`} className="acceso-pie fundir">
            {esBarbero ? "¿Problemas para entrar? Pídele tu clave al administrador." : "¿Olvidaste tu clave? Escríbenos y la restablecemos."}
          </p>
          <Link to="/" className="enlace-volver">
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
