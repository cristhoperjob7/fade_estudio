import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Icon from "./Icon";

/**
 * Datos en solo lectura. Para cambiarlos hay que apretar «Editar».
 * `onGuardar` debe devolver true si se guardó (así se vuelve a la vista de lectura).
 */
export default function Ficha({
  filas,
  children,
  onGuardar,
  onCancelar,
  guardando = false,
  textoEditar = "Editar",
  nota,
}: {
  filas: { etiqueta: string; valor: ReactNode }[];
  children: ReactNode;
  onGuardar: () => Promise<boolean>;
  onCancelar?: () => void;
  guardando?: boolean;
  textoEditar?: string;
  nota?: ReactNode;
}) {
  const [editando, setEditando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (await onGuardar()) setEditando(false);
  };

  if (!editando) {
    return (
      <div className="ficha">
        <dl className="ficha-datos">
          {filas.map((f) => (
            <div key={f.etiqueta}>
              <dt>{f.etiqueta}</dt>
              <dd>{f.valor || <span className="ficha-vacio">Sin completar</span>}</dd>
            </div>
          ))}
        </dl>
        {nota}
        <button type="button" className="btn btn-borde btn-chico ficha-editar" onClick={() => setEditando(true)}>
          <Icon nombre="edit" size={18} /> {textoEditar}
        </button>
      </div>
    );
  }

  return (
    <form className="ficha ficha-edicion" onSubmit={enviar}>
      {children}
      <div className="ficha-botones">
        <button type="submit" className="btn btn-primario" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          className="btn btn-borde"
          disabled={guardando}
          onClick={() => {
            onCancelar?.();
            setEditando(false);
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
