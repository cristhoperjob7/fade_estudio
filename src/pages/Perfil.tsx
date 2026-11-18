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
import { useAjusteChat } from "../lib/chat";
import { hapticaDisponible, useHaptica } from "../lib/haptica";
import FormularioDatos, { validarDatos, valoresDesde } from "../components/FormularioDatos";
import type { ErroresDatos, ValoresDatos } from "../components/FormularioDatos";
import { guardarDatosCompletos, quitarFoto, subirFoto, useMiPerfil } from "../lib/perfil";
type Pestana = "datos" | "clave" | "chat" | "avisos";
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
  const ajusteChat = useAjusteChat();
  const [hapOn, setHap] = useHaptica();
  const [tab, setTab] = useState<Pestana>("datos");
  const [f, setF] = useState<ValoresDatos>(() => valoresDesde(null));
  const [errores, setErrores] = useState<ErroresDatos>({});

  const restaurar = () => {
    setF(valoresDesde(datos));
    setErrores({});
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
    const er = validarDatos(f);
    setErrores(er);
    if (Object.keys(er).length) {
      avisar("Revisa los campos marcados", "error");
      return false;
    }
    setGuardando(true);
    try {
      await guardarDatosCompletos({ nombre: f.nombre.trim(), apellidos: f.apellidos.trim(), celular: f.celular, sexo: f.sexo, region: f.region, comuna: f.comuna, edad: Number(f.edad) });
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
          { valor: "chat" as Pestana, etiqueta: "Ajustes" },
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
            { etiqueta: "Sexo", valor: datos.sexo === "femenino" ? "Femenino" : datos.sexo === "masculino" ? "Masculino" : "" },
            { etiqueta: "Región y comuna", valor: datos.comuna ? `${datos.comuna}, ${datos.region}` : "" },
            { etiqueta: "Correo", valor: datos.correo },
            ...(datos.rol === "barbero" && perfil ? [{ etiqueta: "Comisión", valor: `${perfil.comision_pct}%` }] : []),
          ]}
          onGuardar={guardar}
          onCancelar={restaurar}
          guardando={guardando}
          textoEditar="Editar mis datos"
        >
          <FormularioDatos v={f} onCambio={(n) => { setF(n); if (Object.keys(errores).length) setErrores(validarDatos(n)); }} errores={errores} correo={datos.correo} />
        </Ficha>
      ) : tab === "chat" ? (
        <div className="chat-ajuste">
          <label className="interruptor">
            <input
              type="checkbox"
              checked={ajusteChat.privados !== false}
              disabled={ajusteChat.privados === null}
              onChange={(e) => void ajusteChat.guardar(e.target.checked).then((m) => avisar(m || (e.target.checked ? "Ahora te pueden escribir en privado" : "Mensajes privados desactivados"), m ? "error" : undefined))}
            />
            <span>
              <b>Recibir mensajes privados</b>
              <small>Si lo apagas, nadie podrá iniciarte un chat privado desde el chat de barberos.</small>
            </span>
          </label>
          <label className="interruptor">
            <input type="checkbox" checked={hapOn} onChange={(e) => setHap(e.target.checked)} />
            <span>
              <b>Vibración suave</b>
              <small>{hapticaDisponible() ? "Un toque corto al presionar botones y confirmar acciones. Sin sonido." : "Este aparato no permite vibración desde el navegador (por ejemplo, iPhone)."}</small>
            </span>
          </label>
        </div>
      ) : tab === "avisos" ? (
        <AvisosPush para="admin" />
      ) : (
        <FormularioClave conTitulo={false} onListo={() => setTab("datos")} />
      )}
      </div>
    </>
  );
}
