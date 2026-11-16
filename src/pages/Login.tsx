import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { configurado } from "../lib/supabase";
import FadeLogo from "../components/FadeLogo";
import Cartel, { Tira } from "../components/Cartel";

export default function Login() {
  const { perfil, esAdmin, sesion, cargando, iniciarSesion, cerrarSesion } = useAuth();
  const navegar = useNavigate();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (esAdmin) navegar("/admin", { replace: true });
    else if (perfil) navegar("/panel", { replace: true });
  }, [perfil, esAdmin, navegar]);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    const mensaje = await iniciarSesion(correo, clave);
    setEnviando(false);
    if (mensaje) setError(mensaje);
  };

  const sinAcceso = !cargando && sesion && !perfil && !esAdmin;

  return (
    <div className="acceso">
      <Cartel />
      <main className="acceso-form">
        <div className="acceso-caja">
          <div className="acceso-movil">
            <FadeLogo size={34} />
            <Tira />
          </div>

          <h1>Ingresar</h1>
          <p className="acceso-sub">Entra con tu correo y tu clave.</p>

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
                {enviando ? "Entrando…" : "Entrar"}
              </button>
            </form>
          )}

          <p className="acceso-pie">¿Problemas para entrar? Pídele tu clave al dueño de tu barbería o escríbenos.</p>
          <Link to="/" className="enlace-volver">
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
