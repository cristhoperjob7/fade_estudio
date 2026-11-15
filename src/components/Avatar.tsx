/** Avatar con aro dorado y corta corona: lo llevan el Dueño y el Barbero. */
export default function Avatar({ iniciales }: { iniciales: string }) {
  return (
    <div className="avatar" aria-hidden="true">
      <svg className="corona" viewBox="0 0 18 12" aria-hidden="true">
        <path d="M1 11L0 2l5 4 4-6 4 6 5-4-1 9z" />
      </svg>
      <span>{iniciales.slice(0, 2).toUpperCase()}</span>
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
