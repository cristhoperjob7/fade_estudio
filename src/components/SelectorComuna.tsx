import { NOMBRES_REGION, REGIONES } from "../lib/chile";
import Selector from "./Selector";

/** Dos listas desplegables: región y, según la región, comuna. */
export default function SelectorComuna({
  region,
  comuna,
  onCambio,
  requerido = false,
}: {
  region: string;
  comuna: string;
  onCambio: (region: string, comuna: string) => void;
  requerido?: boolean;
}) {
  return (
    <div className="fila-dos">
      <div className="campo">
        <span>Región</span>
        <Selector
          etiqueta="Región"
          valor={region}
          requerido={requerido}
          placeholder="Elige la región"
          opciones={NOMBRES_REGION.map((r) => ({ valor: r, etiqueta: r }))}
          onCambio={(v) => onCambio(v, "")}
        />
      </div>
      <div className="campo">
        <span>Comuna</span>
        <Selector
          etiqueta="Comuna"
          valor={comuna}
          requerido={requerido}
          deshabilitado={!region}
          placeholder={region ? "Elige la comuna" : "Primero la región"}
          opciones={(REGIONES[region] ?? []).map((c) => ({ valor: c, etiqueta: c }))}
          onCambio={(v) => onCambio(region, v)}
        />
      </div>
    </div>
  );
}
