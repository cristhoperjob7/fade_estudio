import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { urlPagina } from "../lib/publico";
import type { PaginaPro } from "../lib/publico";
import { useToast } from "./Toast";

const SOPORTE = ((import.meta.env.VITE_SOPORTE_WHATSAPP as string | undefined) ?? "").replace(/\D/g, "");
const COLORES = ["#C8A26A", "#2563EB", "#1F8A5B", "#C0392B", "#8E5BD9", "#E07B39", "#D9A441", "#E4E4E7"];
const VACIA: PaginaPro = { descripcion: "", color: "#C8A26A", logo_path: null, portada_path: null };

/** Reduce la foto al tamaño que se necesita (JPG) para que cargue rápido. */
async function preparar(archivo: File, ancho: number, alto: number): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) throw new Error("Usa una foto JPG, PNG o WEBP");
  const bmp = await createImageBitmap(archivo);
  const k = Math.max(ancho / bmp.width, alto / bmp.height);
  const w = ancho / k;
  const h = alto / k;
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la foto");
  ctx.drawImage(bmp, (bmp.width - w) / 2, (bmp.height - h) / 2, w, h, 0, 0, ancho, alto);
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo leer la foto"))), "image/jpeg", 0.85));
}

/** Ajustes → Mi página: logo, portada, color y descripción de la plantilla (Pro y VIP). */
export default function MiPagina({ onGuardado }: { onGuardado?: (resumen: string) => void }) {
  const { barberia } = useAuth();
  const avisar = useToast();
  const [guardada, setGuardada] = useState<PaginaPro>(VACIA);
  const [borrador, setBorrador] = useState<PaginaPro>(VACIA);
  const [editando, setEditando] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [trabajando, setTrabajando] = useState("");
  const entLogo = useRef<HTMLInputElement>(null);
  const entPortada = useRef<HTMLInputElement>(null);
  const plan = barberia?.plan ?? "basico";

  useEffect(() => {
    if (plan !== "pro") return;
    void supabase.rpc("mi_pagina").then(({ data }) => {
      const d = { ...VACIA, ...((data as Partial<PaginaPro> | null) ?? {}) };
      setGuardada(d);
      setBorrador(d);
      setCargado(true);
    });
  }, [plan]);

  if (plan === "vip") {
    return (
      <>
        <p style={{ margin: 0 }}>
          <b>Tu página es a medida.</b>
        </p>
        <p className="suave" style={{ margin: 0 }}>
          Con el plan VIP la página de tu barbería se diseña contigo. Para cambiar fotos, textos o colores, escríbenos y lo hacemos juntos.
        </p>
        <div className="acciones">
          {SOPORTE && (
            <a
              className="btn btn-primario btn-chico"
              href={`https://wa.me/${SOPORTE}?text=${encodeURIComponent("Hola, quiero hacer cambios en la página de mi barbería (plan VIP).")}`}
              target="_blank"
              rel="noreferrer"
            >
              Escribir por WhatsApp
            </a>
          )}
          <a className="btn btn-borde btn-chico" href={`/b/${barberia?.slug ?? ""}`} target="_blank" rel="noreferrer">
            Ver mi página
          </a>
        </div>
      </>
    );
  }
  if (plan === "basico") {
    return (
      <>
        <p className="suave" style={{ margin: 0 }}>
          Tu plan Básico usa una página simple: el nombre de tu barbería y la agenda para reservar. Con el plan Pro puedes poner tu logo, una foto de
          portada, tu color y una descripción.
        </p>
        <Link to="/panel/plan" className="btn btn-primario btn-chico">
          Ver planes
        </Link>
      </>
    );
  }
  if (!cargado) return <p className="suave">Cargando…</p>;

  async function subir(archivo: File | undefined, tipo: "logo" | "portada") {
    if (!archivo || !barberia) return;
    setTrabajando(tipo);
    try {
      const blob = await (tipo === "logo" ? preparar(archivo, 512, 512) : preparar(archivo, 1200, 600));
      const path = `${barberia.id}/${tipo}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("paginas").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) throw new Error("No se pudo subir la imagen");
      setBorrador((b) => ({ ...b, [tipo === "logo" ? "logo_path" : "portada_path"]: path }));
    } catch (e) {
      avisar((e as Error).message, "error");
    } finally {
      setTrabajando("");
    }
  }

  async function guardar() {
    setTrabajando("guardar");
    const { error } = await supabase.rpc("guardar_mi_pagina", {
      p_descripcion: borrador.descripcion.trim(),
      p_color: borrador.color,
      p_logo: borrador.logo_path,
      p_portada: borrador.portada_path,
    });
    setTrabajando("");
    if (error) return avisar(error.message, "error");
    // Borra del almacenamiento las imágenes que ya no se usan.
    const viejas = [guardada.logo_path, guardada.portada_path].filter((p): p is string => !!p && p !== borrador.logo_path && p !== borrador.portada_path);
    if (viejas.length) void supabase.storage.from("paginas").remove(viejas);
    setGuardada(borrador);
    setEditando(false);
    avisar("Página guardada");
    onGuardado?.(borrador.descripcion ? "Logo, portada y descripción" : "Logo y portada");
  }

  const verLogo = urlPagina((editando ? borrador : guardada).logo_path);
  const verPortada = urlPagina((editando ? borrador : guardada).portada_path);
  const v = editando ? borrador : guardada;
  const enlace = barberia ? `/b/${barberia.slug}` : "/";

  return (
    <>
      <div className="mp-prev" style={{ backgroundImage: verPortada ? `url(${verPortada})` : undefined }}>
        <span className="mp-logo" style={{ background: v.color }}>
          {verLogo ? <img src={verLogo} alt="" /> : <b>{(barberia?.nombre ?? "?").slice(0, 2).toUpperCase()}</b>}
        </span>
      </div>

      {!editando ? (
        <>
          <p className="suave" style={{ margin: 0, whiteSpace: "pre-line" }}>
            {guardada.descripcion || "Aún no escribes una descripción."}
          </p>
          <p className="suave chico" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            Color de tu página <i className="mp-punto" style={{ background: guardada.color }} />
          </p>
          <div className="acciones">
            <button className="btn btn-primario btn-chico" onClick={() => setEditando(true)}>
              Editar
            </button>
            <a className="btn btn-borde btn-chico" href={enlace} target="_blank" rel="noreferrer">
              Ver mi página
            </a>
          </div>
          <p className="suave chico" style={{ margin: 0 }}>
            El nombre, la dirección y el WhatsApp se cambian en «Barbería», y los precios en «Servicios y precios».
          </p>
        </>
      ) : (
        <>
          <div className="acciones">
            <button className="btn btn-borde btn-chico" disabled={trabajando !== ""} onClick={() => entLogo.current?.click()}>
              {trabajando === "logo" ? "Subiendo…" : borrador.logo_path ? "Cambiar logo" : "Subir logo"}
            </button>
            <button className="btn btn-borde btn-chico" disabled={trabajando !== ""} onClick={() => entPortada.current?.click()}>
              {trabajando === "portada" ? "Subiendo…" : borrador.portada_path ? "Cambiar portada" : "Subir portada"}
            </button>
            {(borrador.logo_path || borrador.portada_path) && (
              <button className="btn btn-borde btn-chico" onClick={() => setBorrador({ ...borrador, logo_path: null, portada_path: null })}>
                Quitar fotos
              </button>
            )}
          </div>
          <input ref={entLogo} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { void subir(e.target.files?.[0], "logo"); e.target.value = ""; }} />
          <input ref={entPortada} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { void subir(e.target.files?.[0], "portada"); e.target.value = ""; }} />

          <div className="campo">
            <span>Color de tu página</span>
            <div className="mp-colores">
              {COLORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  aria-pressed={borrador.color.toLowerCase() === c.toLowerCase()}
                  className={borrador.color.toLowerCase() === c.toLowerCase() ? "on" : ""}
                  style={{ background: c }}
                  onClick={() => setBorrador({ ...borrador, color: c })}
                />
              ))}
              <input type="color" aria-label="Otro color" value={borrador.color} onChange={(e) => setBorrador({ ...borrador, color: e.target.value.toUpperCase() })} />
            </div>
          </div>

          <label className="campo">
            <span>Descripción</span>
            <textarea rows={4} maxLength={400} value={borrador.descripcion} onChange={(e) => setBorrador({ ...borrador, descripcion: e.target.value })} placeholder="Cuenta en pocas líneas qué hace especial a tu barbería" />
            <small>{borrador.descripcion.length}/400</small>
          </label>

          <div className="acciones">
            <button className="btn btn-primario btn-chico" disabled={trabajando !== ""} onClick={() => void guardar()}>
              {trabajando === "guardar" ? "Guardando…" : "Guardar"}
            </button>
            <button
              className="btn btn-borde btn-chico"
              disabled={trabajando !== ""}
              onClick={() => {
                const nuevas = [borrador.logo_path, borrador.portada_path].filter((p): p is string => !!p && p !== guardada.logo_path && p !== guardada.portada_path);
                if (nuevas.length) void supabase.storage.from("paginas").remove(nuevas);
                setBorrador(guardada);
                setEditando(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </>
  );
}
