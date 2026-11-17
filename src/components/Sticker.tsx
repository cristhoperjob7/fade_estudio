import { DEFS, DIBUJOS } from "../lib/stickers";

/** Se pone una sola vez en la página del chat: contiene los colores que usan los emoticones y los peones. */
export function StickerDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs dangerouslySetInnerHTML={{ __html: DEFS }} />
    </svg>
  );
}

/** Emoticón animado del chat. La clave es «pack:nombre». */
export default function Sticker({ clave, tam = 28 }: { clave: string; tam?: number }) {
  const [pack, nombre = ""] = clave.split(":");
  const dibujo = DIBUJOS[nombre];
  if (!dibujo) return <span className="st-vacio" style={{ width: tam, height: tam }} />;
  const brillo = pack === "vip" ? " glowvip" : pack === "pro" ? " glowpro" : "";
  return <svg className={`st ov${brillo}`} viewBox="0 0 24 24" width={tam} height={tam} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: dibujo }} />;
}

const PAWN = '<circle cx="9" cy="5.2" r="3.7"/><path d="M5.3 9.6h7.4l-1 1.8c1.6 1 2.6 2.8 2.6 5H3.7c0-2.2 1-4 2.6-5z"/><rect x="2.6" y="17.2" width="12.8" height="2.8" rx="1.4"/>';
const RELLENO = { sa: "url(#pR)", pro: "url(#pO)", vip: "url(#pV)", bas: "url(#pB)" } as const;

/** Peón de la lista de conectados: rojo (administración), dorado (Pro), celeste (VIP) o azul (principiante). */
export function Peon({ tipo, retraso = 0 }: { tipo: "sa" | "pro" | "vip" | "bas"; retraso?: number }) {
  return (
    <svg
      className={`peon peon-${tipo}`}
      width="20"
      height="22"
      viewBox="0 0 18 21"
      style={{ animationDelay: `-${retraso}s` }}
      fill={RELLENO[tipo]}
      stroke={tipo === "bas" ? "#1d3f94" : "#0005"}
      strokeWidth=".6"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PAWN }}
    />
  );
}
