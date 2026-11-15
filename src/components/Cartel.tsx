import FadeLogo from "./FadeLogo";

const ALTOS = [100, 94, 86, 78, 69, 60, 51, 42, 34, 27, 20, 14, 9, 5];

/** Lado visual del acceso y de la portada: barras que se degradan, como un fade. */
export default function Cartel({ grande = false }: { grande?: boolean }) {
  return (
    <aside className={`cartel${grande ? " cartel-grande" : ""}`} aria-hidden="true">
      <div className="cartel-marca">
        <FadeLogo size={42} />
      </div>
      <div className="cartel-barras">
        {ALTOS.map((h, i) => (
          <i key={i} style={{ height: `${h}%`, ["--i" as string]: i, ["--t" as string]: i / (ALTOS.length - 1) }} />
        ))}
      </div>
      <p className="cartel-lema">
        Tu agenda,
        <br />
        <i>al corte.</i>
      </p>
    </aside>
  );
}
