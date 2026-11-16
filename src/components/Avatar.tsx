/** Avatar con aro y corona. Dorado para Dueño y Barbero, rojo para el Superadmin. Muestra la foto si hay. */
export default function Avatar({
  iniciales,
  foto,
  rojo = false,
  grande = false,
  sencillo = false,
}: {
  iniciales: string;
  foto?: string | null;
  rojo?: boolean;
  grande?: boolean;
  sencillo?: boolean;
}) {
  return (
    <div className={`avatar${rojo ? " rojo" : ""}${grande ? " grande" : ""}${sencillo ? " sencillo" : ""}`} aria-hidden="true">
      {!sencillo && <svg className="corona" viewBox="0 0 18 12" aria-hidden="true">
        <path d="M1 11L0 2l5 4 4-6 4 6 5-4-1 9z" />
      </svg>}
      {foto ? <img src={foto} alt="" draggable={false} /> : <span>{iniciales.slice(0, 2).toUpperCase()}</span>}
    </div>
  );
}

/** "Matías Rojas" -> "MR" */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2);
  return partes[0][0] + partes[partes.length - 1][0];
}
