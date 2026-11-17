import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { ITEMS } from "./stickers";

export type Sala = { clave: string; nombre: string };
export type PlanChat = "basico" | "pro" | "vip";
export type Mensaje = {
  id: number;
  sala: string;
  autor_id: string;
  autor_nombre: string;
  autor_rol: "superadmin" | "dueno" | "barbero";
  autor_plan: PlanChat;
  autor_barberia: string;
  autor_avatar: string | null;
  texto: string;
  sticker: string | null;
  borrado: boolean;
  creado_en: string;
  destinatario_id?: string | null;
  /** Mensaje destacado del administrador (anuncio o «chat limpiado»). */
  anuncio?: boolean;
};

/** Persona conectada (o con la que tengo un chat privado). */
export type Conectado = {
  id: string;
  nombre: string;
  rol: "superadmin" | "dueno" | "barbero";
  plan: PlanChat;
  barberia: string;
  avatar: string | null;
  /** Si acepta mensajes privados (lo decide cada persona en Mi perfil → Chat). */
  privados?: boolean;
};
export type Privado = Conectado & { sala: string; ultimo: string; ultimo_en: string; no_leidos: number };

/** Nombre de la sala privada entre dos personas (siempre el mismo, sin importar quién escribe primero). */
export const salaPrivada = (a: string, b: string) => `dm:${a < b ? a : b}:${a < b ? b : a}`;
const EVENTO_LEIDO = "fs-chat-leido";
/** Nombre único por suscripción: dos partes de la app pueden escuchar lo mismo sin chocar. */
const unico = (base: string) => `${base}:${Math.random().toString(36).slice(2, 8)}`;

/** Packs de emoticones animados. Cada plan desbloquea los de su nivel y los anteriores. */
export const PACKS: { clave: PlanChat; nombre: string; items: string[] }[] = [
  { clave: "basico", nombre: "Principiante", items: ITEMS.basico },
  { clave: "pro", nombre: "Pro", items: ITEMS.pro },
  { clave: "vip", nombre: "VIP", items: ITEMS.vip },
];
const NIVEL: Record<PlanChat, number> = { basico: 0, pro: 1, vip: 2 };
export const puedeUsarPack = (plan: PlanChat, pack: PlanChat) => NIVEL[plan] >= NIVEL[pack];

/** Salas a las que puedo entrar: la general y la de mi comuna. */
export function useSalas(): Sala[] | null {
  const [salas, setSalas] = useState<Sala[] | null>(null);
  useEffect(() => {
    void supabase.rpc("chat_mis_salas").then(({ data }) => setSalas((data as Sala[] | null) ?? []));
  }, []);
  return salas;
}

const LIMITE = 80;

/** Mensajes de una sala en vivo, con quiénes están conectados y el mensaje fijado. */
export function useChat(sala: string | null, yo: Conectado | null, destinatario?: string) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [conectados, setConectados] = useState<Conectado[]>([]);
  const [fijado, setFijado] = useState("");

  const cargarFijado = useCallback(async () => {
    if (!sala) return;
    const { data } = await supabase.from("chat_fijados").select("texto").eq("sala", sala).maybeSingle();
    setFijado((data as { texto: string } | null)?.texto ?? "");
  }, [sala]);

  const yoRef = useRef(yo);
  yoRef.current = yo;
  const canalRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const miId = yo?.id;

  useEffect(() => {
    let vivo = true;
    setMensajes([]);
    setConectados([]);
    if (!sala) {
      setCargando(false);
      return;
    }
    setCargando(true);
    void supabase
      .from("chat_mensajes")
      .select("*")
      .eq("sala", sala)
      .order("id", { ascending: false })
      .limit(LIMITE)
      .then(({ data }) => {
        if (!vivo) return;
        setMensajes(((data as Mensaje[] | null) ?? []).reverse());
        setCargando(false);
      });
    if (!sala.startsWith("dm:")) void cargarFijado();
    else setFijado("");

    const canal = supabase.channel(`chat:${sala}`, { config: { presence: { key: miId ?? "anon" } } });
    canal
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensajes", filter: `sala=eq.${sala}` }, (p) => {
        const n = p.new as Mensaje;
        setMensajes((m) => (m.some((x) => x.id === n.id) ? m : [...m, n].slice(-200)));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_mensajes", filter: `sala=eq.${sala}` }, (p) => {
        const n = p.new as Mensaje;
        setMensajes((m) => m.map((x) => (x.id === n.id ? n : x)));
      })
      .on("presence", { event: "sync" }, () => {
        const estado = canal.presenceState() as Record<string, Conectado[]>;
        setConectados(
          Object.values(estado)
            .map((v) => v[0])
            .filter((c): c is Conectado => !!c && typeof c.id === "string"),
        );
      })
      .subscribe((estado) => {
        if (estado === "SUBSCRIBED" && yoRef.current) void canal.track(yoRef.current);
      });
    canalRef.current = canal;
    return () => {
      vivo = false;
      canalRef.current = null;
      void supabase.removeChannel(canal);
    };
  }, [sala, miId, cargarFijado]);

  // Si mis datos llegan después de entrar a la sala, se avisan a los demás.
  useEffect(() => {
    if (yo && canalRef.current) void canalRef.current.track(yo);
  }, [yo]);

  /** Devuelve el motivo si no se pudo enviar. */
  const enviar = useCallback(
    async (texto: string, sticker: string | null): Promise<string> => {
      const { error } = destinatario
        ? await supabase.rpc("chat_enviar_privado", { p_destinatario: destinatario, p_texto: texto, p_sticker: sticker })
        : await supabase.rpc("chat_enviar", { p_sala: sala ?? "general", p_texto: texto, p_sticker: sticker });
      return error ? error.message : "";
    },
    [sala, destinatario],
  );
  const borrar = useCallback(async (id: number) => {
    await supabase.rpc("chat_borrar", { p_id: id });
  }, []);
  const silenciar = useCallback(async (usuario: string, minutos: number): Promise<string> => {
    const { error } = await supabase.rpc("chat_silenciar", { p_usuario: usuario, p_minutos: minutos });
    return error ? error.message : "";
  }, []);
  const fijar = useCallback(
    async (texto: string): Promise<string> => {
      const { error } = await supabase.rpc("chat_fijar", { p_sala: sala, p_texto: texto });
      if (!error) await cargarFijado();
      return error ? error.message : "";
    },
    [sala, cargarFijado],
  );

  return { mensajes, cargando, conectados, enLinea: conectados.length, fijado, enviar, borrar, silenciar, fijar };
}

