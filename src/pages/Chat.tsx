import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import Avatar, { iniciales } from "../components/Avatar";
import Hoja from "../components/Hoja";
import Icon from "../components/Icon";
import Sticker, { Peon, StickerDefs } from "../components/Sticker";
import { useToast } from "../components/Toast";
import { useAuth } from "../lib/auth";
import { PACKS, marcarLeido, puedeUsarPack, salaPrivada, useAjusteChat, useBloqueados, useChat, usePrivados, useSalas } from "../lib/chat";
import type { Conectado, Mensaje, PlanChat } from "../lib/chat";
import { urlFoto, useMiPerfil } from "../lib/perfil";

const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago" });

function claseNombre(m: Mensaje): string {
  if (m.autor_rol === "superadmin") return "cn-sa";
  return m.autor_plan === "vip" ? "cn-vip" : m.autor_plan === "pro" ? "cn-pro" : "cn-bas";
}
const GRUPOS: { clave: string; titulo: string; es: (c: Conectado) => boolean }[] = [
  { clave: "sa", titulo: "ADM", es: (c) => c.rol === "superadmin" },
  { clave: "vip", titulo: "Barbero VIP", es: (c) => c.rol !== "superadmin" && c.plan === "vip" },
  { clave: "pro", titulo: "Barbero Pro", es: (c) => c.rol !== "superadmin" && c.plan === "pro" },
  { clave: "bas", titulo: "Barbero Principiante", es: (c) => c.rol !== "superadmin" && c.plan !== "vip" && c.plan !== "pro" },
];
const tipoPeon = (c: Conectado): "sa" | "pro" | "vip" | "bas" => (c.rol === "superadmin" ? "sa" : c.plan === "vip" ? "vip" : c.plan === "pro" ? "pro" : "bas");
const etiquetaGrupo = (c: Conectado) => (c.rol === "superadmin" ? "ADM" : c.plan === "vip" ? "Barbero VIP" : c.plan === "pro" ? "Barbero Pro" : "Barbero Principiante");
const claseC = (c: Conectado) => (c.rol === "superadmin" ? "cn-sa" : c.plan === "vip" ? "cn-vip" : c.plan === "pro" ? "cn-pro" : "cn-bas");

