/** Emoticones animados del chat (dibujos pequeños con movimiento). La clave es «pack:nombre». */
const DIBUJOS: Record<string, { color: string; relleno?: string; trazo: string }> = {
  risa: { color: "#3a2a00", relleno: "#E0B24A", trazo: "M8 10h.01M16 10h.01M7.5 14c1 3 8 3 9 0z" },
  mano: { color: "#E0B24A", trazo: "M8 13V6a1.5 1.5 0 013 0v5M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v9a6 6 0 01-6 6h-1a5 5 0 01-4-2l-2-3a1.5 1.5 0 012.5-1.5L8 15" },
  tijera: { color: "#dfe3ec", trazo: "M6 6a3 3 0 100 6 3 3 0 000-6zM6 12a3 3 0 100 6 3 3 0 000-6zM8.6 8l11 8M8.6 16l11-8" },
  fuego: { color: "#ff8a3d", relleno: "#ff8a3d", trazo: "M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z" },
  copa: { color: "#E0B24A", trazo: "M7 4h10v5a5 5 0 01-10 0zM7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3M12 14v4M8 20h8" },
  maquina: { color: "#7fa2ff", trazo: "M8 3h8v12a4 4 0 01-8 0zM10 15v5h4v-5M9.5 8h5" },
  dinero: { color: "#4ade80", trazo: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v10M9.5 9.5c0-1.5 5-1.5 5 0s-5 1.5-5 3 5 1.5 5 0" },
  navaja: { color: "#8fe3ff", trazo: "M4 16L15 5l4 4L8 20zM15 5l-2-2" },
  corona: { color: "#E0B24A", relleno: "#E0B24A", trazo: "M3 18l-1-11 5 4 5-7 5 7 5-4-1 11z" },
  brillo: { color: "#b58cff", relleno: "#b58cff", trazo: "M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" },
  diamante: { color: "#8fe3ff", trazo: "M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l-2 6 5 12 5-12-2-6" },
  cohete: { color: "#ff7b72", trazo: "M12 2c4 2 6 6 5 11l-3 3h-4l-3-3c-1-5 1-9 5-11zM9 16l-3 4 4-1M15 16l3 4-4-1M12 9.5a1.5 1.5 0 100 .01" },
};

export default function Sticker({ clave, tam = 40 }: { clave: string; tam?: number }) {
  const nombre = clave.split(":")[1] ?? "";
  const d = DIBUJOS[nombre];
  if (!d) return <span className="st-vacio" style={{ width: tam, height: tam }} />;
  return (
    <svg className={`st-anim st-${nombre}`} viewBox="0 0 24 24" width={tam} height={tam} fill={d.relleno && nombre !== "risa" ? d.relleno : "none"} fillOpacity={0.18} stroke={d.color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {nombre === "risa" && <circle cx="12" cy="12" r="9.5" fill="#E0B24A" fillOpacity="1" stroke="none" />}
      <path d={d.trazo} />
    </svg>
  );
}
