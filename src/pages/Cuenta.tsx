import { useAuth } from "../lib/auth";
import { formatearTelefono } from "../lib/whatsapp";
import CambiarClave from "../components/CambiarClave";

/** Pestaña «Cuenta» del barbero. */
export default function Cuenta() {
  const { perfil } = useAuth();
  if (!perfil) return null;
  return (
    <>
      <h1 className="titulo">Mi cuenta</h1>
      <div className="datos" style={{ marginTop: 14 }}>
        <div>
          <span>Nombre</span>
          <b>{perfil.nombre}</b>
        </div>
        <div>
          <span>Correo</span>
          <b>{perfil.correo || "—"}</b>
        </div>
        {perfil.telefono && (
          <div>
            <span>Teléfono</span>
            <b className="num">{formatearTelefono(perfil.telefono)}</b>
          </div>
        )}
        <div>
          <span>Comisión</span>
          <b className="num">{perfil.comision_pct}%</b>
        </div>
      </div>
      <CambiarClave />
    </>
  );
}
