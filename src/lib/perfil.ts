import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export type MiPerfil = {
  rol: "dueno" | "barbero" | "superadmin";
  nombre: string;
  apellidos: string;
  telefono: string;
  correo: string;
  edad: number | null;
  avatar_path: string | null;
  sexo?: "masculino" | "femenino" | null;
  region?: string;
  comuna?: string;
  /** Solo viene después de ejecutar paso29; si falta, no se bloquea a nadie. */
  completo?: boolean;
};

const EVENTO = "fs-perfil-cambio";

/** Dirección pública de una foto guardada en el bucket «avatares». */
export function urlFoto(path: string | null | undefined, version?: number): string | null {
  if (!path) return null;
  const base = supabase.storage.from("avatares").getPublicUrl(path).data.publicUrl;
  return version ? `${base}?v=${version}` : base;
}

/** Mis datos personales (dueño, barbero o superadmin). Se actualiza solo al guardar. */
export function useMiPerfil(activo = true) {
  const [datos, setDatos] = useState<MiPerfil | null>(null);
  const [version, setVersion] = useState(0);

  const cargar = useCallback(async () => {
    const { data } = await supabase.rpc("mi_perfil_datos");
    setDatos((data as MiPerfil | null) ?? null);
    setVersion(Date.now());
  }, []);

  useEffect(() => {
    if (!activo) return;
    void cargar();
    const alCambiar = () => void cargar();
    window.addEventListener(EVENTO, alCambiar);
    return () => window.removeEventListener(EVENTO, alCambiar);
  }, [activo, cargar]);

  return { datos, version, foto: urlFoto(datos?.avatar_path, version) };
}

export function avisarCambioPerfil() {
  window.dispatchEvent(new Event(EVENTO));
}

export async function guardarDatos(d: { nombre: string; apellidos: string; telefono: string; edad: number | null }) {
  const { error } = await supabase.rpc("guardar_mi_perfil", {
    p_nombre: d.nombre,
    p_apellidos: d.apellidos,
    p_telefono: d.telefono,
    p_edad: d.edad,
  });
  if (error) throw new Error(error.message);
  avisarCambioPerfil();
}

/** Guarda todos los datos personales (la base vuelve a validar cada campo). */
export async function guardarDatosCompletos(d: { nombre: string; apellidos: string; celular: string; sexo: string; region: string; comuna: string; edad: number }) {
  const { error } = await supabase.rpc("guardar_mi_perfil_completo", {
    p_nombre: d.nombre,
    p_apellidos: d.apellidos,
    p_celular: d.celular,
    p_sexo: d.sexo,
    p_region: d.region,
    p_comuna: d.comuna,
    p_edad: d.edad,
  });
  if (error) throw new Error(error.message);
  avisarCambioPerfil();
}

/** Achica la foto a un cuadrado de 512 px (JPG) para que pese poco. */
async function achicar(archivo: File): Promise<Blob> {
  const bmp = await createImageBitmap(archivo);
  const lado = Math.min(bmp.width, bmp.height);
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 512;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la foto");
  ctx.drawImage(bmp, (bmp.width - lado) / 2, (bmp.height - lado) / 2, lado, lado, 0, 0, 512, 512);
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo leer la foto"))), "image/jpeg", 0.85));
}

export async function subirFoto(archivo: File, anterior: string | null) {
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) throw new Error("Usa una foto JPG, PNG o WEBP");
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) throw new Error("Tu sesión expiró");
  const blob = await achicar(archivo);
  const path = `${uid}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("avatares").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw new Error("No se pudo subir la foto");
  const r = await supabase.rpc("guardar_mi_foto", { p_path: path });
  if (r.error) throw new Error(r.error.message);
  if (anterior) void supabase.storage.from("avatares").remove([anterior]);
  avisarCambioPerfil();
}

export async function quitarFoto(anterior: string | null) {
  const r = await supabase.rpc("guardar_mi_foto", { p_path: null });
  if (r.error) throw new Error(r.error.message);
  if (anterior) void supabase.storage.from("avatares").remove([anterior]);
  avisarCambioPerfil();
}
