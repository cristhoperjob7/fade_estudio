import type { ReactNode } from "react";
import Hoja from "./Hoja";
import Icon from "./Icon";
import type { NombreIcono } from "./Icon";

/** Cuadro de Ajustes: se ve el título y un resumen; al tocarlo se abre su panel. */
export default function Cuadro({
  titulo,
  resumen,
  icono,
  abierta,
  onToggle,
  children,
}: {
  titulo: string;
  resumen?: string;
  icono: NombreIcono;
  abierta: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <button type="button" className="cuadro" aria-haspopup="dialog" onClick={onToggle}>
        <span className="cuadro-arriba">
          <span className="cuadro-ico">
            <Icon nombre={icono} size={20} />
          </span>
          <span className="cuadro-flecha">
            <Icon nombre="back" size={18} />
          </span>
        </span>
        <span className="cuadro-txt">
          <b>{titulo}</b>
          {resumen && <small>{resumen}</small>}
        </span>
      </button>
      {abierta && (
        <Hoja titulo={titulo} onCerrar={onToggle}>
          {children}
        </Hoja>
      )}
    </>
  );
}
