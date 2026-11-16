import { useEffect, useState } from "react";
import Icon from "./Icon";

export type OpcionSelector = { valor: string; etiqueta: string };

/**
 * Lista desplegable con el diseño de la app (reemplaza al <select> del navegador).
 * En computador se abre bajo el campo; en celular sube desde abajo como una hoja.
 */
export default function Selector({
  valor,
  onCambio,
  opciones,
  placeholder = "Selecciona…",
  etiqueta,
  clase = "",
  deshabilitado = false,
  requerido = false,
}: {
  valor: string;
  onCambio: (valor: string) => void;
  opciones: OpcionSelector[];
  placeholder?: string;
  etiqueta?: string;
  clase?: string;
  deshabilitado?: boolean;
  requerido?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const actual = opciones.find((o) => o.valor === valor);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierto]);

  return (
    <div className={`sel ${clase}`.trim()}>
      <button
        type="button"
        className={`sel-btn${abierto ? " abierto" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={etiqueta}
        disabled={deshabilitado}
        onClick={() => setAbierto(!abierto)}
      >
        <span className={actual ? "" : "sel-ph"}>{actual ? actual.etiqueta : placeholder}</span>
        <Icon nombre="chev" size={18} />
      </button>
      {requerido && <input className="sel-req" tabIndex={-1} aria-hidden="true" required value={valor} onChange={() => undefined} />}
      {abierto && (
        <>
          <div className="sel-fondo" onClick={() => setAbierto(false)} />
          <ul className="sel-lista" role="listbox" aria-label={etiqueta}>
            {opciones.map((o) => (
              <li key={o.valor}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.valor === valor}
                  className={o.valor === valor ? "on" : ""}
                  onClick={() => {
                    onCambio(o.valor);
                    setAbierto(false);
                  }}
                >
                  <span>{o.etiqueta}</span>
                  {o.valor === valor && <Icon nombre="check" size={16} />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
