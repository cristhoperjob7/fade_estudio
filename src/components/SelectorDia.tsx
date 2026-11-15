import { useRef } from "react";
import { diaSemana, fechaLarga, hoyChile, sumarDias } from "../lib/fecha";
import Icon from "./Icon";

const DIA3 = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Lunes de la semana de esa fecha. */
const lunesDe = (f: string) => sumarDias(f, -((diaSemana(f) + 6) % 7));

/**
 * Selector de día: muestra la semana completa (lun a dom), flechas para cambiar de semana,
 * un botón «Hoy» y un calendario para ir a cualquier fecha.
 */
export default function SelectorDia({ fecha, onCambiar }: { fecha: string; onCambiar: (f: string) => void }) {
  const hoy = hoyChile();
  const lunes = lunesDe(fecha);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const cal = useRef<HTMLInputElement>(null);
  const esMes = (f: string) => f.slice(0, 7);
  const abrirCalendario = () => {
    const el = cal.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        /* sigue abajo */
      }
    }
    el.focus();
    el.click();
  };

  return (
    <div className="selector-dia">
      <div className="selector-barra">
        <button type="button" className="icono-btn chico" aria-label="Semana anterior" onClick={() => onCambiar(sumarDias(lunes, -7))}>
          <Icon nombre="back" size={20} />
        </button>
        <span className="selector-titulo capital" aria-live="polite">
          {fechaLarga(fecha)}
        </span>
        <button type="button" className="icono-btn chico" aria-label="Semana siguiente" onClick={() => onCambiar(sumarDias(lunes, 7))}>
          <Icon nombre="back" size={20} />
        </button>
      </div>

      <div className="selector-semana" role="tablist" aria-label="Día de la semana">
        {dias.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={f === fecha}
            aria-label={fechaLarga(f)}
            className={`${f === fecha ? "on" : ""}${f === hoy ? " hoy" : ""}`}
            onClick={() => onCambiar(f)}
          >
            <small>{DIA3[diaSemana(f)]}</small>
            <b className="num">{Number(f.slice(8))}</b>
            {esMes(f) !== esMes(fecha) && <i aria-hidden="true" />}
          </button>
        ))}
      </div>

      <div className="selector-acciones">
        <button type="button" className="btn btn-borde btn-chico" disabled={fecha === hoy} onClick={() => onCambiar(hoy)}>
          Ir a hoy
        </button>
        <button type="button" className="btn btn-borde btn-chico" onClick={abrirCalendario}>
          <Icon nombre="cal" size={18} /> Elegir fecha
        </button>
        <input
          ref={cal}
          type="date"
          className="selector-fecha"
          value={fecha}
          tabIndex={-1}
          aria-label="Elegir una fecha del calendario"
          onChange={(e) => e.target.value && onCambiar(e.target.value)}
        />
      </div>
    </div>
  );
}
