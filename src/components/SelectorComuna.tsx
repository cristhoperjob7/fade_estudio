import { NOMBRES_REGION, REGIONES } from "../lib/chile";

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
      <label className="campo">
        <span>Región</span>
        <select value={region} required={requerido} onChange={(e) => onCambio(e.target.value, "")}>
          <option value="">Elige la región</option>
          {NOMBRES_REGION.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span>Comuna</span>
        <select value={comuna} required={requerido} disabled={!region} onChange={(e) => onCambio(region, e.target.value)}>
          <option value="">{region ? "Elige la comuna" : "Primero la región"}</option>
          {(REGIONES[region] ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
