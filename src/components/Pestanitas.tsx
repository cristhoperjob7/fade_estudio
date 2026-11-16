import type { CSSProperties } from "react";

/** Pestañas con una píldora que se desliza de una a otra. */
export default function Pestanitas<T extends string>({
  valor,
  opciones,
  onCambio,
  etiqueta,
}: {
  valor: T;
  opciones: { valor: T; etiqueta: string }[];
  onCambio: (v: T) => void;
  etiqueta: string;
}) {
  const i = Math.max(0, opciones.findIndex((o) => o.valor === valor));
  const estilo = { "--n": opciones.length, "--i": i } as CSSProperties;
  return (
    <div className="pestanitas" role="tablist" aria-label={etiqueta} style={estilo}>
      <i className="pest-ind" aria-hidden="true" />
      {opciones.map((o) => (
        <button key={o.valor} type="button" role="tab" aria-selected={o.valor === valor} className={o.valor === valor ? "on" : ""} onClick={() => onCambio(o.valor)}>
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
