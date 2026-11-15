import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { BarberiaInfo, Perfil } from "./types";

const CAMPOS = "id,barberia_id,rol,nombre,iniciales,correo,telefono,comision_pct,activo,atiende";

type Contexto = {
  cargando: boolean;
  sesion: Session | null;
  /** null si no hay sesión, o si el usuario existe pero no es personal activo */
  perfil: Perfil | null;
  /** true si es administrador de Fade Studio (no pertenece a ninguna barbería) */
  esAdmin: boolean;
  /** barbería del personal (con su estado de suscripción); null para el superadmin */
  barberia: BarberiaInfo | null;
  /** tipo: desde qué pestaña del acceso se entra (barbero o administración) */
  iniciarSesion: (correo: string, clave: string, tipo?: TipoAcceso) => Promise<string>;
  cerrarSesion: () => Promise<void>;
};

export type TipoAcceso = "barbero" | "admin";

const Auth = createContext<Contexto | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [barberia, setBarberia] = useState<BarberiaInfo | null>(null);
  const [cargando, setCargando] = useState(true);

  /** Lee quién es la persona de la sesión, sin tocar el estado. */
  const leer = useCallback(async (s: Session) => {
    const [{ data }, { data: admin }] = await Promise.all([
      supabase.from("perfiles").select(CAMPOS).eq("id", s.user.id).maybeSingle(),
      supabase.rpc("soy_superadmin"),
    ]);
    const p = data as Perfil | null;
    const activo = p && p.activo ? p : null;
    let info: BarberiaInfo | null = null;
    if (activo) {
      const r = await supabase.rpc("mi_barberia_info");
      info = (r.data as BarberiaInfo | null) ?? null;
    }
    return { perfil: activo, esAdmin: admin === true, barberia: info };
  }, []);

  const aplicar = useCallback((r: { perfil: Perfil | null; esAdmin: boolean; barberia: BarberiaInfo | null } | null) => {
    setPerfil(r?.perfil ?? null);
    setEsAdmin(r?.esAdmin ?? false);
    setBarberia(r?.barberia ?? null);
  }, []);

  const cargarPerfil = useCallback(
    async (s: Session | null) => {
      aplicar(s ? await leer(s) : null);
    },
    [leer, aplicar],
  );

  // Mientras se inicia sesión a mano, el aviso automático de Supabase no debe adelantarse.
  const entrando = useRef(false);

  useEffect(() => {
    let vivo = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return;
      setSesion(data.session);
      await cargarPerfil(data.session);
      if (vivo) setCargando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      if (entrando.current) return;
      setSesion(s);
      // Se difiere para no llamar a Supabase dentro de su propio callback.
      window.setTimeout(() => {
        void cargarPerfil(s);
      }, 0);
    });
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [cargarPerfil]);

  const iniciarSesion = useCallback(
    async (correo: string, clave: string, tipo?: TipoAcceso): Promise<string> => {
      entrando.current = true;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
        if (error || !data.session) {
          return error?.message.toLowerCase().includes("invalid")
            ? "Correo o clave incorrectos."
            : "No pudimos iniciar sesión. Intenta de nuevo.";
        }
        const r = await leer(data.session);
        const esBarbero = r.perfil?.rol === "barbero";
        const esAdministracion = r.esAdmin || r.perfil?.rol === "dueno";
        if (tipo === "barbero" && !esBarbero && esAdministracion) {
          await supabase.auth.signOut();
          return "Esta cuenta es de administración. Entra por la pestaña Administración.";
        }
        if (tipo === "admin" && !esAdministracion && esBarbero) {
          await supabase.auth.signOut();
          return "Esta cuenta es de barbero. Entra por la pestaña Barbero.";
        }
        setSesion(data.session);
        aplicar(r);
        return "";
      } finally {
        entrando.current = false;
      }
    },
    [leer, aplicar],
  );

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut();
    setSesion(null);
    setPerfil(null);
    setEsAdmin(false);
    setBarberia(null);
  }, []);

  const valor = useMemo(
    () => ({ cargando, sesion, perfil, esAdmin, barberia, iniciarSesion, cerrarSesion }),
    [cargando, sesion, perfil, esAdmin, barberia, iniciarSesion, cerrarSesion],
  );
  return <Auth.Provider value={valor}>{children}</Auth.Provider>;
}

export function useAuth(): Contexto {
  const c = useContext(Auth);
  if (!c) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return c;
}
