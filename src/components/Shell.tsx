import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { ROL_LABEL } from "../lib/types";
import Avatar, { iniciales } from "./Avatar";
import { useMiPerfil } from "../lib/perfil";
import Icon from "./Icon";
import type { NombreIcono } from "./Icon";

/** Una opción del menú lateral. `abajo` la deja en el grupo inferior (cuenta). */
export type Pestana = { ruta: string; texto: string; icono: NombreIcono; abajo?: boolean };

/**
 * Marco del panel: menú lateral izquierdo (fijo en computador; en celular y tablet se abre con el botón ☰),
 * barra superior con el nombre de la sección y el contenido. Las opciones dependen del perfil.
 */
export default function Shell({ pestanas }: { pestanas: Pestana[] }) {
  const { perfil, esAdmin, cerrarSesion } = useAuth();
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const [barberia, setBarberia] = useState("");
  const [pendientes, setPendientes] = useState(0);
  const [nuevas, setNuevas] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const botonMenu = useRef<HTMLButtonElement>(null);
  const lateral = useRef<HTMLElement>(null);
  const { datos: mio, foto } = useMiPerfil(Boolean(perfil || esAdmin));

  useEffect(() => {
    if (perfil?.rol !== "dueno") return;
    supabase
      .from("ajustes")
      .select("nombre")
      .maybeSingle()
      .then(({ data }) => setBarberia((data as { nombre: string } | null)?.nombre ?? ""));
  }, [perfil?.rol]);

  // Contador de comprobantes por revisar (solo el dueño), en vivo.
  useEffect(() => {
    if (perfil?.rol !== "dueno") return;
    const contar = () =>
      supabase
        .from("citas")
        .select("id", { count: "exact", head: true })
        .eq("estado", "por_revisar")
        .then(({ count }) => setPendientes(count ?? 0));
    void contar();
    const canal = supabase
      .channel("pendientes-dueno")
      .on("postgres_changes", { event: "*", schema: "public", table: "citas" }, () => void contar())
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [perfil?.rol]);

  // Superadmin: solicitudes nuevas (planes y cambios de plan). Se revisa cada 30 s y al volver a la pestaña.
  useEffect(() => {
    if (!esAdmin || perfil) return;
    let vivo = true;
    const contar = () =>
      supabase.rpc("admin_solicitudes").then(({ data }) => {
        if (vivo) setNuevas(((data ?? []) as { estado: string }[]).filter((x) => x.estado === "nueva").length);
      });
    void contar();
    const id = window.setInterval(() => void contar(), 30_000);
    const alVolver = () => document.visibilityState === "visible" && void contar();
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("fs-solicitudes", alVolver);
    return () => {
      vivo = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("fs-solicitudes", alVolver);
    };
  }, [esAdmin, perfil]);

  const cerrar = useCallback(() => {
    setAbierto(false);
    botonMenu.current?.focus();
  }, []);

  // Al cambiar de sección el menú se cierra solo.
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  // Con el menú abierto: Esc lo cierra y la página de atrás no se desplaza.
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    lateral.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = "";
    };
  }, [abierto, cerrar]);

  if (!perfil && !esAdmin) return null;
  const nombreMostrar = mio ? [mio.nombre, mio.apellidos].filter(Boolean).join(" ") : "";
  const rojo = !perfil;
  const titulo = perfil
    ? perfil.rol === "dueno"
      ? barberia || perfil.nombre
      : nombreMostrar || perfil.nombre
    : nombreMostrar || "Fade Studio";
  const rolTexto = perfil ? ROL_LABEL[perfil.rol] : "Superadmin";
  const ini = perfil ? perfil.iniciales || iniciales(perfil.nombre) : mio?.nombre ? iniciales(nombreMostrar) : "FS";
  const rutaPerfil = rojo ? "/admin/perfil" : "/panel/perfil";
  const actual = pestanas.find((p) => pathname === p.ruta || pathname.startsWith(p.ruta + "/"));
  const principales = pestanas.filter((p) => !p.abajo);
  const cuenta = pestanas.filter((p) => p.abajo);

  const enlace = (p: Pestana) => (
    <NavLink key={p.ruta} to={p.ruta} className={({ isActive }) => `lat-item${isActive ? " on" : ""}`}>
      <Icon nombre={p.icono} size={21} />
      <span>{p.texto}</span>
      {p.ruta === "/admin/solicitudes" && nuevas > 0 && (
        <em className="lat-insignia" aria-label={`${nuevas} nuevas`}>
          {nuevas}
        </em>
      )}
      {p.ruta === "/panel/reservas" && pendientes > 0 && (
        <em className="lat-insignia" aria-label={`${pendientes} por revisar`}>
          {pendientes}
        </em>
      )}
    </NavLink>
  );

  return (
    <div className={`panel${rojo ? " panel-rojo" : ""}`}>
      <aside ref={lateral} id="menu-lateral" className={`lateral${abierto ? " abierto" : ""}`} aria-label="Menú principal">
        <div className="lat-marca">
          <svg className="lat-logo" viewBox="0 0 40 30" width="34" height="26" aria-hidden="true">
            <rect x="0" y="1" width="5" height="28" rx="2.5" fill="#2563eb" />
            <rect x="9" y="4" width="5" height="22" rx="2.5" fill="#2f5fd0" />
            <rect x="18" y="9" width="5" height="12" rx="2.5" fill="#c9a24a" />
            <rect x="27" y="12" width="5" height="6" rx="2.5" fill="#e0b24a" />
            <rect x="35" y="13.5" width="5" height="3" rx="1.5" fill="#e0b24a" />
          </svg>
          <b>Fade Studio</b>
          <button type="button" className="icono-btn lat-cerrar" aria-label="Cerrar menú" onClick={cerrar}>
            <Icon nombre="close" />
          </button>
        </div>

        <Link to={rutaPerfil} className="lat-yo" aria-label="Mi perfil">
          <Avatar iniciales={ini} foto={foto} rojo={rojo} />
          <span className="quien">
            <b>{titulo}</b>
            <span className={rojo ? "rol-rojo" : "rol-oro"}>{rolTexto}</span>
          </span>
        </Link>

        <nav className="lat-nav">
          {principales.map(enlace)}
          {cuenta.length > 0 && <div className="lat-sep" role="presentation" />}
          {cuenta.map(enlace)}
        </nav>

        <button
          type="button"
          className="lat-item lat-salir"
          onClick={async () => {
            await cerrarSesion();
            navegar("/login", { replace: true });
          }}
        >
          <Icon nombre="logout" size={21} />
          <span>Cerrar sesión</span>
        </button>
      </aside>

      {abierto && <div className="lat-fondo" onClick={cerrar} aria-hidden="true" />}

      <div className="panel-der">
        <header className="barra-sup">
          <button
            ref={botonMenu}
            type="button"
            className="icono-btn"
            aria-label="Abrir menú"
            aria-expanded={abierto}
            aria-controls="menu-lateral"
            onClick={() => setAbierto(true)}
          >
            <Icon nombre="menu" />
            {pendientes > 0 && <i className="barra-punto" aria-hidden="true" />}
          </button>
          <b className="barra-titulo">{actual?.texto ?? titulo}</b>
          <Link to={rutaPerfil} className="barra-yo" aria-label="Mi perfil">
            {foto ? <img src={foto} alt="" /> : <span>{ini.slice(0, 2).toUpperCase()}</span>}
          </Link>
        </header>

        <main className="contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