/** Mis conversaciones privadas. Se actualizan solas cuando llega un mensaje. */
export function usePrivados(miId: string | undefined) {
  const [lista, setLista] = useState<Privado[]>([]);
  const cargar = useCallback(async () => {
    const { data } = await supabase.rpc("chat_mis_privados");
    setLista((data as Privado[] | null) ?? []);
  }, []);
  useEffect(() => {
    if (!miId) return;
    void cargar();
    const canal = supabase.channel(unico(`chat-privados:${miId}`));
    canal.on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensajes", filter: `destinatario_id=eq.${miId}` }, () => void cargar()).subscribe();
    const alLeer = () => void cargar();
    window.addEventListener(EVENTO_LEIDO, alLeer);
    return () => {
      window.removeEventListener(EVENTO_LEIDO, alLeer);
      void supabase.removeChannel(canal);
    };
  }, [miId, cargar]);
  return { lista, recargar: cargar, sinLeer: lista.reduce((t, p) => t + p.no_leidos, 0) };
}

/** Marca como leída una conversación y avisa al resto de la app. */
export async function marcarLeido(sala: string) {
  await supabase.rpc("chat_marcar_leido", { p_sala: sala });
  window.dispatchEvent(new Event(EVENTO_LEIDO));
}

/** Cantidad de mensajes privados sin leer (para la insignia del menú). */
export function useNoLeidos(miId: string | undefined): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!miId) return;
    const contar = () => void supabase.rpc("chat_no_leidos").then(({ data }) => setN(Number(data ?? 0)));
    contar();
    const canal = supabase.channel(unico(`chat-no-leidos:${miId}`));
    canal.on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_mensajes", filter: `destinatario_id=eq.${miId}` }, contar).subscribe();
    window.addEventListener(EVENTO_LEIDO, contar);
    return () => {
      window.removeEventListener(EVENTO_LEIDO, contar);
      void supabase.removeChannel(canal);
    };
  }, [miId]);
  return n;
}

/** Personas que bloqueé. */
export function useBloqueados() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    void supabase.rpc("chat_mis_bloqueados").then(({ data }) => setIds((data as string[] | null) ?? []));
  }, []);
  const cambiar = useCallback(async (id: string, bloquear: boolean): Promise<string> => {
    const { error } = await supabase.rpc("chat_bloquear", { p_usuario: id, p_bloquear: bloquear });
    if (error) return error.message;
    setIds((x) => (bloquear ? [...x, id] : x.filter((y) => y !== id)));
    return "";
  }, []);
  return { ids, cambiar };
}

