import FadeLogo from "./FadeLogo";

const BARRAS = [40, 36, 31, 26, 21, 16, 12, 9, 6, 4];

/** Franja de barras que se degradan (un fade), de azul a dorado. */
export function Tira() {
  return (
    <svg className="tira" viewBox="0 0 220 40" preserveAspectRatio="xMinYMax meet" aria-hidden="true">
      <defs>
        <linearGradient id="tira-g" x1="0" x2="1">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#e0b24a" />
        </linearGradient>
      </defs>
      <g fill="url(#tira-g)">
        {BARRAS.map((h, i) => (
          <rect key={i} x={i * 22} y={40 - h} width="14" height={h} rx="7" />
        ))}
      </g>
    </svg>
  );
}

/** Lado izquierdo del acceso en pantallas grandes (en celular se oculta). */
export default function Cartel() {
  return (
    <aside className="panel-marca">
      <FadeLogo size={40} />
      <div>
        <h2>
          Todo tu local,
          <i>en un solo panel.</i>
        </h2>
        <ul className="puntos">
          <li>
            <b>1</b>Los clientes reservan solos, a cualquier hora.
          </li>
          <li>
            <b>2</b>Pagan por adelantado y tú apruebas el comprobante.
          </li>
          <li>
            <b>3</b>Agenda por barbero, comisiones y avisos al celular.
          </li>
        </ul>
      </div>
      <Tira />
    </aside>
  );
}
