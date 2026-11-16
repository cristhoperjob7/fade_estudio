import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

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
};

/** Packs de emoticones animados. Cada plan desbloquea los de su nivel y los anteriores. */
export const PACKS: { clave: PlanChat; nombre: string; items: string[] }[] = [
  { clave: "basico", nombre: "Básicos", items: ["risa", "mano", "tijera", "fuego"] },
  { clave: "pro", nombre: "Pro", items: ["copa", "maquina", "dinero", "navaja"] },
  { clave: "vip", nombre: "VIP", items: ["corona", "brillo", "diamante", "cohete"] },
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
export function useChat(sala: string, miId: string | undefined) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enLinea, setEnLinea] = useState(0);
  const [fijado, setFijado] = useState("");

  const cargarFijado = useCallback(async () => {
    const { data } = await supabase.from("chat_fijados").select("texto").eq("sala", sala).maybeSingle();
    setFijado((data as { texto: string } | null)?.texto ?? "");
  }, [sala]);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setMensajes([]);
    setEnLinea(0);
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
    void cargarFijado();

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
      .on("presence", { event: "sync" }, () => setEnLinea(Object.keys(canal.presenceState()).length))
      .subscribe((estado) => {
        if (estado === "SUBSCRIBED") void canal.track({ desde: Date.now() });
      });
    return () => {
      vivo = false;
      void supabase.removeChannel(canal);
    };
  }, [sala, miId, cargarFijado]);

  /** Devuelve el motivo si no se pudo enviar. */
  const enviar = useCallback(
    async (texto: string, sticker: string | null): Promise<string> => {
      const { error } = await supabase.rpc("chat_enviar", { p_sala: sala, p_texto: texto, p_sticker: sticker });
      return error ? error.message : "";
    },
    [sala],
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

  return { mensajes, cargando, enLinea, fijado, enviar, borrar, silenciar, fijar };
}
