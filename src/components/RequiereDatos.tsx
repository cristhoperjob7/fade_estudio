import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { FadeMark } from "./FadeLogo";
import FormularioDatos, { validarDatos, valoresDesde } from "./FormularioDatos";
import type { ErroresDatos, ValoresDatos } from "./FormularioDatos";
import { useToast } from "./Toast";
import { useAuth } from "../lib/auth";
import { guardarDatosCompletos, useMiPerfil } from "../lib/perfil";

/** Si a la persona le faltan datos, no ve nada más hasta completarlos (solo puede cerrar sesión). */
export default function RequiereDatos({ children }: { children: ReactNode }) {
  const { datos } = useMiPerfil();
  if (datos && datos.completo === false) return <Puerta key={datos.correo} />;
  return <>{children}</>;
}

function Puerta() {
  const avisar = useToast();
  const { cerrarSesion } = useAuth();
  const { datos } = useMiPerfil();
  const [v, setV] = useState<ValoresDatos>(() => valoresDesde(datos));
  const [errores, setErrores] = useState<ErroresDatos>({});
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const er = validarDatos(v);
    setErrores(er);
    if (Object.keys(er).length) {
      avisar("Revisa los campos marcados", "error");
      return;
    }
    setGuardando(true);
    try {
      await guardarDatosCompletos({ nombre: v.nombre.trim(), apellidos: v.apellidos.trim(), celular: v.celular, sexo: v.sexo, region: v.region, comuna: v.comuna, edad: Number(v.edad) });
      avisar("Datos guardados");
    } catch (err) {
      avisar((err as Error).message, "error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="dp-puerta">
      <form className="dp-puerta-in" onSubmit={enviar} noValidate>
        <FadeMark size={44} />
        <h1>Completa tus datos para continuar</h1>
        <p>Antes de seguir necesitamos que completes tu información. Es solo esta vez.</p>
        <FormularioDatos v={v} onCambio={(n) => { setV(n); if (Object.keys(errores).length) setErrores(validarDatos(n)); }} errores={errores} correo={datos?.correo ?? ""} />
        <div className="acciones">
          <button type="submit" className="btn btn-primario" disabled={guardando}>{guardando ? "Guardando…" : "Guardar y continuar"}</button>
          <button type="button" className="btn btn-borde" onClick={() => void cerrarSesion()}>Cerrar sesión</button>
        </div>
      </form>
    </div>
  );
}
