import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  iniciarSesion: (correo: string, clave: string) => Promise<string>;
  cerrarSesion: () => Promise<void>;
};

const Auth = createContext<Contexto | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [barberia, setBarberia] = useState<BarberiaInfo | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarPerfil = useCallback(async (s: Session | null) => {
    if (!s) {
      setPerfil(null);
      setEsAdmin(false);
      setBarberia(null);
      return;
    }
    const [{ data }, { data: admin }] = await Promise.all([
      supabase.from("perfiles").select(CAMPOS).eq("id", s.user.id).maybeSingle(),
      supabase.rpc("soy_superadmin"),
    ]);
    const p = data as Perfil | null;
    const activo = p && p.activo ? p : null;
    setEsAdmin(admin === true);
    setPerfil(activo);
    if (activo) {
      const { data: info } = await supabase.rpc("mi_barberia_info");
      setBarberia((info as BarberiaInfo | null) ?? null);
    } else {
      setBarberia(null);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return;
      setSesion(data.session);
      await cargarPerfil(data.session);
      if (vivo) setCargando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
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
    async (correo: string, clave: string): Promise<string> => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
      if (error) {
        return error.message.toLowerCase().includes("invalid")
          ? "Correo o clave incorrectos."
          : "No pudimos iniciar sesión. Intenta de nuevo.";
      }
      setSesion(data.session);
      await cargarPerfil(data.session);
      return "";
    },
    [cargarPerfil],
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
