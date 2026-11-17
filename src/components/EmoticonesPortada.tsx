import Sticker, { StickerDefs } from "./Sticker";

/** Sección de la portada: el mejor emoticón de cada plan, con su animación real del chat. */
export default function EmoticonesPortada() {
  return (
    <div className="lp-emo">
      <StickerDefs />
      <div className="lp-emo-fila">
        <div className="lp-emo-card">
          <div className="lp-emo-big">
            <Sticker clave="basico:tijerita" tam={70} />
          </div>
          <b>Básico</b>
          <small>12 emoticones</small>
        </div>
        <div className="lp-emo-card lp-emo-pro">
          <span className="lp-emo-tag">PRO</span>
          <div className="lp-emo-big">
            <Sticker clave="pro:poste" tam={78} />
          </div>
          <b>Pro</b>
          <small>35 animados</small>
        </div>
        <div className="lp-emo-card lp-emo-vip">
          <span className="lp-emo-tag">VIP</span>
          <div className="lp-emo-in">
            <div className="lp-emo-big">
              <Sticker clave="vip:rey_cool" tam={84} />
            </div>
            <b>VIP</b>
            <small>35 exclusivos</small>
          </div>
        </div>
      </div>

      <div className="lp-emo-chat" role="img" aria-label="Ejemplo de mensajes con emoticones de cada plan">
        <div className="lp-emo-msg lp-e1">
          <b className="lp-n-bas">Corte Fino</b>
          <span>
            Buena esa <Sticker clave="basico:tijerita" tam={28} />
          </span>
        </div>
        <div className="lp-emo-msg lp-e2">
          <b className="lp-n-pro">Don Pato</b>
          <span>
            Hoy no paramos <Sticker clave="pro:poste" tam={34} />
          </span>
        </div>
        <div className="lp-emo-msg lp-emo-msg-vip lp-e3">
          <b className="lp-n-vip">Hermanos Vega</b>
          <span>
            El rey llegó <Sticker clave="vip:rey_cool" tam={44} />
          </span>
        </div>
      </div>
    </div>
  );
}
