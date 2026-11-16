import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import Avatar, { iniciales } from "../components/Avatar";
import Icon from "../components/Icon";
import Sticker from "../components/Sticker";
import { useToast } from "../components/Toast";
import { useAuth } from "../lib/auth";
import { PACKS, puedeUsarPack, useChat, useSalas } from "../lib/chat";
import type { Mensaje, PlanChat } from "../lib/chat";
import { urlFoto } from "../lib/perfil";

const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago" });

function claseNombre(m: Mensaje): string {
  if (m.autor_rol === "superadmin") return "cn-sa";
  return m.autor_plan === "vip" ? "cn-vip" : m.autor_plan === "pro" ? "cn-pro" : "cn-bas";
}
function insignia(m: Mensaje): string {
  if (m.autor_rol === "superadmin") return "SUPERADMIN";
  return m.autor_plan === "vip" ? "VIP" : m.autor_plan === "pro" ? "PRO" : "";
}

/** Chat de barberos: una sala general y una por comuna, en vivo. */
export default function Chat() {
  const { sesion, esAdmin, perfil, barberia } = useAuth();
  const avisar = useToast();
  const miId = sesion?.user.id;
  const soyAdmin = esAdmin && !perfil;
  const miPlan: PlanChat = soyAdmin ? "vip" : ((barberia?.plan ?? "basico") as PlanChat);
  const salas = useSalas();
  const [sala, setSala] = useState("general");
  const { mensajes, cargando, enLinea, fijado, enviar, borrar, silenciar, fijar } = useChat(sala, miId);
  const [texto, setTexto] = useState("");
  const [panel, setPanel] = useState(false);
  const [pack, setPack] = useState<PlanChat>("basico");
  const [menu, setMenu] = useState<number | null>(null);
  const [editandoFijo, setEditandoFijo] = useState(false);
  const [borradorFijo, setBorradorFijo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const abajo = useRef(true);

  const nombreSala = salas?.find((s) => s.clave === sala)?.nombre ?? "Barberos de Chile";
  const tieneComuna = (salas ?? []).some((s) => s.clave !== "general");

  useEffect(() => {
    const el = lista.current;
    if (el && abajo.current) el.scrollTop = el.scrollHeight;
  }, [mensajes, cargando]);

  async function mandar(t: string, sticker: string | null) {
    if (ocupado) return;
    setOcupado(true);
    const motivo = await enviar(t, sticker);
    setOcupado(false);
    if (motivo) return avisar(motivo, "error");
    abajo.current = true;
    if (sticker) setPanel(false);
    else setTexto("");
  }
  const alEnviar = (e: FormEvent) => {
    e.preventDefault();
    if (texto.trim()) void mandar(texto.trim(), null);
  };

  return (
    <div className="chat">
      <div className="chat-cab">
        <div>
          <h1 className="titulo"># {nombreSala}</h1>
          <p className="suave">
            <i className="chat-punto" /> {enLinea} {enLinea === 1 ? "conectado" : "conectados"}
          </p>
        </div>
        {soyAdmin && (
          <button
            type="button"
            className="btn btn-borde btn-chico"
            onClick={() => {
              setBorradorFijo(fijado);
              setEditandoFijo(!editandoFijo);
            }}
          >
            {fijado ? "Editar fijado" : "Fijar aviso"}
          </button>
        )}
      </div>

      {salas && salas.length > 1 && (
        <div className="chat-salas" role="tablist" aria-label="Salas">
          {salas.map((s) => (
            <button key={s.clave} type="button" role="tab" aria-selected={sala === s.clave} className={sala === s.clave ? "on" : ""} onClick={() => setSala(s.clave)}>
              {s.nombre}
            </button>
          ))}
        </div>
      )}
      {salas && !tieneComuna && !soyAdmin && (
        <p className="chat-aviso">
          Para entrar a la sala de tu comuna, agrega la comuna en{" "}
          <Link to="/panel/ajustes">Ajustes → Barbería</Link> (lo hace el dueño).
        </p>
      )}

      {editandoFijo && (
        <form
          className="chat-fijar"
          onSubmit={(e) => {
            e.preventDefault();
            void fijar(borradorFijo).then((m) => {
              if (m) return avisar(m, "error");
              setEditandoFijo(false);
              avisar(borradorFijo.trim() ? "Aviso fijado" : "Aviso quitado");
            });
          }}
        >
          <input value={borradorFijo} maxLength={300} onChange={(e) => setBorradorFijo(e.target.value)} placeholder="Escribe el aviso (déjalo vacío para quitarlo)" />
          <button className="btn btn-primario btn-chico">Guardar</button>
        </form>
      )}
      {fijado && (
        <p className="chat-fijado" role="note">
          <b>Fijado</b> {fijado}
        </p>
      )}

      <div
        className="chat-lista"
        ref={lista}
        onScroll={(e) => {
          const el = e.currentTarget;
          abajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
        }}
        onClick={() => setMenu(null)}
      >
        {cargando && <p className="suave">Cargando…</p>}
        {!cargando && mensajes.filter((m) => !m.borrado).length === 0 && <p className="chat-vacio">Aún no hay mensajes. ¡Escribe el primero!</p>}
        {mensajes.map((m, i) => {
          if (m.borrado) return null;
          const previo = mensajes.slice(0, i).reverse().find((x) => !x.borrado);
          const seguido = previo && previo.autor_id === m.autor_id && new Date(m.creado_en).getTime() - new Date(previo.creado_en).getTime() < 180000;
          const mio = m.autor_id === miId;
          const ins = insignia(m);
          return (
            <div key={m.id} className={`chat-msg${seguido ? " seguido" : ""}${m.autor_plan === "vip" && m.autor_rol !== "superadmin" ? " vipmsg" : ""}`}>
              <div className="chat-av">
                {!seguido && <Avatar sencillo iniciales={iniciales(m.autor_nombre)} foto={urlFoto(m.autor_avatar)} rojo={m.autor_rol === "superadmin"} plan={m.autor_plan} />}
              </div>
              <div className="chat-cuerpo">
                {!seguido && (
                  <div className="chat-nom">
                    <span className={claseNombre(m)}>{m.autor_nombre}</span>
                    {m.autor_rol !== "superadmin" && m.autor_barberia && <small>{m.autor_barberia}</small>}
                    {ins && <em className={`chat-ins ins-${ins.toLowerCase()}`}>{ins}</em>}
                    <time>{hora(m.creado_en)}</time>
                  </div>
                )}
                <div className="chat-txt">
                  {m.texto && <span>{m.texto}</span>}
                  {m.sticker && (
                    <span className="chat-sticker">
                      <Sticker clave={m.sticker} tam={56} />
                    </span>
                  )}
                </div>
              </div>
              {(mio || soyAdmin) && (
                <div className="chat-acc">
                  <button type="button" aria-label="Opciones del mensaje" onClick={(e) => { e.stopPropagation(); setMenu(menu === m.id ? null : m.id); }}>
                    <Icon nombre="mas3" size={18} />
                  </button>
                  {menu === m.id && (
                    <div className="chat-menu" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => { void borrar(m.id); setMenu(null); }}>
                        Borrar mensaje
                      </button>
                      {soyAdmin && !mio && (
                        <button
                          type="button"
                          onClick={() => {
                            void silenciar(m.autor_id, 60).then((e2) => avisar(e2 || `${m.autor_nombre} silenciado por 1 hora`, e2 ? "error" : undefined));
                            setMenu(null);
                          }}
                        >
                          Silenciar 1 hora
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="chat-comp">
        {panel && (
          <div className="chat-panel" role="dialog" aria-label="Emoticones">
            <div className="chat-packs" role="tablist">
              {PACKS.map((p) => (
                <button key={p.clave} type="button" role="tab" aria-selected={pack === p.clave} className={pack === p.clave ? "on" : ""} onClick={() => setPack(p.clave)}>
                  {!puedeUsarPack(miPlan, p.clave) && <Icon nombre="lock" size={13} />} {p.nombre}
                </button>
              ))}
            </div>
            <div className="chat-stickers">
              {PACKS.find((p) => p.clave === pack)?.items.map((n) => {
                const libre = puedeUsarPack(miPlan, pack);
                return (
                  <button
                    key={n}
                    type="button"
                    className={libre ? "" : "bloq"}
                    aria-label={n}
                    onClick={() => (libre ? void mandar("", `${pack}:${n}`) : avisar(`Estos emoticones son del plan ${pack === "pro" ? "Pro" : "VIP"}.`, "error"))}
                  >
                    <Sticker clave={`${pack}:${n}`} tam={36} />
                  </button>
                );
              })}
            </div>
            {!puedeUsarPack(miPlan, pack) && <p className="chat-nota">Se desbloquean con el plan {pack === "pro" ? "Pro" : "VIP"}.</p>}
          </div>
        )}
        <form className="chat-form" onSubmit={alEnviar}>
          <button type="button" className="chat-emo" aria-label="Emoticones" aria-expanded={panel} onClick={() => setPanel(!panel)}>
            <Icon nombre="smile" size={22} />
          </button>
          <input value={texto} maxLength={500} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un mensaje…" aria-label="Mensaje" autoComplete="off" />
          <button className="chat-enviar" disabled={ocupado || !texto.trim()} aria-label="Enviar">
            <Icon nombre="send" size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
