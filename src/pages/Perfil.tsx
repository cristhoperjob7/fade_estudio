import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Avatar, { iniciales } from "../components/Avatar";
import { FormularioClave } from "../components/CambiarClave";
import AvisosPush from "../components/AvisosPush";
import { useAuth } from "../lib/auth";
import Ficha from "../components/Ficha";
import { formatearTelefono } from "../lib/whatsapp";
import Icon from "../components/Icon";
import Pestanitas from "../components/Pestanitas";
import { useToast } from "../components/Toast";
import { guardarDatos, quitarFoto, subirFoto, useMiPerfil } from "../lib/perfil";
type Pestana = "datos" | "clave" | "avisos";
const ROL_TEXTO = { dueno: "Dueño", barbero: "Barbero", superadmin: "Superadmin" } as const;

/** «Mi perfil»: foto y datos personales. Sirve para Dueño, Barbero y Superadmin. */
export default function Perfil() {
  const avisar = useToast();
  const { perfil, barberia: infoBarberia } = useAuth();
  const plan = (infoBarberia?.plan ?? "basico") as "basico" | "pro" | "vip";
  const { datos, foto } = useMiPerfil();
  const archivo = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [tab, setTab] = useState<Pestana>("datos");
  const [f, setF] = useState({ nombre: "", apellidos: "", telefono: "", edad: "" });

  const restaurar = () => {
    if (!datos) return;
    setF({
      nombre: datos.nombre,
      apellidos: datos.apellidos,
      telefono: datos.telefono,
      edad: datos.edad ? String(datos.edad) : "",
    });
  };
  useEffect(restaurar, [datos]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!datos) return <p className="mut" style={{ marginTop: 20 }}>Cargando…</p>;
  const rojo = datos.rol === "superadmin";
  const nombreCompleto = [datos.nombre, datos.apellidos].filter(Boolean).join(" ");

  async function alElegir(e: ChangeEvent<HTMLInputElement>) {
    const a = e.target.files?.[0];
    e.target.value = "";
    if (!a || !datos) return;
    setSubiendo(true);
    try {
      await subirFoto(a, datos.avatar_path);
      avisar("Foto actualizada");
    } catch (err) {
      avisar((err as Error).message, "error");
    } finally {
      setSubiendo(false);
    }
  }

  async function sacar() {
    if (!datos) return;
    setSubiendo(true);
    try {
      await quitarFoto(datos.avatar_path);
      avisar("Foto quitada");
    } catch (err) {
      avisar((err as Error).message, "error");
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar(): Promise<boolean> {
    const edad = f.edad.trim() === "" ? null : Number(f.edad);
    if (edad !== null && (!Number.isInteger(edad) || edad < 10 || edad > 110)) {
      avisar("Revisa tu edad", "error");
      return false;
    }
    setGuardando(true);
    try {
      await guardarDatos({ nombre: f.nombre, apellidos: f.apellidos, telefono: f.telefono, edad });
      avisar("Datos guardados");
      return true;
    } catch (err) {
      avisar((err as Error).message, "error");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="perfil-foto">
        <Avatar iniciales={nombreCompleto ? iniciales(nombreCompleto) : "?"} foto={foto} rojo={rojo} plan={plan} grande />
        <div style={{ textAlign: "center" }}>
          <b>{nombreCompleto || "Sin nombre"}</b>
          <div>
            <span className={rojo ? "rol-rojo" : `rol-${plan}`}>{ROL_TEXTO[datos.rol] ?? "Superadmin"}</span>
          </div>
        </div>
        <input ref={archivo} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={alElegir} />
        <div className="acciones">
          <button type="button" className="btn btn-borde btn-chico" disabled={subiendo} onClick={() => archivo.current?.click()}>
            <Icon nombre="camera" size={18} /> {subiendo ? "Subiendo…" : foto ? "Cambiar foto" : "Subir foto"}
          </button>
          {foto && (
            <button type="button" className="btn btn-borde btn-chico" disabled={subiendo} onClick={sacar}>
              Quitar
            </button>
          )}
        </div>
      </div>

      <Pestanitas
        etiqueta="Mi perfil"
        valor={tab}
        onCambio={setTab}
        opciones={[
          { valor: "datos", etiqueta: "Mis datos" },
          { valor: "clave", etiqueta: "Cambiar mi clave" },
          ...(rojo ? [{ valor: "avisos" as Pestana, etiqueta: "Avisos" }] : []),
        ]}
      />

      <div key={tab} className="pest-panel">
      {tab === "datos" ? (
        <Ficha
          filas={[
            { etiqueta: "Nombre", valor: datos.nombre },
            { etiqueta: "Apellidos", valor: datos.apellidos },
            { etiqueta: "Celular", valor: datos.telefono ? formatearTelefono(datos.telefono) : "" },
            { etiqueta: "Edad", valor: datos.edad ? `${datos.edad} años` : "" },
            { etiqueta: "Correo", valor: datos.correo },
            ...(datos.rol === "barbero" && perfil ? [{ etiqueta: "Comisión", valor: `${perfil.comision_pct}%` }] : []),
          ]}
          onGuardar={guardar}
          onCancelar={restaurar}
          guardando={guardando}
          textoEditar="Editar mis datos"
        >
          <div className="fila2">
            <label className="campo">
              <span>Nombre</span>
              <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} maxLength={60} autoComplete="given-name" required />
            </label>
            <label className="campo">
              <span>Apellidos</span>
              <input value={f.apellidos} onChange={(e) => setF({ ...f, apellidos: e.target.value })} maxLength={60} autoComplete="family-name" />
            </label>
          </div>
          <div className="fila2">
            <label className="campo">
              <span>Celular</span>
              <input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} inputMode="tel" placeholder="+56 9 1234 5678" autoComplete="tel" />
            </label>
            <label className="campo">
              <span>Edad</span>
              <input value={f.edad} onChange={(e) => setF({ ...f, edad: e.target.value.replace(/\D/g, "").slice(0, 3) })} inputMode="numeric" placeholder="Ej: 28" />
            </label>
          </div>
          <p className="suave chico">El correo es con el que entras y no se cambia aquí.</p>
        </Ficha>
      ) : tab === "avisos" ? (
        <AvisosPush para="admin" />
      ) : (
        <FormularioClave conTitulo={false} onListo={() => setTab("datos")} />
      )}
      </div>
    </>
  );
}
