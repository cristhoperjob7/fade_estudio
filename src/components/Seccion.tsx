import type { ReactNode } from "react";
import Icon from "./Icon";
import type { NombreIcono } from "./Icon";

/** Sección plegable: solo se ve el título y un resumen. Al tocarla se abre. */
export default function Seccion({
  titulo,
  resumen,
  icono,
  abierta,
  onToggle,
  children,
}: {
  titulo: string;
  resumen?: string;
  icono?: NombreIcono;
  abierta: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className={`plegable${abierta ? " abierta" : ""}`}>
      <button type="button" className="plegable-cab" aria-expanded={abierta} onClick={onToggle}>
        {icono && (
          <span className="plegable-ico">
            <Icon nombre={icono} size={20} />
          </span>
        )}
        <span className="plegable-txt">
          <b>{titulo}</b>
          {resumen && <small>{resumen}</small>}
        </span>
        <span className="plegable-flecha">
          <Icon nombre="chev" size={20} />
        </span>
      </button>
      {abierta && <div className="plegable-cuerpo">{children}</div>}
    </section>
  );
}
