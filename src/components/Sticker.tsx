import { DEFS, DIBUJOS } from "../lib/stickers";
import "../styles/stickers.css";

/** Se pone una sola vez en la página del chat: contiene los colores que usan los emoticones y los peones. */
export function StickerDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs dangerouslySetInnerHTML={{ __html: DEFS }} />
    </svg>
  );
}

/** Destellos que rodean a todos los emoticones VIP (se mueven aparte del dibujo). */
const AURA_VIP =
  '<path class="e-tw" style="transform-origin:3px 5px" d="M3 2.600l.7 1.900 1.900.7-1.900.7-.7 1.900-.7-1.900L.4 5.200l1.900-.7z" fill="#fff"/>' +
  '<path class="e-tw" style="animation-delay:.7s;transform-origin:45px 42px" d="M45 39.400l.7 1.900 1.900.7-1.900.7-.7 1.900-.7-1.900-1.900-.7 1.900-.7z" fill="#ffe98a"/>';

/** Emoticón animado del chat. La clave es «pack:nombre». */
export default function Sticker({ clave, tam = 32 }: { clave: string; tam?: number }) {
  const [pack, nombre = ""] = clave.split(":");
  const dibujo = DIBUJOS[nombre];
  if (!dibujo) return <span style={{ display: "inline-block", width: tam, height: tam }} />;
  const clase = pack === "vip" ? " estk-vip" : pack === "pro" ? " estk-pro" : "";
  return <svg className={`estk${clase}`} viewBox="0 0 48 48" width={tam} height={tam} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: dibujo + (pack === "vip" ? AURA_VIP : "") }} />;
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
