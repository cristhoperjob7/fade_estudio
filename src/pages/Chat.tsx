import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import Avatar, { iniciales } from "../components/Avatar";
import Hoja from "../components/Hoja";
import Icon from "../components/Icon";
import Sticker, { Peon, StickerDefs } from "../components/Sticker";
import { NOMBRES } from "../lib/stickers";
import { useToast } from "../components/Toast";
import { useAuth } from "../lib/auth";
import { COMANDOS, PACKS, baneoChat, comandoChat, listarSancionados, marcarLeido, puedeUsarPack, salaPrivada, silenciarChat, useAjusteChat, useBloqueados, useChat, useEstadoChat, useNoLeidos, usePrivados } from "../lib/chat";
import type { Conectado, PlanChat, Sancionados } from "../lib/chat";
import { urlFoto, useMiPerfil } from "../lib/perfil";

const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago" });

function claseNombre(m: { autor_rol: string; autor_plan: PlanChat }): string {
  if (m.autor_rol === "superadmin") return "cn-sa";
  return m.autor_plan === "vip" ? "cn-vip" : m.autor_plan === "pro" ? "cn-pro" : "cn-bas";
}
const claseC = (c: Conectado) => claseNombre({ autor_rol: c.rol, autor_plan: c.plan });
type Tipo = "sa" | "pro" | "vip" | "bas";
const tipoPeon = (c: Conectado): Tipo => (c.rol === "superadmin" ? "sa" : c.plan === "vip" ? "vip" : c.plan === "pro" ? "pro" : "bas");
const etiquetaGrupo = (c: Conectado) => (c.rol === "superadmin" ? "ADM" : c.plan === "vip" ? "Barbero VIP" : c.plan === "pro" ? "Barbero Pro" : "Barbero Principiante");
const GRUPOS: { clave: Tipo; titulo: string }[] = [
  { clave: "sa", titulo: "ADM" },
  { clave: "vip", titulo: "Barbero VIP" },
  { clave: "pro", titulo: "Barbero Pro" },
  { clave: "bas", titulo: "Barbero Principiante" },
];

/** Lo que se ofrece al tocar un pack bloqueado. */
const VENTA: Record<"pro" | "vip", { titulo: string; lineas: string[] }> = {
  pro: {
    titulo: "Desbloquea los 35 emoticones Pro",
    lineas: ["Tijeras, navaja, poste y más, animados", "Tu página propia con fotos y mapa", "Avisos a tus clientes"],
  },
  vip: {
    titulo: "Sé VIP y destaca en todo el chat",
    lineas: ["35 emoticones VIP de lujo, con animaciones únicas", "Tus mensajes con brillo y tu peón con aura", "Página a medida hecha para tu barbería"],
  },
};

const CLAVE_DENTRO = "fs_chat_dentro";
const estabaDentro = (id?: string) => {
  try {
    return !!id && sessionStorage.getItem(CLAVE_DENTRO) === id;
  } catch {
    return false;
  }
};
const marcarDentro = (id: string | undefined, dentro: boolean) => {
  try {
    if (dentro && id) sessionStorage.setItem(CLAVE_DENTRO, id);
    else sessionStorage.removeItem(CLAVE_DENTRO);
  } catch {
    /* sin almacenamiento: solo no recordará la entrada */
  }
};

