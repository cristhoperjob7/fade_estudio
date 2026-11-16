import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { configurado, supabase } from "./supabase";
import type { Servicio } from "./types";
import { PAGINAS_A_MEDIDA } from "../pages/publico/personalizadas";

export type AjustesPublicos = {
  nombre: string;
  direccion: string;
  whatsapp: string;
  hora_apertura: number;
  hora_cierre: number;
  dias_agenda: number;
  tolerancia_min: number;
};

export type PlanClave = "basico" | "pro" | "vip";
export type PaginaPro = { descripcion: string; logo_path: string | null; portada_path: string | null; fotos: string[] };

export type DatosPublicos = AjustesPublicos & {
  slug: string;
  region?: string;
  comuna?: string;
  plan?: PlanClave;
  /** Plantilla editable (solo Pro y VIP). null si todavía no la personalizó. */
  pagina?: PaginaPro | null;
  /** false si la suscripción de la barbería está vencida o suspendida */
  activa: boolean;
  servicios: Servicio[];
};

/** Mientras cargan (o si falta la conexión) se muestra vacío: nunca datos de otra barbería. */
export const AJUSTES_BASE: AjustesPublicos = {
  nombre: "",
  direccion: "",
  whatsapp: "",
  hora_apertura: 600,
  hora_cierre: 1200,
  dias_agenda: 15,
  tolerancia_min: 15,
};

/** Barbería que se muestra en la raíz del sitio (variable VITE_BARBERIA_POR_DEFECTO). Vacío = página de Fade Studio. */
export const SLUG_DEFECTO = ((import.meta.env.VITE_BARBERIA_POR_DEFECTO as string | undefined) ?? "").trim().toLowerCase();

/** Dirección pública de una imagen de la página (logo o portada). */
export function urlPagina(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from("paginas").getPublicUrl(path).data.publicUrl;
}

/** ¿Se muestra la plantilla Pro? (plan Pro, o VIP que todavía no tiene su página a medida) */
export function useEsPlantilla(): boolean {
  const slug = useSlug();
  const { datos } = useBarberiaPublica();
  if (!datos?.plan || datos.plan === "basico") return false;
  return datos.plan === "pro" || !PAGINAS_A_MEDIDA[slug];
}

/** La plantilla Pro es en blanco y negro: acento blanco con texto negro. */
export function useTemaPublico(): CSSProperties | undefined {
  const plantilla = useEsPlantilla();
  if (!plantilla) return undefined;
  return { "--blue": "#ffffff", "--gold": "#ffffff", "--acento": "#ffffff", "--on-acento": "#000000" } as CSSProperties;
}

/** Dirección de la barbería: /b/<slug>/..., o la de por defecto cuando se entra por la raíz. */
export function useSlug(): string {
  const { slug } = useParams();
  return (slug ?? SLUG_DEFECTO).toLowerCase();
}

/** Rutas públicas de la barbería actual. */
export function useRutas() {
  const { slug } = useParams();
  const base = slug ? `/b/${slug}` : "";
  return {
    inicio: base || "/",
    reservar: `${base}/reservar`,
    reserva: (codigo: string, token: string) => `${base}/reserva/${codigo}?t=${token}`,
  };
}

export type EstadoPublico = "cargando" | "ok" | "no_existe" | "error";

const cache = new Map<string, DatosPublicos>();

/** Datos públicos de la barbería (nombre, horario, servicios y si está recibiendo reservas). */
export function useBarberiaPublica(): { datos: DatosPublicos | null; estado: EstadoPublico; aj: AjustesPublicos } {
  const slug = useSlug();
  const [datos, setDatos] = useState<DatosPublicos | null>(cache.get(slug) ?? null);
  const [estado, setEstado] = useState<EstadoPublico>(cache.has(slug) ? "ok" : "cargando");

  useEffect(() => {
    const previo = cache.get(slug) ?? null;
    setDatos(previo);
    setEstado(previo ? "ok" : "cargando");
    if (!slug) {
      setEstado("no_existe");
      return;
    }
    if (!configurado) {
      setEstado("error");
      return;
    }
    let vivo = true;
    supabase.rpc("datos_publicos", { p_slug: slug }).then(({ data, error }) => {
      if (!vivo) return;
      if (error) return setEstado((e) => (e === "ok" ? e : "error"));
      if (!data) return setEstado("no_existe");
      const d = data as DatosPublicos;
      cache.set(slug, d);
      setDatos(d);
      setEstado("ok");
    });
    return () => {
      vivo = false;
    };
  }, [slug]);

  return { datos, estado, aj: datos ?? AJUSTES_BASE };
}

/** Atajo: solo los ajustes públicos. */
export function useAjustesPublicos(): AjustesPublicos {
  return useBarberiaPublica().aj;
}

/** Barberías que tienen su propia marca (logo y fotos) cargada en el sitio. El resto usa la plantilla neutra. */
const CON_MARCA_PROPIA = new Set(["barber-studio-593", SLUG_DEFECTO].filter(Boolean));
export function useMarcaPropia(): boolean {
  return CON_MARCA_PROPIA.has(useSlug());
}