/** Mi ajuste: ¿acepto mensajes privados? */
export function useAjusteChat() {
  const [privados, setPrivados] = useState<boolean | null>(null);
  useEffect(() => {
    void supabase.rpc("chat_mi_ajuste").then(({ data }) => setPrivados(data !== false));
  }, []);
  const guardar = useCallback(async (valor: boolean): Promise<string> => {
    const { error } = await supabase.rpc("chat_guardar_ajuste", { p_privados: valor });
    if (error) return error.message;
    setPrivados(valor);
    return "";
  }, []);
  return { privados, guardar };
}

/** Estado general del chat para mí: baneo, sala congelada, modo lento y expulsión. Se revisa cada pocos segundos. */
export type EstadoChat = { baneado: boolean; motivo: string; congelado: boolean; lento: number; expulsadoDesde: number | null };
export function useEstadoChat(activo = true) {
  const [est, setEst] = useState<EstadoChat>({ baneado: false, motivo: "", congelado: false, lento: 0, expulsadoDesde: null });
  const [listo, setListo] = useState(false);
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    const leer = () =>
      void supabase.rpc("chat_mi_estado").then(({ data }) => {
        if (!vivo || !data) return;
        const d = data as { baneado: boolean; motivo: string; congelado: boolean; lento: number; expulsado_desde: number | null };
        setEst({ baneado: !!d.baneado, motivo: d.motivo ?? "", congelado: !!d.congelado, lento: d.lento ?? 0, expulsadoDesde: d.expulsado_desde });
        setListo(true);
      });
    leer();
    const t = window.setInterval(leer, 10000);
    return () => {
      vivo = false;
      window.clearInterval(t);
    };
  }, [activo]);
  return { ...est, listo };
}

export type RespuestaComando = { ok: boolean; texto: string; confirmar?: boolean };
/** Solo el superadmin: el servidor valida; a cualquier otra persona le responde «No autorizado». */
export async function comandoChat(linea: string, confirmar = false): Promise<RespuestaComando> {
  const { data, error } = await supabase.rpc("chat_comando", { p_linea: linea, p_confirmar: confirmar });
  if (error) return { ok: false, texto: error.message };
  return data as RespuestaComando;
}

export type Sancionados = {
  silenciados: { id: string; nombre: string; hasta: string }[];
  baneados: { id: string; nombre: string; motivo: string }[];
};
export async function listarSancionados(): Promise<Sancionados> {
  const { data } = await supabase.rpc("chat_sancionados");
  const d = (data as Sancionados | null) ?? { silenciados: [], baneados: [] };
  return { silenciados: d.silenciados ?? [], baneados: d.baneados ?? [] };
}
export async function baneoChat(id: string, banear: boolean, motivo = ""): Promise<string | null> {
  const { error } = await supabase.rpc("chat_baneo", { p_usuario: id, p_banear: banear, p_motivo: motivo });
  return error ? error.message : null;
}
export async function silenciarChat(id: string, minutos: number): Promise<string | null> {
  const { error } = await supabase.rpc("chat_silenciar", { p_usuario: id, p_minutos: minutos });
  return error ? error.message : null;
}

/** Comandos que se sugieren al escribir «!» + 2 letras (solo superadmin). */
export const COMANDOS: { c: string; uso: string; que: string }[] = [
  { c: "!ayuda", uso: "!ayuda", que: "Lista de comandos" },
  { c: "!cls", uso: "!cls · !cls 20 · !cls @nombre", que: "Limpia el chat" },
  { c: "!silenciar", uso: "!silenciar @nombre min", que: "Silencia a alguien" },
  { c: "!voz", uso: "!voz @nombre", que: "Quita el silencio" },
  { c: "!ban", uso: "!ban @nombre motivo", que: "Banea del chat" },
  { c: "!unban", uso: "!unban @nombre", que: "Quita el baneo" },
  { c: "!kick", uso: "!kick @nombre", que: "Saca del chat" },
  { c: "!sancionados", uso: "!sancionados", que: "Silenciados y baneados" },
  { c: "!info", uso: "!info @nombre", que: "Datos de la persona" },
  { c: "!fijar", uso: "!fijar texto", que: "Fija un aviso" },
  { c: "!desfijar", uso: "!desfijar", que: "Quita el aviso fijado" },
  { c: "!anuncio", uso: "!anuncio texto", que: "Mensaje destacado" },
  { c: "!lento", uso: "!lento seg", que: "Modo lento (0 lo apaga)" },
  { c: "!congelar", uso: "!congelar", que: "Solo escribe ADM" },
  { c: "!abrir", uso: "!abrir", que: "Reabre el chat" },
  { c: "!estado", uso: "!estado", que: "Estado del chat" },
  { c: "!registro", uso: "!registro", que: "Últimas acciones" },
];
