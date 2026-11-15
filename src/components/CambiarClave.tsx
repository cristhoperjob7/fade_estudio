import { useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "./Toast";
import Hoja from "./Hoja";
import Icon from "./Icon";

/** Formulario para cambiar la clave. Cada persona cambia la suya. */
export function FormularioClave({ onListo, conTitulo = true }: { onListo?: () => void; conTitulo?: boolean }) {
  const avisar = useToast();
  const [clave, setClave] = useState("");
  const [repite, setRepite] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (clave.length < 8) return setError("La clave debe tener al menos 8 caracteres.");
    if (clave !== repite) return setError("Las dos claves no son iguales.");
    setOcupado(true);
    setError("");
    const { error: err } = await supabase.auth.updateUser({ password: clave });
    setOcupado(false);
    if (err) return setError("No pudimos cambiarla. Cierra sesión, entra de nuevo e intenta otra vez.");
    setClave("");
    setRepite("");
    avisar("Clave cambiada");
    onListo?.();
  };

  return (
    <form className={conTitulo ? "tarjeta" : "ficha"} onSubmit={guardar}>
      {conTitulo && <h2>Cambiar mi clave</h2>}
      <label className="campo">
        <span>Clave nueva</span>
        <input type="password" autoComplete="new-password" minLength={8} value={clave} onChange={(e) => setClave(e.target.value)} />
        <small>Mínimo 8 caracteres.</small>
      </label>
      <label className="campo">
        <span>Repite la clave</span>
        <input type="password" autoComplete="new-password" value={repite} onChange={(e) => setRepite(e.target.value)} />
      </label>
      {error && (
        <p className="aviso error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primario" disabled={ocupado || !clave}>
        {ocupado ? "Guardando…" : "Guardar clave"}
      </button>
    </form>
  );
}

/** Botón «Cambiar mi clave»: abre el formulario en una ventana, sin campos sueltos en la página. */
export default function CambiarClave() {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-borde btn-ancho" onClick={() => setAbierta(true)}>
        <Icon nombre="key" size={20} /> Cambiar mi clave
      </button>
      {abierta && (
        <Hoja titulo="Cambiar mi clave" onCerrar={() => setAbierta(false)}>
          <FormularioClave conTitulo={false} onListo={() => setAbierta(false)} />
        </Hoja>
      )}
    </>
  );
}
