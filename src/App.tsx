import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import type { Rol } from "./lib/types";
import { FadeMark } from "./components/FadeLogo";
import Shell from "./components/Shell";
import type { Pestana } from "./components/Shell";
import Home from "./pages/publico/Home";
import Reservar from "./pages/publico/Reservar";
import Reserva from "./pages/publico/Reserva";
import Login from "./pages/Login";
import Inicio from "./pages/dueno/Inicio";
import Ajustes from "./pages/dueno/Ajustes";
import Reservas from "./pages/dueno/Reservas";
import Agenda from "./pages/barbero/Agenda";
import Historial from "./pages/Historial";
import PlanDueno from "./pages/dueno/Plan";
import AgendaGeneral from "./pages/dueno/AgendaGeneral";
import Equipo from "./pages/dueno/Equipo";
import Perfil from "./pages/Perfil";
import RequiereDatos from "./components/RequiereDatos";
import Chat from "./pages/Chat";
import Landing from "./pages/Landing";
import Vencida from "./pages/Vencida";
import Resumen from "./pages/admin/Resumen";
import Barberias from "./pages/admin/Barberias";
import Solicitudes from "./pages/admin/Solicitudes";
import Planes from "./pages/admin/Planes";
import Descuentos from "./pages/admin/Descuentos";
import Contratar from "./pages/Contratar";
import { SLUG_DEFECTO } from "./lib/publico";

const PESTANAS_DUENO: Pestana[] = [
  { ruta: "/panel/inicio", texto: "Inicio", icono: "home" },
  { ruta: "/panel/agenda-general", texto: "Agenda", icono: "cal" },
  { ruta: "/panel/reservas", texto: "Reservas", icono: "receipt" },
  { ruta: "/panel/historial", texto: "Historial", icono: "clock" },
  { ruta: "/panel/equipo", texto: "Equipo", icono: "users" },
  { ruta: "/panel/chat", texto: "Chat", icono: "chat" },
  { ruta: "/panel/plan", texto: "Mi plan", icono: "tag" },
  { ruta: "/panel/ajustes", texto: "Ajustes", icono: "settings" },
  { ruta: "/panel/perfil", texto: "Mi perfil", icono: "user", abajo: true },
];
const PESTANAS_ADMIN: Pestana[] = [
  { ruta: "/admin/resumen", texto: "Resumen", icono: "home" },
  { ruta: "/admin/barberias", texto: "Barberías", icono: "shop" },
  { ruta: "/admin/solicitudes", texto: "Solicitudes", icono: "inbox" },
  { ruta: "/admin/planes", texto: "Planes", icono: "tag" },
  { ruta: "/admin/descuentos", texto: "Descuentos", icono: "percent" },
  { ruta: "/admin/chat", texto: "Chat", icono: "chat" },
  { ruta: "/admin/perfil", texto: "Mi perfil", icono: "user", abajo: true },
];
const PESTANAS_BARBERO: Pestana[] = [
  { ruta: "/panel/agenda", texto: "Agenda", icono: "cal" },
  { ruta: "/panel/chat", texto: "Chat", icono: "chat" },
  { ruta: "/panel/perfil", texto: "Mi perfil", icono: "user", abajo: true },
];

function Cargando() {
  return (
    <div className="splash" role="status" aria-label="Cargando">
      <FadeMark size={72} />
    </div>
  );
}

/** Solo entra quien tiene sesión y un perfil activo. Si la suscripción de su barbería venció, ve el aviso. */
function RequiereSesion() {
  const { cargando, sesion, perfil, esAdmin, barberia } = useAuth();
  if (cargando) return <Cargando />;
  if (!sesion) return <Navigate to="/login" replace />;
  if (!perfil) return <Navigate to={esAdmin ? "/admin" : "/login"} replace />; // el login explica por qué no tiene acceso
  if (barberia && !barberia.vigente) return <Vencida />;
  return <RequiereDatos><Outlet /></RequiereDatos>;
}

/** Solo el superadmin de Fade Studio. */
function RequiereAdmin() {
  const { cargando, sesion, esAdmin } = useAuth();
  if (cargando) return <Cargando />;
  if (!sesion) return <Navigate to="/login" replace />;
  if (!esAdmin) return <Navigate to="/panel" replace />;
  return <RequiereDatos><Outlet /></RequiereDatos>;
}

function RequiereRol({ rol }: { rol: Rol }) {
  const { perfil } = useAuth();
  if (perfil?.rol !== rol) return <Navigate to="/panel" replace />;
  return <Outlet />;
}

/** Un solo panel para todos; las opciones del menú dependen del perfil. */
function ShellPanel() {
  const { perfil } = useAuth();
  return <Shell pestanas={perfil?.rol === "dueno" ? PESTANAS_DUENO : PESTANAS_BARBERO} />;
}

function IrAlInicio() {
  const { perfil } = useAuth();
  return <Navigate to={perfil?.rol === "dueno" ? "/panel/inicio" : "/panel/agenda"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={SLUG_DEFECTO ? <Home /> : <Landing />} />
      <Route path="/fade-studio" element={<Landing />} />
      <Route path="/contratar" element={<Contratar />} />
      <Route path="/reservar" element={<Reservar />} />
      <Route path="/reserva/:codigo" element={<Reserva />} />
      <Route path="/b/:slug" element={<Home />} />
      <Route path="/b/:slug/reservar" element={<Reservar />} />
      <Route path="/b/:slug/reserva/:codigo" element={<Reserva />} />
      <Route path="/login" element={<Login />} />

      <Route path="/admin" element={<RequiereAdmin />}>
        <Route index element={<Navigate to="resumen" replace />} />
        <Route element={<Shell pestanas={PESTANAS_ADMIN} />}>
          <Route path="resumen" element={<Resumen />} />
          <Route path="barberias" element={<Barberias />} />
          <Route path="solicitudes" element={<Solicitudes />} />
          <Route path="planes" element={<Planes />} />
          <Route path="descuentos" element={<Descuentos />} />
          <Route path="chat" element={<Chat />} />
          <Route path="perfil" element={<Perfil />} />
        </Route>
      </Route>

      <Route path="/panel" element={<RequiereSesion />}>
        <Route index element={<IrAlInicio />} />

        <Route element={<ShellPanel />}>
          <Route path="perfil" element={<Perfil />} />
          <Route path="chat" element={<Chat />} />

          <Route element={<RequiereRol rol="dueno" />}>
            <Route path="inicio" element={<Inicio />} />
            <Route path="agenda-general" element={<AgendaGeneral />} />
            <Route path="reservas" element={<Reservas />} />
            <Route path="historial" element={<Historial />} />
            <Route path="equipo" element={<Equipo />} />
            <Route path="plan" element={<PlanDueno />} />
            <Route path="ajustes" element={<Ajustes />} />
          </Route>

          <Route element={<RequiereRol rol="barbero" />}>
            <Route path="agenda" element={<Agenda />} />
            <Route path="cuenta" element={<Navigate to="/panel/perfil" replace />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