/** Entrada: el chat solo se abre (y apareces conectado) cuando tocas «Entrar». Si cambias de menú y vuelves, sigues dentro hasta que toques «Salir». */
export default function Chat() {
  const { sesion, esAdmin, perfil } = useAuth();
  const avisar = useToast();
  const miId = sesion?.user.id;
  const [dentro, setDentro] = useState(() => estabaDentro(miId));
  const est = useEstadoChat(true);
  const base = useRef<number | null | undefined>(undefined);
  const entrar = () => {
    marcarDentro(miId, true);
    setDentro(true);
  };
  const salir = () => {
    marcarDentro(miId, false);
    setDentro(false);
  };

  // Si un administrador te saca (!kick), vuelves a la portada.
  useEffect(() => {
    if (!est.listo) return;
    if (base.current === undefined) {
      base.current = est.expulsadoDesde;
      return;
    }
    if (est.expulsadoDesde !== base.current) {
      base.current = est.expulsadoDesde;
      if (dentro) {
        salir();
        avisar("Un administrador te sacó del chat", "error");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [est.listo, est.expulsadoDesde]);

  if (est.baneado && !(esAdmin && !perfil)) return <Baneado motivo={est.motivo} />;
  return dentro ? <Sala onSalir={salir} est={est} /> : <Portada onEntrar={entrar} />;
}

function Baneado({ motivo }: { motivo: string }) {
  return (
    <div className="chat-portada chat-baneado">
      <div className="chat-portada-ico">
        <Icon nombre="lock" size={34} />
      </div>
      <h1 className="titulo">Estás baneado del chat</h1>
      <p className="suave">Un administrador te quitó el acceso al chat de barberos. El resto del sistema sigue funcionando normal.</p>
      {motivo && <p className="chat-portada-aviso">Motivo: {motivo}</p>}
    </div>
  );
}

function Portada({ onEntrar }: { onEntrar: () => void }) {
  const { sesion } = useAuth();
  const sinLeer = useNoLeidos(sesion?.user.id);
  return (
    <div className="chat-portada">
      <div className="chat-portada-ico">
        <Icon nombre="chat" size={34} />
      </div>
      <h1 className="titulo">Chat de barberos</h1>
      <p className="suave">Conversa con otros barberos y dueños de barberías. Mientras estés dentro, los demás te verán como conectado.</p>
      <ul className="chat-reglas">
        <li>Trata a todos con respeto.</li>
        <li>Nada de spam ni publicidad.</li>
        <li>Los chats privados son solo entre dos personas.</li>
      </ul>
      {sinLeer > 0 && (
        <p className="chat-portada-aviso">
          Tienes {sinLeer} {sinLeer === 1 ? "mensaje privado" : "mensajes privados"} sin leer.
        </p>
      )}
      <button type="button" className="btn btn-primario chat-entrar" onClick={onEntrar}>
        Entrar al chat
      </button>
    </div>
  );
}

function Sala({ onSalir, est }: { onSalir: () => void; est: ReturnType<typeof useEstadoChat> }) {
  const { sesion, esAdmin, perfil, barberia } = useAuth();
  const avisar = useToast();
  const miId = sesion?.user.id;
  const soyAdmin = esAdmin && !perfil;
  const esDueno = perfil?.rol === "dueno";
  const miPlan: PlanChat = soyAdmin ? "vip" : ((barberia?.plan ?? "basico") as PlanChat);
  const { datos: mio } = useMiPerfil(true);
  const ajuste = useAjusteChat();
  const bloq = useBloqueados();
  const priv = usePrivados(miId);

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

  // Pestañas: «global» siempre está; cada chat privado abierto es otra pestaña.
  const [abiertos, setAbiertos] = useState<Conectado[]>([]);
  const [activa, setActiva] = useState("global");
  const dm = abiertos.find((c) => c.id === activa) ?? null;
  const enDm = !!dm;
  const global = useChat("general", yo);
  const privado = useChat(dm && miId ? salaPrivada(miId, dm.id) : null, yo, dm?.id);
  const actual = enDm ? privado : global;
  const mensajes = actual.mensajes;

  const [texto, setTexto] = useState("");
  const [panel, setPanel] = useState(false);
  const [pack, setPack] = useState<PlanChat>("basico");
  const [menu, setMenu] = useState<number | null>(null);
  const [editandoFijo, setEditandoFijo] = useState(false);
  const [borradorFijo, setBorradorFijo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [miembros, setMiembros] = useState(false);
  const [historial, setHistorial] = useState(false);
  const [ficha, setFicha] = useState<Conectado | null>(null);
  const [stickerSel, setStickerSel] = useState<string | null>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [menuCab, setMenuCab] = useState(false);
  const [moderando, setModerando] = useState(false);
  const [sanc, setSanc] = useState<Sancionados | null>(null);
  const [sistema, setSistema] = useState<{ id: number; texto: string }[]>([]);
  const [pendiente, setPendiente] = useState<{ linea: string; texto: string } | null>(null);
  const entradaRef = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const abajo = useRef(true);
  const bloqueado = !!dm && bloq.ids.includes(dm.id);

  // Si llega un mensaje privado de alguien sin pestaña abierta, se abre su pestaña (con el número).
  useEffect(() => {
    const nuevos = priv.lista.filter((p) => p.no_leidos > 0);
    if (nuevos.length === 0) return;
    setAbiertos((a) => {
      const faltan = nuevos.filter((p) => !a.some((c) => c.id === p.id));
      return faltan.length ? [...a, ...faltan] : a;
    });
  }, [priv.lista]);

  // Mirando un privado: se marca como leído cada vez que llega algo.
  useEffect(() => {
    if (enDm && dm && miId) void marcarLeido(salaPrivada(miId, dm.id));
  }, [enDm, dm, miId, mensajes.length]);

  useEffect(() => {
    const el = lista.current;
    if (el && abajo.current) el.scrollTop = el.scrollHeight;
  }, [mensajes, actual.cargando, activa]);

  function abrirPrivado(c: Conectado) {
    if (c.id === miId) return;
    setAbiertos((a) => (a.some((x) => x.id === c.id) ? a : [...a, c]));
    cambiarA(c.id);
    setMiembros(false);
    setHistorial(false);
  }
  function cambiarA(id: string) {
    setActiva(id);
    setTexto("");
    setPanel(false);
    setMenu(null);
    abajo.current = true;
  }
  function cerrar(c: Conectado) {
    if (miId) void marcarLeido(salaPrivada(miId, c.id));
    setAbiertos((a) => a.filter((x) => x.id !== c.id));
    if (activa === c.id) cambiarA("global");
  }

  async function mandar(t: string, sticker: string | null) {
    if (ocupado) return;
    setOcupado(true);
    const motivo = await actual.enviar(t, sticker);
    setOcupado(false);
    if (motivo) return avisar(motivo, "error");
    abajo.current = true;
    setTexto("");
    setStickerSel(null);
    setPanel(false);
  }

  function decir(texto: string) {
    setSistema((l) => [...l.slice(-9), { id: Date.now() + Math.random(), texto }]);
    abajo.current = true;
  }
  async function correr(linea: string, confirmar: boolean) {
    setOcupado(true);
    const r = await comandoChat(linea, confirmar);
    setOcupado(false);
    if (r.confirmar) {
      setPendiente({ linea, texto: r.texto });
      return;
    }
    setPendiente(null);
    decir(r.texto);
    if (r.ok && moderando) void listarSancionados().then(setSanc);
  }
  const esComando = soyAdmin && !enDm && texto.trimStart().startsWith("!");
  const alEnviar = (e: FormEvent) => {
    e.preventDefault();
    if (esComando) {
      const l = texto.trim();
      setTexto("");
      setPanel(false);
      void correr(l, false);
      return;
    }
    if (texto.trim() || stickerSel) void mandar(texto.trim(), stickerSel);
  };
  const sugerencias = (() => {
    if (!esComando) return [];
    const t = texto.trimStart().toLowerCase();
    if (!/^![a-z]{2,}$/.test(t)) return [];
    return COMANDOS.filter((c) => c.c.startsWith(t) && c.c !== t);
  })();
  const congeladoParaMi = est.congelado && !soyAdmin && !enDm;

  async function abrirModeracion() {
    setMenuCab(false);
    setModerando(true);
    setSanc(await listarSancionados());
  }
  async function moderar(accion: () => Promise<string | null>, ok: string) {
    const m = await accion();
    avisar(m || ok, m ? "error" : undefined);
    if (!m) setSanc(await listarSancionados());
  }
  useEffect(() => {
    if (ficha && soyAdmin) void listarSancionados().then(setSanc);
  }, [ficha, soyAdmin]);

  // ---- Lista de conectados: en el global todos; en un privado, solo quienes están en esa conversación ----
  const conectadosGlobal = global.conectados;
  const grupos = GRUPOS.map((g) => ({ ...g, gente: conectadosGlobal.filter((c) => tipoPeon(c) === g.clave).sort((a, b) => a.nombre.localeCompare(b.nombre)) })).filter((g) => g.gente.length > 0);
  const fila = (c: Conectado, extra?: string) => (
    <button key={c.id} type="button" className="chat-miem" onClick={() => { setMiembros(false); setFicha(c); }}>
      <Peon tipo={tipoPeon(c)} retraso={(c.nombre.length * 3) % 7} />
      <span className="chat-miem-t">
        <b className={claseC(c)}>
          {c.nombre}
          {c.id === miId ? " (tú)" : ""}
        </b>
        <small>{extra ?? (c.rol !== "superadmin" ? c.barberia : "")}</small>
      </span>
    </button>
  );
  const lateral =
    enDm && dm && yo ? (
      <div className="chat-miembros">
        <h2>En esta conversación</h2>
        {fila(yo, "En línea")}
        {fila(dm, conectadosGlobal.some((c) => c.id === dm.id) ? "En línea" : "Desconectado")}
        <p className="suave chat-lat-nota">Vuelve a «# Global» para ver a todos los conectados.</p>
      </div>
    ) : (
      <div className="chat-miembros">
        <h2>Conectados · {conectadosGlobal.length}</h2>
        {grupos.length === 0 && <p className="suave">Nadie más por ahora.</p>}
        {grupos.map((g) => (
          <section key={g.clave}>
            <h3>
              {g.titulo} <span>{g.gente.length}</span>
            </h3>
            {g.gente.map((c) => fila(c))}
          </section>
        ))}
      </div>
    );

  const packActual = PACKS.find((p) => p.clave === pack);
  const libre = puedeUsarPack(miPlan, pack);
  const venta = pack === "basico" ? null : VENTA[pack];

  return (
    <div className="chat">
      <StickerDefs />
      <div className="chat-tabs" role="tablist" aria-label="Conversaciones">
        <button type="button" role="tab" aria-selected={!enDm} className={`chat-tab${!enDm ? " on" : ""}`} onClick={() => cambiarA("global")}>
          # Global
        </button>
        {abiertos.map((c) => {
          const n = priv.lista.find((p) => p.id === c.id)?.no_leidos ?? 0;
          return (
            <div key={c.id} className={`chat-tab${activa === c.id ? " on" : ""}`}>
              <button type="button" role="tab" aria-selected={activa === c.id} onClick={() => cambiarA(c.id)}>
                <b className={claseC(c)}>{c.nombre}</b>
                {n > 0 && activa !== c.id && <em className="chat-no-leidos">{n}</em>}
              </button>
              <button type="button" className="x" aria-label={`Cerrar chat con ${c.nombre}`} onClick={() => cerrar(c)}>
                ×
              </button>
            </div>
          );
        })}
        <button type="button" className="chat-tab chat-tab-mas" aria-label="Mis conversaciones privadas" onClick={() => setHistorial(true)}>
          +
        </button>
      </div>

      <div className="chat-cab">
        <div className="chat-tit">
          <h1 className="chat-h">{enDm ? dm!.nombre : "# Chat global"}</h1>
          <p className="suave">
            {enDm ? (
              `${etiquetaGrupo(dm!)}${dm!.rol !== "superadmin" && dm!.barberia ? ` · ${dm!.barberia}` : ""}`
            ) : (
              <>
                <i className="chat-punto" /> {conectadosGlobal.length} {conectadosGlobal.length === 1 ? "conectado" : "conectados"}
                {est.lento > 0 && <> · lento {est.lento} s</>}
                {est.congelado && <> · congelado</>}
              </>
            )}
          </p>
        </div>
        <button type="button" className="chat-ib chat-btn-miem" aria-label="Ver conectados" onClick={() => setMiembros(true)}>
          <Icon nombre="users" size={20} />
        </button>
        <button type="button" className="chat-ib" aria-label="Más opciones" aria-expanded={menuCab} onClick={() => setMenuCab(!menuCab)}>
          <Icon nombre="mas3" size={20} />
        </button>
        {menuCab && (
          <>
            <div className="chat-menu2-fondo" onClick={() => setMenuCab(false)} />
            <div className="chat-menu2" role="menu">
              {!enDm && soyAdmin && (
                <button type="button" role="menuitem" onClick={() => { setMenuCab(false); setBorradorFijo(global.fijado); setEditandoFijo(!editandoFijo); }}>
                  {global.fijado ? "Editar aviso fijado" : "Fijar aviso"}
                </button>
              )}
              {soyAdmin && (
                <button type="button" role="menuitem" onClick={() => void abrirModeracion()}>
                  Moderación
                </button>
              )}
              {enDm && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setMenuCab(false); void bloq.cambiar(dm!.id, !bloqueado).then((m) => avisar(m || (bloqueado ? "Desbloqueado" : "Bloqueado"), m ? "error" : undefined)); }}
                  >
                    {bloqueado ? "Desbloquear" : "Bloquear"}
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setMenuCab(false); cerrar(dm!); }}>
                    Cerrar esta conversación
                  </button>
                </>
              )}
              <button type="button" role="menuitem" className="mal" onClick={() => { setMenuCab(false); onSalir(); }}>
                Salir del chat
              </button>
            </div>
          </>
        )}
      </div>

      {!enDm && editandoFijo && (
        <form
          className="chat-fijar"
          onSubmit={(e) => {
            e.preventDefault();
            void global.fijar(borradorFijo).then((m) => {
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
      {!enDm && global.fijado && (
        <p className="chat-fijado" role="note">
          <b>Fijado</b> {global.fijado}
        </p>
      )}

      <div className="chat-cols">
        <div className="chat-zona">
          <div
            key={activa}
            className={`chat-lista${enDm ? " dm" : ""}`}
            ref={lista}
            onScroll={(e) => {
              const el = e.currentTarget;
              abajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
            }}
            onClick={() => setMenu(null)}
          >
            {actual.cargando && <p className="suave">Cargando…</p>}
            {!actual.cargando && mensajes.filter((m) => !m.borrado).length === 0 && <p className="chat-vacio">{enDm ? `Escríbele a ${dm!.nombre}.` : "Aún no hay mensajes. ¡Escribe el primero!"}</p>}
            {mensajes.map((m, i) => {
              if (m.borrado) return null;
              if (m.anuncio) {
                return (
                  <div key={m.id} className="chat-anuncio" role="note">
                    <b>ADM</b> {m.texto}
                  </div>
                );
              }
              const mioMsg = m.autor_id === miId;
              const cuerpo = (
                <div className="chat-txt">
                  {m.texto && <span>{m.texto}</span>}
                  {m.sticker && (
                    <span className="chat-sticker">
                      <Sticker clave={m.sticker} tam={enDm ? 34 : 32} />
                    </span>
                  )}
                </div>
              );
              const opciones = (mioMsg || (soyAdmin && !enDm)) && (
                <div className="chat-acc">
                  <button type="button" aria-label="Opciones del mensaje" onClick={(e) => { e.stopPropagation(); setMenu(menu === m.id ? null : m.id); }}>
                    <Icon nombre="mas3" size={18} />
                  </button>
                  {menu === m.id && (
                    <div className="chat-menu" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => { void actual.borrar(m.id); setMenu(null); }}>
                        Borrar mensaje
                      </button>
                    </div>
                  )}
                </div>
              );
              if (enDm) {
                const quien = mioMsg ? yo : dm;
                const prevDm = mensajes.slice(0, i).reverse().find((x) => !x.borrado);
                const seguidoDm = !!prevDm && prevDm.autor_id === m.autor_id && new Date(m.creado_en).getTime() - new Date(prevDm.creado_en).getTime() < 180000;
                return (
                  <div key={m.id} className={`chat-fila-dm${mioMsg ? " mio" : ""}${seguidoDm ? " seguido" : ""}`}>
                    <div className="chat-av">
                      {!seguidoDm && <Avatar sencillo iniciales={iniciales(quien?.nombre ?? m.autor_nombre)} foto={urlFoto(quien?.avatar ?? m.autor_avatar)} rojo={quien?.rol === "superadmin"} plan={quien?.plan ?? m.autor_plan} />}
                    </div>
                    <div className={`chat-burb${mioMsg ? " mio" : ""}`}>
                      {cuerpo}
                      <time>{hora(m.creado_en)}</time>
                      {opciones}
                    </div>
                  </div>
                );
              }
              const previo = mensajes.slice(0, i).reverse().find((x) => !x.borrado);
              const seguido = previo && previo.autor_id === m.autor_id && new Date(m.creado_en).getTime() - new Date(previo.creado_en).getTime() < 180000;
              return (
                <div key={m.id} className={`chat-msg${seguido ? " seguido" : ""}`}>
                  <div className="chat-av">{!seguido && <Avatar sencillo iniciales={iniciales(m.autor_nombre)} foto={urlFoto(m.autor_avatar)} rojo={m.autor_rol === "superadmin"} plan={m.autor_plan} />}</div>
                  <div className="chat-cuerpo">
                    {!seguido && (
                      <div className="chat-nom">
                        <span className={claseNombre(m)}>{m.autor_nombre}</span>
                        {m.autor_rol !== "superadmin" && m.autor_barberia && <small>{m.autor_barberia}</small>}
                        <time>{hora(m.creado_en)}</time>
                      </div>
                    )}
                    {cuerpo}
                  </div>
                  {opciones}
                </div>
              );
            })}
            {!enDm &&
              sistema.map((x) => (
                <div key={x.id} className="chat-sistema">
                  <small>Solo tú ves esto</small>
                  <pre>{x.texto}</pre>
                  <button type="button" aria-label="Ocultar" onClick={() => setSistema((l) => l.filter((y) => y.id !== x.id))}>
                    ×
                  </button>
                </div>
              ))}
          </div>

          {enDm && bloqueado ? (
            <p className="chat-aviso chat-bloq">Bloqueaste a {dm!.nombre}. Desbloquéalo para volver a escribirle.</p>
          ) : (
            <div className="chat-comp">
              {panel && (
                <div className="chat-panel" role="dialog" aria-label="Emoticones">
                  <div className="chat-packs" role="tablist">
                    {PACKS.map((p) => (
                      <button key={p.clave} type="button" role="tab" aria-selected={pack === p.clave} className={`${pack === p.clave ? "on " : ""}pk-${p.clave}`} onClick={() => { setPack(p.clave); setVista(null); }}>
                        {!puedeUsarPack(miPlan, p.clave) && <Icon nombre="lock" size={13} />} {p.nombre}
                      </button>
                    ))}
                  </div>
                  {!libre && venta && (() => {
                    const claveV = vista && vista.startsWith(`${pack}:`) ? vista : `${pack}:${packActual?.items[0] ?? ""}`;
                    const nombreV = NOMBRES[claveV.split(":")[1] ?? ""] ?? "";
                    return (
                      <div className={`chat-vista vista-${pack}`}>
                        <Sticker clave={claveV} tam={84} />
                        <b>{nombreV}</b>
                        <small>Exclusivo {pack === "vip" ? "VIP" : "Pro"} · lo ven todos en el chat</small>
                        <p className="chat-vista-t">{venta.titulo}</p>
                        {esDueno ? (
                          <Link className="btn btn-primario" to="/panel/plan">
                            Pasarme a {pack === "vip" ? "VIP" : "Pro"}
                          </Link>
                        ) : (
                          <small>Pídele al dueño de tu barbería que active el plan {pack === "vip" ? "VIP" : "Pro"}.</small>
                        )}
                      </div>
                    );
                  })()}
                  <div className="chat-stickers">
                    {packActual?.items.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={libre ? "" : "bloq"}
                        aria-label={NOMBRES[n] ?? n}
                        title={NOMBRES[n] ?? n}
                        onClick={() => (libre ? (setStickerSel(`${pack}:${n}`), setPanel(false), entradaRef.current?.focus()) : setVista(`${pack}:${n}`))}
                      >
                        <Sticker clave={`${pack}:${n}`} tam={34} />
                        {!libre && <i className="cand" aria-hidden="true"><Icon nombre="lock" size={11} /></i>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {pendiente && (
                <div className="chat-confirma" role="alertdialog">
                  <span>{pendiente.texto}</span>
                  <div>
                    <button type="button" className="btn btn-chico" onClick={() => setPendiente(null)}>
                      Cancelar
                    </button>
                    <button type="button" className="btn btn-primario btn-chico peligro" disabled={ocupado} onClick={() => void correr(pendiente.linea, true)}>
                      Confirmar
                    </button>
                  </div>
                </div>
              )}
              {sugerencias.length > 0 && (
                <div className="chat-sug" role="listbox" aria-label="Comandos">
                  {sugerencias.map((c) => (
                    <button key={c.c} type="button" role="option" onClick={() => { setTexto(c.c + " "); entradaRef.current?.focus(); }}>
                      <b>{c.uso}</b>
                      <small>{c.que}</small>
                    </button>
                  ))}
                </div>
              )}
              {congeladoParaMi && <p className="chat-nota-c">El chat está congelado por un administrador. Vuelve a intentar en un rato.</p>}
              <form className="chat-form" onSubmit={alEnviar}>
                <button type="button" className="chat-emo" aria-label="Emoticones" aria-expanded={panel} onClick={() => setPanel(!panel)}>
                  <Icon nombre="smile" size={22} />
                </button>
                {stickerSel && (
                  <span className="chat-chip">
                    <Sticker clave={stickerSel} tam={28} />
                    <button type="button" aria-label="Quitar emoticón" onClick={() => setStickerSel(null)}>
                      ×
                    </button>
                  </span>
                )}
                <input
                  ref={entradaRef}
                  value={texto}
                  maxLength={500}
                  disabled={congeladoParaMi}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder={enDm ? `Mensaje privado a ${dm!.nombre}…` : soyAdmin ? "Escribe un mensaje o un comando (!ayuda)…" : "Escribe un mensaje…"}
                  aria-label="Mensaje"
                  autoComplete="off"
                />
                <button className="chat-enviar" disabled={ocupado || congeladoParaMi || (!texto.trim() && !stickerSel)} aria-label="Enviar">
                  <Icon nombre="send" size={20} />
                </button>
              </form>
            </div>
          )}
        </div>
        <aside className="chat-lat">{lateral}</aside>
      </div>

      {ficha && (
        <Hoja titulo={ficha.nombre} onCerrar={() => setFicha(null)}>
          <div className="chat-ficha">
            <Avatar iniciales={iniciales(ficha.nombre)} foto={urlFoto(ficha.avatar)} rojo={ficha.rol === "superadmin"} plan={ficha.plan} grande />
            <h3 className={claseC(ficha)}>{ficha.nombre}</h3>
            <p className="chat-ficha-rol">
              <Peon tipo={tipoPeon(ficha)} /> {etiquetaGrupo(ficha)}
            </p>
            {ficha.rol !== "superadmin" && ficha.barberia && <p className="suave">{ficha.barberia}</p>}
            {soyAdmin && ficha.id !== miId && (
              <div className="chat-mod">
                <small>Moderación</small>
                <div>
                  {[[10, "10 min"], [60, "1 hora"], [1440, "1 día"]].map(([m, t]) => (
                    <button key={m} type="button" className="btn btn-borde btn-chico" onClick={() => void moderar(() => silenciarChat(ficha.id, m as number), `${ficha.nombre} silenciado ${t}`)}>
                      Silenciar {t}
                    </button>
                  ))}
                </div>
                <div>
                  {sanc?.silenciados.some((x) => x.id === ficha.id) && (
                    <button type="button" className="btn btn-borde btn-chico" onClick={() => void moderar(() => silenciarChat(ficha.id, 0), "Ya puede escribir")}>
                      Quitar silencio
                    </button>
                  )}
                  {sanc?.baneados.some((x) => x.id === ficha.id) ? (
                    <button type="button" className="btn btn-borde btn-chico" onClick={() => void moderar(() => baneoChat(ficha.id, false), "Desbaneado")}>
                      Quitar baneo
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primario btn-chico peligro" onClick={() => void moderar(() => baneoChat(ficha.id, true), `${ficha.nombre} baneado`)}>
                      Banear
                    </button>
                  )}
                </div>
              </div>
            )}
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
      {moderando && (
        <Hoja titulo="Moderación" onCerrar={() => setModerando(false)}>
          <div className="chat-bandeja">
            <h3 className="chat-mod-t">Silenciados</h3>
            {sanc && sanc.silenciados.length === 0 && <p className="chat-vacio">Nadie silenciado.</p>}
            {sanc?.silenciados.map((x) => (
              <div key={x.id} className="chat-fila">
                <span className="chat-fila-t">
                  <b>{x.nombre}</b>
                  <small>Hasta las {hora(x.hasta)}</small>
                </span>
                <button type="button" className="btn btn-borde btn-chico" onClick={() => void moderar(() => silenciarChat(x.id, 0), "Ya puede escribir")}>
                  Quitar
                </button>
              </div>
            ))}
            <h3 className="chat-mod-t">Baneados</h3>
            {sanc && sanc.baneados.length === 0 && <p className="chat-vacio">Nadie baneado.</p>}
            {sanc?.baneados.map((x) => (
              <div key={x.id} className="chat-fila">
                <span className="chat-fila-t">
                  <b>{x.nombre}</b>
                  <small>{x.motivo || "Sin motivo"}</small>
                </span>
                <button type="button" className="btn btn-borde btn-chico" onClick={() => void moderar(() => baneoChat(x.id, false), "Desbaneado")}>
                  Quitar
                </button>
              </div>
            ))}
            <p className="suave chat-lat-nota">También puedes usar comandos: escribe !ayuda en el chat.</p>
          </div>
        </Hoja>
      )}
      {historial && (
        <Hoja titulo="Mis chats privados" onCerrar={() => setHistorial(false)}>
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
        </Hoja>
      )}
    </div>
  );
}
