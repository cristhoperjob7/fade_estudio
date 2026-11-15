import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { ROL_LABEL } from "../lib/types";
import Avatar, { iniciales } from "./Avatar";
import { useMiPerfil } from "../lib/perfil";
import Icon from "./Icon";
import type { NombreIcono } from "./Icon";

export type Pestana = { ruta: string; texto: string; icono: NombreIcono };

/** Marco común del panel: cabecera con rol dorado, contenido y barra inferior. */
export default function Shell({ pestanas }: { pestanas: Pestana[] }) {
  const { perfil, esAdmin, cerrarSesion } = useAuth();
  const navegar = useNavigate();
  const [barberia, setBarberia] = useState("");
  const [pendientes, setPendientes] = useState(0);
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

  if (!perfil && !esAdmin) return null;
  const nombreMostrar = mio ? [mio.nombre, mio.apellidos].filter(Boolean).join(" ") : "";
  const titulo = perfil
    ? perfil.rol === "dueno"
      ? barberia || perfil.nombre
      : nombreMostrar || perfil.nombre
    : nombreMostrar || "Fade Studio";
  const rolTexto = perfil ? ROL_LABEL[perfil.rol] : "Superadmin";
  const ini = perfil ? perfil.iniciales || iniciales(perfil.nombre) : mio?.nombre ? iniciales(nombreMostrar) : "FS";
  const rojo = !perfil;

  return (
    <div className="app">
      <header className="cabecera">
        <Link to={rojo ? "/admin/perfil" : "/panel/perfil"} className="avatar-link" aria-label="Mi perfil">
          <Avatar iniciales={ini} foto={foto} rojo={rojo} />
        </Link>
        <div className="quien">
          <b>{titulo}</b>
          <span className={rojo ? "rol-rojo" : "rol-oro"}>{rolTexto}</span>
        </div>
        <button
          className="icono-btn"
          aria-label="Cerrar sesión"
          onClick={async () => {
            await cerrarSesion();
            navegar("/login", { replace: true });
          }}
        >
          <Icon nombre="logout" />
        </button>
      </header>

      <main className="contenido">
        <Outlet />
      </main>

      {pestanas.length > 1 && (
        <nav className="pestanas" aria-label="Secciones">
          {pestanas.map((p) => (
            <NavLink key={p.ruta} to={p.ruta} className={({ isActive }) => (isActive ? "on" : "")}>
              <Icon nombre={p.icono} />
              {p.texto}
              {p.ruta === "/panel/reservas" && pendientes > 0 && (
                <span className="insignia" aria-label={`${pendientes} por revisar`}>
                  {pendientes}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