/** Chat de barberos: una sala general y una por comuna, en vivo. */
export default function Chat() {
  const { sesion, esAdmin, perfil, barberia } = useAuth();
  const avisar = useToast();
  const miId = sesion?.user.id;
  const soyAdmin = esAdmin && !perfil;
  const miPlan: PlanChat = soyAdmin ? "vip" : ((barberia?.plan ?? "basico") as PlanChat);
  const salas = useSalas();
  const { datos: mio } = useMiPerfil(true);
  const [sala, setSala] = useState("general");
  const [vista, setVista] = useState<"sala" | "privados" | "dm">("sala");
  const [dm, setDm] = useState<Conectado | null>(null);
  const [miembros, setMiembros] = useState(false);
  const priv = usePrivados(miId);
  const bloq = useBloqueados();
  const ajuste = useAjusteChat();
  const [ficha, setFicha] = useState<Conectado | null>(null);
  const yo = useMemo<Conectado | null>(
    () =>
      miId && mio
        ? {
            id: miId,
            nombre: [mio.nombre, mio.apellidos].filter(Boolean).join(" ") || (soyAdmin ? "Superadmin" : "Barbero"),
            rol: soyAdmin ? "superadmin" : perfil?.rol === "dueno" ? "dueno" : "barbero",
            plan: miPlan,
            barberia: soyAdmin ? "" : (barberia?.nombre ?? ""),
            avatar: mio.avatar_path ?? null,
            privados: ajuste.privados !== false,
          }
        : null,
    [miId, mio, soyAdmin, perfil?.rol, miPlan, barberia?.nombre, ajuste.privados],
  );
  const salaActual = vista === "dm" && dm && miId ? salaPrivada(miId, dm.id) : sala;
  const { mensajes, cargando, conectados, enLinea, fijado, enviar, borrar, fijar } = useChat(salaActual, yo, vista === "dm" ? dm?.id : undefined);
  const enDm = vista === "dm" && !!dm;
  const bloqueado = !!dm && bloq.ids.includes(dm.id);
  const [texto, setTexto] = useState("");
  const [panel, setPanel] = useState(false);
  const [pack, setPack] = useState<PlanChat>("basico");
  const [menu, setMenu] = useState<number | null>(null);
  const [editandoFijo, setEditandoFijo] = useState(false);
  const [borradorFijo, setBorradorFijo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const abajo = useRef(true);

  const nombreSala = enDm ? dm!.nombre : (salas?.find((s) => s.clave === sala)?.nombre ?? "Barberos de Chile");

  // Si estoy mirando una conversación privada, se marca como leída cada vez que llega algo.
  useEffect(() => {
    if (enDm) void marcarLeido(salaActual);
  }, [enDm, salaActual, mensajes.length]);

  function abrirPrivado(c: Conectado) {
    if (c.id === miId) return;
    setDm(c);
    setVista("dm");
    setMiembros(false);
    abajo.current = true;
  }
  const grupos = GRUPOS.map((g) => ({ ...g, gente: conectados.filter(g.es).sort((a, b) => a.nombre.localeCompare(b.nombre)) })).filter((g) => g.gente.length > 0);
  const lateral = (
    <div className="chat-miembros">
      <h2>Conectados · {enLinea}</h2>
      {grupos.length === 0 && <p className="suave">Nadie más por ahora.</p>}
      {grupos.map((g) => (
        <section key={g.clave}>
          <h3>{g.titulo} <span>{g.gente.length}</span></h3>
          {g.gente.map((c) => (
            <button key={c.id} type="button" className="chat-miem" onClick={() => { setMiembros(false); setFicha(c); }}>
              <Peon tipo={tipoPeon(c)} retraso={(c.nombre.length * 3) % 7} />
              <span className="chat-miem-t">
                <b className={claseC(c)}>{c.nombre}{c.id === miId ? " (tú)" : ""}</b>
                {c.rol !== "superadmin" && c.barberia && <small>{c.barberia}</small>}
              </span>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
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
      <StickerDefs />
      <div className="chat-cab">
        <div className="chat-tit">
          {vista !== "sala" && (
            <button type="button" className="chat-atras" aria-label="Volver" onClick={() => setVista(vista === "dm" ? "privados" : "sala")}>
              <Icon nombre="back" size={20} />
            </button>
          )}
          <div>
            <h1 className="titulo">{vista === "privados" ? "Privados" : enDm ? nombreSala : `# ${nombreSala}`}</h1>
            <p className="suave">
              {vista === "privados" ? (
                "Tus conversaciones uno a uno"
              ) : enDm ? (
                dm!.rol === "superadmin" ? "Administración" : dm!.barberia
              ) : (
                <>
                  <i className="chat-punto" /> {enLinea} {enLinea === 1 ? "conectado" : "conectados"}
                </>
              )}
            </p>
          </div>
        </div>
        {enDm && (
          <button type="button" className="btn btn-borde btn-chico" onClick={() => void bloq.cambiar(dm!.id, !bloqueado).then((m) => avisar(m || (bloqueado ? "Desbloqueado" : "Bloqueado"), m ? "error" : undefined))}>
            {bloqueado ? "Desbloquear" : "Bloquear"}
          </button>
        )}
        {vista === "sala" && (
          <button type="button" className="btn btn-borde btn-chico chat-btn-miem" onClick={() => setMiembros(true)}>
            Conectados
          </button>
        )}
        {soyAdmin && vista === "sala" && (
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

      {vista !== "dm" && (
        <div className="chat-salas" role="tablist" aria-label="Salas">
          {(salas ?? []).map((s) => (
            <button key={s.clave} type="button" role="tab" aria-selected={vista === "sala" && sala === s.clave} className={vista === "sala" && sala === s.clave ? "on" : ""} onClick={() => { setSala(s.clave); setVista("sala"); }}>
              {s.nombre}
            </button>
          ))}
          <button type="button" role="tab" aria-selected={vista === "privados"} className={vista === "privados" ? "on" : ""} onClick={() => setVista("privados")}>
            Privados{priv.sinLeer > 0 && <em className="chat-no-leidos">{priv.sinLeer}</em>}
          </button>
        </div>
      )}
      {vista === "sala" && salas && !tieneComuna && !soyAdmin && (
        <p className="chat-aviso">
          Para entrar a la sala de tu comuna, agrega la comuna en{" "}
          <Link to="/panel/ajustes">Ajustes → Barbería</Link> (lo hace el dueño).
        </p>
      )}

      {vista === "sala" && editandoFijo && (
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
      {vista === "sala" && fijado && (
        <p className="chat-fijado" role="note">
          <b>Fijado</b> {fijado}
        </p>
      )}

      {vista === "privados" ? (
        <div className="chat-bandeja">
          {priv.lista.length === 0 && <p className="chat-vacio">Aún no tienes conversaciones privadas. Toca a alguien en «Conectados» para escribirle.</p>}
          {priv.lista.map((p) => (
            <button key={p.sala} type="button" className="chat-fila" onClick={() => abrirPrivado(p)}>
              <Avatar sencillo iniciales={iniciales(p.nombre)} foto={urlFoto(p.avatar)} rojo={p.rol === "superadmin"} plan={p.plan} />
              <span className="chat-fila-t">
                <b className={claseC(p)}>{p.nombre}</b>
                <small>{p.ultimo}</small>
              </span>
              <span className="chat-fila-d">
                <time>{hora(p.ultimo_en)}</time>
                {p.no_leidos > 0 && <em className="chat-no-leidos">{p.no_leidos}</em>}
              </span>
            </button>
          ))}
        </div>
      ) : (
      <div className="chat-cols">
      <div className="chat-zona">
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
        {!cargando && mensajes.filter((m) => !m.borrado).length === 0 && <p className="chat-vacio">{enDm ? `Escríbele a ${dm!.nombre}.` : "Aún no hay mensajes. ¡Escribe el primero!"}</p>}
        {mensajes.map((m, i) => {
          if (m.borrado) return null;
          const previo = mensajes.slice(0, i).reverse().find((x) => !x.borrado);
          const seguido = previo && previo.autor_id === m.autor_id && new Date(m.creado_en).getTime() - new Date(previo.creado_en).getTime() < 180000;
          const mio = m.autor_id === miId;
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
                    <time>{hora(m.creado_en)}</time>
                  </div>
                )}
                <div className="chat-txt">
                  {m.texto && <span>{m.texto}</span>}
                  {m.sticker && (
                    <span className="chat-sticker">
                      <Sticker clave={m.sticker} tam={32} />
                    </span>
                  )}
                </div>
              </div>
              {(mio || (soyAdmin && !enDm)) && (
                <div className="chat-acc">
                  <button type="button" aria-label="Opciones del mensaje" onClick={(e) => { e.stopPropagation(); setMenu(menu === m.id ? null : m.id); }}>
                    <Icon nombre="mas3" size={18} />
                  </button>
                  {menu === m.id && (
                    <div className="chat-menu" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => { void borrar(m.id); setMenu(null); }}>
                        Borrar mensaje
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {enDm && bloqueado ? (
        <p className="chat-aviso chat-bloq">Bloqueaste a {dm!.nombre}. Desbloquéalo para volver a escribirle.</p>
      ) : (
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
                    <Sticker clave={`${pack}:${n}`} tam={32} />
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
      )}
      </div>
      {vista === "sala" && <aside className="chat-lat">{lateral}</aside>}
      </div>
      )}
      {ficha && (
        <Hoja titulo={ficha.nombre} onCerrar={() => setFicha(null)}>
          <div className="chat-ficha">
            <Avatar iniciales={iniciales(ficha.nombre)} foto={urlFoto(ficha.avatar)} rojo={ficha.rol === "superadmin"} plan={ficha.plan} grande />
            <h3 className={claseC(ficha)}>{ficha.nombre}</h3>
            <p className="chat-ficha-rol">
              <Peon tipo={tipoPeon(ficha)} /> {etiquetaGrupo(ficha)}
            </p>
            {ficha.rol !== "superadmin" && ficha.barberia && <p className="suave">{ficha.barberia}</p>}
            {ficha.id === miId ? (
              <p className="suave">Este eres tú.</p>
            ) : ficha.privados === false && !soyAdmin ? (
              <p className="chat-aviso">{ficha.nombre} tiene desactivados los mensajes privados.</p>
            ) : (
              <button type="button" className="btn btn-primario" onClick={() => { abrirPrivado(ficha); setFicha(null); }}>
                Iniciar chat privado
              </button>
            )}
          </div>
        </Hoja>
      )}
      {miembros && (
        <Hoja titulo="Conectados" onCerrar={() => setMiembros(false)}>
          {lateral}
        </Hoja>
      )}
    </div>
  );
}
