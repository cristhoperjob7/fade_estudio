import { useState } from "react";
import { supabase } from "../lib/supabase";

export type CodigoValido = { codigo: string; porcentaje: number; meses: number };

/** Campo «¿Tienes un código?»: valida el código en el servidor antes de enviarlo. */
export default function CodigoDescuento({
  valor,
  onCambio,
  clase = "",
}: {
  valor: CodigoValido | null;
  onCambio: (c: CodigoValido | null) => void;
  clase?: string;
}) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function aplicar() {
    setOcupado(true);
    setError("");
    const { data, error: err } = await supabase.rpc("validar_descuento", { p_codigo: texto });
    setOcupado(false);
    const r = data as { ok: boolean; error?: string; codigo?: string; porcentaje?: number; meses?: number } | null;
    if (err || !r || !r.ok) return setError(r?.error ?? "No pudimos revisar el código. Inténtalo de nuevo.");
    onCambio({ codigo: r.codigo!, porcentaje: r.porcentaje!, meses: r.meses! });
  }

  if (valor) {
    return (
      <div className={`codigo-ok ${clase}`}>
        <span>
          Código <b>{valor.codigo}</b>: −{valor.porcentaje}% por {valor.meses} {valor.meses === 1 ? "mes" : "meses"}
        </span>
        <button type="button" onClick={() => onCambio(null)}>
          Quitar
        </button>
      </div>
    );
  }

  return (
    <div className={`codigo-caja ${clase}`}>
      <label>
        <span>¿Tienes un código de descuento?</span>
        <div className="codigo-fila">
          <input value={texto} onChange={(e) => setTexto(e.target.value.toUpperCase())} maxLength={20} placeholder="Escríbelo aquí" autoComplete="off" />
          <button type="button" disabled={ocupado || !texto.trim()} onClick={() => void aplicar()}>
            {ocupado ? "…" : "Aplicar"}
          </button>
        </div>
      </label>
      {error && <small className="codigo-error">{error}</small>}
    </div>
  );
}
